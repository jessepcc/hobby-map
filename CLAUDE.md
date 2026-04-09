# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hobby-Map recommends hobbies based on user-provided text (memories, interests, lifestyle descriptions). It uses a knowledge graph of hobbies and concepts with hybrid search and multi-factor scoring to rank recommendations.

**Two modes:**
- **Production (deployed):** Pure client-side JS on Cloudflare Pages. The browser loads seed JSON directly and runs all search/ranking logic (vector similarity via Transformers.js, text matching, graph traversal, RRF fusion) locally.
- **Development:** Go backend with SQLite + FTS5 for prototyping search algorithms, seeding data, and running integration tests.

## Commands

### Development (Go backend)

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

### Deployment (Cloudflare Pages)

```bash
npm run build:static       # Copy web/ + seeds/ → dist/
npm run deploy:cloudflare  # Build + wrangler pages deploy
```

## Architecture

### Deployed (client-side JS)

```
web/
  index.html               Vanilla JS SPA (hash routing: #/explore, #/match, #/compare)
  app.js                   Main app, routing, UI rendering, radar charts (Chart.js)
  static-api.js            Client-side search: loads seed JSON, FTS matching, graph BFS, RRF fusion, multi-factor scoring
  explore-ranking.js        Explore page ranking/filtering logic
  embedding.js             In-browser vector embeddings via Transformers.js
  style.css                Styles
  thumbnails/              Hobby hero images

seeds/                     JSON seed data (~223 hobbies, ~500 concepts, ~6500 edges)
scripts/build-static.mjs   Copies web/ + seeds/ into dist/ for deployment
wrangler.toml              Cloudflare Pages config (pages_build_output_dir = ./dist)
```

### Development (Go backend)

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
```

## Key Data Flow: Recommendation Pipeline

**Production (browser):**
1. User text → client-side signal extraction (rule-based keyword matching)
2. Signals → in-browser vector search (Transformers.js) + text matching + graph BFS → RRF merge → multi-factor scoring → ranked results with radar charts

**Development (Go):**
1. User text → `POST /api/memory/extract` → LLM or rule-based signal extraction
2. Signals → `POST /api/recommend` → FTS search + graph BFS expansion → RRF merge → multi-factor scoring → ranked results with radar charts

## Scoring Weights

Client-side (`web/static-api.js`): Vector: 0.28, FTS: 0.30, Graph: 0.14, Dimension: 0.12, Outcome: 0.10, Novelty: 0.06, Barrier: 0.10

Go backend (`search/ranking.go`): Vector: 0.28, FTS: 0.14, Graph: 0.24, Dimension: 0.16, Outcome: 0.10, Novelty: 0.08, Barrier: 0.15

## Radar Axes (domain/radar.go)

6 composite axes derived from 15 raw dimensions (all normalized 0.0–1.0):
Commitment, Cost, Body, Environment, Social, Depth

## Database (development only)

SQLite with FTS5. Schema in `internal/sqlite/migrations/`. Key tables: nodes, edges, hobbies, hobby_dimensions, memory_sessions, memory_signals. Two FTS tables: hobby_fts, node_fts.

## Testing Conventions

- In-memory SQLite via `testutil.NewTestDB(t)`
- Integration tests skip with `-short` flag: `if testing.Short() { t.Skip() }`
- Table-driven tests where applicable
- HTTP tests use `httptest.NewRecorder()` with seeded test DB
- Client-side: `web/explore-ranking.test.js`

## Environment Variables

See `.env.example`. LLM_API_KEY is optional—falls back to rule-based extractor.
