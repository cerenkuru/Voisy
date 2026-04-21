package signaling

import "github.com/coder/websocket"

type Client struct {
	ID       string
	Nickname string
	RoomID   string
	Conn     *websocket.Conn // Client'in websocket bağlantısı, mesaj gönderip almak için kullanılır
}

type PeerInfo struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
}

// Client'ın sadece dışarıya gösterilen hali. Conn yok çünkü bağlantı nesnesi JSON'a dönüştürülemez, karşı tarafa gönderilemez.

type WSMessage struct {
	Type     string         `json:"type"`
	RoomID   string         `json:"roomId,omitempty"`
	Nickname string         `json:"nickname,omitempty"`
	SelfID   string         `json:"selfId,omitempty"`
	Target   string         `json:"target,omitempty"`
	From     string         `json:"from,omitempty"`
	PeerID   string         `json:"peerId,omitempty"`
	Message  string         `json:"message,omitempty"`
	Peer     *PeerInfo      `json:"peer,omitempty"`
	Peers    []PeerInfo     `json:"peers,omitempty"`
	Payload  map[string]any `json:"payload,omitempty"`
}

// WebSocket üzerinden gidip gelen her mesaj bu struct. omitempty → o alan boşsa JSON'a yazma, sade tut.
// Payload map[string]any → WebRTC'nin offer/answer/ice verileri buraya giriyor. Farklı yapıda olabilecekleri için esnek map kullanılmış.

const (
	MsgJoin       = "join"
	MsgJoined     = "joined"
	MsgPeerJoined = "peer-joined"
	MsgPeerLeft   = "peer-left"
	MsgSignal     = "signal"
	MsgError      = "error"
)

// String sabitleri. "join" yazmak yerine MsgJoin yazıyoruz — yazım hatası olursa compiler yakalar.
