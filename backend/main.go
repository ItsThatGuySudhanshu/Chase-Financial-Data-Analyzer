package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

func main() {
	InitDB()

	// Automatically scan and ingest any CSVs in the sheets folder on startup
	inserted := ScanLocalSheetsDir()
	log.Printf("Startup auto-scan complete. Inserted %d new transactions.\n", inserted)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Basic CORS to allow React frontend
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(corsHandler.Handler)

	r.Route("/api", func(r chi.Router) {
		r.Get("/transactions", getTransactions)
		r.Get("/summary", getSummary)
		r.Get("/budgets", getBudgets)
		r.Post("/budgets", setBudget)
		r.Delete("/budgets/{id}", deleteBudget)
		r.Post("/scan", scanSheets)
		r.Post("/upload", uploadSheet)
	})

	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
