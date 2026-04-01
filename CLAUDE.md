# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hobby-Map is a Go web application that recommends hobbies based on user-provided text (memories, interests, lifestyle descriptions). It uses a knowledge graph of hobbies and concepts with hybrid search (FTS5 + graph traversal + RRF fusion) to rank recommendations.

## Commands

```bash
make run          # Start HTTP server (localhost:8080)
make seed         # Reseed database from seeds/ JSON files
make test         # Run all tests (-v -count=1)
make test-short   # Skip integration tests (-short flag)
make clean        # Delete hobby-map.db

# Run a single test
go test ./internal/repo -run TestHobbyRepo_SearchFTS -v -count=1
```

The server auto-seeds the database on first run if it's empty.

## Architecture

Go module: `hobby-map` (Go 1.25, SQLite via modernc.org/sqlite, chi router)

```
cmd/api/main.go          Entry point: config → DB → repos → services → router
cmd/seed/main.go         Standalone seeder CLI

internal/
  app/                   Config loading, Dependencies container (DI)
  domain/                Pure models: Hobby, Node, Edge, Dimension, Memory, Radar
  repo/                  SQL repositories: HobbyRepo, GraphRepo, MemoryRepo
  service/               Business logic: RetrievalService, MemoryService
  search/                RRF fusion and multi-factor scoring (7 weighted components)
  llm/                   Extractor interface with Anthropic and rule-based impls
  http/                  Chi router, handlers (explore, compare, memory, recommend)
  sqlite/                DB setup, pragmas (WAL mode), embedded migrations
  seed/                  JSON seed loader
  testutil/              In-memory SQLite helper, test fixtures

web/                     Vanilla JS SPA (hash routing: #/explore, #/match, #/compare)
seeds/                   JSON seed data (~223 hobbies, ~500 concepts, ~6500 edges)
scripts/                 Node.js utilities for seed data assembly/validation
```

## Key Data Flow: Recommendation Pipeline

1. User text → `POST /api/memory/extract` → LLM or rule-based signal extraction
2. Signals → `POST /api/recommend` → FTS search + graph BFS expansion → RRF merge → multi-factor scoring → ranked results with radar charts

## Scoring Weights (search/ranking.go)

Vector: 0.28, FTS: 0.14, Graph: 0.24, Dimension: 0.16, Outcome: 0.10, Novelty: 0.08, Barrier: 0.15

## Radar Axes (domain/radar.go)

6 composite axes derived from 15 raw dimensions (all normalized 0.0–1.0):
Commitment, Cost, Body, Environment, Social, Depth

## Database

SQLite with FTS5. Schema in `internal/sqlite/migrations/`. Key tables: nodes, edges, hobbies, hobby_dimensions, memory_sessions, memory_signals. Two FTS tables: hobby_fts, node_fts.

## Testing Conventions

- In-memory SQLite via `testutil.NewTestDB(t)`
- Integration tests skip with `-short` flag: `if testing.Short() { t.Skip() }`
- Table-driven tests where applicable
- HTTP tests use `httptest.NewRecorder()` with seeded test DB

## Environment Variables

See `.env.example`. LLM_API_KEY is optional—falls back to rule-based extractor.
