package repo

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"

	"hobby-map/internal/domain"
)

type MemoryRepo struct {
	db *sql.DB
}

func NewMemoryRepo(db *sql.DB) *MemoryRepo {
	return &MemoryRepo{db: db}
}

func (r *MemoryRepo) CreateSession(ctx context.Context, source, rawText string) (string, error) {
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO memory_sessions (id, source, raw_text) VALUES (?, ?, ?)",
		id, source, rawText)
	if err != nil {
		return "", fmt.Errorf("create session: %w", err)
	}
	return id, nil
}

func (r *MemoryRepo) SaveSignals(ctx context.Context, sessionID string, signals []domain.MemorySignal) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx,
		"INSERT INTO memory_signals (id, memory_session_id, signal_type, text, normalized_value, weight, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, s := range signals {
		id := s.ID
		if id == "" {
			id = uuid.New().String()
		}
		if _, err := stmt.ExecContext(ctx, id, sessionID, s.SignalType, s.Text, s.NormalizedValue, s.Weight, s.Confidence); err != nil {
			return fmt.Errorf("save signal: %w", err)
		}
	}
	return tx.Commit()
}

func (r *MemoryRepo) GetSignals(ctx context.Context, sessionID string) ([]domain.MemorySignal, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, memory_session_id, signal_type, text, normalized_value, weight, confidence FROM memory_signals WHERE memory_session_id = ?",
		sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var signals []domain.MemorySignal
	for rows.Next() {
		var s domain.MemorySignal
		if err := rows.Scan(&s.ID, &s.MemorySessionID, &s.SignalType, &s.Text, &s.NormalizedValue, &s.Weight, &s.Confidence); err != nil {
			return nil, err
		}
		signals = append(signals, s)
	}
	return signals, rows.Err()
}
