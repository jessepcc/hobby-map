package service

import (
	"context"
	"fmt"

	"hobby-map/internal/domain"
	"hobby-map/internal/llm"
	"hobby-map/internal/repo"
)

type MemoryService struct {
	extractor llm.Extractor
	memRepo   *repo.MemoryRepo
}

func NewMemoryService(ext llm.Extractor, memRepo *repo.MemoryRepo) *MemoryService {
	return &MemoryService{extractor: ext, memRepo: memRepo}
}

func (s *MemoryService) ExtractAndSave(ctx context.Context, source, text string) (string, []domain.MemorySignal, error) {
	signals, err := s.extractor.ExtractSignals(ctx, text)
	if err != nil {
		return "", nil, fmt.Errorf("extract signals: %w", err)
	}

	sessionID, err := s.memRepo.CreateSession(ctx, source, text)
	if err != nil {
		return "", nil, fmt.Errorf("create session: %w", err)
	}

	if err := s.memRepo.SaveSignals(ctx, sessionID, signals); err != nil {
		return "", nil, fmt.Errorf("save signals: %w", err)
	}

	return sessionID, signals, nil
}
