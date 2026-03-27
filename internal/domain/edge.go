package domain

type Edge struct {
	ID         string
	FromNodeID string
	ToNodeID   string
	Type       string
	Weight     float64
	Metadata   map[string]any
}
