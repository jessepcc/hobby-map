package domain

type CandidateScore struct {
	HobbyID        string
	HobbyName      string
	VectorScore    float64
	FTSScore       float64
	GraphScore     float64
	DimensionScore float64
	OutcomeScore   float64
	NoveltyScore   float64
	BarrierPenalty float64
	FinalScore     float64
	Reasons        []string
	Caution        string
}

type RecommendationRun struct {
	ID              string
	MemorySessionID string
	FiltersJSON     string
	RankingVersion  string
	Results         []CandidateScore
	CreatedAt       string
}

type ExploreFilter struct {
	Query               string
	StartupCostMax      *float64
	OngoingCostMax      *float64
	TimePerSessionMax   *float64
	PhysicalDemandMax   *float64
	SpaceRequiredMax    *float64
	SocialDependencyMax *float64
	Limit               int
	Offset              int
}
