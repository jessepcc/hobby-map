package service

import (
	"context"
	"sort"
	"strings"

	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
	"hobby-map/internal/search"
)

type RetrievalService struct {
	hobbies *repo.HobbyRepo
	graph   *repo.GraphRepo
}

func NewRetrievalService(hobbies *repo.HobbyRepo, graph *repo.GraphRepo) *RetrievalService {
	return &RetrievalService{hobbies: hobbies, graph: graph}
}

func (s *RetrievalService) Recommend(ctx context.Context, signals []domain.MemorySignal, filter repo.ListFilter) ([]domain.CandidateScore, error) {
	// Step 1: Build search query from signals
	var queryParts []string
	for _, sig := range signals {
		queryParts = append(queryParts, sig.Text)
	}
	query := strings.Join(queryParts, " OR ")

	// Step 2: FTS search
	ftsResults, err := s.hobbies.SearchFTS(ctx, query, 100)
	if err != nil {
		ftsResults = nil // Non-fatal: continue with other channels
	}

	// Step 3: Graph expansion — find concept nodes via FTS on node_fts, then expand
	graphResults := s.expandViaGraph(ctx, signals)

	// Step 4: RRF merge (no vector channel for now)
	merged := search.RRFMerge(ftsResults, graphResults, nil, 60)

	// Step 5: Score and rank top candidates
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if len(merged) > 100 {
		merged = merged[:100]
	}

	var candidates []domain.CandidateScore
	for _, m := range merged {
		hobby, err := s.hobbies.GetByID(ctx, m.ID)
		if err != nil {
			continue
		}

		// Apply dimension filters to candidates
		if !passesDimFilter(hobby, filter) {
			continue
		}

		c := domain.CandidateScore{
			HobbyID:   m.ID,
			HobbyName: hobby.Name,
		}

		// Normalize RRF score to [0,1] range for FTS and graph components
		c.FTSScore = ftsScore(m.ID, ftsResults)
		c.GraphScore = graphScore(m.ID, graphResults)
		c.DimensionScore = search.ComputeDimensionScore(signals, hobby.Dimensions)
		c.OutcomeScore = computeOutcomeScore(signals, hobby)
		c.NoveltyScore = 0.5 // Default neutral novelty

		search.ComputeFinalScore(&c)

		c.Reasons = generateReasons(signals, hobby)
		c.Caution = generateCaution(hobby)

		candidates = append(candidates, c)
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].FinalScore > candidates[j].FinalScore
	})

	if len(candidates) > filter.Limit {
		candidates = candidates[:filter.Limit]
	}

	return candidates, nil
}

func (s *RetrievalService) expandViaGraph(ctx context.Context, signals []domain.MemorySignal) []repo.ScoredID {
	var conceptIDs []string
	seen := make(map[string]bool)

	for _, sig := range signals {
		ids, err := s.graph.SearchNodeFTS(ctx, sig.Text, 10)
		if err != nil {
			continue
		}
		for _, id := range ids {
			if !seen[id] {
				seen[id] = true
				conceptIDs = append(conceptIDs, id)
			}
		}
	}

	if len(conceptIDs) == 0 {
		return nil
	}

	results, err := s.graph.ExpandToHobbies(ctx, conceptIDs, 3, 100)
	if err != nil {
		return nil
	}
	return results
}

func ftsScore(id string, results []repo.ScoredID) float64 {
	for i, r := range results {
		if r.ID == id {
			return 1.0 / (1.0 + float64(i)) // Rank-based normalization
		}
	}
	return 0
}

func graphScore(id string, results []repo.ScoredID) float64 {
	for _, r := range results {
		if r.ID == id {
			return r.Score
		}
	}
	return 0
}

func computeOutcomeScore(signals []domain.MemorySignal, hobby *domain.Hobby) float64 {
	// Simple heuristic: check if any desired_experience signals align with hobby description
	score := 0.0
	for _, sig := range signals {
		if sig.SignalType == "desired_experience" {
			if strings.Contains(strings.ToLower(hobby.LongDesc), strings.ToLower(sig.Text)) {
				score += sig.Weight
			}
		}
	}
	if score > 1.0 {
		score = 1.0
	}
	return score
}

func generateReasons(signals []domain.MemorySignal, hobby *domain.Hobby) []string {
	var reasons []string
	for _, sig := range signals {
		if sig.SignalType == "interest" && len(reasons) < 3 {
			reasons = append(reasons, "Matches your interest in "+sig.Text)
		}
	}
	if len(reasons) < 3 && hobby.DifficultySummary != "" {
		reasons = append(reasons, hobby.DifficultySummary)
	}
	for len(reasons) < 3 {
		reasons = append(reasons, "Aligns with your preferences")
	}
	return reasons[:3]
}

func generateCaution(hobby *domain.Hobby) string {
	dims := hobby.Dimensions
	if dims["startup_cost"] > 0.7 {
		return "Higher initial investment required"
	}
	if dims["physical_demand"] > 0.7 {
		return "Physically demanding — start gradually"
	}
	if dims["space_required"] > 0.7 {
		return "Requires dedicated space"
	}
	if dims["consistency_required"] > 0.7 {
		return "Needs regular practice to progress"
	}
	return "Results take time — be patient"
}

func passesDimFilter(h *domain.Hobby, f repo.ListFilter) bool {
	d := h.Dimensions
	if f.StartupCostMax != nil && d["startup_cost"] > *f.StartupCostMax {
		return false
	}
	if f.OngoingCostMax != nil && d["ongoing_cost"] > *f.OngoingCostMax {
		return false
	}
	if f.TimePerSessionMax != nil && d["time_per_session"] > *f.TimePerSessionMax {
		return false
	}
	if f.PhysicalDemandMax != nil && d["physical_demand"] > *f.PhysicalDemandMax {
		return false
	}
	if f.SpaceRequiredMax != nil && d["space_required"] > *f.SpaceRequiredMax {
		return false
	}
	if f.SocialDependencyMax != nil && d["social_dependency"] > *f.SocialDependencyMax {
		return false
	}
	return true
}
