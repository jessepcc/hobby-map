package service_test

import (
	"context"
	"testing"

	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
	"hobby-map/internal/service"
	"hobby-map/internal/testutil"
)

func TestRetrievalService_Recommend(t *testing.T) {
	db := testutil.TestDB(t)

	// Seed test data: hobbies, concepts, edges, FTS
	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing with bamboo swords", map[string]float64{
		"startup_cost": 0.5, "physical_demand": 0.7, "age_longevity": 0.6,
	})
	testutil.SeedTestHobby(t, db, "h2", "painting", "Oil Painting", "Art with oils on canvas", map[string]float64{
		"startup_cost": 0.5, "physical_demand": 0.2, "age_longevity": 0.85,
	})
	testutil.SeedTestConcept(t, db, "c1", "japanese-culture", "Japanese Culture")
	testutil.SeedTestEdge(t, db, "e1", "h1", "c1", "related_to", 0.9)
	testutil.SeedFTSEntry(t, db, "h1", "Kendo", "japanese fencing", "Japanese fencing with bamboo swords", "", "Japanese Culture martial arts")
	testutil.SeedFTSEntry(t, db, "h2", "Oil Painting", "classical painting", "Art with oils on canvas", "", "arts crafts")

	hobbyRepo := repo.NewHobbyRepo(db)
	graphRepo := repo.NewGraphRepo(db)
	svc := service.NewRetrievalService(hobbyRepo, graphRepo)

	signals := []domain.MemorySignal{
		{SignalType: "interest", Text: "Japanese culture", NormalizedValue: "japanese_culture", Weight: 0.9, Confidence: 0.9},
	}

	results, err := svc.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20}, nil)
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}

	if len(results) == 0 {
		t.Fatal("expected results")
	}

	// Kendo should rank higher due to Japanese culture graph link + FTS match
	if results[0].HobbyID != "h1" {
		t.Errorf("top result = %q, want h1 (kendo)", results[0].HobbyID)
	}
}

func TestRetrievalService_RecommendWithVectorResults(t *testing.T) {
	db := testutil.TestDB(t)

	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing with bamboo swords", map[string]float64{
		"startup_cost": 0.5, "physical_demand": 0.7, "age_longevity": 0.6,
	})
	testutil.SeedTestHobby(t, db, "h2", "painting", "Oil Painting", "Art with oils on canvas", map[string]float64{
		"startup_cost": 0.5, "physical_demand": 0.2, "age_longevity": 0.85,
	})
	testutil.SeedTestHobby(t, db, "h3", "pottery", "Pottery", "Wheel throwing clay", map[string]float64{
		"startup_cost": 0.4, "physical_demand": 0.3, "age_longevity": 0.8,
	})
	testutil.SeedFTSEntry(t, db, "h1", "Kendo", "", "Japanese fencing", "", "")
	testutil.SeedFTSEntry(t, db, "h2", "Oil Painting", "", "Art with oils", "", "")
	testutil.SeedFTSEntry(t, db, "h3", "Pottery", "", "Wheel throwing clay", "", "")

	hobbyRepo := repo.NewHobbyRepo(db)
	graphRepo := repo.NewGraphRepo(db)
	svc := service.NewRetrievalService(hobbyRepo, graphRepo)

	signals := []domain.MemorySignal{
		{SignalType: "interest", Text: "clay arts", Weight: 0.9, Confidence: 0.9},
	}

	// Vector results boost pottery (h3) which FTS might not find for "clay arts"
	vectorResults := []repo.ScoredID{
		{ID: "h3", Score: 0.92},
		{ID: "h2", Score: 0.71},
		{ID: "h1", Score: 0.35},
	}

	results, err := svc.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20}, vectorResults)
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}

	if len(results) == 0 {
		t.Fatal("expected results")
	}

	// Pottery should appear in results thanks to vector boost
	found := false
	for _, r := range results {
		if r.HobbyID == "h3" {
			found = true
			if r.VectorScore == 0 {
				t.Error("expected non-zero VectorScore for h3")
			}
			break
		}
	}
	if !found {
		t.Error("expected pottery (h3) in results via vector boost")
	}
}
