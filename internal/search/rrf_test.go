package search_test

import (
	"math"
	"testing"

	"hobby-map/internal/repo"
	"hobby-map/internal/search"
)

func TestRRF_MergesSources(t *testing.T) {
	fts := []repo.ScoredID{
		{ID: "h1", Score: -1.0},
		{ID: "h2", Score: -2.0},
	}
	graph := []repo.ScoredID{
		{ID: "h2", Score: 0.9},
		{ID: "h3", Score: 0.7},
	}
	vector := []repo.ScoredID{
		{ID: "h1", Score: 0.95},
		{ID: "h3", Score: 0.85},
	}

	results := search.RRFMerge(fts, graph, vector, 60)

	if len(results) != 3 {
		t.Fatalf("len = %d, want 3", len(results))
	}

	// All three hobbies should appear
	ids := make(map[string]bool)
	for _, r := range results {
		ids[r.ID] = true
		if r.Score <= 0 {
			t.Errorf("hobby %s has non-positive score %f", r.ID, r.Score)
		}
	}
	if !ids["h1"] || !ids["h2"] || !ids["h3"] {
		t.Error("missing expected hobbies")
	}
}

func TestRRF_EmptyInputs(t *testing.T) {
	results := search.RRFMerge(nil, nil, nil, 60)
	if len(results) != 0 {
		t.Errorf("len = %d, want 0", len(results))
	}
}

func assertNear(t *testing.T, name string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.001 {
		t.Errorf("%s: got %.4f, want %.4f", name, got, want)
	}
}
