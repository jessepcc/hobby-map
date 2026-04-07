## Overview
A no-survey memory-to-hobby matcher with SQLite as the single source of truth, FTS5 for keyword search, and `sqlite-vec` for semantic recall and hybrid ranking. [formester](https://formester.com/templates/discover-a-new-hobby-quiz-2217/)
That fits your product direction because you explicitly prioritize memory-paste personalization over questionnaire flows, treating exploration as a lightweight secondary tool rather than the main event.

## Product scope
- Product name placeholder: `hobby-map`.
- Core promise: “Paste what matters to you, then see hobbies that fit your life and mindset.”
- Primary modes:
- `Match`: (Default) Paste memory, extract signals, show ranked hobbies, and inspect a compact radar plus themed reasons.
- `Explore`: (Secondary) Browse nearby alternatives manually after results.
- `Filter`: narrow by cost, time, physical demand, space, social level, and age longevity.
- `Compare`: compare 2 to 4 hobbies across dimensions, barriers, and outcomes.

### MVP goals
- A user can paste their memory to discover a matching hobby in under 3 minutes.
- A user can understand why a hobby matched through explanation-rich results.
- A user can save or dismiss hobbies.
- A user can compare at least 2 hobbies visually.

### Non-goals for V1
- No social network.
- No booking marketplace.
- No user-generated graph editing.
- No heavy collaborative cloud backend.
- No complex survey engine.

## Target Audience & Positioning
- **Primary audience**: Adults 30–50 with stable income and changing social rhythms, who want a hobby that gives them identity, progress, and personal satisfaction outside work. Broadly defined as **stable professionals in a life-transition gap**.
- **Core situation**: Life is no longer chaotic in the old way, but it is also less socially automatic, so they want something meaningful to grow into.
- **Core job-to-be-done**: "Help me find a hobby I can realistically sustain and feel proud of."

### Tone & Branding
The product is fundamentally an **identity and meaning** product, not just a hobby picker.
- **Themes**: "Next chapter", "Something that is yours", "A life beyond work", "Progress without pressure", "Find your thing."
- **Cautions**: 
  - Do not make the app sound bitter toward marriage, kids, or friends moving on.
  - Do not over-index entirely on "achievement" (incorporate needs for calm, ritual, and belonging).
  - Do not assume the same story across all ages/genders—the emotional drivers look similar, but the language and hobby choices may differ.
  - Do not build for mid-age abstractly. Build for the specific moment: *“My life is stable, but I need something that is mine.”*

## User flows
- `Flow 1: Memory match (Default)` — Paste memory -> extract signals into 3 themed buckets -> show ranked hobbies -> view compact radar + themed reasons.
- `Flow 2: Browse manually` — open app, adjust filters, browse hobbies, click a hobby, inspect details, save shortlist. (Acts as a "browse nearby alternatives" support feature).
- `Flow 3: Compare` — select up to 4 hobbies, view radar/table comparison, inspect “why fit” and “why may fail.”

## Screens and behavior
- `Home`: Just two entry points: **Paste memory** and **Browse manually**.
- `Memory Result`: Extracted memory is shown as 3 themed buckets (**Interests**, **Lifestyle constraints**, **Desired experience**). The primary screen is a ranked card list with mini radar charts. Below results, a small "similar hobbies" or "adjacent matches" strip allows exploration.
- `Matched Hobby Card`: Shows the hobby name, a one-line fit summary, a 6-axis radar chart, 3 reason chips, 1 caution chip, and an expandable "Why this matched your memory" explanation (translating signals into human explanations).
- `Explore / Browse manually`: left panel has filters, main canvas shows results.
- `Compare`: user can pin up to 4 hobbies, then view radar chart, compact metric table, barriers, outcomes, and “why matched / why may fail.”
- `Saved`: shortlist plus dismissed hobbies, so the system avoids repeating bad recommendations.

### Core interactions
- **Memory Matching**: Default flow. Signals are matched to hobby dimensions and concepts.
- **6-Axis Radar**: Answers "what kind of hobby is this?" by abstracting raw database dimensions into 6 user-facing themed axes:
  - **Commitment**: time per session + consistency required.
  - **Cost**: startup cost + ongoing cost + gear dependency.
  - **Body**: physical demand + injury risk.
  - **Environment**: space required + portability.
  - **Social**: social dependency.
  - **Depth**: learning curve + first-win difficulty + age longevity + creative expression + historical/cultural depth.
- Filters are always available and applied instantly.
- Comparison is explicit, not hidden behind recommendation.
- Every recommendation should show exactly 3 positive reasons and 1 caution for consistency.

## SQLite schema
- Use plain tables for graph data, FTS5 for lexical retrieval, and `sqlite-vec` for embeddings, which matches the SQLite hybrid-search pattern. [formester](https://formester.com/templates/discover-a-new-hobby-quiz-2217/)
- Keep IDs as text UUIDs or ULIDs for simplicity.
- Store most dimensions in a narrow `hobby_dimensions` table instead of many nullable columns.

### Core Graph
Everything is a node, and all relationships are edges.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL, -- hobby, concept, entity, outcome, barrier, activity, audience
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  edge_type TEXT NOT NULL, -- related_to, connects_to, requires, leads_to, has_outcome, has_barrier, implies, etc.
  weight REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_edges_from ON edges(from_node_id, edge_type);
CREATE INDEX idx_edges_to   ON edges(to_node_id, edge_type);
CREATE INDEX idx_edges_pair ON edges(from_node_id, to_node_id);
```

### Hobby Extensions & Dimensions
Hobbies extend nodes to add domain-specific UI/Product data. Relationships like outcomes, barriers, and related hobbies are handled natively in the `edges` table.

```sql
CREATE TABLE hobbies (
  node_id TEXT PRIMARY KEY, -- 1:1 link to nodes.id
  short_desc TEXT NOT NULL,
  long_desc TEXT NOT NULL DEFAULT '',
  difficulty_summary TEXT NOT NULL DEFAULT '',
  starter_path TEXT NOT NULL DEFAULT '',
  popularity REAL NOT NULL DEFAULT 0.5,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE hobby_aliases (
  hobby_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (hobby_id, alias),
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE
);

CREATE TABLE dimensions (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  min_value REAL NOT NULL DEFAULT 0.0,
  max_value REAL NOT NULL DEFAULT 1.0,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE hobby_dimensions (
  hobby_id TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  PRIMARY KEY (hobby_id, dimension_id),
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE,
  FOREIGN KEY (dimension_id) REFERENCES dimensions(id) ON DELETE CASCADE
);
```

### Memory and recommendation tables
```sql
CREATE TABLE memory_sessions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL, -- claude_import, manual_paste
  raw_text TEXT NOT NULL,
  extracted_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memory_signals (
  id TEXT PRIMARY KEY,
  memory_session_id TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- interest, lifestyle_constraint, desired_experience
  text TEXT NOT NULL,
  normalized_value TEXT NOT NULL DEFAULT '',
  weight REAL NOT NULL DEFAULT 1.0,
  confidence REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (memory_session_id) REFERENCES memory_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_memory_signals_session ON memory_signals(memory_session_id, signal_type);

CREATE TABLE recommendation_runs (
  id TEXT PRIMARY KEY,
  memory_session_id TEXT,
  filters_json TEXT NOT NULL DEFAULT '{}',
  ranking_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_session_id) REFERENCES memory_sessions(id) ON DELETE SET NULL
);

CREATE TABLE recommendation_results (
  run_id TEXT NOT NULL,
  hobby_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  final_score REAL NOT NULL,
  dense_score REAL NOT NULL DEFAULT 0,
  lexical_score REAL NOT NULL DEFAULT 0,
  graph_score REAL NOT NULL DEFAULT 0,
  dimension_score REAL NOT NULL DEFAULT 0,
  outcome_score REAL NOT NULL DEFAULT 0,
  novelty_score REAL NOT NULL DEFAULT 0,
  barrier_penalty REAL NOT NULL DEFAULT 0,
  reasons_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (run_id, hobby_id),
  FOREIGN KEY (run_id) REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE
);
```

### FTS5 and vectors
```sql
-- FTS for hobbies (combines nodes + hobbies data + expanded edges)
CREATE VIRTUAL TABLE hobby_fts USING fts5(
  node_id UNINDEXED,
  name,        -- from nodes.name
  aliases,     -- aggregated from hobby_aliases
  short_desc,  -- from hobbies.short_desc
  long_desc,   -- from hobbies.long_desc
  concepts,    -- aggregated from edges + nodes
  entities,    -- aggregated from edges + nodes
  tokenize = 'unicode61'
);

-- Searchable text for non-hobby nodes (concepts, entities)
CREATE VIRTUAL TABLE node_fts USING fts5(
  node_id UNINDEXED,
  name,
  description,
  tokenize = 'unicode61'
);
```

- For vectors, `sqlite-vec` setup varies by build and binding, but with the Entity Extension pattern, we can use a single vector table for all nodes (hobbies, concepts, entities). [formester](https://formester.com/templates/discover-a-new-hobby-quiz-2217/)

```sql
-- Conceptual shape; adapt to sqlite-vec syntax in the Go binding you choose.
-- Unified vector space for ALL nodes (hobbies, concepts, etc.)
CREATE VIRTUAL TABLE node_vec USING vec0(
  node_rowid INTEGER PRIMARY KEY,
  node_id TEXT, -- mapping back to nodes.id
  embedding FLOAT[768]
);

CREATE VIRTUAL TABLE memory_signal_vec USING vec0(
  signal_rowid INTEGER PRIMARY KEY,
  signal_id TEXT, -- mapping back to memory_signals.id
  embedding FLOAT[768]
);
```

### Seed dimensions
```sql
INSERT INTO dimensions (id, key, label) VALUES
('d_startup_cost', 'startup_cost', 'Startup cost'),
('d_ongoing_cost', 'ongoing_cost', 'Ongoing cost'),
('d_time_per_session', 'time_per_session', 'Time per session'),
('d_consistency_required', 'consistency_required', 'Consistency required'),
('d_physical_demand', 'physical_demand', 'Physical demand'),
('d_space_required', 'space_required', 'Space required'),
('d_social_dependency', 'social_dependency', 'Social dependency'),
('d_learning_curve', 'learning_curve', 'Learning curve'),
('d_first_win_difficulty', 'first_win_difficulty', 'First win difficulty'),
('d_age_longevity', 'age_longevity', 'Age longevity'),
('d_gear_dependency', 'gear_dependency', 'Gear dependency'),
('d_portability', 'portability', 'Portability'),
('d_injury_risk', 'injury_risk', 'Injury risk'),
('d_creative_expression', 'creative_expression', 'Creative expression'),
('d_historical_cultural_depth', 'historical_cultural_depth', 'Historical/cultural depth');
```

## Ranking and retrieval
- Retrieval should be multi-channel: `FTS5`, `vector`, and `graph expansion`, then fuse the candidate sets. [learn.microsoft](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking)
- Keep graph traversal in Go, not SQL, for V1; SQLite stores the edges, Go computes shallow path scores.
- Use RRF for recall fusion, then a final weighted score for the top 100 candidates. [elastic](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)

### Retrieval flow
- `1.` Parse memory into signals, for example `interest: Japanese history`, `goal: meaningful hobby`, `constraint: low weekly time`.
- `2.` Embed each signal and run vector search over hobbies and optionally concept/entity nodes.
- `3.` Run FTS5 over aliases, descriptions, concepts, and entities.
- `4.` Link matched concepts/entities to the graph and expand 1 to 2 hops to hobbies.
- `5.` Merge candidates with RRF.
- `6.` Compute final score with dimensions, outcomes, and penalties.

### RRF
\[
RRF(h) = \sum_{m \in M} \frac{w_m}{k + rank_m(h)}
\]

- Suggested defaults:
- `k = 60`
- `w_vector = 1.0`
- `w_fts = 0.8`
- `w_graph = 1.2`

### Final score
\[
Score(h) = 0.28S_{vector} + 0.14S_{fts} + 0.24S_{graph} + 0.16S_{dim} + 0.10S_{outcome} + 0.08S_{novelty} - 0.15P_{barrier}
\]

### Score components
- `S_vector`: max or weighted average cosine similarity between memory signals and hobby embedding.
- `S_fts`: normalized BM25-like rank from FTS5 results.
- `S_graph`: score from linked concept/entity proximity to hobby (computed from path weights in the `edges` table).
- `S_dim`: match between inferred user constraints and explicit values in the `hobby_dimensions` table (e.g., matching a `low weekly time` signal against a low `time_per_session` value).
- `S_outcome`: boost if hobby has an `edge_type = 'has_outcome'` connecting to a node that aligns with extracted user goals.
- `S_novelty`: slight boost for adjacent but non-obvious hobbies.
- `P_barrier`: penalty scalar. Computed by checking if the hobby has an `edge_type = 'has_barrier'` connecting to an extracted user aversion, OR if it has extreme exclusionary values in `hobby_dimensions` (e.g., very high `startup_cost` when the user signals budget constraints).

### Graph score
```go
graphScore = sum(pathWeight / (1.0 + 0.35*float64(hops)))
pathWeight = product(edge.Weight)
```

- Only keep top 10 paths.
- Ignore paths longer than 3 hops.
- Ignore edges below `0.4` weight.

## Go repo layout
- Keep storage simple, domain-centric, and easy to test.

```text
hobby-map/
├─ cmd/
│  ├─ api/
│  │  └─ main.go
│  └─ seed/
│     └─ main.go
├─ internal/
│  ├─ app/
│  │  ├─ container.go
│  │  └─ config.go
│  ├─ domain/
│  │  ├─ hobby.go
│  │  ├─ node.go
│  │  ├─ edge.go
│  │  ├─ memory.go
│  │  ├─ recommendation.go
│  │  └─ dimension.go
│  ├─ sqlite/
│  │  ├─ db.go
│  │  ├─ migrations.go
│  │  └─ pragmas.go
│  ├─ repo/
│  │  ├─ hobby_repo.go
│  │  ├─ graph_repo.go
│  │  ├─ memory_repo.go
│  │  ├─ vector_repo.go
│  │  └─ recommendation_repo.go
│  ├─ service/
│  │  ├─ explore_service.go
│  │  ├─ compare_service.go
│  │  ├─ memory_service.go
│  │  ├─ linking_service.go
│  │  ├─ retrieval_service.go
│  │  ├─ ranking_service.go
│  │  └─ explain_service.go
│  ├─ embedding/
│  │  ├─ client.go
│  │  └─ cosine.go
│  ├─ llm/
│  │  ├─ client.go
│  │  ├─ extract_prompt.go
│  │  └─ schemas.go
│  ├─ search/
│  │  ├─ fts.go
│  │  ├─ vector.go
│  │  ├─ graph.go
│  │  └─ rrf.go
│  ├─ http/
│  │  ├─ router.go
│  │  ├─ handlers_explore.go
│  │  ├─ handlers_compare.go
│  │  ├─ handlers_memory.go
│  │  └─ handlers_recommend.go
│  └─ testutil/
│     ├─ fixtures.go
│     └─ sqlite.go
├─ migrations/
│  ├─ 001_init.sql
│  ├─ 002_fts.sql
│  ├─ 003_vectors.sql
│  └─ 004_seed_dimensions.sql
├─ seeds/
│  ├─ hobbies.json
│  ├─ concepts.json
│  ├─ edges.json
│  └─ dimensions.json
├─ web/
│  └─ ...frontend
├─ Makefile
├─ go.mod
└─ README.md
```

### Domain structs
```go
package domain

type Hobby struct {
	ID                  string // From nodes.id
	Slug                string // From nodes.slug
	Name                string // From nodes.name
	ShortDesc           string
	LongDesc            string
	DifficultySummary   string
	StarterPath         string
	Popularity          float64
	Dimensions          map[string]float64
	Aliases             []string
}

type Node struct {
	ID          string
	Type        string
	Slug        string
	Name        string
	Description string
	Metadata    map[string]any
}

type Edge struct {
	ID         string
	FromNodeID string
	ToNodeID   string
	Type       string
	Weight     float64
	Metadata   map[string]any
}

type MemorySignal struct {
	ID              string
	MemorySessionID string
	SignalType      string
	Text            string
	NormalizedValue string
	Weight          float64
	Confidence      float64
	Metadata        map[string]any
}

type CandidateScore struct {
	HobbyID        string
	VectorScore    float64
	FTSScore       float64
	GraphScore     float64
	DimensionScore float64
	OutcomeScore   float64
	NoveltyScore   float64
	BarrierPenalty float64
	FinalScore     float64
	Reasons        []string
}
```

### Repositories
```go
type HobbyRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Hobby, error)
	List(ctx context.Context, filter ExploreFilter) ([]domain.Hobby, error)
	SearchFTS(ctx context.Context, query string, limit int) ([]ScoredID, error)
}

type VectorRepository interface {
	UpsertNodeEmbedding(ctx context.Context, nodeID string, vec []float32) error
	SearchNodes(ctx context.Context, vec []float32, limit int) ([]ScoredID, error)
}

type GraphRepository interface {
	GetNode(ctx context.Context, id string) (*domain.Node, error)
	GetEdgesFrom(ctx context.Context, nodeID string, edgeTypes []string) ([]domain.Edge, error)
	ExpandToHobbies(ctx context.Context, nodeIDs []string, maxHops int, limit int) ([]ScoredID, error)
}

type MemoryRepository interface {
	CreateSession(ctx context.Context, source, rawText string) (string, error)
	SaveSignals(ctx context.Context, sessionID string, signals []domain.MemorySignal) error
	GetSignals(ctx context.Context, sessionID string) ([]domain.MemorySignal, error)
}
```

### Services
```go
type ExploreService struct {
	Hobbies HobbyRepository
}

type MemoryService struct {
	LLM        Extractor
	Embeddings Embedder
	MemoryRepo MemoryRepository
}

type RetrievalService struct {
	Hobbies HobbyRepository
	Vectors VectorRepository
	Graph   GraphRepository
}

type RankingService struct {
	Hobbies HobbyRepository
	Graph   GraphRepository
}
```

## API shape
- Keep the API thin and deterministic.

### Endpoints
- `GET /api/hobbies`
- `GET /api/hobbies/:id`
- `POST /api/compare`
- `POST /api/memory/extract`
- `POST /api/recommend`
- `GET /api/recommend/:runID`
- `POST /api/feedback/save`
- `POST /api/feedback/dismiss`

### Example request
```json
POST /api/memory/extract
{
  "source": "claude_import",
  "text": "I am interested in Japanese history, like disciplined long-term practice, and prefer something meaningful over flashy."
}
```

### Example extract response
```json
{
  "memorySessionId": "mem_01J...",
  "signals": [
    {"type": "interest", "text": "Japanese history", "normalizedValue": "japanese_history", "weight": 0.95},
    {"type": "trait", "text": "disciplined long-term practice", "normalizedValue": "disciplined_practice", "weight": 0.82},
    {"type": "goal", "text": "meaningful hobby", "normalizedValue": "meaningful_hobby", "weight": 0.71}
  ]
}
```

### Example recommend request
```json
POST /api/recommend
{
  "memorySessionId": "mem_01J...",
  "filters": {
    "startup_cost_max": 0.7,
    "physical_demand_max": 0.8,
    "space_required_max": 0.4
  },
  "limit": 20
}
```

## Open Source Strategy
The project is designed to be fully open-source and easy for the community to run locally.

### Licensing
- **Code:** Standard MIT License to encourage usage and contributions to the core engine.
- **Data (Seeds):** The curated `seeds/*.json` dataset will be licensed under Creative Commons (e.g., CC BY-NC-SA 4.0) to protect the proprietary curation while allowing local development.

### Developer Experience (DX)
- **Zero-config startup:** A `docker-compose.yml` will be provided. The Docker image is critical because it will pre-compile `sqlite-vec` in a standard Linux environment, shielding users from complex CGO/C-compiler setups across different operating systems.
- **Bootstrapping:** The `docker compose up` command should run migrations and invoke `cmd/seed/main.go` automatically upon creating the initial volume.

### Dependencies and `.env`
Local development requires an `api_key` for the embedding and memory extraction services. The `.env.example` file will require:
- `LLM_PROVIDER`: (e.g., openai, anthropic, ollama)
- `LLM_API_KEY`: The API key for extraction.
- `EMBEDDING_PROVIDER`: (e.g., openai, local)
- `EMBEDDING_API_KEY`: The API key for vector generation.
*Note:* To maintain a free tier for contributors, an `ollama` local integration for both extraction and embeddings is highly desired for V1.


### V1 acceptance criteria
- Search returns relevant hobbies from alias and description matches.
- Explore can filter under 100 ms on local dataset.
- Compare works for 2 to 4 hobbies.
- Memory paste yields top 20 recommendations with explanation reasons.
- A case like `Japanese history` can surface `kendo`, `kenjutsu`, and `kyudo` through graph and semantic links.
