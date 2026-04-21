package room

import (
	"context"
	"sync"

	"github.com/coder/websocket/wsjson"

	"voisy/internal/signaling"
)

// sync.RWMutex nedir? Çok önemli:
// Aynı anda 100 kullanıcı bağlanıyor
// Hepsi aynı map'e yazıyor
// Go'da bu race condition = program çöker

// RWMutex çözüm:
// - Yazarken: sadece 1 kişi yazabilir (Lock)
// - Okurken: herkes aynı anda okuyabilir (RLock)

type Manager struct {
	mu    sync.RWMutex     // kilitleme mekanizması
	Rooms map[string]*Room // roomID → Room
}

func NewManager() *Manager {
	return &Manager{Rooms: make(map[string]*Room)}
}

func (m *Manager) CreateRoom(roomID, roomName string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Rooms[roomID] = NewRoom(roomID, roomName)
}

func (m *Manager) Join(roomID string, client *signaling.Client) ([]signaling.PeerInfo, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	roomRef, ok := m.Rooms[roomID]
	if !ok {
		return nil, false // Oda yok
	}

	peers := roomRef.PeerList()         // Önce mevcut listeyi al
	roomRef.Clients[client.ID] = client // Sonra yeni kişiyi ekle
	return peers, true
}

// Neden önce liste alıp sonra ekliyoruz? Yeni gelen kişi kendi kendini listede görmesin diye.

func (m *Manager) Leave(roomID, clientID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	roomRef, ok := m.Rooms[roomID]
	if !ok {
		return
	}

	delete(roomRef.Clients, clientID)

	if len(roomRef.Clients) == 0 {
		delete(m.Rooms, roomID) // Oda boşaldıysa odayı da sil
	}
}

// Ahmet odaya girdi.

// Sunucu odadaki herkese şunu söylemeli:
// "Ahmet geldi!"

// Barış  → "Ahmet geldi!" ✅
// Cem    → "Ahmet geldi!" ✅
// Ahmet  → gönderme ❌ (kendine söyleme)

func (m *Manager) Broadcast(roomID, excludeClientID string, msg signaling.WSMessage) {
	//                           hangi oda  kimi atlayacak     ne gönderecek
	m.mu.RLock() // Sadece okuyacağız, RLock yeterli
	roomRef, ok := m.Rooms[roomID]
	if !ok {
		m.mu.RUnlock()
		return
	}

	targets := make([]*signaling.Client, 0, len(roomRef.Clients))
	for clientID, client := range roomRef.Clients {
		if clientID == excludeClientID {
			continue // Mesajı gönderen kişiyi atla
		}
		targets = append(targets, client)
	}
	m.mu.RUnlock() // Listeyi aldık, kilidi bırak
	// Neden önce listeye alıp sonra gönderiyoruz? Gönderme sırasında kilidi tutarsak diğer işlemler bekler. Kilidi erken bırakıp sonra gönderiyoruz.
	// _ = → hatayı görmezden gel demek. Bağlantı kopuksa zaten ayrılmış sayılır.
	for _, client := range targets {
		_ = wsjson.Write(context.Background(), client.Conn, msg)
		// Barış'a gönder, Cem'e gönder

	}
}

func (m *Manager) GetClient(roomID, clientID string) *signaling.Client {
	//                           hangi oda   kimin ID'si      Client döndür (yoksa nil)

	m.mu.RLock()
	defer m.mu.RUnlock()
	// Okuma kilidi al, fonksiyon bitince bırak.

	roomRef, ok := m.Rooms[roomID]
	if !ok {
		return nil // Oda yoksa nil dön
	}

	return roomRef.Clients[clientID] // Kişi varsa Client'ı dön, yoksa nil
}
