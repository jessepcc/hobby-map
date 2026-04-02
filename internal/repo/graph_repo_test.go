package repo_test

import (
	"context"
	"math"
	"testing"

	"hobby-map/internal/repo"
	"hobby-map/internal/testutil"
)

func TestGraphRepo_GetEdgesFrom(t *testing.T) {
	db := testutil.TestDB(t)
	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "desc", nil)
	testutil.SeedTestConcept(t, db, "c1", "martial-arts", "Martial Arts")
	testutil.SeedTestEdge(t, db, "e1", "h1", "c1", "related_to", 0.9)

	r := repo.NewGraphRepo(db)
	edges, err := r.GetEdgesFrom(context.Background(), "h1", nil)
	if err != nil {
		t.Fatalf("GetEdgesFrom: %v", err)
	}
	if len(edges) != 1 {
		t.Fatalf("len = %d, want 1", len(edges))
	}
	if edges[0].ToNodeID != "c1" {
		t.Errorf("to = %q, want c1", edges[0].ToNodeID)
	}
}

func TestGraphRepo_ExpandToHobbies(t *testing.T) {
	db := testutil.TestDB(t)

	// Create: concept -> hobby chain
	// c1 (martial-arts) <-> h1 (kendo), h2 (kenjutsu), h3 (archery via japanese-archery concept)
	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing", nil)
	testutil.SeedTestHobby(t, db, "h2", "kenjutsu", "Kenjutsu", "Japanese swordsmanship", nil)
	testutil.SeedTestHobby(t, db, "h3", "kyudo", "Kyudo", "Japanese archery", nil)
	testutil.SeedTestConcept(t, db, "c1", "martial-arts", "Martial Arts")
	testutil.SeedTestConcept(t, db, "c2", "japanese-archery", "Japanese Archery")

	testutil.SeedTestEdge(t, db, "e1", "h1", "c1", "related_to", 0.9)
	testutil.SeedTestEdge(t, db, "e2", "h2", "c1", "related_to", 0.85)
	testutil.SeedTestEdge(t, db, "e3", "h3", "c2", "related_to", 0.9)
	testutil.SeedTestEdge(t, db, "e4", "c2", "c1", "related_to", 0.8)

	r := repo.NewGraphRepo(db)

	// Starting from martial-arts concept, should find kendo, kenjutsu (1 hop) and kyudo (2 hops)
	results, err := r.ExpandToHobbies(context.Background(), []string{"c1"}, 3, 10)
	if err != nil {
		t.Fatalf("ExpandToHobbies: %v", err)
	}

	ids := make(map[string]bool)
	for _, r := range results {
		ids[r.ID] = true
	}

	if !ids["h1"] {
		t.Error("missing h1 (kendo)")
	}
	if !ids["h2"] {
		t.Error("missing h2 (kenjutsu)")
	}
	if !ids["h3"] {
		t.Error("missing h3 (kyudo)")
	}
}

func TestGraphRepo_SearchNodeFTS_EscapesPunctuation(t *testing.T) {
	db := testutil.TestDB(t)
	testutil.SeedTestConcept(t, db, "c1", "long-term-practice", "Long Term Practice")

	if _, err := db.Exec(`INSERT INTO node_fts (node_id, name, description) VALUES (?, ?, ?)`,
		"c1", "Long Term Practice", "A long-term discipline"); err != nil {
		t.Fatalf("insert node_fts: %v", err)
	}

	r := repo.NewGraphRepo(db)
	ids, err := r.SearchNodeFTS(context.Background(), "long-term", 10)
	if err != nil {
		t.Fatalf("SearchNodeFTS: %v", err)
	}
	if len(ids) != 1 || ids[0] != "c1" {
		t.Fatalf("ids = %v, want [c1]", ids)
	}
}

func TestGraphRepo_ExpandToHobbies_AccumulatesAcrossSeeds(t *testing.T) {
	db := testutil.TestDB(t)

	testutil.SeedTestConcept(t, db, "s1", "seed-1", "Seed One")
	testutil.SeedTestConcept(t, db, "s2", "seed-2", "Seed Two")
	testutil.SeedTestConcept(t, db, "c1", "discipline", "Discipline")
	testutil.SeedTestHobby(t, db, "h1", "kenjutsu", "Kenjutsu", "Japanese swordsmanship", nil)

	testutil.SeedTestEdge(t, db, "e1", "s1", "c1", "related_to", 0.9)
	testutil.SeedTestEdge(t, db, "e2", "s2", "c1", "related_to", 0.8)
	testutil.SeedTestEdge(t, db, "e3", "c1", "h1", "related_to", 0.9)

	r := repo.NewGraphRepo(db)
	results, err := r.ExpandToHobbies(context.Background(), []string{"s1", "s2"}, 3, 10)
	if err != nil {
		t.Fatalf("ExpandToHobbies: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("len = %d, want 1", len(results))
	}

	want := (0.9*0.9)/(1.0+0.35*2.0) + (0.8*0.9)/(1.0+0.35*2.0)
	if math.Abs(results[0].Score-want) > 0.0001 {
		t.Fatalf("score = %.6f, want %.6f", results[0].Score, want)
	}
}
