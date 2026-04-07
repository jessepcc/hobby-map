import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// --- Load enriched hobbies ---
const hobbies = JSON.parse(readFileSync('tmp/hobbies_enriched.json', 'utf8'));

// Normalize array fields that Haiku may have stored as strings
function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.length > 0) return [val];
  return [];
}
for (const h of hobbies) {
  h.concepts = ensureArray(h.concepts);
  h.entities = ensureArray(h.entities);
  h.outcomes = ensureArray(h.outcomes);
  h.barriers = ensureArray(h.barriers);
  h.aliases = ensureArray(h.aliases);
}

function slugify(name) {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// --- Build node registry for non-hobby nodes ---
// key: "type:slug" → node object
const nodeRegistry = new Map();

function getOrCreateNode(type, tag) {
  const slug = slugify(tag);
  const key = `${type}:${slug}`;
  if (!nodeRegistry.has(key)) {
    nodeRegistry.set(key, {
      id: randomUUID(),
      node_type: type,
      slug,
      name: tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: '',
    });
  }
  return nodeRegistry.get(key);
}

// --- Build category concept nodes ---
const categories = new Set(hobbies.map(h => h.metadata?.category).filter(Boolean));
for (const cat of categories) {
  getOrCreateNode('concept', slugify(cat));
}

// --- Build edges ---
const edges = [];

function addEdge(fromId, toId, edgeType, weight) {
  edges.push({
    id: randomUUID(),
    from_node_id: fromId,
    to_node_id: toId,
    edge_type: edgeType,
    weight: Math.round(weight * 100) / 100,
    metadata: {},
  });
}

for (const h of hobbies) {
  // Hobby → category concept
  if (h.metadata?.category) {
    const catNode = getOrCreateNode('concept', slugify(h.metadata.category));
    addEdge(h.id, catNode.id, 'related_to', 1.0);
  }

  // Hobby → concepts
  const concepts = h.concepts || [];
  for (let i = 0; i < concepts.length; i++) {
    const node = getOrCreateNode('concept', concepts[i]);
    const weight = 0.95 - (i * 0.05); // 0.95, 0.90, 0.85, 0.80, 0.75
    addEdge(h.id, node.id, 'related_to', Math.max(weight, 0.70));
  }

  // Hobby → entities
  const entities = h.entities || [];
  for (const ent of entities) {
    const node = getOrCreateNode('entity', ent);
    addEdge(h.id, node.id, 'requires', 0.80);
  }

  // Hobby → outcomes (exactly 3)
  const outcomes = h.outcomes || [];
  for (const out of outcomes) {
    const node = getOrCreateNode('outcome', out);
    addEdge(h.id, node.id, 'has_outcome', 0.85);
  }

  // Hobby → barriers (exactly 1)
  const barriers = h.barriers || [];
  for (const bar of barriers) {
    const node = getOrCreateNode('barrier', bar);
    addEdge(h.id, node.id, 'has_barrier', 0.80);
  }
}

// --- Hobby-to-hobby similarity edges (shared concepts >= 2) ---
const hobbyConceptSets = hobbies.map(h => ({
  id: h.id,
  concepts: new Set([...(h.concepts || []), slugify(h.metadata?.category || '')]),
}));

for (let i = 0; i < hobbyConceptSets.length; i++) {
  for (let j = i + 1; j < hobbyConceptSets.length; j++) {
    const a = hobbyConceptSets[i];
    const b = hobbyConceptSets[j];
    const shared = [...a.concepts].filter(c => b.concepts.has(c)).length;
    if (shared >= 2) {
      const weight = Math.min(0.95, 0.40 + shared * 0.15);
      addEdge(a.id, b.id, 'related_to', weight);
    }
  }
}

// --- Concept-to-concept edges (co-occurrence >= 5 hobbies) ---
const conceptCoOccurrence = new Map();
for (const h of hobbies) {
  const tags = h.concepts || [];
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const pair = [slugify(tags[i]), slugify(tags[j])].sort().join('|');
      conceptCoOccurrence.set(pair, (conceptCoOccurrence.get(pair) || 0) + 1);
    }
  }
}

for (const [pair, count] of conceptCoOccurrence) {
  if (count >= 5) {
    const [slugA, slugB] = pair.split('|');
    const nodeA = nodeRegistry.get(`concept:${slugA}`);
    const nodeB = nodeRegistry.get(`concept:${slugB}`);
    if (nodeA && nodeB) {
      const weight = Math.min(0.90, 0.50 + count * 0.05);
      addEdge(nodeA.id, nodeB.id, 'related_to', weight);
    }
  }
}

// --- Write seeds ---

// dimensions.json — static from spec
const dimensions = [
  { id: 'd_startup_cost', key: 'startup_cost', label: 'Startup cost', min_value: 0.0, max_value: 1.0, description: 'One-time cost to begin the hobby' },
  { id: 'd_ongoing_cost', key: 'ongoing_cost', label: 'Ongoing cost', min_value: 0.0, max_value: 1.0, description: 'Recurring monthly/annual expenses' },
  { id: 'd_time_per_session', key: 'time_per_session', label: 'Time per session', min_value: 0.0, max_value: 1.0, description: 'Typical time investment per session' },
  { id: 'd_consistency_required', key: 'consistency_required', label: 'Consistency required', min_value: 0.0, max_value: 1.0, description: 'How regularly you need to practice' },
  { id: 'd_physical_demand', key: 'physical_demand', label: 'Physical demand', min_value: 0.0, max_value: 1.0, description: 'Level of physical exertion required' },
  { id: 'd_space_required', key: 'space_required', label: 'Space required', min_value: 0.0, max_value: 1.0, description: 'Physical space needed to practice' },
  { id: 'd_social_dependency', key: 'social_dependency', label: 'Social dependency', min_value: 0.0, max_value: 1.0, description: 'How much the hobby depends on other people' },
  { id: 'd_learning_curve', key: 'learning_curve', label: 'Learning curve', min_value: 0.0, max_value: 1.0, description: 'Difficulty of reaching competence' },
  { id: 'd_first_win_difficulty', key: 'first_win_difficulty', label: 'First win difficulty', min_value: 0.0, max_value: 1.0, description: 'How long until first satisfying result' },
  { id: 'd_age_longevity', key: 'age_longevity', label: 'Age longevity', min_value: 0.0, max_value: 1.0, description: 'How long you can practice this into old age' },
  { id: 'd_gear_dependency', key: 'gear_dependency', label: 'Gear dependency', min_value: 0.0, max_value: 1.0, description: 'Reliance on specialized equipment' },
  { id: 'd_portability', key: 'portability', label: 'Portability', min_value: 0.0, max_value: 1.0, description: 'Ability to practice in different locations' },
  { id: 'd_injury_risk', key: 'injury_risk', label: 'Injury risk', min_value: 0.0, max_value: 1.0, description: 'Risk of physical injury during practice' },
  { id: 'd_creative_expression', key: 'creative_expression', label: 'Creative expression', min_value: 0.0, max_value: 1.0, description: 'Opportunity for personal creative output' },
  { id: 'd_historical_cultural_depth', key: 'historical_cultural_depth', label: 'Historical/cultural depth', min_value: 0.0, max_value: 1.0, description: 'Richness of history and cultural tradition' },
];

// Clean hobbies for output (remove graph tags, keep in metadata for reference)
const cleanHobbies = hobbies.map(h => ({
  id: h.id,
  slug: h.slug,
  name: h.name,
  description: h.description,
  short_desc: h.short_desc,
  long_desc: h.long_desc || '',
  difficulty_summary: h.difficulty_summary || '',
  starter_path: h.starter_path || '',
  popularity: h.popularity || 0.5,
  aliases: h.aliases || [],
  dimensions: h.dimensions || {},
  metadata: h.metadata || {},
}));

const conceptNodes = [...nodeRegistry.values()];

writeFileSync('seeds/dimensions.json', JSON.stringify(dimensions, null, 2));
writeFileSync('seeds/hobbies.json', JSON.stringify(cleanHobbies, null, 2));
writeFileSync('seeds/concepts.json', JSON.stringify(conceptNodes, null, 2));
writeFileSync('seeds/edges.json', JSON.stringify(edges, null, 2));

console.log('=== Assembly complete ===');
console.log(`Hobbies:  ${cleanHobbies.length}`);
console.log(`Nodes:    ${conceptNodes.length} (${[...new Set(conceptNodes.map(n => n.node_type))].join(', ')})`);
console.log(`Edges:    ${edges.length}`);
console.log(`Dims:     ${dimensions.length}`);

// Breakdown by node type
const typeCounts = {};
for (const n of conceptNodes) {
  typeCounts[n.node_type] = (typeCounts[n.node_type] || 0) + 1;
}
console.log(`\nNode breakdown:`, typeCounts);

// Breakdown by edge type
const edgeTypeCounts = {};
for (const e of edges) {
  edgeTypeCounts[e.edge_type] = (edgeTypeCounts[e.edge_type] || 0) + 1;
}
console.log(`Edge breakdown:`, edgeTypeCounts);
