package domain

type MemorySession struct {
	ID            string
	Source        string
	RawText       string
	ExtractedJSON string
	CreatedAt     string
}

type MemorySignal struct {
	ID              string
	MemorySessionID string
	SignalType      string // interest, lifestyle_constraint, desired_experience
	Text            string
	NormalizedValue string
	Weight          float64
	Confidence      float64
	Metadata        map[string]any
}
