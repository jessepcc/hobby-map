package domain

type Node struct {
	ID          string
	Type        string
	Slug        string
	Name        string
	Description string
	Metadata    map[string]any
}
