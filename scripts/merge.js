import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const files = readdirSync('tmp')
  .filter(f => f.startsWith('enriched_batch_') && f.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error('No enriched batch files found in tmp/');
  process.exit(1);
}

const all = [];
const issues = [];

for (const file of files) {
  const raw = readFileSync(`tmp/${file}`, 'utf8');
  let batch;
  try {
    batch = JSON.parse(raw);
  } catch (e) {
    issues.push(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  if (!Array.isArray(batch)) {
    issues.push(`${file}: not an array`);
    continue;
  }
  for (const h of batch) {
    // Quick field checks
    const missing = [];
    if (!h.long_desc) missing.push('long_desc');
    if (!h.difficulty_summary) missing.push('difficulty_summary');
    if (!h.starter_path) missing.push('starter_path');
    if (!h.aliases || h.aliases.length === 0) missing.push('aliases');
    if (!h.concepts || h.concepts.length === 0) missing.push('concepts');
    if (!h.outcomes || h.outcomes.length === 0) missing.push('outcomes');
    if (!h.barriers || h.barriers.length === 0) missing.push('barriers');
    if (typeof h.popularity !== 'number' || h.popularity === 0.5) missing.push('popularity(unchanged)');

    const dims = h.dimensions || {};
    const dimCount = Object.keys(dims).length;
    if (dimCount !== 15) missing.push(`dimensions(${dimCount}/15)`);

    if (missing.length > 0) {
      issues.push(`${file} → ${h.name}: missing ${missing.join(', ')}`);
    }
  }
  all.push(...batch);
}

writeFileSync('tmp/hobbies_enriched.json', JSON.stringify(all, null, 2));

console.log(`Merged ${files.length} batch files → ${all.length} hobbies`);
if (issues.length > 0) {
  console.log(`\n⚠ ${issues.length} issue(s):`);
  for (const issue of issues) console.log(`  - ${issue}`);
}
