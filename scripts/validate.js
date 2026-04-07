import { readFileSync } from 'node:fs';

const hobbies = JSON.parse(readFileSync('seeds/hobbies.json', 'utf8'));
const concepts = JSON.parse(readFileSync('seeds/concepts.json', 'utf8'));
const edges = JSON.parse(readFileSync('seeds/edges.json', 'utf8'));
const dimensions = JSON.parse(readFileSync('seeds/dimensions.json', 'utf8'));

const errors = [];
const warnings = [];

// --- 1. Dimensions ---
if (dimensions.length !== 15) errors.push(`Expected 15 dimensions, got ${dimensions.length}`);

const dimKeys = new Set(dimensions.map(d => d.key));

// --- 2. Hobbies ---
console.log(`Validating ${hobbies.length} hobbies...`);

for (const h of hobbies) {
  if (!h.id) errors.push(`${h.name}: missing id`);
  if (!h.slug) errors.push(`${h.name}: missing slug`);
  if (!h.name) errors.push(`(unknown): missing name`);
  if (!h.short_desc) warnings.push(`${h.name}: missing short_desc`);
  if (!h.long_desc) warnings.push(`${h.name}: missing long_desc`);
  if (!h.difficulty_summary) warnings.push(`${h.name}: missing difficulty_summary`);
  if (!h.starter_path) warnings.push(`${h.name}: missing starter_path`);
  if (!h.aliases || h.aliases.length === 0) warnings.push(`${h.name}: no aliases`);

  // Dimensions
  const dims = h.dimensions || {};
  const hobbyDimKeys = Object.keys(dims);
  if (hobbyDimKeys.length !== 15) {
    errors.push(`${h.name}: has ${hobbyDimKeys.length}/15 dimensions`);
  }
  for (const [key, val] of Object.entries(dims)) {
    if (!dimKeys.has(key)) errors.push(`${h.name}: unknown dimension '${key}'`);
    if (typeof val !== 'number' || val < 0 || val > 1) {
      errors.push(`${h.name}: dimension '${key}' out of range: ${val}`);
    }
  }
}

// --- 3. Node ID uniqueness ---
const allNodeIds = new Set();
const hobbyIds = new Set();
for (const h of hobbies) {
  if (allNodeIds.has(h.id)) errors.push(`Duplicate hobby ID: ${h.id}`);
  allNodeIds.add(h.id);
  hobbyIds.add(h.id);
}
for (const c of concepts) {
  if (allNodeIds.has(c.id)) errors.push(`Duplicate concept ID: ${c.id}`);
  allNodeIds.add(c.id);
}

// --- 4. Edges ---
console.log(`Validating ${edges.length} edges...`);

let orphanEdges = 0;
for (const e of edges) {
  if (!allNodeIds.has(e.from_node_id)) {
    orphanEdges++;
    if (orphanEdges <= 5) errors.push(`Edge ${e.id}: from_node_id ${e.from_node_id} not found`);
  }
  if (!allNodeIds.has(e.to_node_id)) {
    orphanEdges++;
    if (orphanEdges <= 5) errors.push(`Edge ${e.id}: to_node_id ${e.to_node_id} not found`);
  }
  if (typeof e.weight !== 'number' || e.weight < 0 || e.weight > 1) {
    errors.push(`Edge ${e.id}: weight out of range: ${e.weight}`);
  }
}
if (orphanEdges > 5) errors.push(`...and ${orphanEdges - 5} more orphan edges`);

// --- 5. Orphan concept nodes ---
const referencedNodeIds = new Set();
for (const e of edges) {
  referencedNodeIds.add(e.from_node_id);
  referencedNodeIds.add(e.to_node_id);
}
let orphanConcepts = 0;
for (const c of concepts) {
  if (!referencedNodeIds.has(c.id)) {
    orphanConcepts++;
    if (orphanConcepts <= 3) warnings.push(`Orphan concept node: ${c.name} (${c.node_type})`);
  }
}
if (orphanConcepts > 3) warnings.push(`...and ${orphanConcepts - 3} more orphan concept nodes`);

// --- 6. Hobby edge coverage ---
const hobbyEdgeCounts = new Map();
for (const id of hobbyIds) hobbyEdgeCounts.set(id, { outcomes: 0, barriers: 0, concepts: 0, total: 0 });

for (const e of edges) {
  if (hobbyEdgeCounts.has(e.from_node_id)) {
    const counts = hobbyEdgeCounts.get(e.from_node_id);
    counts.total++;
    if (e.edge_type === 'has_outcome') counts.outcomes++;
    if (e.edge_type === 'has_barrier') counts.barriers++;
    if (e.edge_type === 'related_to') counts.concepts++;
  }
}

let lowOutcomes = 0, lowBarriers = 0, noEdges = 0;
for (const [id, counts] of hobbyEdgeCounts) {
  if (counts.outcomes < 3) lowOutcomes++;
  if (counts.barriers < 1) lowBarriers++;
  if (counts.total === 0) noEdges++;
}
if (lowOutcomes > 0) warnings.push(`${lowOutcomes} hobbies with <3 outcomes`);
if (lowBarriers > 0) warnings.push(`${lowBarriers} hobbies with <1 barrier`);
if (noEdges > 0) errors.push(`${noEdges} hobbies with zero edges`);

// --- 7. Japanese history acceptance test ---
console.log('\n--- V1 Acceptance Test: Japanese History ---');
const jpConcepts = concepts.filter(c =>
  c.slug.includes('japanese') || c.slug.includes('japan')
);
console.log(`Japanese concept nodes: ${jpConcepts.map(c => c.slug).join(', ') || 'NONE'}`);

const jpHobbies = hobbies.filter(h =>
  ['kendo', 'kenjutsu', 'kyudo'].includes(h.slug)
);
console.log(`Required hobbies found: ${jpHobbies.map(h => h.slug).join(', ') || 'NONE'}`);

if (jpConcepts.length > 0 && jpHobbies.length === 3) {
  // Check edges from JP hobbies to JP concepts
  const jpHobbyIds = new Set(jpHobbies.map(h => h.id));
  const jpConceptIds = new Set(jpConcepts.map(c => c.id));
  const jpEdges = edges.filter(e =>
    jpHobbyIds.has(e.from_node_id) && jpConceptIds.has(e.to_node_id)
  );
  console.log(`Graph paths (JP hobby → JP concept): ${jpEdges.length}`);
  if (jpEdges.length >= 3) {
    console.log('✓ V1 acceptance test PASSED');
  } else {
    warnings.push('V1 acceptance test: insufficient graph paths from JP hobbies to JP concepts');
  }
} else {
  warnings.push('V1 acceptance test: missing required hobbies or concept nodes');
}

// --- Report ---
console.log('\n=== Validation Report ===');
console.log(`Hobbies: ${hobbies.length}`);
console.log(`Concepts: ${concepts.length}`);
console.log(`Edges: ${edges.length}`);
console.log(`Dimensions: ${dimensions.length}`);
console.log(`\nErrors: ${errors.length}`);
for (const e of errors) console.log(`  ✗ ${e}`);
console.log(`Warnings: ${warnings.length}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);

if (errors.length === 0) {
  console.log('\n✓ All critical checks passed');
} else {
  console.log(`\n✗ ${errors.length} error(s) need fixing`);
  process.exit(1);
}
