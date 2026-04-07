package domain

type Node struct {
	ID          string
	Type        string
	Slug        string
	Name        string
	NameZH      string
	Description string
	Metadata    map[string]any
}
