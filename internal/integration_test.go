package internal_test

import (
	"context"
	"strings"
	"testing"

	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
	"hobby-map/internal/seed"
	"hobby-map/internal/service"
	dbpkg "hobby-map/internal/sqlite"
)

func seedAndPrepare(t *testing.T) (*repo.HobbyRepo, *repo.GraphRepo) {
	t.Helper()
	db, err := dbpkg.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if err := seed.Load(db, "../seeds"); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// Populate node_fts for concept search
	// Collect all data first, then insert — avoids holding rows open during prepare
	type conceptRow struct{ id, name, desc string }
	var concepts []conceptRow
	rows, err := db.Query("SELECT id, name, description FROM nodes WHERE node_type != 'hobby'")
	if err != nil {
		t.Fatalf("query concepts: %v", err)
	}
	for rows.Next() {
		var c conceptRow
		rows.Scan(&c.id, &c.name, &c.desc)
		concepts = append(concepts, c)
	}
	rows.Close()

	for _, c := range concepts {
		db.Exec("INSERT OR REPLACE INTO node_fts (node_id, name, description) VALUES (?, ?, ?)", c.id, c.name, c.desc)
	}

	return repo.NewHobbyRepo(db), repo.NewGraphRepo(db)
}

func TestAcceptance_JapaneseHistoryFindsKendo(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	hobbyRepo, graphRepo := seedAndPrepare(t)
	retrieval := service.NewRetrievalService(hobbyRepo, graphRepo)

	signals := []domain.MemorySignal{
		{SignalType: "interest", Text: "Japanese history", NormalizedValue: "japanese_history", Weight: 0.95, Confidence: 0.9},
		{SignalType: "desired_experience", Text: "disciplined long-term practice", NormalizedValue: "disciplined_practice", Weight: 0.82, Confidence: 0.8},
		{SignalType: "desired_experience", Text: "meaningful hobby", NormalizedValue: "meaningful_hobby", Weight: 0.71, Confidence: 0.7},
	}

	results, err := retrieval.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20})
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}

	if len(results) == 0 {
		t.Fatal("no results returned")
	}

	// Check that Japanese martial arts hobbies appear in top 20
	japaneseHobbies := map[string]bool{
		"kendo": false, "kenjutsu": false, "kyudo": false,
	}
	for _, r := range results {
		slug := strings.ToLower(r.HobbyName)
		for key := range japaneseHobbies {
			if strings.Contains(slug, key) {
				japaneseHobbies[key] = true
			}
		}
	}

	found := 0
	for name, ok := range japaneseHobbies {
		if ok {
			found++
		} else {
			t.Logf("Japanese hobby not found in top 20: %s", name)
		}
	}
	if found == 0 {
		t.Error("no Japanese martial arts hobbies found in top 20 results")
		for i, r := range results {
			t.Logf("  #%d: %s (score: %.4f)", i+1, r.HobbyName, r.FinalScore)
		}
	}

	// Verify each result has exactly 3 reasons and 1 caution
	for _, r := range results {
		if len(r.Reasons) != 3 {
			t.Errorf("hobby %s has %d reasons, want 3", r.HobbyName, len(r.Reasons))
		}
		if r.Caution == "" {
			t.Errorf("hobby %s has no caution", r.HobbyName)
		}
	}
}

func TestAcceptance_ExploreFilterPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	hobbyRepo, _ := seedAndPrepare(t)

	max := 0.5
	filter := repo.ListFilter{
		StartupCostMax:    &max,
		PhysicalDemandMax: &max,
		Limit:             50,
	}

	hobbies, err := hobbyRepo.List(context.Background(), filter)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(hobbies) == 0 {
		t.Error("no hobbies matched filter")
	}

	for _, h := range hobbies {
		if h.Dimensions["startup_cost"] > 0.5 {
			t.Errorf("hobby %s has startup_cost %.2f > 0.5", h.Name, h.Dimensions["startup_cost"])
		}
		if h.Dimensions["physical_demand"] > 0.5 {
			t.Errorf("hobby %s has physical_demand %.2f > 0.5", h.Name, h.Dimensions["physical_demand"])
		}
	}
}

func TestAcceptance_CompareHobbies(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	hobbyRepo, _ := seedAndPrepare(t)

	hobbies, err := hobbyRepo.List(context.Background(), repo.ListFilter{Limit: 3})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(hobbies) < 2 {
		t.Fatal("need at least 2 hobbies for compare")
	}

	for _, h := range hobbies {
		radar := domain.ComputeRadar(h.Dimensions)
		if radar.Commitment == 0 && radar.Cost == 0 && radar.Body == 0 {
			t.Errorf("hobby %s has all-zero radar", h.Name)
		}
	}
}

func TestAcceptance_FTSSearchReturnsRelevantResults(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	hobbyRepo, _ := seedAndPrepare(t)

	results, err := hobbyRepo.SearchFTS(context.Background(), "painting", 10)
	if err != nil {
		t.Fatalf("SearchFTS: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("no FTS results for 'painting'")
	}

	// At least one result should be oil painting or watercolor
	foundPainting := false
	for _, r := range results {
		hobby, _ := hobbyRepo.GetByID(context.Background(), r.ID)
		if hobby != nil && strings.Contains(strings.ToLower(hobby.Name), "paint") {
			foundPainting = true
			break
		}
	}
	if !foundPainting {
		t.Error("FTS search for 'painting' didn't return a painting hobby")
	}
}

func TestAcceptance_RuleBasedExtractor(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	hobbyRepo, graphRepo := seedAndPrepare(t)
	retrieval := service.NewRetrievalService(hobbyRepo, graphRepo)

	// Simulate what the full pipeline does: rule-based extraction -> recommend
	ext := &mockRuleExtractor{}
	signals, err := ext.extract("I love Japanese history and want something disciplined and meaningful")
	if err != nil {
		t.Fatalf("extract: %v", err)
	}
	if len(signals) == 0 {
		t.Fatal("no signals extracted")
	}

	results, err := retrieval.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20})
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("no results from rule-based -> recommend pipeline")
	}

	t.Logf("Rule-based pipeline returned %d results, top: %s (%.4f)", len(results), results[0].HobbyName, results[0].FinalScore)
}

type mockRuleExtractor struct{}

func (e *mockRuleExtractor) extract(text string) ([]domain.MemorySignal, error) {
	lower := strings.ToLower(text)
	var signals []domain.MemorySignal

	interestKeywords := []string{"interested in", "love", "enjoy", "fascinated by", "passionate about", "like"}
	for _, kw := range interestKeywords {
		idx := strings.Index(lower, kw)
		if idx >= 0 {
			after := strings.TrimSpace(text[idx+len(kw):])
			end := strings.IndexAny(after, ",.\n;")
			if end < 0 || end > 60 {
				end = len(after)
				if end > 60 {
					end = 60
				}
			}
			phrase := strings.TrimSpace(after[:end])
			if phrase != "" {
				signals = append(signals, domain.MemorySignal{
					SignalType:      "interest",
					Text:            phrase,
					NormalizedValue: strings.ReplaceAll(strings.ToLower(phrase), " ", "_"),
					Weight:          0.85,
					Confidence:      0.7,
				})
			}
		}
	}

	goalKeywords := map[string]string{
		"meaningful": "meaningful_hobby",
		"disciplined": "disciplined_practice",
	}
	for kw, nv := range goalKeywords {
		if strings.Contains(lower, kw) {
			signals = append(signals, domain.MemorySignal{
				SignalType:      "desired_experience",
				Text:            kw,
				NormalizedValue: nv,
				Weight:          0.8,
				Confidence:      0.65,
			})
		}
	}

	return signals, nil
}
