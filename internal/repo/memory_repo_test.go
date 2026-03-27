package repo_test

import (
	"context"
	"testing"

	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
	"hobby-map/internal/testutil"
)

func TestMemoryRepo_CreateAndGet(t *testing.T) {
	db := testutil.TestDB(t)
	r := repo.NewMemoryRepo(db)
	ctx := context.Background()

	sessionID, err := r.CreateSession(ctx, "manual_paste", "I like Japanese history")
	if err != nil {
		t.Fatalf("CreateSession: %v", err)
	}

	signals := []domain.MemorySignal{
		{ID: "s1", SignalType: "interest", Text: "Japanese history", NormalizedValue: "japanese_history", Weight: 0.95, Confidence: 0.9},
	}
	if err := r.SaveSignals(ctx, sessionID, signals); err != nil {
		t.Fatalf("SaveSignals: %v", err)
	}

	got, err := r.GetSignals(ctx, sessionID)
	if err != nil {
		t.Fatalf("GetSignals: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0].Text != "Japanese history" {
		t.Errorf("text = %q", got[0].Text)
	}
}
