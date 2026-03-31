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
