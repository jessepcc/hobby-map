package domain

type Hobby struct {
	ID                string
	Slug              string
	Name              string
	ShortDesc         string
	LongDesc          string
	DifficultySummary string
	StarterPath       string
	Popularity        float64
	Dimensions        map[string]float64
	Aliases           []string
}
