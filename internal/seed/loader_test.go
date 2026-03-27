package seed_test

import (
	"os"
	"path/filepath"
	"testing"

	"hobby-map/internal/seed"
	"hobby-map/internal/testutil"
)

func TestLoad_InsertsHobbiesAndEdges(t *testing.T) {
	db := testutil.TestDB(t)

	// Create minimal test seed files in a temp dir
	dir := t.TempDir()

	writeJSON(t, filepath.Join(dir, "dimensions.json"), `[
		{"id":"d_startup_cost","key":"startup_cost","label":"Startup cost","min_value":0,"max_value":1,"description":"cost"}
	]`)
	writeJSON(t, filepath.Join(dir, "hobbies.json"), `[
		{
			"id":"h1","slug":"kendo","name":"Kendo",
			"description":"Japanese fencing","short_desc":"Japanese fencing","long_desc":"","difficulty_summary":"","starter_path":"",
			"popularity":0.5,"aliases":["japanese fencing"],
			"dimensions":{"startup_cost":0.6},"metadata":{}
		}
	]`)
	writeJSON(t, filepath.Join(dir, "concepts.json"), `[
		{"id":"c1","node_type":"concept","slug":"martial-arts","name":"Martial Arts","description":""}
	]`)
	writeJSON(t, filepath.Join(dir, "edges.json"), `[
		{"id":"e1","from_node_id":"h1","to_node_id":"c1","edge_type":"related_to","weight":0.9,"metadata":{}}
	]`)

	err := seed.Load(db, dir)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	// Verify hobby node
	var name string
	if err := db.QueryRow("SELECT name FROM nodes WHERE id='h1'").Scan(&name); err != nil {
		t.Fatalf("query node: %v", err)
	}
	if name != "Kendo" {
		t.Errorf("name = %q, want Kendo", name)
	}

	// Verify hobby extension
	var shortDesc string
	if err := db.QueryRow("SELECT short_desc FROM hobbies WHERE node_id='h1'").Scan(&shortDesc); err != nil {
		t.Fatalf("query hobby: %v", err)
	}

	// Verify alias
	var alias string
	if err := db.QueryRow("SELECT alias FROM hobby_aliases WHERE hobby_id='h1'").Scan(&alias); err != nil {
		t.Fatalf("query alias: %v", err)
	}
	if alias != "japanese fencing" {
		t.Errorf("alias = %q, want 'japanese fencing'", alias)
	}

	// Verify dimension
	var val float64
	if err := db.QueryRow("SELECT value FROM hobby_dimensions WHERE hobby_id='h1' AND dimension_id='d_startup_cost'").Scan(&val); err != nil {
		t.Fatalf("query dimension: %v", err)
	}
	if val != 0.6 {
		t.Errorf("dimension = %f, want 0.6", val)
	}

	// Verify edge
	var edgeType string
	if err := db.QueryRow("SELECT edge_type FROM edges WHERE id='e1'").Scan(&edgeType); err != nil {
		t.Fatalf("query edge: %v", err)
	}

	// Verify concept
	var nodeType string
	if err := db.QueryRow("SELECT node_type FROM nodes WHERE id='c1'").Scan(&nodeType); err != nil {
		t.Fatalf("query concept node: %v", err)
	}

	// Verify FTS was populated
	var ftsName string
	if err := db.QueryRow("SELECT name FROM hobby_fts WHERE node_id='h1'").Scan(&ftsName); err != nil {
		t.Fatalf("query fts: %v", err)
	}
	if ftsName != "Kendo" {
		t.Errorf("fts name = %q, want Kendo", ftsName)
	}
}

func writeJSON(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
