package handler

import (
	"encoding/json" // JSON okuma/yazma
	"math/rand"     // Rastgele sayı üretme
	"net/http"      // HTTP sunucu/istemci
	"strings"       // String işlemleri (TrimSpace gibi)
	"time"          // Zaman işlemleri (UnixNano için)

	"voisy/internal/room" // Senin yazdığın room paketi
)

type RoomHandler struct {
	manager *room.Manager // Odaları yöneten struct'a pointer
}

type createRoomRequest struct {
	Name string `json:"name"` // Gelen JSON'daki "name" alanı
}

type createRoomResponse struct {
	RoomID string `json:"roomId"`
	Name   string `json:"name"`
}

func NewRoomHandler(manager *room.Manager) *RoomHandler {
	return &RoomHandler{manager: manager}
}

func (h *RoomHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Sadece POST kabul et, GET gelirse hata dön.
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// w → sunucunun client'a yazdığı yer r → client'tan gelen istek

	// Gelen JSON'u req struct'ına dönüştür. Bozuk JSON gelirse hata dön.
	var req createRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return
	}

	// TrimSpace → baştaki/sondaki boşlukları siler. İsim boşsa default "My Room" yap.
	roomName := strings.TrimSpace(req.Name)
	if roomName == "" {
		roomName = "My Room"
	}

	roomID := generateRoomID()
	h.manager.CreateRoom(roomID, roomName)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createRoomResponse{RoomID: roomID, Name: roomName})
}

func generateRoomID() string {
	randSource := rand.New(rand.NewSource(time.Now().UnixNano()))
	alphabet := []rune("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
	output := make([]rune, 6)

	for i := range output {
		output[i] = alphabet[randSource.Intn(len(alphabet))]
	}

	return string(output)
}

// time.Now().UnixNano()
// → 1970'ten bu yana geçen süreyi nanosaniye cinsinden verir
// → Örnek: 1712345678901234567
// → Her çağrıldığında farklı sayı, bu yüzden seed olarak kullanılır
// rand.NewSource(...)
// → Rastgele sayı üreteci için başlangıç noktası (seed) oluşturur
// → Aynı seed = aynı rastgele sayılar. Farklı seed = farklı sayılar
// → UnixNano verince her seferinde farklı seed → farklı sonuç
// rand.New(...)
// → Bu seed'i kullanan yeni bir rastgele sayı üreteci oluşturur

// POST /rooms {"name": "Müzik"}
//     → JSON oku
//     → İsim boşsa "My Room" yap
//     → 6 karakterlik rastgele ID üret (örn. "K7PX2M")
//     → manager.CreateRoom() ile kaydet
//     → {"roomId": "K7PX2M", "name": "Müzik"} dön
