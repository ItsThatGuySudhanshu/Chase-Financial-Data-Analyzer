package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

//go:embed all:dist
var distEmbed embed.FS

func main() {
	InitDB()


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
		r.Get("/setup/status", getSetupStatus)
		r.Post("/setup/initialize", initializeSetup)
		r.Get("/transactions", getTransactions)
		r.Put("/transactions/{id}/category", updateTransactionCategory)
		r.Post("/transactions/tag", addTag)
		r.Get("/rules", getRules)
		r.Post("/rules", addRule)
		r.Delete("/rules/{id}", deleteRule)
		r.Get("/subscriptions", getSubscriptionsHandler)
		r.Get("/analytics/trends", getTrendsHandler)
		r.Get("/export", exportCSVHandler)
		r.Get("/summary", getSummary)
		r.Get("/budgets", getBudgets)
		r.Post("/budgets", setBudget)
		r.Post("/budgets/bulk", setBudgetsBulk)
		r.Delete("/budgets/{id}", deleteBudget)

		r.Post("/upload", uploadSheet)
	})

	// Serve embedded static files
	fsys, _ := fs.Sub(distEmbed, "dist")
	staticHandler := http.FileServer(http.FS(fsys))

	r.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
		// If the request is for a file that exists, serve it
		// Otherwise, serve index.html (for SPA routing)
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			staticHandler.ServeHTTP(w, r)
			return
		}

		_, err := fs.Stat(fsys, path)
		if err == nil {
			staticHandler.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html
		r.URL.Path = "/"
		staticHandler.ServeHTTP(w, r)
	})

	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
