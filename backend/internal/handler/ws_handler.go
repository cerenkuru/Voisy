package handler

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/google/uuid"

	"voisy/internal/room"
	"voisy/internal/signaling"
)

type WSHandler struct {
	manager *room.Manager
}

func NewWSHandler(manager *room.Manager) *WSHandler {
	return &WSHandler{manager: manager}
}

// HTTP bağlantısını WebSocket'e upgrade et. OriginPatterns güvenlik için — sadece localhost'tan gelen bağlantıları kabul et.
func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"localhost:*", "127.0.0.1:*"},
	})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "bye")

	// Bağlanan kişi 15 saniye içinde join mesajı göndermezse bağlantıyı kes. Timeout olmadan bağlantı sonsuza kadar açık kalır.
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var join signaling.WSMessage
	if err = wsjson.Read(ctx, conn, &join); err != nil {
		return
	}

	// İlk mesaj mutlaka join olmalı. Farklı bir şey gelirse hata gönder ve kes.
	if join.Type != signaling.MsgJoin || strings.TrimSpace(join.RoomID) == "" {
		_ = wsjson.Write(ctx, conn, signaling.WSMessage{Type: signaling.MsgError, Message: "first message must be join"})
		return
	}

	roomID := strings.ToUpper(strings.TrimSpace(join.RoomID))
	nickname := strings.TrimSpace(join.Nickname)
	if nickname == "" {
		nickname = "Guest"
	}

	client := &signaling.Client{
		ID:       uuid.NewString(), // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
		Nickname: nickname,
		RoomID:   roomID,
		Conn:     conn,
	}
	// Bu bağlantı için bir Client nesnesi oluştur. UUID = dünyada unique ID.

	peers, created := h.manager.Join(roomID, client)
	if !created {
		_ = wsjson.Write(ctx, conn, signaling.WSMessage{Type: signaling.MsgError, Message: "room not found"})
		return
	}

	_ = wsjson.Write(ctx, conn, signaling.WSMessage{
		Type:   signaling.MsgJoined,
		RoomID: roomID,
		SelfID: client.ID,
		Peers:  peers,
	})

	h.manager.Broadcast(roomID, client.ID, signaling.WSMessage{
		Type: signaling.MsgPeerJoined,
		Peer: &signaling.PeerInfo{ID: client.ID, Nickname: client.Nickname},
	})
	// Katıldı → kendisine "hoş geldin + odadaki kişiler" gönder → odadaki herkese "biri geldi" gönder.

	// Sonsuz döngü — mesaj bekle. Mesaj gelince hedef kişiye ilet. Bağlantı kopunca döngü kırılır.
	for {
		var msg signaling.WSMessage
		if err = wsjson.Read(r.Context(), conn, &msg); err != nil {
			break
		}

		switch msg.Type {
		case signaling.MsgSignal:
			if strings.TrimSpace(msg.Target) == "" {
				continue
			}

			targetClient := h.manager.GetClient(roomID, msg.Target)
			if targetClient == nil {
				continue // Hedef kişi yoksa atla
			}

			relay := signaling.WSMessage{
				Type:    signaling.MsgSignal,
				From:    client.ID,
				Payload: msg.Payload,
			}
			// Hedef kişiye WebRTC mesajını ilet
			_ = wsjson.Write(r.Context(), targetClient.Conn, relay)
		}
	}

	h.manager.Leave(roomID, client.ID)
	h.manager.Broadcast(roomID, client.ID, signaling.WSMessage{Type: signaling.MsgPeerLeft, PeerID: client.ID})
} // Döngü bitti = kişi ayrıldı
