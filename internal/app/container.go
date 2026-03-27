package app

import (
	"hobby-map/internal/repo"
	"hobby-map/internal/service"
)

type Dependencies struct {
	HobbyRepo *repo.HobbyRepo
	GraphRepo *repo.GraphRepo
	MemRepo   *repo.MemoryRepo
	Retrieval *service.RetrievalService
	Memory    *service.MemoryService
}
