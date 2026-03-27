package sqlite_test

import (
	"testing"

	dbpkg "hobby-map/internal/sqlite"
)

func TestOpen_CreatesTablesAndDimensions(t *testing.T) {
	db, err := dbpkg.Open(":memory:")
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer db.Close()

	// Verify core tables exist
	tables := []string{"nodes", "edges", "hobbies", "hobby_aliases", "dimensions", "hobby_dimensions",
		"memory_sessions", "memory_signals", "recommendation_runs", "recommendation_results",
		"node_embeddings", "user_feedback"}
	for _, table := range tables {
		var name string
		err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&name)
		if err != nil {
			t.Errorf("table %s not found: %v", table, err)
		}
	}

	// Verify FTS tables
	for _, vt := range []string{"hobby_fts", "node_fts"} {
		var name string
		err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", vt).Scan(&name)
		if err != nil {
			t.Errorf("virtual table %s not found: %v", vt, err)
		}
	}

	// Verify seed dimensions
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM dimensions").Scan(&count); err != nil {
		t.Fatalf("count dimensions: %v", err)
	}
	if count != 15 {
		t.Errorf("expected 15 dimensions, got %d", count)
	}

	// Verify foreign keys are on
	var fk int
	db.QueryRow("PRAGMA foreign_keys").Scan(&fk)
	if fk != 1 {
		t.Error("foreign_keys not enabled")
	}
}
