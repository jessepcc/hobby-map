package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	appPkg "hobby-map/internal/app"
	handler "hobby-map/internal/http"
	"hobby-map/internal/llm"
	"hobby-map/internal/repo"
	"hobby-map/internal/seed"
	"hobby-map/internal/service"
	dbpkg "hobby-map/internal/sqlite"
)

func main() {
	cfg := appPkg.LoadConfig()

	db, err := dbpkg.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	var nodeCount int
	db.QueryRow("SELECT COUNT(*) FROM nodes").Scan(&nodeCount)
	if nodeCount == 0 {
		fmt.Println("Database empty — seeding...")
		if err := seed.Load(db, cfg.SeedsDir); err != nil {
			log.Fatalf("seed: %v", err)
		}
		populateNodeFTS(db)
		fmt.Println("Seeded successfully.")
	}

	hobbyRepo := repo.NewHobbyRepo(db)
	graphRepo := repo.NewGraphRepo(db)
	memRepo := repo.NewMemoryRepo(db)
	retrieval := service.NewRetrievalService(hobbyRepo, graphRepo)

	deps := &appPkg.Dependencies{
		HobbyRepo: hobbyRepo,
		GraphRepo: graphRepo,
		MemRepo:   memRepo,
		Retrieval: retrieval,
	}

	if cfg.LLMAPIKey != "" {
		ext := llm.NewAnthropicExtractor(cfg.LLMAPIKey)
		deps.Memory = service.NewMemoryService(ext, memRepo)
	} else {
		deps.Memory = service.NewMemoryService(&llm.RuleBasedExtractor{}, memRepo)
		fmt.Println("No LLM_API_KEY — using rule-based extraction")
	}

	router := handler.NewRouter(deps)

	addr := ":" + cfg.Port
	fmt.Printf("hobby-map listening on http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, router))
}

func populateNodeFTS(db *sql.DB) {
	type row struct{ id, name, desc string }
	var concepts []row
	rows, err := db.Query("SELECT id, name, description FROM nodes WHERE node_type != 'hobby'")
	if err != nil {
		return
	}
	for rows.Next() {
		var r row
		rows.Scan(&r.id, &r.name, &r.desc)
		concepts = append(concepts, r)
	}
	rows.Close()

	for _, c := range concepts {
		db.Exec("INSERT OR REPLACE INTO node_fts (node_id, name, description) VALUES (?, ?, ?)", c.id, c.name, c.desc)
	}
}
