package search_test

import (
	"testing"

	"hobby-map/internal/domain"
	"hobby-map/internal/search"
)

func TestComputeFinalScore(t *testing.T) {
	c := domain.CandidateScore{
		VectorScore:    0.8,
		FTSScore:       0.6,
		GraphScore:     0.7,
		DimensionScore: 0.5,
		OutcomeScore:   0.4,
		NoveltyScore:   0.3,
		BarrierPenalty: 0.1,
	}

	score := search.ComputeFinalScore(&c)

	// 0.28*0.8 + 0.14*0.6 + 0.24*0.7 + 0.16*0.5 + 0.10*0.4 + 0.08*0.3 - 0.15*0.1
	// = 0.224 + 0.084 + 0.168 + 0.08 + 0.04 + 0.024 - 0.015 = 0.605
	assertNear(t, "final", score, 0.605)
	assertNear(t, "candidate", c.FinalScore, 0.605)
}

func TestComputeDimensionScore(t *testing.T) {
	signals := []domain.MemorySignal{
		{SignalType: "lifestyle_constraint", NormalizedValue: "low_cost", Weight: 0.9},
	}
	dims := map[string]float64{
		"startup_cost": 0.2,
		"ongoing_cost": 0.15,
	}
	score := search.ComputeDimensionScore(signals, dims)
	if score < 0.5 {
		t.Errorf("expected high dimension score for low-cost hobby matching low_cost constraint, got %f", score)
	}
}
