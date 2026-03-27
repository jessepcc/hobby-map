package llm

import (
	"context"

	"hobby-map/internal/domain"
)

// Extractor parses raw memory text into structured signals.
type Extractor interface {
	ExtractSignals(ctx context.Context, text string) ([]domain.MemorySignal, error)
}
