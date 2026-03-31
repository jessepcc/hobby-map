package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"hobby-map/internal/app"
)

func NewRouter(deps *app.Dependencies) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	}))

	h := &Handlers{deps: deps}

	r.Route("/api", func(r chi.Router) {
		r.Get("/hobbies", h.ListHobbies)
		r.Get("/hobbies/{id}", h.GetHobby)
		r.Post("/compare", h.Compare)
		r.Post("/memory/extract", h.ExtractMemory)
		r.Post("/recommend", h.Recommend)
		r.Post("/feedback/save", h.SaveFeedback)
		r.Post("/feedback/dismiss", h.DismissFeedback)
	})

	// Serve pre-computed embeddings
	r.Handle("/seeds/*", http.StripPrefix("/seeds/", http.FileServer(http.Dir("seeds"))))

	// Serve static frontend
	fs := http.FileServer(http.Dir("web"))
	r.Handle("/*", fs)

	return r
}
