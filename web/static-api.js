const HOBBIES_URL = '/seeds/hobbies.json';
const CONCEPTS_URL = '/seeds/concepts.json';
const EDGES_URL = '/seeds/edges.json';

const W_VECTOR = 1.0;
const W_FTS = 2.0;
const W_GRAPH = 0.6;

const WtVector = 0.28;
const WtFTS = 0.30;
const WtGraph = 0.14;
const WtDimension = 0.12;
const WtOutcome = 0.10;
const WtNovelty = 0.06;
const WtBarrier = 0.10;

const hobbyAliases = {
  'kendo': 'Kendo',
  'kenjutsu': 'Kenjutsu',
  'iaido': 'Iaido',
  'martial art': 'Martial Arts',
  'photography': 'Photography',
  'street photography': 'Photography',
  'travel photography': 'Travel Photography',
  'film photography': 'Film Photography',
  'astrophotography': 'Astrophotography',
  'macro photography': 'Macro Photography',
  'wildlife photography': 'Wildlife Photography',
  'investing': 'Personal Finance',
  'investment': 'Personal Finance',
  'stocks': 'Personal Finance',
  'portfolio': 'Personal Finance',
  'crypto': 'Personal Finance',
  'robotics': 'Amateur Robotics',
  'coding': 'Coding',
  'programming': 'Coding',
  'web development': 'Web Development',
  'software': 'Coding',
  '3d printing': '3D Printing',
  'blender 3d': '3D Modeling',
  '3d modeling': '3D Modeling',
  'stop motion': 'Stop Motion Animation',
  'calligraphy': 'Calligraphy',
  'shodo': 'Shodo',
  'woodworking': 'Woodworking',
  'cooking': 'Cooking',
  'baking': 'Baking',
  'gardening': 'Gardening',
  'hiking': 'Hiking',
  'cycling': 'Cycling',
  'running': 'Running',
  'swimming': 'Swimming',
  'yoga': 'Yoga',
  'meditation': 'Meditation',
  'chess': 'Chess',
  'guitar': 'Guitar',
  'piano': 'Piano',
  'drums': 'Drums',
  'ukulele': 'Ukulele',
  'violin': 'Violin',
  'singing': 'Singing',
  'painting': 'Oil Painting',
  'watercolor': 'Watercolor Painting',
  'drawing': 'Drawing',
  'sketching': 'Urban Sketching',
  'pottery': 'Pottery',
  'sculpting': 'Sculpting',
  'knitting': 'Knitting',
  'crocheting': 'Crocheting',
  'sewing': 'Sewing',
  'journaling': 'Journaling',
  'writing': 'Creative Writing',
  'blogging': 'Blogging',
  'podcasting': 'Podcasting',
  'filmmaking': 'Filmmaking',
  'video editing': 'Video Editing',
  'video game': 'Video Games',
  'gaming': 'Video Games',
  'board game': 'Board Games',
  'tabletop': 'Tabletop RPGs',
  'dnd': 'Tabletop RPGs',
  'd&d': 'Tabletop RPGs',
  'rock climbing': 'Rock Climbing',
  'bouldering': 'Bouldering',
  'surfing': 'Surfing',
  'skateboarding': 'Skateboarding',
  'skiing': 'Skiing',
  'snowboarding': 'Snowboarding',
  'camping': 'Camping',
  'backpacking': 'Backpacking',
  'fishing': 'Fishing',
  'archery': 'Archery',
  'fencing': 'Fencing',
  'boxing': 'Boxing',
  'kickboxing': 'Kickboxing',
  'tai chi': 'Tai Chi',
  'tea ceremony': 'Tea Ceremony',
  'origami': 'Origami',
  'ikebana': 'Ikebana',
  'bonsai': 'Bonsai',
  'aquarium': 'Aquarium Keeping',
  'drone': 'Drone Flying',
  'dj': 'DJing',
  'music production': 'Music Production',
  'beatbox': 'Beatboxing',
  'magic': 'Card Magic',
  'juggling': 'Juggling',
  'cosplay': 'Cosplay',
  'lego': 'Lego Building',
  'puzzle': 'Puzzle Solving',
  'reading': 'Reading',
  'book club': 'Book Clubs',
  'astronomy': 'Astronomy',
  'stargazing': 'Stargazing',
  'birdwatch': 'Birdwatching',
  'homebrew': 'Homebrewing',
  'wine tasting': 'Wine Tasting',
  'coffee': 'Coffee Roasting',
  'ferment': 'Fermentation',
  'leatherwork': 'Leatherworking',
  'jewelry': 'Jewelry Making',
  'candle': 'Candle Making',
  'soap making': 'Soap Making',
  'mechanical keyboard': 'Mechanical Keyboards',
  'vinyl': 'Vinyl Records',
  'coin collect': 'Coin Collecting',
  'stamp collect': 'Stamp Collecting',
  'fountain pen': 'Fountain Pens',
  'language learning': 'Language Learning',
  'language exchange': 'Language Exchange',
  'learning japanese': 'Language Learning',
  'learning chinese': 'Language Learning',
  'learning spanish': 'Language Learning',
  'learning french': 'Language Learning',
  'japanese language': 'Language Learning',
  'data visualization': 'Data Visualization',
  'home automation': 'Home Automation',
  'ethical hacking': 'Ethical Hacking',
  'lock picking': 'Lock Picking',
  'laser cutting': 'Laser Cutting',
  'whittling': 'Whittling',
  'pen turning': 'Pen Turning',
  'glassblowing': 'Glassblowing',
  'blacksmithing': 'Blacksmithing',
  'philosophy': 'Philosophy',
  'neuroscience': 'Philosophy',
  'volunteer': 'Volunteering',
  'sailing': 'Sailing',
  'kayaking': 'Kayaking',
  'scuba': 'Scuba Diving',
  'tennis': 'Tennis',
  'badminton': 'Badminton',
  'table tennis': 'Table Tennis',
  'bowling': 'Bowling',
  'golf': 'Disc Golf',
  'parkour': 'Parkour',
  'slackline': 'Slacklining',
  'strength training': 'Weightlifting',
  'weightlifting': 'Weightlifting',
  'weight training': 'Weightlifting',
  'powerlifting': 'Weightlifting',
  'bodybuilding': 'Weightlifting',
  'calisthenics': 'Calisthenics',
  'ios development': 'Coding',
  'app development': 'Coding',
  'mobile development': 'Coding',
  'hardware prototyping': 'Electronics',
  'electronics': 'Electronics',
  'arduino': 'Electronics',
  'raspberry pi': 'Electronics',
  'ham radio': 'Ham Radio',
  'digital art': 'Digital Illustration',
  'illustration': 'Digital Illustration',
  'travel': 'Travel',
};

const activityVerbs = [
  'practices', 'practice', 'practises', 'practise',
  'plays', 'play', 'playing',
  'does', 'doing',
  'studies', 'study', 'studying',
  'learns', 'learn', 'learning',
  'teaches', 'teach', 'teaching',
  'trains', 'train', 'training',
  'enjoys', 'enjoy', 'enjoying',
  'loves', 'love', 'loving',
  'shoots', 'shoot', 'shooting',
  'builds', 'build', 'building',
  'makes', 'make', 'making',
  'collects', 'collect', 'collecting',
  'explored', 'explores', 'explore', 'exploring',
  'started', 'starts', 'start', 'starting',
  'into',
  'tried',
];

let hobbyStorePromise;
let graphStorePromise;

function avg(...vals) {
  if (!vals.length) return 0;
  return vals.reduce((sum, value) => sum + value, 0) / vals.length;
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function slugifyText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(s) {
  return slugifyText(s)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function computeRadar(dims = {}) {
  return {
    commitment: avg(dims.time_per_session || 0, dims.consistency_required || 0),
    cost: avg(dims.startup_cost || 0, dims.ongoing_cost || 0, dims.gear_dependency || 0),
    body: avg(dims.physical_demand || 0, dims.injury_risk || 0),
    environment: avg(dims.space_required || 0, 1 - (dims.portability || 0)),
    social: dims.social_dependency || 0,
    depth: avg(
      dims.learning_curve || 0,
      dims.first_win_difficulty || 0,
      dims.age_longevity || 0,
      dims.creative_expression || 0,
      dims.historical_cultural_depth || 0,
    ),
  };
}

function buildHobbyResponse(raw) {
  const dimensions = raw.dimensions || {};
  const aliases = raw.aliases || [];
  const hobby = {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    nameZh: raw.name_zh || '',
    shortDesc: raw.short_desc || raw.description || '',
    longDesc: raw.long_desc || '',
    difficultySummary: raw.difficulty_summary || '',
    starterPath: raw.starter_path || '',
    popularity: raw.popularity ?? 0.5,
    dimensions,
    aliases,
    radar: computeRadar(dimensions),
  };
  hobby.searchText = slugifyText([
    hobby.name,
    hobby.nameZh,
    hobby.shortDesc,
    hobby.longDesc,
    hobby.difficultySummary,
    hobby.starterPath,
    aliases.join(' '),
    raw.description || '',
    raw.metadata?.category || '',
    raw.metadata?.original_setting || '',
    raw.metadata?.original_social || '',
  ].join(' '));
  return hobby;
}

async function loadHobbyStore() {
  if (!hobbyStorePromise) {
    hobbyStorePromise = (async () => {
      const rawHobbies = await fetch(HOBBIES_URL).then((res) => {
        if (!res.ok) throw new Error('Failed to load hobbies');
        return res.json();
      });

      const hobbies = rawHobbies.map(buildHobbyResponse);
      hobbies.sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return a.name.localeCompare(b.name);
      });

      return {
        hobbies,
        byId: new Map(hobbies.map((hobby) => [hobby.id, hobby])),
        byName: new Map(hobbies.map((hobby) => [hobby.name, hobby])),
      };
    })();
  }
  return hobbyStorePromise;
}

async function loadGraphStore() {
  if (!graphStorePromise) {
    graphStorePromise = (async () => {
      const hobbyStore = await loadHobbyStore();
      const [concepts, edges] = await Promise.all([
        fetch(CONCEPTS_URL).then((res) => {
          if (!res.ok) throw new Error('Failed to load concepts');
          return res.json();
        }),
        fetch(EDGES_URL).then((res) => {
          if (!res.ok) throw new Error('Failed to load edges');
          return res.json();
        }),
      ]);

      const nodeTypes = new Map();
      const conceptTexts = [];
      const adjacency = new Map();

      for (const hobby of hobbyStore.hobbies) {
        nodeTypes.set(hobby.id, 'hobby');
      }
      for (const concept of concepts) {
        nodeTypes.set(concept.id, concept.node_type || 'concept');
        conceptTexts.push({
          id: concept.id,
          text: slugifyText([concept.name, concept.slug, concept.description || ''].join(' ')),
        });
      }

      for (const edge of edges) {
        if (!adjacency.has(edge.from_node_id)) adjacency.set(edge.from_node_id, []);
        if (!adjacency.has(edge.to_node_id)) adjacency.set(edge.to_node_id, []);
        adjacency.get(edge.from_node_id).push(edge);
        adjacency.get(edge.to_node_id).push(edge);
      }

      return {
        ...hobbyStore,
        concepts,
        conceptTexts,
        adjacency,
        nodeTypes,
      };
    })();
  }
  return graphStorePromise;
}

function scoreQueryAgainstText(text, query) {
  const normalizedQuery = slugifyText(query);
  if (!normalizedQuery) return 0;

  let score = 0;
  if (text.includes(normalizedQuery)) {
    score += normalizedQuery.length > 3 ? 3 : 1.5;
  }

  const queryTokens = tokenize(normalizedQuery);
  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += token.length > 4 ? 0.9 : 0.45;
    }
  }
  return score;
}

function searchItems(items, query, limit, textField = 'searchText') {
  const scored = [];
  for (const item of items) {
    const score = scoreQueryAgainstText(item[textField], query);
    if (score > 0) {
      scored.push({ item, score });
    }
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.item.popularity ?? 0) !== (a.item.popularity ?? 0)) {
      return (b.item.popularity ?? 0) - (a.item.popularity ?? 0);
    }
    return a.item.name.localeCompare(b.item.name);
  });
  return scored.slice(0, limit);
}

function listPassesFilters(hobby, params) {
  const dims = hobby.dimensions || {};
  const maxChecks = [
    ['startup_cost_max', 'startup_cost'],
    ['ongoing_cost_max', 'ongoing_cost'],
    ['time_per_session_max', 'time_per_session'],
    ['physical_demand_max', 'physical_demand'],
    ['space_required_max', 'space_required'],
    ['social_dependency_max', 'social_dependency'],
  ];

  for (const [paramKey, dimKey] of maxChecks) {
    const raw = params.get(paramKey);
    if (raw == null || raw === '') continue;
    const maxValue = Number(raw);
    if (Number.isFinite(maxValue) && (dims[dimKey] || 0) > maxValue) {
      return false;
    }
  }
  return true;
}

function extractList(s) {
  let end = s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '.' || c === ';' || c === '\n' || i > 120) {
      end = i;
      break;
    }
  }
  const chunk = s.slice(0, end).trim();
  return chunk
    .split(',')
    .flatMap((part) => part.split(' and '))
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
}

function extractPhrase(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === ',' || c === '.' || c === ';' || c === '\n' || i > 60) {
      return s.slice(0, i).trim();
    }
  }
  return s.trim();
}

function makeSignal(signalType, text, normalized, weight, confidence) {
  return {
    id: crypto.randomUUID(),
    type: signalType,
    signalType,
    text,
    normalizedValue: normalize(normalized),
    weight,
    confidence,
  };
}

function extractSignals(text) {
  const lower = String(text || '').toLowerCase();
  const signals = [];
  const seen = new Set();

  const addSignal = (signalType, signalText, normalized, weight, confidence) => {
    const key = signalType + ':' + normalize(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    signals.push(makeSignal(signalType, signalText, normalized, weight, confidence));
  };

  for (const [pattern, hobbyName] of Object.entries(hobbyAliases)) {
    if (lower.includes(pattern)) {
      addSignal('interest', hobbyName, hobbyName, 0.9, 0.85);
    }
  }

  const interestKeywords = [
    'interested in', 'interest in', 'interests in', 'interests spanning',
    'fascinated by', 'passionate about', 'curiosity about', 'curious about',
  ];
  for (const keyword of interestKeywords) {
    const index = lower.indexOf(keyword);
    if (index >= 0) {
      const after = text.slice(index + keyword.length).trim();
      for (const phrase of extractList(after)) {
        addSignal('interest', phrase, phrase, 0.85, 0.7);
      }
    }
  }

  for (const verb of activityVerbs) {
    const search = verb + ' ';
    let index = 0;
    while (true) {
      const pos = lower.indexOf(search, index);
      if (pos < 0) break;
      const phrase = extractPhrase(text.slice(pos + search.length).trim());
      if (phrase && phrase.length > 2) {
        addSignal('experience', phrase, phrase, 0.85, 0.75);
      }
      index = pos + search.length;
    }
  }

  const constraintMap = {
    'low cost': 'low_cost',
    'cheap': 'low_cost',
    'budget': 'low_cost',
    'affordable': 'low_cost',
    'not much time': 'low_time',
    'limited time': 'low_time',
    'short sessions': 'low_time',
    'solo': 'solo_friendly',
    'alone': 'solo_friendly',
    'by myself': 'solo_friendly',
    'not physical': 'low_physical',
    'low physical': 'low_physical',
    'small space': 'low_space',
    'apartment': 'low_space',
    'creative': 'high_creative',
    'artistic': 'high_creative',
    'long-term': 'high_longevity',
    'lifetime': 'high_longevity',
    'travel': 'portable',
    'portable': 'portable',
    'outdoor': 'outdoor',
    'indoor': 'indoor',
  };

  for (const [phrase, normalized] of Object.entries(constraintMap)) {
    if (lower.includes(phrase)) {
      addSignal('lifestyle_constraint', phrase, normalized, 0.75, 0.6);
    }
  }

  const goalKeywords = {
    'meaningful': 'meaningful_hobby',
    'progress': 'sense_of_progress',
    'mastery': 'mastery',
    'relaxing': 'relaxation',
    'calm': 'relaxation',
    'social': 'social_connection',
    'community': 'social_connection',
    'identity': 'identity',
    'proud': 'achievement',
    'achievement': 'achievement',
    'competition': 'competition',
    'compete': 'competition',
    'disciplined': 'disciplined_practice',
    'discipline': 'disciplined_practice',
    'focus': 'focus',
    'mindful': 'mindfulness',
    'flow state': 'flow',
    'challenge': 'challenge',
    'intellectual': 'intellectual',
    'problem-solv': 'problem_solving',
    'hands-on': 'hands_on',
    'tactile': 'hands_on',
    'hardware': 'hands_on',
    'content creation': 'content_creation',
  };

  for (const [keyword, normalized] of Object.entries(goalKeywords)) {
    if (lower.includes(keyword)) {
      addSignal('desired_experience', keyword, normalized, 0.8, 0.65);
    }
  }

  if (!signals.length) {
    signals.push(makeSignal('interest', text.trim(), text.trim(), 0.7, 0.5));
  }

  return signals;
}

function vectorScoreForID(id, results) {
  for (const result of results || []) {
    if (result.id === id) return result.score;
  }
  return 0;
}

function ftsScore(id, results) {
  for (let i = 0; i < results.length; i++) {
    if (results[i].id === id) {
      return 1 / (1 + i);
    }
  }
  return 0;
}

function graphScore(id, results) {
  for (const result of results) {
    if (result.id === id) return result.score;
  }
  return 0;
}

function computeDimensionScore(signals, hobbyDims) {
  const constraintMap = {
    low_cost: { dims: ['startup_cost', 'ongoing_cost'], lowGood: true },
    low_time: { dims: ['time_per_session', 'consistency_required'], lowGood: true },
    low_physical: { dims: ['physical_demand'], lowGood: true },
    low_space: { dims: ['space_required'], lowGood: true },
    solo_friendly: { dims: ['social_dependency'], lowGood: true },
    high_creative: { dims: ['creative_expression'], lowGood: false },
    high_longevity: { dims: ['age_longevity'], lowGood: false },
    portable: { dims: ['portability'], lowGood: false },
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    if (signal.signalType !== 'lifestyle_constraint' && signal.type !== 'lifestyle_constraint') continue;
    const entry = constraintMap[signal.normalizedValue];
    if (!entry) continue;

    for (const dimKey of entry.dims) {
      const value = hobbyDims[dimKey];
      if (value == null) continue;
      const match = entry.lowGood ? 1 - value : value;
      totalScore += match * signal.weight;
      totalWeight += signal.weight;
    }
  }

  return totalWeight === 0 ? 0.5 : totalScore / totalWeight;
}

function computeOutcomeScore(signals, hobby) {
  const hobbyLower = (hobby.longDesc || '').toLowerCase();
  let score = 0;
  for (const signal of signals) {
    if ((signal.signalType === 'desired_experience' || signal.type === 'desired_experience')
      && hobbyLower.includes(signal.text.toLowerCase())) {
      score += signal.weight;
    }
  }
  return Math.min(score, 1);
}

function computeFinalScore(candidate) {
  return WtVector * candidate.vectorScore
    + WtFTS * candidate.ftsScore
    + WtGraph * candidate.graphScore
    + WtDimension * candidate.dimensionScore
    + WtOutcome * candidate.outcomeScore
    + WtNovelty * candidate.noveltyScore
    - WtBarrier * candidate.barrierPenalty;
}

function generateReasons(signals, hobby) {
  const reasons = [];
  const hobbyLower = slugifyText([
    hobby.name,
    hobby.shortDesc,
    hobby.longDesc,
    hobby.aliases.join(' '),
  ].join(' '));

  for (const signal of signals) {
    if (reasons.length >= 3) break;
    if (signal.signalType !== 'interest' && signal.type !== 'interest') continue;
    const sigLower = slugifyText(signal.text);
    if (hobbyLower.includes(sigLower) || sigLower.includes(slugifyText(hobby.name))) {
      reasons.push('Matches your interest in ' + signal.text);
    }
  }

  const stopWords = new Set([
    'with', 'that', 'this', 'from', 'have', 'been', 'also', 'just', 'like', 'very',
    'more', 'some', 'than', 'them', 'then', 'when', 'what', 'your', 'about', 'would',
    'their', 'which', 'could', 'other', 'after', 'recently', 'achieved', 'interested',
    'following', 'program', 'using', 'including', 'shoot',
  ]);
  for (const signal of signals) {
    if (reasons.length >= 3) break;
    if (signal.signalType !== 'experience' && signal.type !== 'experience') continue;
    for (const word of tokenize(signal.text)) {
      if (word.length > 4 && !stopWords.has(word) && hobbyLower.includes(word)) {
        reasons.push('Relates to your experience');
        break;
      }
    }
  }

  for (const signal of signals) {
    if (reasons.length >= 3) break;
    if (signal.signalType === 'desired_experience' || signal.type === 'desired_experience') {
      if (hobbyLower.includes(slugifyText(signal.text))) {
        reasons.push('Fits your goal: ' + signal.text);
      }
    }
  }

  if (!reasons.length) {
    reasons.push(hobby.shortDesc);
  }
  if (reasons.length < 3 && hobby.difficultySummary) {
    reasons.push(hobby.difficultySummary);
  }
  while (reasons.length < 3) {
    reasons.push('Discovered via knowledge graph');
  }
  return reasons.slice(0, 3);
}

function generateCaution(hobby) {
  const dims = hobby.dimensions || {};
  if ((dims.startup_cost || 0) > 0.7) return 'Higher initial investment required';
  if ((dims.physical_demand || 0) > 0.7) return 'Physically demanding — start gradually';
  if ((dims.space_required || 0) > 0.7) return 'Requires dedicated space';
  if ((dims.consistency_required || 0) > 0.7) return 'Needs regular practice to progress';
  return 'Results take time — be patient';
}

function passesDimFilter(hobby, filters = {}) {
  const dims = hobby.dimensions || {};
  if (filters.startup_cost_max != null && (dims.startup_cost || 0) > filters.startup_cost_max) return false;
  if (filters.ongoing_cost_max != null && (dims.ongoing_cost || 0) > filters.ongoing_cost_max) return false;
  if (filters.time_per_session_max != null && (dims.time_per_session || 0) > filters.time_per_session_max) return false;
  if (filters.physical_demand_max != null && (dims.physical_demand || 0) > filters.physical_demand_max) return false;
  if (filters.space_required_max != null && (dims.space_required || 0) > filters.space_required_max) return false;
  if (filters.social_dependency_max != null && (dims.social_dependency || 0) > filters.social_dependency_max) return false;
  return true;
}

function rrfMerge(fts, graph, vector, k) {
  const scores = new Map();
  const addChannel = (results, weight) => {
    results.forEach((result, index) => {
      scores.set(result.id, (scores.get(result.id) || 0) + weight / (k + index + 1));
    });
  };

  addChannel(fts, W_FTS);
  addChannel(graph, W_GRAPH);
  addChannel(vector || [], W_VECTOR);

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

function searchHobbiesByClauses(hobbies, clauses, limit) {
  if (!clauses.length) return [];
  const scored = [];
  for (const hobby of hobbies) {
    let score = 0;
    for (const clause of clauses) {
      score += scoreQueryAgainstText(hobby.searchText, clause);
    }
    if (score > 0) {
      scored.push({ id: hobby.id, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function searchConceptsByText(conceptTexts, query, limit) {
  const scored = [];
  for (const concept of conceptTexts) {
    const score = scoreQueryAgainstText(concept.text, query);
    if (score > 0) {
      scored.push({ id: concept.id, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.id);
}

function expandViaGraph(store, signals) {
  const conceptIds = [];
  const seen = new Set();

  for (const signal of signals) {
    const ids = searchConceptsByText(store.conceptTexts, signal.text, 10);
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        conceptIds.push(id);
      }
    }
  }

  if (!conceptIds.length) return [];

  const hobbyScores = new Map();
  const queue = conceptIds.map((id) => ({
    nodeId: id,
    hops: 0,
    pathWeight: 1,
    path: [id],
  }));

  while (queue.length) {
    const visit = queue.shift();
    const nodeType = store.nodeTypes.get(visit.nodeId);
    if (nodeType === 'hobby') {
      const score = visit.pathWeight / (1 + 0.35 * visit.hops);
      hobbyScores.set(visit.nodeId, (hobbyScores.get(visit.nodeId) || 0) + score);
    }

    if (visit.hops >= 2) continue;

    const edges = store.adjacency.get(visit.nodeId) || [];
    for (const edge of edges) {
      const neighbor = edge.to_node_id === visit.nodeId ? edge.from_node_id : edge.to_node_id;
      if ((edge.weight || 0) < 0.4 || visit.path.includes(neighbor)) continue;
      queue.push({
        nodeId: neighbor,
        hops: visit.hops + 1,
        pathWeight: visit.pathWeight * edge.weight,
        path: visit.path.concat(neighbor),
      });
    }
  }

  return Array.from(hobbyScores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
}

export async function getHobbies(params = '') {
  const store = await loadHobbyStore();
  const searchParams = new URLSearchParams(params);
  const query = searchParams.get('q') || '';
  const limit = Number(searchParams.get('limit') || '50');
  const offset = Number(searchParams.get('offset') || '0');

  let hobbies;
  if (query) {
    hobbies = searchItems(store.hobbies, query, limit + offset).map((entry) => entry.item);
  } else {
    hobbies = store.hobbies.filter((hobby) => listPassesFilters(hobby, searchParams));
  }

  return hobbies.slice(offset, offset + limit);
}

export async function getHobby(id) {
  const store = await loadHobbyStore();
  const hobby = store.byId.get(id);
  if (!hobby) {
    throw new Error('hobby not found');
  }
  return hobby;
}

export async function compareHobbies(ids) {
  const store = await loadHobbyStore();
  return ids.map((id) => {
    const hobby = store.byId.get(id);
    if (!hobby) throw new Error('hobby not found');
    return hobby;
  });
}

export async function extractMemory(text) {
  const signals = extractSignals(text);
  return {
    memorySessionId: crypto.randomUUID(),
    signals: signals.map((signal) => ({
      type: signal.type,
      text: signal.text,
      normalizedValue: signal.normalizedValue,
      weight: signal.weight,
    })),
  };
}

export async function recommend(signals, filters = {}, limit = 20, vectorResults = []) {
  const store = await loadGraphStore();
  const normalizedSignals = (signals || []).map((signal) => ({
    ...signal,
    type: signal.type || signal.signalType,
    signalType: signal.signalType || signal.type,
    text: signal.text || '',
    normalizedValue: signal.normalizedValue || normalize(signal.text || ''),
    weight: signal.weight ?? 1,
  }));

  if (!normalizedSignals.length) {
    throw new Error('no signals — provide signals or memorySessionId');
  }

  const queryParts = normalizedSignals
    .filter((signal) => signal.signalType === 'interest' || signal.signalType === 'desired_experience')
    .map((signal) => signal.text)
    .filter(Boolean);

  const ftsResults = searchHobbiesByClauses(store.hobbies, queryParts, 100);
  const interestSignals = normalizedSignals.filter((signal) => signal.signalType === 'interest' || signal.signalType === 'desired_experience');
  const graphResults = expandViaGraph(store, interestSignals);
  const merged = rrfMerge(ftsResults, graphResults, vectorResults || [], 20);

  const maxGraphScore = Math.max(1, ...graphResults.map((result) => result.score));
  const candidates = [];

  for (const mergedResult of merged.slice(0, 100)) {
    const hobby = store.byId.get(mergedResult.id);
    if (!hobby || !passesDimFilter(hobby, filters)) continue;

    const candidate = {
      hobbyId: hobby.id,
      hobbyName: hobby.name,
      hobbyNameZh: hobby.nameZh,
      vectorScore: vectorScoreForID(hobby.id, vectorResults || []),
      ftsScore: ftsScore(hobby.id, ftsResults),
      graphScore: graphScore(hobby.id, graphResults) / maxGraphScore,
      dimensionScore: computeDimensionScore(normalizedSignals, hobby.dimensions || {}),
      outcomeScore: computeOutcomeScore(normalizedSignals, hobby),
      noveltyScore: 0.5,
      barrierPenalty: 0,
      reasons: generateReasons(normalizedSignals, hobby),
      caution: generateCaution(hobby),
      radar: hobby.radar,
    };
    candidate.finalScore = computeFinalScore(candidate);
    candidates.push(candidate);
  }

  candidates.sort((a, b) => b.finalScore - a.finalScore);

  return {
    results: candidates.slice(0, limit).map((candidate, index) => {
      const hobby = store.byId.get(candidate.hobbyId);
      return {
        hobbyId: candidate.hobbyId,
        hobbyName: candidate.hobbyName,
        hobbyNameZh: candidate.hobbyNameZh,
        slug: hobby?.slug || '',
        shortDesc: hobby?.shortDesc || '',
        rank: index + 1,
        reasons: candidate.reasons,
        caution: candidate.caution,
        radar: candidate.radar,
      };
    }),
  };
}
