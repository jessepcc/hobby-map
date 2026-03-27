package domain

// RadarAxes maps the 15 raw dimensions to 6 user-facing axes per spec.
type RadarAxes struct {
	Commitment  float64 `json:"commitment"`
	Cost        float64 `json:"cost"`
	Body        float64 `json:"body"`
	Environment float64 `json:"environment"`
	Social      float64 `json:"social"`
	Depth       float64 `json:"depth"`
}

// ComputeRadar derives 6 radar axes from raw hobby dimensions.
func ComputeRadar(dims map[string]float64) RadarAxes {
	return RadarAxes{
		Commitment:  avg(dims["time_per_session"], dims["consistency_required"]),
		Cost:        avg(dims["startup_cost"], dims["ongoing_cost"], dims["gear_dependency"]),
		Body:        avg(dims["physical_demand"], dims["injury_risk"]),
		Environment: avg(dims["space_required"], 1.0-dims["portability"]),
		Social:      dims["social_dependency"],
		Depth:       avg(dims["learning_curve"], dims["first_win_difficulty"], dims["age_longevity"], dims["creative_expression"], dims["historical_cultural_depth"]),
	}
}

func avg(vals ...float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	var sum float64
	for _, v := range vals {
		sum += v
	}
	return sum / float64(len(vals))
}
