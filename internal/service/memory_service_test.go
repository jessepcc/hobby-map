package service_test

import (
	"context"
	"testing"

	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
	"hobby-map/internal/service"
	"hobby-map/internal/testutil"
)

type stubExtractor struct{}

func (s *stubExtractor) ExtractSignals(_ context.Context, text string) ([]domain.MemorySignal, error) {
	return []domain.MemorySignal{
		{SignalType: "interest", Text: "Japanese history", NormalizedValue: "japanese_history", Weight: 0.95, Confidence: 0.9},
		{SignalType: "desired_experience", Text: "meaningful hobby", NormalizedValue: "meaningful_hobby", Weight: 0.8, Confidence: 0.85},
	}, nil
}

func TestMemoryService_ExtractAndSave(t *testing.T) {
	db := testutil.TestDB(t)
	memRepo := repo.NewMemoryRepo(db)
	svc := service.NewMemoryService(&stubExtractor{}, memRepo)

	session, signals, err := svc.ExtractAndSave(context.Background(), "manual_paste", "I like Japanese history and want something meaningful")
	if err != nil {
		t.Fatalf("ExtractAndSave: %v", err)
	}
	if session == "" {
		t.Fatal("empty session ID")
	}
	if len(signals) != 2 {
		t.Fatalf("len = %d, want 2", len(signals))
	}
	if signals[0].SignalType != "interest" {
		t.Errorf("signal type = %q", signals[0].SignalType)
	}
}
