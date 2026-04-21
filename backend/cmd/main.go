package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"voisy/internal/handler"
	"voisy/internal/room"
)

// Bu bir middleware — her isteği yakalatır, CORS header'ları ekler, sonra asıl handler'a iletir.
// CORS nedir? Browser güvenlik kuralı. Frontend localhost:5173'de, backend localhost:8080'de. Farklı port = farklı origin = browser bloklar. Bu header'lar "izin var" der.

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "https://localhost:5173"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return // OPTIONS = browser'ın ön sorusu, sadece header dön
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	manager := room.NewManager()

	mux := http.NewServeMux()
	// mux = router. Hangi URL hangi handler'a gitsin bunu bilir.
	mux.Handle("/api/rooms", handler.NewRoomHandler(manager)) // POST → oda oluştur
	mux.Handle("/ws", handler.NewWSHandler(manager))          // WebSocket bağlantısı
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok")) // Sunucu çalışıyor mu? → "ok"
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: withCORS(mux), // mux'u CORS middleware'ine sar
	}

	certPath := filepath.Clean("../localhost+1.pem")
	keyPath := filepath.Clean("../localhost+1-key.pem")

	if _, certErr := os.Stat(certPath); certErr == nil {
		// Sertifika varsa HTTPS başlat

		if _, keyErr := os.Stat(keyPath); keyErr == nil {
			log.Printf("signaling server listening on https://localhost%s", server.Addr)
			if err := server.ListenAndServeTLS(certPath, keyPath); err != nil && !strings.Contains(err.Error(), "Server closed") {
				log.Fatal(err)
			}
			return
		}
	}

	log.Printf("signaling server listening on http://localhost%s", server.Addr)
	// Sertifika yoksa HTTP başlat

	if err := server.ListenAndServe(); err != nil && !strings.Contains(err.Error(), "Server closed") {
		log.Fatal(err)
	}
}

// main.go → manager oluştur → mux'a handler'ları bağla → server başlat

// Client bağlanır:
//   ws_handler → join mesajı bekle → odaya ekle → WebRTC mesajlarını ilet

// Client ayrılır:
//   ws_handler → Leave → odadakilere haber ver
