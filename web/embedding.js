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
