package search

import "hobby-map/internal/domain"

// Score weights per spec
const (
	WtVector    = 0.28
	WtFTS       = 0.14
	WtGraph     = 0.24
	WtDimension = 0.16
	WtOutcome   = 0.10
	WtNovelty   = 0.08
	WtBarrier   = 0.15
)

// ComputeFinalScore applies the spec's weighted formula and sets c.FinalScore.
func ComputeFinalScore(c *domain.CandidateScore) float64 {
	c.FinalScore = WtVector*c.VectorScore +
		WtFTS*c.FTSScore +
		WtGraph*c.GraphScore +
		WtDimension*c.DimensionScore +
		WtOutcome*c.OutcomeScore +
		WtNovelty*c.NoveltyScore -
		WtBarrier*c.BarrierPenalty
	return c.FinalScore
}

// ComputeDimensionScore checks how well hobby dimensions match user constraint signals.
func ComputeDimensionScore(signals []domain.MemorySignal, hobbyDims map[string]float64) float64 {
	// Map known constraint normalized values to dimension keys and whether low is good
	constraintMap := map[string]struct {
		dims    []string
		lowGood bool
	}{
		"low_cost":       {dims: []string{"startup_cost", "ongoing_cost"}, lowGood: true},
		"low_time":       {dims: []string{"time_per_session", "consistency_required"}, lowGood: true},
		"low_physical":   {dims: []string{"physical_demand"}, lowGood: true},
		"low_space":      {dims: []string{"space_required"}, lowGood: true},
		"solo_friendly":  {dims: []string{"social_dependency"}, lowGood: true},
		"high_creative":  {dims: []string{"creative_expression"}, lowGood: false},
		"high_longevity": {dims: []string{"age_longevity"}, lowGood: false},
		"portable":       {dims: []string{"portability"}, lowGood: false},
	}

	var totalScore float64
	var totalWeight float64

	for _, sig := range signals {
		if sig.SignalType != "lifestyle_constraint" {
			continue
		}
		cm, ok := constraintMap[sig.NormalizedValue]
		if !ok {
			continue
		}
		for _, dimKey := range cm.dims {
			val, exists := hobbyDims[dimKey]
			if !exists {
				continue
			}
			var match float64
			if cm.lowGood {
				match = 1.0 - val // Lower dimension value = better match
			} else {
				match = val // Higher dimension value = better match
			}
			totalScore += match * sig.Weight
			totalWeight += sig.Weight
		}
	}

	if totalWeight == 0 {
		return 0.5 // Neutral when no constraints
	}
	return totalScore / totalWeight
}
