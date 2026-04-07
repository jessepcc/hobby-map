import { HOBBIES, CATEGORIES } from '../hobbies.js';
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

// --- 7 Japanese hobbies to add (V1 acceptance criteria) ---
const JAPANESE_HOBBIES = [
  { name: "Kendo", category: "Sports & Fitness", difficulty: "Intermediate", cost: "Medium", setting: "Indoor", social: "Social", description: "Japanese fencing with bamboo swords (shinai) and protective armor — discipline, respect, and spirit." },
  { name: "Kenjutsu", category: "Sports & Fitness", difficulty: "Advanced", cost: "Medium", setting: "Indoor", social: "Social", description: "Traditional Japanese swordsmanship using wooden or blunted steel swords — martial technique and kata." },
  { name: "Kyudo", category: "Sports & Fitness", difficulty: "Intermediate", cost: "Medium", setting: "Indoor", social: "Both", description: "Japanese archery emphasizing form, breathing, and meditative focus over competition." },
  { name: "Iaido", category: "Sports & Fitness", difficulty: "Intermediate", cost: "Medium", setting: "Indoor", social: "Solo", description: "Art of drawing and cutting with the Japanese katana — solo kata practice for precision and mindfulness." },
  { name: "Ikebana", category: "Arts & Crafts", difficulty: "Beginner", cost: "Low", setting: "Indoor", social: "Both", description: "Japanese art of flower arranging — minimalism, seasonality, and asymmetric balance." },
  { name: "Shodo", category: "Arts & Crafts", difficulty: "Intermediate", cost: "Low", setting: "Indoor", social: "Solo", description: "Japanese brush calligraphy — ink, brush, and paper as meditative artistic practice." },
  { name: "Tea Ceremony", category: "Mind & Self-Development", difficulty: "Intermediate", cost: "Medium", setting: "Indoor", social: "Social", description: "Chado — the Japanese way of tea, combining mindfulness, aesthetics, hospitality, and ritual." },
];

const allHobbies = [...HOBBIES, ...JAPANESE_HOBBIES];

// --- Heuristic baseline maps ---

const difficultyDims = {
  Beginner:     { learning_curve: 0.20, first_win_difficulty: 0.15 },
  Intermediate: { learning_curve: 0.50, first_win_difficulty: 0.45 },
  Advanced:     { learning_curve: 0.80, first_win_difficulty: 0.75 },
};

const costDims = {
  Low:    { startup_cost: 0.15, ongoing_cost: 0.15, gear_dependency: 0.15 },
  Medium: { startup_cost: 0.45, ongoing_cost: 0.40, gear_dependency: 0.45 },
  High:   { startup_cost: 0.75, ongoing_cost: 0.70, gear_dependency: 0.75 },
};

const settingDims = {
  Indoor:  { space_required: 0.25, portability: 0.70 },
  Outdoor: { space_required: 0.60, portability: 0.40 },
  Both:    { space_required: 0.40, portability: 0.55 },
};

const socialDims = {
  Solo:   { social_dependency: 0.10 },
  Social: { social_dependency: 0.80 },
  Both:   { social_dependency: 0.40 },
};

const categoryPhysical = {
  "Sports & Fitness":       { physical_demand: 0.70, creative_expression: 0.15 },
  "Arts & Crafts":          { physical_demand: 0.15, creative_expression: 0.85 },
  "Music & Audio":          { physical_demand: 0.15, creative_expression: 0.80 },
  "Outdoor & Adventure":    { physical_demand: 0.60, creative_expression: 0.15 },
  "Performance & Expression": { physical_demand: 0.45, creative_expression: 0.80 },
  "Food & Drink":           { physical_demand: 0.20, creative_expression: 0.60 },
  "Nature & Animals":       { physical_demand: 0.35, creative_expression: 0.25 },
  "Film & Photography":     { physical_demand: 0.15, creative_expression: 0.75 },
  "Fashion & Style":        { physical_demand: 0.15, creative_expression: 0.75 },
  "Writing & Storytelling":  { physical_demand: 0.05, creative_expression: 0.90 },
  "Home & Garden":          { physical_demand: 0.30, creative_expression: 0.50 },
};
const defaultCategoryDims = { physical_demand: 0.30, creative_expression: 0.30 };

// Neutral defaults for dimensions with no source
const neutralDims = {
  time_per_session: 0.50,
  consistency_required: 0.50,
  age_longevity: 0.50,
  injury_risk: 0.20,
  historical_cultural_depth: 0.30,
};

// --- Helpers ---

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// --- Transform ---

const baseline = allHobbies.map(h => {
  const catDims = categoryPhysical[h.category] || defaultCategoryDims;

  return {
    id: randomUUID(),
    slug: slugify(h.name),
    name: h.name,
    description: h.description,
    short_desc: h.description,
    long_desc: '',
    difficulty_summary: '',
    starter_path: '',
    popularity: 0.50,
    aliases: [],
    dimensions: {
      ...difficultyDims[h.difficulty],
      ...costDims[h.cost],
      ...settingDims[h.setting],
      ...socialDims[h.social],
      ...catDims,
      ...neutralDims,
    },
    concepts: [],
    entities: [],
    outcomes: [],
    barriers: [],
    metadata: {
      category: h.category,
      original_difficulty: h.difficulty,
      original_cost: h.cost,
      original_setting: h.setting,
      original_social: h.social,
    },
  };
});

// --- Write output ---

mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/hobbies_baseline.json', JSON.stringify(baseline, null, 2));
console.log(`Wrote ${baseline.length} hobbies to tmp/hobbies_baseline.json`);

// Quick sanity check
const dimKeys = Object.keys(baseline[0].dimensions);
console.log(`Dimensions per hobby: ${dimKeys.length} (${dimKeys.join(', ')})`);
