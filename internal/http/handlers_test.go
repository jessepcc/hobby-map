package http_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hobby-map/internal/app"
	handler "hobby-map/internal/http"
	"hobby-map/internal/repo"
	"hobby-map/internal/service"
	dbpkg "hobby-map/internal/sqlite"
)

func setupTestServer(t *testing.T) http.Handler {
	t.Helper()
	db, err := dbpkg.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	// Seed minimal test data
	hobbyRepo := repo.NewHobbyRepo(db)
	graphRepo := repo.NewGraphRepo(db)
	memRepo := repo.NewMemoryRepo(db)

	// Insert test hobby directly
	db.Exec(`INSERT INTO nodes (id, node_type, slug, name, description) VALUES ('h1', 'hobby', 'kendo', 'Kendo', 'Japanese fencing')`)
	db.Exec(`INSERT INTO hobbies (node_id, short_desc) VALUES ('h1', 'Japanese fencing with bamboo swords')`)
	db.Exec(`INSERT INTO hobby_dimensions (hobby_id, dimension_id, value) VALUES ('h1', 'd_startup_cost', 0.5)`)
	db.Exec(`INSERT INTO hobby_fts (node_id, name, aliases, short_desc, long_desc, concepts) VALUES ('h1', 'Kendo', 'japanese fencing', 'Japanese fencing', '', 'martial arts')`)

	db.Exec(`INSERT INTO nodes (id, node_type, slug, name, description) VALUES ('h2', 'hobby', 'painting', 'Oil Painting', 'Painting with oils')`)
	db.Exec(`INSERT INTO hobbies (node_id, short_desc) VALUES ('h2', 'Oil painting on canvas')`)
	db.Exec(`INSERT INTO hobby_fts (node_id, name, aliases, short_desc, long_desc, concepts) VALUES ('h2', 'Oil Painting', '', 'Oil painting on canvas', '', 'arts')`)

	deps := &app.Dependencies{
		HobbyRepo: hobbyRepo,
		GraphRepo: graphRepo,
		MemRepo:   memRepo,
		Retrieval: service.NewRetrievalService(hobbyRepo, graphRepo),
	}

	return handler.NewRouter(deps)
}

func TestGetHobbies(t *testing.T) {
	srv := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/hobbies", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("status = %d, want 200, body: %s", w.Code, w.Body.String())
	}

	var resp []map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp) < 1 {
		t.Error("expected at least 1 hobby")
	}
}

func TestGetHobbyByID(t *testing.T) {
	srv := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/hobbies/h1", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["name"] != "Kendo" {
		t.Errorf("name = %v", resp["name"])
	}
}

func TestGetHobbyByID_NotFound(t *testing.T) {
	srv := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/hobbies/nonexistent", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != 404 {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestPostCompare(t *testing.T) {
	srv := setupTestServer(t)
	body := `{"ids":["h1","h2"]}`
	req := httptest.NewRequest("POST", "/api/compare", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("status = %d, want 200, body: %s", w.Code, w.Body.String())
	}

	var resp []map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp) != 2 {
		t.Errorf("len = %d, want 2", len(resp))
	}
}

func TestSearchHobbies(t *testing.T) {
	srv := setupTestServer(t)
	req := httptest.NewRequest("GET", "/api/hobbies?q=kendo", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("status = %d, body: %s", w.Code, w.Body.String())
	}
}
