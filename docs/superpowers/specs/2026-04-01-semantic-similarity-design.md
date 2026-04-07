# Semantic Similarity Design Spec

## Goal

Add vector-based semantic similarity to the hobby recommendation pipeline. Pre-compute hobby embeddings offline, embed user signals in-browser at runtime, and merge cosine similarity results into the existing RRF fusion pipeline. Zero backend dependency for the vector channel.

## Architecture

```
OFFLINE (build-time, run once when hobbies change)
──────────────────────────────────────────────────
scripts/embed.mjs
  → loads all-MiniLM-L6-v2 via @huggingface/transformers (Node.js)
  → embeds 223 hobbies: "{name} — {short_desc}"
  → writes seeds/embeddings.json (~340KB, 384d per hobby)

BROWSER (runtime)
──────────────────────────────────────────────────
Page load:
  → embedding.js loads all-MiniLM-L6-v2 from CDN (~23MB ONNX, cached in IndexedDB)
  → embedding.js fetches seeds/embeddings.json

User pastes memory → clicks "Discover hobbies":
  → app.js calls /api/memory/extract → signals
  → embedding.js embeds signal texts (interest + desired_experience)
  → embedding.js computes cosine similarity against pre-computed embeddings
  → top-30 vector results sent alongside signals to /api/recommend
  → Go server merges vectorResults into RRF (fts + graph + vector) → final ranking

GO SERVER (minimal change)
──────────────────────────────────────────────────
  → recommendRequest accepts optional vectorResults field
  → RetrievalService.Recommend() passes vectorResults to RRFMerge
  → VectorScore populated on CandidateScore → weighted into FinalScore
```

## Key Decisions

- **Model**: `Xenova/all-MiniLM-L6-v2` (22M params, 384d, ~23MB ONNX). Same model for offline and browser to ensure embedding space alignment.
- **Dimensions**: 384 (native for this model). Asset size is ~340KB for 223 hobbies.
- **Embedding text**: `"{name} — {short_desc}"` per hobby. Concepts are not embedded (mostly empty descriptions; graph traversal already covers concept→hobby discovery).
- **Cosine similarity**: Since embeddings are L2-normalized, cosine similarity = dot product.
- **Aggregation**: For multiple signal embeddings, take max similarity per hobby (not mean). This ensures a strong single-signal match isn't diluted by unrelated signals.
- **Graceful degradation**: If the browser model fails to load, the app works exactly as before (FTS + graph only). Vector search is purely additive.
- **No Qwen3**: Original plan used Qwen3-Embedding-8B (8B params) via OpenRouter. Switched to all-MiniLM-L6-v2 to run entirely in-browser with no API key or backend proxy needed. Quality difference is negligible for a 223-hobby corpus.

## What Changes

| Component | Change |
|---|---|
| `scripts/embed.mjs` | New: offline embedding generator |
| `seeds/embeddings.json` | New: pre-computed 384d embeddings |
| `package.json` | Add `@huggingface/transformers` dev dependency |
| `web/embedding.js` | New: browser model loading + cosine search |
| `web/index.html` | Add `<script type="module">` for embedding.js |
| `web/app.js` | Integrate vector results into runMatch() |
| `internal/http/handlers_recommend.go` | Accept vectorResults in request |
| `internal/service/retrieval_service.go` | Pass vectorResults to RRFMerge, set VectorScore |
| `internal/service/retrieval_service_test.go` | Update Recommend() call signature |
| `internal/search/rrf.go` | No change (already accepts vector channel) |
| `internal/search/ranking.go` | No change (VectorScore weight already wired) |

## Validation

End-to-end test with JC's real Claude memory. Expected: kendo, photography, martial arts, coding, electronics, language learning surface in top results. Vector channel should boost semantically related hobbies that FTS alone might miss (e.g., "myofascial therapy" → yoga/physical therapy, "hardware prototyping" → electronics/robotics).
