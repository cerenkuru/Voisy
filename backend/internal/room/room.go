package room

import "voisy/internal/signaling"

type Room struct {
	ID      string
	Name    string
	Clients map[string]*signaling.Client
}

// Bir odanın içinde ne var: ID, isim, ve o odadaki kullanıcılar. map[string]*Client → ID ile hızlı kullanıcı bulabiliyoruz.
func NewRoom(id, name string) *Room {
	return &Room{
		ID:      id,
		Name:    name,
		Clients: make(map[string]*signaling.Client),
	}
}
// make zorunlu — map'i initialize etmeden kullanırsan panic verir.

func (r *Room) PeerList() []signaling.PeerInfo {
	peers := make([]signaling.PeerInfo, 0, len(r.Clients))

	for _, client := range r.Clients {
		peers = append(peers, signaling.PeerInfo{ID: client.ID, Nickname: client.Nickname})
	}

	return peers
}
// Odadaki herkesi PeerInfo listesine çevir. Yeni biri katıldığında "odada şu kişiler var" diye göndermek için kullanılıyor.
// make([]signaling.PeerInfo, 0, len(r.Clients)) → başlangıç uzunluğu 0, ama kapasite olarak kaç kişi varsa o kadar yer ayır. Performans için.