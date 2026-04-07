# Semantic Similarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-browser vector search to the recommendation pipeline using pre-computed hobby embeddings and Transformers.js for query-time inference.

**Architecture:** Offline script embeds 223 hobbies with `all-MiniLM-L6-v2` (384d). Browser loads the same model via Transformers.js, embeds user signal texts, computes cosine similarity, and sends vector results to the Go server's RRF merge pipeline. Zero new backend dependencies.

**Tech Stack:** `@huggingface/transformers` (Node.js + browser), `Xenova/all-MiniLM-L6-v2` (384d, 23MB ONNX), Go, Vanilla JS

---

### Task 1: Create offline embedding script

**Files:**
- Modify: `package.json`
- Create: `scripts/embed.mjs`

- [ ] **Step 1: Install @huggingface/transformers**

```bash
cd /Users/jessechow/development/hb
npm install --save-dev @huggingface/transformers
```

- [ ] **Step 2: Create the embedding script**

Create `scripts/embed.mjs`:

```js
import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'fs';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const HOBBIES_PATH = 'seeds/hobbies.json';
const OUTPUT_PATH = 'seeds/embeddings.json';

async function main() {
  console.log(`Loading model: ${MODEL_ID}...`);
  const extractor = await pipeline('feature-extraction', MODEL_ID, {
    dtype: 'fp32',
  });

  const hobbies = JSON.parse(readFileSync(HOBBIES_PATH, 'utf-8'));
  console.log(`Embedding ${hobbies.length} hobbies...`);

  const texts = hobbies.map(h => `${h.name} — ${h.short_desc}`);
  const ids = hobbies.map(h => h.id);

  // Batch embed all hobbies
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  const vectors = output.tolist();

  // Build output map
  const embeddings = {};
  for (let i = 0; i < ids.length; i++) {
    embeddings[ids[i]] = vectors[i].map(v => Math.round(v * 1e6) / 1e6);
  }

  const result = {
    model: MODEL_ID,
    dimensions: vectors[0].length,
    count: ids.length,
    created_at: new Date().toISOString(),
    embeddings,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(result));
  const sizeKB = (Buffer.byteLength(JSON.stringify(result)) / 1024).toFixed(0);
  console.log(`Wrote ${OUTPUT_PATH} (${ids.length} hobbies, ${vectors[0].length}d, ${sizeKB}KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Verify script runs and inspect output**

```bash
node scripts/embed.mjs
```

Expected: downloads model on first run (~23MB), embeds 223 hobbies, writes `seeds/embeddings.json`. Subsequent runs reuse cached model.

```bash
node -e "const e = JSON.parse(require('fs').readFileSync('seeds/embeddings.json')); console.log('Model:', e.model); console.log('Dims:', e.dimensions); console.log('Count:', e.count); console.log('Sample ID:', Object.keys(e.embeddings)[0]); console.log('Sample vec length:', Object.values(e.embeddings)[0].length);"
```

Expected: Model: Xenova/all-MiniLM-L6-v2, Dims: 384, Count: 223, Sample vec length: 384

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/embed.mjs seeds/embeddings.json
git commit -m "feat: add offline embedding script and pre-computed hobby embeddings

Uses all-MiniLM-L6-v2 (384d) via @huggingface/transformers.
Embeds '{name} — {short_desc}' for each of 223 hobbies.
Output: seeds/embeddings.json (~340KB).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Modify Go server to accept vector results

**Files:**
- Modify: `internal/http/handlers_recommend.go`
- Modify: `internal/service/retrieval_service.go`
- Modify: `internal/service/retrieval_service_test.go`

- [ ] **Step 1: Write failing test — Recommend with vector results**

Add to `internal/service/retrieval_service_test.go`:

```go
func TestRetrievalService_RecommendWithVectorResults(t *testing.T) {
	db := testutil.TestDB(t)

	testutil.SeedTestHobby(t, db, "h1", "kendo", "Kendo", "Japanese fencing with bamboo swords", map[string]float64{
		"startup_cost": 0.5, "physical_demand": 0.7, "age_longevity": 0.6,
	})
	testutil.SeedTestHobby(t, db, "h2", "painting", "Oil Painting", "Art with oils on canvas", map[string]float64{
		"startup_cost": 0.5, "physical_demand": 0.2, "age_longevity": 0.85,
	})
	testutil.SeedTestHobby(t, db, "h3", "pottery", "Pottery", "Wheel throwing clay", map[string]float64{
		"startup_cost": 0.4, "physical_demand": 0.3, "age_longevity": 0.8,
	})
	testutil.SeedFTSEntry(t, db, "h1", "Kendo", "", "Japanese fencing", "", "")
	testutil.SeedFTSEntry(t, db, "h2", "Oil Painting", "", "Art with oils", "", "")
	testutil.SeedFTSEntry(t, db, "h3", "Pottery", "", "Wheel throwing clay", "", "")

	hobbyRepo := repo.NewHobbyRepo(db)
	graphRepo := repo.NewGraphRepo(db)
	svc := service.NewRetrievalService(hobbyRepo, graphRepo)

	signals := []domain.MemorySignal{
		{SignalType: "interest", Text: "clay arts", Weight: 0.9, Confidence: 0.9},
	}

	// Vector results boost pottery (h3) which FTS might not find for "clay arts"
	vectorResults := []repo.ScoredID{
		{ID: "h3", Score: 0.92},
		{ID: "h2", Score: 0.71},
		{ID: "h1", Score: 0.35},
	}

	results, err := svc.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20}, vectorResults)
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}

	if len(results) == 0 {
		t.Fatal("expected results")
	}

	// Pottery should appear in results thanks to vector boost
	found := false
	for _, r := range results {
		if r.HobbyID == "h3" {
			found = true
			if r.VectorScore == 0 {
				t.Error("expected non-zero VectorScore for h3")
			}
			break
		}
	}
	if !found {
		t.Error("expected pottery (h3) in results via vector boost")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/service -run TestRetrievalService_RecommendWithVectorResults -v -count=1
```

Expected: FAIL — `Recommend()` doesn't accept 4th argument.

- [ ] **Step 3: Update RetrievalService.Recommend signature**

In `internal/service/retrieval_service.go`, change the `Recommend` function signature and wire in vector results:

Change:
```go
func (s *RetrievalService) Recommend(ctx context.Context, signals []domain.MemorySignal, filter repo.ListFilter) ([]domain.CandidateScore, error) {
```

To:
```go
func (s *RetrievalService) Recommend(ctx context.Context, signals []domain.MemorySignal, filter repo.ListFilter, vectorResults []repo.ScoredID) ([]domain.CandidateScore, error) {
```

Change the RRF merge call from:
```go
	merged := search.RRFMerge(ftsResults, graphResults, nil, 20)
```

To:
```go
	merged := search.RRFMerge(ftsResults, graphResults, vectorResults, 20)
```

In the candidate scoring loop, after `c.GraphScore = ...`, add:
```go
		c.VectorScore = vectorScoreForID(m.ID, vectorResults)
```

Add the helper function at the bottom of the file:
```go
func vectorScoreForID(id string, results []repo.ScoredID) float64 {
	for _, r := range results {
		if r.ID == id {
			return r.Score
		}
	}
	return 0
}
```

- [ ] **Step 4: Fix existing test call site**

In `internal/service/retrieval_service_test.go`, update the existing test's call from:
```go
	results, err := svc.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20})
```
To:
```go
	results, err := svc.Recommend(context.Background(), signals, repo.ListFilter{Limit: 20}, nil)
```

- [ ] **Step 5: Fix handler call site**

In `internal/http/handlers_recommend.go`, add the `VectorResults` field to the request struct:

After the existing `Filters` field, add:
```go
	VectorResults   []vectorResult        `json:"vectorResults"`
```

Add the vectorResult struct after `recommendResponse`:
```go
type vectorResult struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
}
```

Update the `Recommend` handler to convert and pass vector results. Change:
```go
	results, err := h.deps.Retrieval.Recommend(r.Context(), signals, filter)
```
To:
```go
	var vecResults []repo.ScoredID
	for _, vr := range req.VectorResults {
		vecResults = append(vecResults, repo.ScoredID{ID: vr.ID, Score: vr.Score})
	}
	results, err := h.deps.Retrieval.Recommend(r.Context(), signals, filter, vecResults)
```

- [ ] **Step 6: Fix any other call sites**

Check for other callers of `Recommend()`:

```bash
grep -rn '\.Recommend(' internal/ --include='*.go'
```

Update any remaining callers (e.g., handler tests) by adding `nil` as the 4th argument.

- [ ] **Step 7: Run all tests**

```bash
make test-short
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add internal/http/handlers_recommend.go internal/service/retrieval_service.go internal/service/retrieval_service_test.go
git commit -m "feat: accept vector results in recommendation pipeline

RetrievalService.Recommend() now takes optional vectorResults parameter.
Browser sends cosine similarity results, server merges via RRF.
VectorScore is populated on CandidateScore and weighted into FinalScore.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Create browser embedding module

**Files:**
- Create: `web/embedding.js`
- Modify: `web/index.html`

- [ ] **Step 1: Create web/embedding.js**

```js
// embedding.js — In-browser semantic search via Transformers.js
// Loads all-MiniLM-L6-v2 and pre-computed hobby embeddings.
// Exposes: initEmbedding(), searchByVector(texts, topK)

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDINGS_URL = '/seeds/embeddings.json';

let _extractor = null;
let _nodeEmbeddings = null; // { id: Float32Array }
let _nodeIds = null;        // string[]
let _matrix = null;         // Float32Array (flattened NxD matrix for fast dot product)
let _dims = 0;
let _ready = false;
let _initPromise = null;

async function initEmbedding() {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit() {
  try {
    // Load embeddings JSON and model in parallel
    const [embData, transformers] = await Promise.all([
      fetch(EMBEDDINGS_URL).then(r => {
        if (!r.ok) throw new Error('Failed to load embeddings: ' + r.status);
        return r.json();
      }),
      import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3'),
    ]);

    _dims = embData.dimensions;
    _nodeIds = Object.keys(embData.embeddings);
    // Build flat matrix for fast batch dot product
    _matrix = new Float32Array(_nodeIds.length * _dims);
    for (let i = 0; i < _nodeIds.length; i++) {
      const vec = embData.embeddings[_nodeIds[i]];
      _matrix.set(vec, i * _dims);
    }

    console.log(`[embedding] Loaded ${_nodeIds.length} embeddings (${_dims}d)`);

    // Load model
    console.log('[embedding] Loading model...');
    _extractor = await transformers.pipeline('feature-extraction', MODEL_ID, {
      dtype: 'fp32',
    });
    console.log('[embedding] Model ready');

    _ready = true;
  } catch (err) {
    console.warn('[embedding] Init failed, vector search disabled:', err.message);
    _ready = false;
  }
}

function isReady() {
  return _ready;
}

async function searchByVector(texts, topK) {
  if (!_ready || !texts.length) return [];

  // Embed query texts
  const output = await _extractor(texts, { pooling: 'mean', normalize: true });
  const queryVecs = output.tolist(); // [[384], [384], ...]

  // For each hobby, compute max cosine similarity across all query vectors
  const scores = new Float32Array(_nodeIds.length);
  for (const qv of queryVecs) {
    for (let i = 0; i < _nodeIds.length; i++) {
      let dot = 0;
      const offset = i * _dims;
      for (let d = 0; d < _dims; d++) {
        dot += qv[d] * _matrix[offset + d];
      }
      if (dot > scores[i]) scores[i] = dot;
    }
  }

  // Sort and return top-K
  const indices = Array.from({ length: _nodeIds.length }, (_, i) => i);
  indices.sort((a, b) => scores[b] - scores[a]);

  const results = [];
  for (let i = 0; i < Math.min(topK, indices.length); i++) {
    const idx = indices[i];
    if (scores[idx] <= 0) break;
    results.push({ id: _nodeIds[idx], score: Math.round(scores[idx] * 1e4) / 1e4 });
  }
  return results;
}

// Expose to global scope (app.js is not a module)
window.embeddingModule = { initEmbedding, isReady, searchByVector };

// Auto-initialize: module scripts are deferred, so this runs after DOM parsing.
// Model loading happens in background — ready by the time user clicks "Discover".
initEmbedding();
```

- [ ] **Step 2: Add embedding.js to index.html**

In `web/index.html`, add before the closing `</body>` tag, before the app.js script:

```html
  <script type="module" src="/embedding.js"></script>
  <script src="/app.js"></script>
```

Remove the existing `<script src="/app.js"></script>` line so it's not duplicated.

- [ ] **Step 3: Serve seeds/ directory from Go server**

In `internal/http/router.go`, the static file server serves from `web/`. The embeddings file is in `seeds/`. Add a route to serve it.

After the `r.Handle("/*", fs)` line, add before it:

```go
	// Serve pre-computed embeddings
	r.Handle("/seeds/*", http.StripPrefix("/seeds/", http.FileServer(http.Dir("seeds"))))
```

Note: this must come before the `/*` catch-all.

- [ ] **Step 4: Verify embedding.js loads in browser**

```bash
make run
```

Open `http://localhost:8080` in Chrome. Open DevTools Console. Expected logs:
```
[embedding] Loaded 223 embeddings (384d)
[embedding] Loading model...
[embedding] Model ready
```

First load downloads ~23MB model (cached in IndexedDB for subsequent visits).

- [ ] **Step 5: Commit**

```bash
git add web/embedding.js web/index.html internal/http/router.go
git commit -m "feat: add browser embedding module with Transformers.js

Loads all-MiniLM-L6-v2 in-browser for real-time semantic search.
Pre-computed embeddings loaded from seeds/embeddings.json.
Exposes searchByVector() for cosine similarity search.
Gracefully degrades if model fails to load.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Integrate vector search into browser recommendation flow

**Files:**
- Modify: `web/app.js`

- [ ] **Step 1: Modify runMatch() to include vector search**

Note: `embedding.js` is a module script (deferred) that auto-calls `initEmbedding()` on load. No init call needed in `app.js` — by the time the user clicks "Discover hobbies", the module has already started loading.

In the `runMatch()` function in `web/app.js`, after the signals are extracted and before calling `recommend()`, add vector search. Replace the `try` block inside `runMatch()`:

Change from:
```js
    const extracted = await extractMemory(text);
    const signals = extracted.signals;
    state.lastMemory = text;
    state.lastSignals = signals;

    const domainSignals = signals.map(s => ({
      signalType: s.type, text: s.text,
      normalizedValue: s.normalizedValue, weight: s.weight, confidence: s.weight,
    }));
    const rec = await recommend(domainSignals, {}, 10);
```

To:
```js
    const extracted = await extractMemory(text);
    const signals = extracted.signals;
    state.lastMemory = text;
    state.lastSignals = signals;

    const domainSignals = signals.map(s => ({
      signalType: s.type, text: s.text,
      normalizedValue: s.normalizedValue, weight: s.weight, confidence: s.weight,
    }));

    // Vector search: embed interest/experience signals, find similar hobbies
    let vectorResults = [];
    if (window.embeddingModule && window.embeddingModule.isReady()) {
      const searchTexts = signals
        .filter(s => s.type === 'interest' || s.type === 'desired_experience' || s.type === 'experience')
        .map(s => s.text);
      if (searchTexts.length > 0) {
        try {
          vectorResults = await window.embeddingModule.searchByVector(searchTexts, 30);
        } catch (e) {
          console.warn('Vector search failed:', e);
        }
      }
    }

    const rec = await recommend(domainSignals, {}, 10, vectorResults);
```

- [ ] **Step 2: Update the recommend() helper to accept vectorResults**

Change the `recommend` function from:
```js
const recommend = (signals, filters, limit) => api('/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signals, filters: filters || {}, limit: limit || 20 }) });
```

To:
```js
const recommend = (signals, filters, limit, vectorResults) => api('/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signals, filters: filters || {}, limit: limit || 20, vectorResults: vectorResults || [] }) });
```

- [ ] **Step 3: Verify in browser**

```bash
make run
```

Open `http://localhost:8080`. Wait for "[embedding] Model ready" in console. Paste test text: "I love Japanese martial arts and street photography". Click "Discover hobbies". Console should show no errors. Results should include kendo and photography.

- [ ] **Step 4: Commit**

```bash
git add web/app.js
git commit -m "feat: integrate vector search into recommendation flow

Browser embeds user signals via Transformers.js, computes cosine
similarity against pre-computed hobby embeddings, and sends vector
results to the server for RRF fusion. Gracefully skips if model
not yet loaded.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: End-to-end validation with JC's memory

This task validates the full pipeline using real user data.

**Files:** None (manual testing)

- [ ] **Step 1: Start the server**

```bash
make run
```

- [ ] **Step 2: Open the app and wait for model**

Open `http://localhost:8080` in Chrome. Open DevTools Console. Wait for:
```
[embedding] Loaded 223 embeddings (384d)
[embedding] Model ready
```

- [ ] **Step 3: Paste JC's memory and run**

Paste the full memory text (starting with "Work context...") into the textarea. Click "Discover hobbies".

**Expected top results** (hobbies explicitly mentioned or strongly implied):
- Kendo (directly mentioned, nidan rank)
- Photography / Street Photography / Travel Photography (Sigma DP2, Fujifilm X-T5)
- Coding / Web Development (technical co-founder, CS background)
- Language Learning (Japanese language)
- Personal Finance / Investing (portfolio, PLTR, TSLA)
- Electronics (hardware prototyping, Arduino, Raspberry Pi)
- Weightlifting (Jeff Nippard PPL, strength training)

**Expected vector-boosted results** (semantically related, FTS might miss):
- 3D Modeling (Blender mentioned in coursework context)
- Martial arts adjacent (kenjutsu, iaido — through semantic similarity to kendo)
- Digital Illustration (design work, editorial aesthetic)

- [ ] **Step 4: Compare with and without vector search**

Temporarily disable vector search by adding `return [];` at the top of `searchByVector()` in `web/embedding.js`. Reload and re-run the same memory. Note the results. Then re-enable and compare.

The vector-enabled results should show:
1. More diverse hobby suggestions (semantic matches beyond keyword overlap)
2. Better ranking for hobbies that are semantically close but use different vocabulary

- [ ] **Step 5: Run automated tests**

```bash
make test-short
```

Expected: all pass (including the new `TestRetrievalService_RecommendWithVectorResults`).
