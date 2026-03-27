package domain

import (
	"math"
	"testing"
)

func TestComputeRadar(t *testing.T) {
	dims := map[string]float64{
		"time_per_session":          0.65,
		"consistency_required":      0.45,
		"startup_cost":              0.5,
		"ongoing_cost":              0.45,
		"gear_dependency":           0.6,
		"physical_demand":           0.3,
		"injury_risk":               0.25,
		"space_required":            0.35,
		"portability":               0.3,
		"social_dependency":         0.15,
		"learning_curve":            0.55,
		"first_win_difficulty":      0.5,
		"age_longevity":             0.85,
		"creative_expression":       0.95,
		"historical_cultural_depth": 0.9,
	}

	r := ComputeRadar(dims)

	assertClose(t, "Commitment", r.Commitment, 0.55)
	assertClose(t, "Cost", r.Cost, 0.5167)
	assertClose(t, "Body", r.Body, 0.275)
	assertClose(t, "Environment", r.Environment, 0.525)
	assertClose(t, "Social", r.Social, 0.15)
	assertClose(t, "Depth", r.Depth, 0.75)
}

func assertClose(t *testing.T, name string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.01 {
		t.Errorf("%s: got %.4f, want %.4f", name, got, want)
	}
}
