package main

import (
	"fmt"
	"log"
	"os"

	"hobby-map/internal/app"
	"hobby-map/internal/seed"
	dbpkg "hobby-map/internal/sqlite"
)

func main() {
	cfg := app.LoadConfig()
	db, err := dbpkg.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	seedsDir := cfg.SeedsDir
	if len(os.Args) > 1 {
		seedsDir = os.Args[1]
	}

	fmt.Printf("Seeding from %s into %s...\n", seedsDir, cfg.DBPath)
	if err := seed.Load(db, seedsDir); err != nil {
		log.Fatalf("seed: %v", err)
	}
	fmt.Println("Done.")
}
