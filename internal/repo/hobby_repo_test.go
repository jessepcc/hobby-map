package repo_test

import (
	"context"
	"testing"

	"hobby-map/internal/repo"
	"hobby-map/internal/testutil"
)

func TestHobbyRepo_GetByID(t *testing.T) {
	db := testutil.TestDB(t)
	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing", map[string]float64{"startup_cost": 0.6})

	r := repo.NewHobbyRepo(db)
	h, err := r.GetByID(context.Background(), "h1")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if h.Name != "Kendo" {
		t.Errorf("name = %q, want Kendo", h.Name)
	}
	if h.Dimensions["startup_cost"] != 0.6 {
		t.Errorf("startup_cost = %f, want 0.6", h.Dimensions["startup_cost"])
	}
}

func TestHobbyRepo_GetByID_NotFound(t *testing.T) {
	db := testutil.TestDB(t)
	r := repo.NewHobbyRepo(db)
	_, err := r.GetByID(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent hobby")
	}
}

func TestHobbyRepo_List(t *testing.T) {
	db := testutil.TestDB(t)
	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing", map[string]float64{"startup_cost": 0.6, "physical_demand": 0.7})
	testutil.SeedTestHobby(t, db, "h2", "painting", "Oil Painting", "Art with oils", map[string]float64{"startup_cost": 0.5, "physical_demand": 0.2})

	r := repo.NewHobbyRepo(db)

	// No filter
	hobbies, err := r.List(context.Background(), repo.ListFilter{Limit: 10})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(hobbies) != 2 {
		t.Errorf("len = %d, want 2", len(hobbies))
	}

	// Filter by physical demand max
	max := 0.5
	hobbies, err = r.List(context.Background(), repo.ListFilter{PhysicalDemandMax: &max, Limit: 10})
	if err != nil {
		t.Fatalf("List filtered: %v", err)
	}
	if len(hobbies) != 1 {
		t.Errorf("filtered len = %d, want 1", len(hobbies))
	}
	if hobbies[0].Name != "Oil Painting" {
		t.Errorf("filtered name = %q, want Oil Painting", hobbies[0].Name)
	}
}

func TestHobbyRepo_SearchFTS(t *testing.T) {
	db := testutil.TestDB(t)
	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing", nil)
	testutil.SeedFTSEntry(t, db, "h1", "Kendo", "japanese fencing", "Japanese fencing", "", "martial arts")

	r := repo.NewHobbyRepo(db)
	results, err := r.SearchFTS(context.Background(), "japanese", 10)
	if err != nil {
		t.Fatalf("SearchFTS: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("expected at least 1 result")
	}
	if results[0].ID != "h1" {
		t.Errorf("result ID = %q, want h1", results[0].ID)
	}
}

func TestHobbyRepo_SearchFTSClauses_EscapesPunctuation(t *testing.T) {
	db := testutil.TestDB(t)
	testutil.SeedTestHobby(t, db, "h1", "kenjutsu", "Kenjutsu", "Japanese swordsmanship", nil)
	testutil.SeedFTSEntry(t, db, "h1", "Kenjutsu", "", "Traditional Japanese swordsmanship", "", "Japanese history long term discipline")

	r := repo.NewHobbyRepo(db)
	results, err := r.SearchFTSClauses(context.Background(), []string{"Japanese history", "long-term"}, 10)
	if err != nil {
		t.Fatalf("SearchFTSClauses: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("expected at least 1 result")
	}
	if results[0].ID != "h1" {
		t.Errorf("result ID = %q, want h1", results[0].ID)
	}
}
