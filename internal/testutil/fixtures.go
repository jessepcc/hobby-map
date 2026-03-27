package testutil

import (
	"database/sql"
	"testing"
)

// SeedTestHobby inserts a minimal hobby into the test database and returns the node ID.
func SeedTestHobby(t *testing.T, db *sql.DB, id, slug, name, shortDesc string, dims map[string]float64) string {
	t.Helper()
	_, err := db.Exec(`INSERT INTO nodes (id, node_type, slug, name, description) VALUES (?, 'hobby', ?, ?, ?)`,
		id, slug, name, shortDesc)
	if err != nil {
		t.Fatalf("insert node: %v", err)
	}
	_, err = db.Exec(`INSERT INTO hobbies (node_id, short_desc) VALUES (?, ?)`, id, shortDesc)
	if err != nil {
		t.Fatalf("insert hobby: %v", err)
	}
	for key, val := range dims {
		dimID := "d_" + key
		_, err = db.Exec(`INSERT INTO hobby_dimensions (hobby_id, dimension_id, value) VALUES (?, ?, ?)`, id, dimID, val)
		if err != nil {
			t.Fatalf("insert dimension %s: %v", key, err)
		}
	}
	return id
}

// SeedTestConcept inserts a concept node and returns its ID.
func SeedTestConcept(t *testing.T, db *sql.DB, id, slug, name string) string {
	t.Helper()
	_, err := db.Exec(`INSERT INTO nodes (id, node_type, slug, name) VALUES (?, 'concept', ?, ?)`, id, slug, name)
	if err != nil {
		t.Fatalf("insert concept: %v", err)
	}
	return id
}

// SeedTestEdge inserts an edge.
func SeedTestEdge(t *testing.T, db *sql.DB, id, fromID, toID, edgeType string, weight float64) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO edges (id, from_node_id, to_node_id, edge_type, weight) VALUES (?, ?, ?, ?, ?)`,
		id, fromID, toID, edgeType, weight)
	if err != nil {
		t.Fatalf("insert edge: %v", err)
	}
}

// SeedTestAlias inserts a hobby alias.
func SeedTestAlias(t *testing.T, db *sql.DB, hobbyID, alias string) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO hobby_aliases (hobby_id, alias) VALUES (?, ?)`, hobbyID, alias)
	if err != nil {
		t.Fatalf("insert alias: %v", err)
	}
}

// SeedFTSEntry inserts a hobby_fts entry for search testing.
func SeedFTSEntry(t *testing.T, db *sql.DB, nodeID, name, aliases, shortDesc, longDesc, concepts string) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO hobby_fts (node_id, name, aliases, short_desc, long_desc, concepts) VALUES (?, ?, ?, ?, ?, ?)`,
		nodeID, name, aliases, shortDesc, longDesc, concepts)
	if err != nil {
		t.Fatalf("insert fts: %v", err)
	}
}
