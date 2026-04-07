import { readFileSync, writeFileSync } from 'node:fs';

const BATCH_SIZE = 12;

const hobbies = JSON.parse(readFileSync('tmp/hobbies_baseline.json', 'utf8'));
const totalBatches = Math.ceil(hobbies.length / BATCH_SIZE);

for (let i = 0; i < totalBatches; i++) {
  const batch = hobbies.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  const padded = String(i + 1).padStart(2, '0');
  writeFileSync(`tmp/batch_${padded}.json`, JSON.stringify(batch, null, 2));
}

console.log(`Split ${hobbies.length} hobbies into ${totalBatches} batches of ~${BATCH_SIZE}`);
