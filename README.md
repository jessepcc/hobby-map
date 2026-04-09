# HobbyMap

Discover hobbies that match your interests, lifestyle, and goals from 200+ activities. Enter a short personal profile and get ranked recommendations with radar charts.

**Live site runs entirely in the browser** — no backend required. Search, ranking, and vector embeddings all happen client-side.

## How It Works

1. You describe your interests, memories, or lifestyle in free text
2. The app extracts signals (interests, constraints, goals) via rule-based parsing
3. Three search channels run in parallel:
   - **Vector similarity** — in-browser embeddings via Transformers.js
   - **Text search** — substring + token matching with length-weighted scoring
   - **Graph traversal** — BFS through ~500 concepts and ~6500 edges (2-hop, weight-decay, cycle-aware)
4. Channels merge via **Reciprocal Rank Fusion** (RRF)
5. Final ranking uses 7 weighted factors (vector, text, graph, dimension fit, outcome, novelty, barrier) and displays results with radar charts

## Stack

- **Production:** Vanilla JS SPA on Cloudflare Pages — loads seed JSON directly, runs all search/ranking in-browser
- **Development:** Go backend (SQLite + FTS5, Chi router) for prototyping search algorithms and running integration tests

## Repo Layout

```
web/                     Browser app (hash routing: #/explore, #/match, #/compare)
  app.js                 Main app, routing, UI, radar charts (Chart.js)
  static-api.js          Client-side search engine: FTS, graph BFS, RRF fusion
  embedding.js           In-browser vector embeddings (Transformers.js)
  explore-ranking.js     Explore page ranking/filtering
seeds/                   ~223 hobbies, ~500 concepts, ~6500 edges (JSON)

cmd/api/                 Go API server (development)
cmd/seed/                Seed loader CLI
internal/                Go backend: repo, service, search, LLM, HTTP handlers
scripts/                 Build utilities
```

## Local Development

1. Copy `.env.example` to `.env` (API keys are optional — falls back to rule-based extraction)
2. `npm install`
3. `make run` — starts Go server at http://localhost:8080

```bash
make test          # Run all Go tests
make test-short    # Skip integration tests
make seed          # Reseed database
make clean         # Delete hobby-map.db
```

## Deployment

Deployed as a static site on Cloudflare Pages:

```bash
npm run build:static       # Copy web/ + seeds/ → dist/
npm run deploy:cloudflare  # Build + deploy to Cloudflare Pages
```
