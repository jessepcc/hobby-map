// ── State ──
const state = {
  hobbies: [],
  compareIds: new Set(),
  charts: {},
  visibleCount: 15,
  lastMemory: null,
  lastSignals: null,
  lastResults: null,
};

// ── Explore Dimension Definitions ──
const EXPLORE_DIMS = [
  { id: 'cost', label: 'Commitment', lowPole: 'Casual', highPole: 'Dedicated',
    phrases: ['Drop-in anytime', 'Light routine', 'Steady practice', 'Serious habit', 'Full dedication'],
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' },
  { id: 'phys', label: 'Cost', lowPole: 'Free', highPole: 'Premium',
    phrases: ['Nearly free', 'Budget-friendly', 'Moderate spend', 'Real investment', 'Premium gear'],
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { id: 'time', label: 'Body', lowPole: 'Gentle', highPole: 'Intense',
    phrases: ['Minimal effort', 'Light activity', 'Moderate exertion', 'Demanding', 'Full-body intense'],
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' },
  { id: 'space', label: 'Environment', lowPole: 'Anywhere', highPole: 'Dedicated space',
    phrases: ['Do it anywhere', 'Small footprint', 'Some room needed', 'Specific venue', 'Fixed facility'],
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>' },
  { id: 'social', label: 'Social', lowPole: 'Solo', highPole: 'Group',
    phrases: ['Fully solo', 'Mostly alone', 'Flexible', 'With others', 'Team required'],
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="19" cy="7" r="3"/><path d="M21 21v-2a3 3 0 00-2-2.8"/></svg>' },
  { id: 'depth', label: 'Depth', lowPole: 'Quick start', highPole: 'Deep mastery',
    phrases: ['Pick up in a day', 'Short learning curve', 'Moderate depth', 'Years of growth', 'Lifelong pursuit'],
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
];

function updateDimVisuals(dd, value) {
  const phraseEl = document.getElementById('dim-phrase-' + dd.id);
  if (phraseEl) {
    const idx = Math.min(Math.floor(value * dd.phrases.length), dd.phrases.length - 1);
    phraseEl.textContent = dd.phrases[idx];
  }
  const numFilled = Math.round(value * 5);
  for (let i = 0; i < 5; i++) {
    const block = document.getElementById('dim-block-' + dd.id + '-' + i);
    if (block) block.classList.toggle('filled', i < numFilled);
  }
  const range = document.getElementById('f-' + dd.id);
  if (range) {
    const pct = value * 100;
    range.style.background = 'linear-gradient(to right, var(--y) 0%, var(--y) ' + pct + '%, var(--rule) ' + pct + '%, var(--rule) 100%)';
  }
  const ctrlEl = document.getElementById('dim-ctrl-' + dd.id);
  if (ctrlEl) ctrlEl.classList.toggle('active', value !== 0.5);
}

// ── API ──
async function api(path, opts) {
  const res = await fetch('/api' + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
const getHobbies = (params = '') => api('/hobbies' + (params ? '?' + params : ''));
const getHobby = (id) => api('/hobbies/' + id);
const compareHobbies = (ids) => api('/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
const extractMemory = (text) => api('/memory/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source: 'manual_paste' }) });
const recommend = (signals, filters, limit, vectorResults) => api('/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signals, filters: filters || {}, limit: limit || 20, vectorResults: vectorResults || [] }) });

// ── Router ──
function route() {
  const hash = location.hash || '#/';
  const path = hash.slice(1);
  const exploreLink = document.getElementById('nav-explore');
  if (exploreLink) exploreLink.classList.toggle('active', path === '/explore');
  destroyCharts();
  if (path === '/explore') renderExplore();
  else if (path === '/results') renderResults();
  else if (path.startsWith('/hobby/')) renderDetail(path.split('/hobby/')[1]);
  else if (path === '/compare') renderCompare();
  else renderLanding();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

function destroyCharts() {
  Object.values(state.charts).forEach(c => c.destroy());
  state.charts = {};
}

// ── DOM ──
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'cls') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  });
  if (children != null) {
    if (typeof children === 'string') node.textContent = children;
    else if (Array.isArray(children)) children.forEach(c => { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    else node.appendChild(typeof children === 'string' ? document.createTextNode(children) : children);
  }
  return node;
}

// ════════════ LANDING ════════════
const MEMORY_PROMPT = [
  'I am moving to another service and need to export my data. Just write every memory you',
  'have about me, as well as any context you have inferred about me from past',
  'conversations. From everything on a single very long text, or even multiple ones if it',
  'makes more easily, as follows/output, if available -- memory content',
  '',
  'Then also try to cover all of the following -- previous AI-wide memories about yourself:',
  '',
  ' - Instructions I have given you about how to consume ideas, content, style,',
  '   always on, or trend to fit',
  ' - Personal details, name, location, job, family, interests',
  ' - Favorite genres, entertainment, and relaxing tenure',
  ' - Skills, languages, and frameworks I work with',
  ' - Preferences and requirements I have made to your behaviors',
  ' - Any other useful context for improving recommendations',
  '',
  'Do not apologize. Be thorough. Try not to miss anything. Write the long block,',
  'then fix the last sections left to try and fill.',
].join('\n');

function renderLanding() {
  const app = document.getElementById('app');
  app.replaceChildren();

  // Hero
  const hero = el('div', { cls: 'hero' });
  hero.appendChild(el('span', { cls: 'hero-deco' }, '+'));
  hero.appendChild(el('h1', null, 'Find your thing.'));
  hero.appendChild(el('p', { cls: 'subtitle' }, 'Paste Memory. We\u2019ll find hobbies that fit your life.'));

  const inputCard = el('div', { cls: 'input-card' });
  const textarea = el('textarea', {
    id: 'memory-input',
    placeholder: 'Paste how AI sees you in memory...',
    rows: '5',
  });
  inputCard.appendChild(textarea);
  hero.appendChild(inputCard);

  const ctaBtn = el('button', { cls: 'cta-btn', id: 'match-btn', onClick: runMatch }, 'Discover hobbies');
  hero.appendChild(ctaBtn);
  hero.appendChild(el('div', { id: 'input-helper-slot' }));

  const landing = el('div', { cls: 'landing' });
  landing.appendChild(hero);

  // Memory Guide
  const guide = el('div', { cls: 'memory-guide' });
  const guideCard = el('div', { cls: 'guide-card' });

  const headingRow = el('div', { cls: 'guide-heading' });
  headingRow.appendChild(el('span', { cls: 'guide-heading-label' }, 'HOW TO GET YOUR MEMORY'));
  guideCard.appendChild(headingRow);

  guideCard.appendChild(el('p', { cls: 'guide-desc' }, 'Copy and paste the provided prompt into a chat with any AI provider. It is written specifically to help you get all of your context in one chat.'));

  const promptBlock = el('div', { cls: 'prompt-block' });
  promptBlock.textContent = MEMORY_PROMPT;
  guideCard.appendChild(promptBlock);

  function makeCopyIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14'); svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flexShrink = '0';
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '9'); rect.setAttribute('y', '9');
    rect.setAttribute('width', '13'); rect.setAttribute('height', '13'); rect.setAttribute('rx', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');
    svg.appendChild(rect); svg.appendChild(path);
    return svg;
  }
  function setCopyBtnDefault() {
    copyBtn.textContent = '';
    copyBtn.appendChild(makeCopyIcon());
    copyBtn.appendChild(document.createTextNode(' Copy prompt'));
  }
  const copyBtn = el('button', { cls: 'copy-btn', onClick: () => {
    navigator.clipboard.writeText(MEMORY_PROMPT).then(() => {
      copyBtn.textContent = '\u2713 Copied!';
      setTimeout(setCopyBtnDefault, 2000);
    });
  }});
  setCopyBtnDefault();
  guideCard.appendChild(copyBtn);

  const refLink = el('a', { cls: 'guide-ref' }, 'Learn more at claude.com/import-memory');
  refLink.href = 'https://claude.com/import-memory';
  refLink.target = '_blank';
  refLink.rel = 'noopener noreferrer';
  guideCard.appendChild(refLink);
  guide.appendChild(guideCard);
  landing.appendChild(guide);

  // Footer
  const footer = el('div', { cls: 'footer-bar' });
  footer.appendChild(el('span', null, 'No surveys'));
  footer.appendChild(el('span', { cls: 'footer-dot' }, '\u00b7'));
  footer.appendChild(el('span', null, 'AI-powered matching'));
  footer.appendChild(el('span', { cls: 'footer-dot' }, '\u00b7'));
  footer.appendChild(el('span', null, 'Instant results'));
  landing.appendChild(footer);

  app.appendChild(landing);
}

async function runMatch() {
  const textarea = document.getElementById('memory-input');
  const text = textarea?.value?.trim();
  if (!text) {
    textarea.closest('.input-card').classList.add('shake');
    setTimeout(() => textarea.closest('.input-card').classList.remove('shake'), 500);
    const slot = document.getElementById('input-helper-slot');
    if (slot && !slot.hasChildNodes()) {
      slot.appendChild(el('div', { cls: 'input-helper' }, 'Write a few sentences about yourself \u2014 try the prompt below for ideas.'));
    }
    textarea.focus();
    return;
  }

  const btn = document.getElementById('match-btn');
  btn.disabled = true;
  btn.replaceChildren(el('span', { cls: 'spinner' }), ' Reading\u2026');

  try {
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
    state.lastResults = rec.results || [];
    location.hash = '#/results';
  } catch (err) {
    const slot = document.getElementById('input-helper-slot');
    if (slot) {
      slot.replaceChildren(el('div', { cls: 'input-helper' },
        err.message === 'Failed to fetch' ? 'Couldn\u2019t reach the server.' : 'Something didn\u2019t work. Try again.'));
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Discover hobbies';
  }
}

// ════════════ RESULTS ════════════
function renderResults() {
  const app = document.getElementById('app');
  app.replaceChildren();

  if (!state.lastResults) { location.hash = '#/'; return; }

  const page = el('div', { cls: 'results-page' });

  // Back link
  page.appendChild(el('button', { cls: 'back-link', onClick: () => { location.hash = '#/'; }}, [
    el('span', null, '\u2190'),
    el('span', null, 'Try different memory'),
  ]));

  // Memory Section
  const memSection = el('div', { cls: 'memory-section' });

  const memHeader = el('div', { cls: 'memory-header' });
  const memLabel = el('div', { cls: 'memory-label' });
  memLabel.appendChild(el('span', { cls: 'memory-label-plus' }, '+'));
  memLabel.appendChild(el('span', { cls: 'memory-label-text' }, 'YOUR MEMORY'));
  memHeader.appendChild(memLabel);
  memHeader.appendChild(el('div', { cls: 'memory-header-spacer' }));
  memHeader.appendChild(el('button', { cls: 'edit-link', onClick: () => { location.hash = '#/'; }}, [
    el('span', null, '\u270e'),
    el('span', null, 'Edit memory'),
  ]));
  memSection.appendChild(memHeader);

  const memCard = el('div', { cls: 'memory-card' });
  memCard.appendChild(el('p', null, state.lastMemory));
  memSection.appendChild(memCard);

  // Signals
  if (state.lastSignals?.length) {
    const sigSection = el('div', { cls: 'signals-section' });
    const grouped = {};
    const typeLabels = { interest: 'INTERESTS', lifestyle_constraint: 'LIFESTYLE', experience: 'EXPERIENCE', desired_experience: 'DESIRED EXPERIENCE' };
    state.lastSignals.forEach(s => {
      const key = s.type || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    let first = true;
    Object.entries(grouped).forEach(([type, sigs]) => {
      if (!first) sigSection.appendChild(el('div', { cls: 'signal-sep' }));
      first = false;
      const group = el('div', { cls: 'signal-group' });
      group.setAttribute('data-type', type);
      group.appendChild(el('span', { cls: 'signal-group-label' }, typeLabels[type] || type.replace(/_/g, ' ').toUpperCase()));
      const pills = el('div', { cls: 'signal-pills' });
      sigs.forEach(s => pills.appendChild(el('span', { cls: 'signal-pill' }, s.text)));
      group.appendChild(pills);
      sigSection.appendChild(group);
    });
    memSection.appendChild(sigSection);
  }
  page.appendChild(memSection);

  // Results Header
  const rHeader = el('div', { cls: 'results-header' });
  rHeader.appendChild(el('h2', null, 'Your matches'));
  rHeader.appendChild(el('span', { cls: 'results-subtitle' }, 'Based on your interests and lifestyle'));
  rHeader.appendChild(el('div', { cls: 'results-header-spacer' }));
  rHeader.appendChild(el('span', { cls: 'results-count' }, state.lastResults.length + ' results'));
  page.appendChild(rHeader);

  if (!state.lastResults.length) {
    page.appendChild(el('div', { cls: 'empty' }, [
      el('p', null, 'No strong matches \u2014 but that\u2019s useful info.'),
      el('p', null, 'Try adding more about what you enjoy, your schedule, or what you\u2019re looking for.'),
    ]));
    app.appendChild(page);
    return;
  }

  // Cards Grid
  const grid = el('div', { cls: 'cards-grid' });
  state.lastResults.forEach((r, i) => {
    const card = el('div', { cls: 'result-card', style: 'animation-delay:' + (i * 0.04) + 's', onClick: () => {
      location.hash = '#/hobby/' + (r.hobbyId || r.rank);
    }});

    const header = el('div', { cls: 'card-header' });
    const content = el('div', { cls: 'card-content' });
    content.appendChild(el('h3', null, r.hobbyName));

    // Separate tagged reasons (match/experience/goal) from descriptive text
    const taggedReasons = [];
    const descParts = [];
    (r.reasons || []).forEach(reason => {
      if (reason.startsWith('Matches your interest') || reason.startsWith('Relates to') || reason.startsWith('Fits your goal') || reason === 'Discovered via knowledge graph') {
        taggedReasons.push(reason);
      } else {
        descParts.push(reason);
      }
    });

    // Show descriptive text (short desc, difficulty) as card body — truncate to ~150 chars
    const descText = descParts.join(' ').slice(0, 160);
    if (descText) content.appendChild(el('p', { cls: 'card-desc' }, descText + (descParts.join(' ').length > 160 ? '…' : '')));
    header.appendChild(content);

    const radarWrap = el('div', { cls: 'card-radar' });
    radarWrap.appendChild(el('canvas', { id: 'result-radar-' + i }));
    header.appendChild(radarWrap);
    card.appendChild(header);

    // Chips — only show tagged match reasons
    const chips = el('div', { cls: 'card-chips' });
    taggedReasons.slice(0, 3).forEach(reason => {
      let chipCls = 'chip chip-info';
      if (reason.startsWith('Matches your interest')) chipCls = 'chip chip-match';
      else if (reason.startsWith('Relates to')) chipCls = 'chip chip-experience';
      else if (reason.startsWith('Fits your goal')) chipCls = 'chip chip-goal';
      chips.appendChild(el('span', { cls: chipCls }, reason));
    });
    if (r.caution) chips.appendChild(el('span', { cls: 'chip chip-muted' }, r.caution));
    card.appendChild(chips);

    // Footer
    const footer = el('div', { cls: 'card-footer' });
    footer.appendChild(el('button', { cls: 'card-explore-link', onClick: (e) => {
      e.stopPropagation();
      location.hash = '#/hobby/' + (r.hobbyId || r.rank);
    }}, 'Explore this hobby \u2192'));
    card.appendChild(footer);

    grid.appendChild(card);
  });
  page.appendChild(grid);
  app.appendChild(page);

  // Render radars
  state.lastResults.forEach((r, i) => {
    if (r.radar) renderRadar('result-radar-' + i, r.radar, r.hobbyName);
  });
}

// ════════════ EXPLORE ════════════
async function renderExplore() {
  const app = document.getElementById('app');
  app.replaceChildren();
  const page = el('div', { cls: 'page explore' });

  // Header
  const header = el('div', { cls: 'explore-header' });
  const headerLeft = el('div', { cls: 'explore-header-left' });
  headerLeft.appendChild(el('h1', null, 'Explore by dimension'));
  headerLeft.appendChild(el('p', null, 'Drag the axes to discover your ideal hobby. The catalogue reacts.'));
  header.appendChild(headerLeft);

  const headerRight = el('div', { cls: 'explore-header-right' });
  const searchBar = el('div', { cls: 'search-bar' });
  const searchInput = el('input', { type: 'text', id: 'search-input', placeholder: 'Search hobbies\u2026' });
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  searchBar.appendChild(searchInput);
  searchBar.appendChild(el('button', { cls: 'btn-primary', onClick: doSearch }, 'Explore'));
  headerRight.appendChild(searchBar);
  header.appendChild(headerRight);
  page.appendChild(header);

  // Dimension Controls
  const dims = el('div', { cls: 'dim-controls' });
  EXPLORE_DIMS.forEach(dd => {
    const ctrl = el('div', { cls: 'dim-control', id: 'dim-ctrl-' + dd.id });
    const header = el('div', { cls: 'dim-control-header' });
    const iconEl = el('span', { cls: 'dim-control-icon' });
    const iconDoc = new DOMParser().parseFromString(dd.icon, 'text/html');
    iconEl.appendChild(iconDoc.body.firstChild);
    header.appendChild(iconEl);
    header.appendChild(el('span', { cls: 'dim-control-label' }, dd.label));
    ctrl.appendChild(header);
    ctrl.appendChild(el('div', { cls: 'dim-control-phrase', id: 'dim-phrase-' + dd.id }, dd.phrases[2]));

    const intensity = el('div', { cls: 'dim-intensity' });
    for (let i = 0; i < 5; i++) {
      intensity.appendChild(el('div', {
        cls: 'dim-intensity-block' + (i < 3 ? ' filled' : ''),
        id: 'dim-block-' + dd.id + '-' + i,
      }));
    }
    ctrl.appendChild(intensity);

    const sliderWrap = el('div', { cls: 'dim-slider-wrap' });
    const range = el('input', { type: 'range', id: 'f-' + dd.id, min: '0', max: '1', step: '0.05', value: '0.5', 'aria-label': dd.label + ' filter' });
    range.style.background = 'linear-gradient(to right, var(--y) 0%, var(--y) 50%, var(--rule) 50%, var(--rule) 100%)';
    range.addEventListener('input', () => {
      updateDimVisuals(dd, parseFloat(range.value));
      applyFilters();
    });
    sliderWrap.appendChild(range);
    ctrl.appendChild(sliderWrap);

    const poles = el('div', { cls: 'dim-poles' });
    poles.appendChild(el('span', { cls: 'dim-pole' }, dd.lowPole));
    poles.appendChild(el('span', { cls: 'dim-pole' }, dd.highPole));
    ctrl.appendChild(poles);

    dims.appendChild(ctrl);
  });
  page.appendChild(dims);

  // Results
  page.appendChild(el('div', { id: 'hobby-list' }, [
    el('div', { cls: 'loading' }, [el('span', { cls: 'spinner' }), 'Loading\u2026'])
  ]));

  app.appendChild(page);
  app.appendChild(el('div', { id: 'compare-bar-slot' }));
  loadHobbies();
}

async function loadHobbies(query) {
  const list = document.getElementById('hobby-list');
  if (!list) return;
  list.replaceChildren(el('div', { cls: 'loading' }, [el('span', { cls: 'spinner' }), 'Loading\u2026']));
  try {
    const params = new URLSearchParams();
    if (query) { params.set('q', query); }
    else {
      const sliders = { startup_cost_max: 'f-cost', physical_demand_max: 'f-phys', time_per_session_max: 'f-time', space_required_max: 'f-space', social_dependency_max: 'f-social' };
      Object.entries(sliders).forEach(([param, id]) => {
        const v = parseFloat(document.getElementById(id)?.value || '1');
        if (v < 1) params.set(param, v);
      });
    }
    params.set('limit', '50');
    const hobbies = await getHobbies(params.toString());
    state.hobbies = hobbies;
    state.visibleCount = 15;
    renderHobbyList(hobbies);
  } catch (err) {
    const isNetwork = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
    list.replaceChildren(el('div', { cls: 'empty' }, [
      el('p', null, isNetwork ? 'Couldn\u2019t reach the server.' : 'Couldn\u2019t load hobbies.'),
      el('button', { cls: 'btn-secondary', onClick: () => loadHobbies(query) }, 'Retry'),
    ]));
  }
}

function doSearch() {
  const q = document.getElementById('search-input')?.value?.trim();
  loadHobbies(q || undefined);
}

function applyFilters() {
  const si = document.getElementById('search-input');
  if (si) si.value = '';
  loadHobbies();
}

function renderHobbyList(hobbies) {
  const list = document.getElementById('hobby-list');
  if (!list) return;
  destroyCharts();
  list.replaceChildren();

  if (!hobbies.length) {
    list.appendChild(el('div', { cls: 'empty' }, [
      el('p', null, 'No hobbies matched those filters.'),
      el('p', null, 'Try widening the sliders or clearing your search.'),
      el('button', { cls: 'btn-secondary', onClick: () => {
        const si = document.getElementById('search-input');
        if (si) si.value = '';
        EXPLORE_DIMS.forEach(dd => {
          const slider = document.getElementById('f-' + dd.id);
          if (slider) slider.value = '0.5';
          updateDimVisuals(dd, 0.5);
        });
        loadHobbies();
      }}, 'Reset filters'),
    ]));
    return;
  }

  const resultsWrap = el('div', { cls: 'results-list' });

  const rHeader = el('div', { cls: 'results-list-header' });
  rHeader.appendChild(el('h2', null, 'Best matches for your criteria'));
  resultsWrap.appendChild(rHeader);

  const visible = hobbies.slice(0, state.visibleCount);
  visible.forEach((h, i) => {
    const row = el('div', { cls: 'hobby-row', style: 'animation-delay:' + (i * 0.02) + 's', onClick: () => {
      location.hash = '#/hobby/' + h.id;
    }});

    // Rank
    const rank = el('div', { cls: 'hobby-rank' });
    rank.appendChild(el('span', null, String(i + 1)));
    row.appendChild(rank);

    // Image placeholder
    const img = el('div', { cls: 'hobby-img' });
    row.appendChild(img);

    // Info
    const info = el('div', { cls: 'hobby-info' });
    info.appendChild(el('h3', null, h.name));
    info.appendChild(el('div', { cls: 'hobby-desc' }, h.shortDesc));
    const tags = el('div', { cls: 'hobby-tags' });
    if (h.tags) {
      h.tags.slice(0, 3).forEach(t => tags.appendChild(el('span', { cls: 'hobby-tag' }, t)));
    }
    info.appendChild(tags);
    row.appendChild(info);

    // Dimension bars
    const dimsEl = el('div', { cls: 'hobby-dims' });
    const dimLabels = ['Commit', 'Cost', 'Body', 'Social', 'Depth'];
    const dimKeys = ['commitment', 'cost', 'body', 'social', 'depth'];
    dimKeys.forEach((key, di) => {
      const dimRow = el('div', { cls: 'hobby-dim-row' });
      dimRow.appendChild(el('span', { cls: 'hobby-dim-label' }, dimLabels[di]));
      const bar = el('div', { cls: 'hobby-dim-bar' });
      const v = h.radar ? (h.radar[key] || 0) : 0;
      bar.appendChild(el('div', { cls: 'hobby-dim-fill', style: 'width:' + (v * 100) + '%' }));
      dimRow.appendChild(bar);
      dimsEl.appendChild(dimRow);
    });
    row.appendChild(dimsEl);

    // Arrow
    const arrow = el('div', { cls: 'hobby-arrow' });
    arrow.appendChild(el('span', null, '\u2192'));
    row.appendChild(arrow);

    resultsWrap.appendChild(row);
  });

  if (hobbies.length > state.visibleCount) {
    const remaining = hobbies.length - state.visibleCount;
    const more = el('div', { cls: 'show-more' });
    more.appendChild(el('button', { cls: 'btn-text', onClick: () => { state.visibleCount += 15; renderHobbyList(hobbies); } }, 'Show ' + remaining + ' more hobbies \u2193'));
    resultsWrap.appendChild(more);
  }

  list.appendChild(resultsWrap);
  renderCompareBar();
}

// ════════════ COMPARE ════════════
function toggleCompare(id) {
  if (state.compareIds.has(id)) state.compareIds.delete(id);
  else if (state.compareIds.size < 4) state.compareIds.add(id);
}

function renderCompareBar() {
  const slot = document.getElementById('compare-bar-slot');
  if (!slot) return;
  slot.replaceChildren();
  if (state.compareIds.size < 1) return;

  const bar = el('div', { cls: 'compare-bar' });
  const count = el('span', { cls: 'count' });
  count.append(el('span', null, String(state.compareIds.size)), ' selected');
  bar.appendChild(count);

  if (state.compareIds.size === 1) {
    bar.appendChild(el('span', { cls: 'compare-hint' }, '\u2014 pick one more'));
  }
  if (state.compareIds.size >= 2) {
    bar.appendChild(el('button', { cls: 'btn-primary', style: 'padding:7px 20px;font-size:13px', onClick: () => {
      location.hash = '#/compare';
    }}, 'Compare'));
  }
  bar.appendChild(el('button', { cls: 'btn-text', style: 'margin-left:4px', onClick: () => { state.compareIds.clear(); renderHobbyList(state.hobbies); } }, 'Clear'));
  slot.appendChild(bar);
}

// ════════════ COMPARE PAGE ════════════
async function renderCompare() {
  const app = document.getElementById('app');
  app.replaceChildren();

  const page = el('div', { cls: 'compare-page' });
  page.appendChild(el('button', { cls: 'back-link', onClick: () => { location.hash = '#/explore'; }}, [
    el('span', null, '\u2190'),
    el('span', null, 'Back to explore'),
  ]));

  try {
    const ids = Array.from(state.compareIds);
    if (ids.length < 2) { location.hash = '#/explore'; return; }
    const hobbies = await compareHobbies(ids);

    page.appendChild(el('h1', null, 'Comparing ' + hobbies.length + ' hobbies'));
    page.appendChild(el('p', { cls: 'compare-subtitle' }, 'Side-by-side view of all dimensions'));

    // Layout: radar + legend
    const layout = el('div', { cls: 'compare-layout' });
    const radarWrap = el('div', { cls: 'compare-radar-wrap' });
    radarWrap.appendChild(el('canvas', { id: 'compare-overlay-radar' }));
    layout.appendChild(radarWrap);

    const colors = ['#FFD600', '#2d7d32', '#b8860b', '#555555'];
    const legend = el('div', { cls: 'compare-legend' });
    hobbies.forEach((h, i) => {
      const item = el('div', { cls: 'compare-legend-item' });
      item.appendChild(el('div', { cls: 'compare-legend-dot', style: 'background:' + colors[i] }));
      const info = el('div');
      info.appendChild(el('div', { cls: 'compare-legend-name' }, h.name));
      info.appendChild(el('div', { cls: 'compare-legend-desc' }, h.shortDesc || ''));
      item.appendChild(info);
      legend.appendChild(item);
    });
    layout.appendChild(legend);
    page.appendChild(layout);

    // Dim table
    page.appendChild(buildDimTable(hobbies));

    app.appendChild(page);

    const colorsFull = colors.map(c => c + 'CC');
    renderRadarOverlay('compare-overlay-radar', hobbies.map((h, i) => ({ label: h.name, radar: h.radar, color: colorsFull[i] })));
  } catch (err) {
    page.appendChild(el('div', { cls: 'empty' }, [
      el('p', null, 'Couldn\u2019t load the comparison.'),
      el('button', { cls: 'btn-secondary', onClick: () => renderCompare() }, 'Retry'),
    ]));
    app.appendChild(page);
  }
}

// ════════════ DETAIL ════════════
async function renderDetail(id) {
  const app = document.getElementById('app');
  app.replaceChildren();

  const page = el('div', { cls: 'detail-page' });

  // Back link
  const backTarget = state.lastResults ? '#/results' : '#/explore';
  const backLabel = state.lastResults ? 'Back to results' : 'Back to explore';
  page.appendChild(el('button', { cls: 'back-link', onClick: () => { location.hash = backTarget; }}, [
    el('span', null, '\u2190'),
    el('span', null, backLabel),
  ]));

  try {
    const h = await getHobby(id);

    page.appendChild(el('h1', null, h.name));
    if (h.aliases?.length) page.appendChild(el('div', { cls: 'detail-aliases' }, h.aliases.join(', ')));

    const layout = el('div', { cls: 'detail-layout' });

    // Left: text sections
    const left = el('div', { cls: 'detail-left' });

    if (h.longDesc || h.shortDesc) {
      const section = el('div', { cls: 'detail-section' });
      section.appendChild(el('h3', null, 'About'));
      section.appendChild(el('p', null, h.longDesc || h.shortDesc));
      left.appendChild(section);
    }
    if (h.difficultySummary) {
      const section = el('div', { cls: 'detail-section' });
      section.appendChild(el('h3', null, 'Difficulty'));
      section.appendChild(el('p', null, h.difficultySummary));
      left.appendChild(section);
    }
    if (h.starterPath) {
      const section = el('div', { cls: 'detail-section' });
      section.appendChild(el('h3', null, 'Getting started'));
      section.appendChild(el('p', null, h.starterPath));
      left.appendChild(section);
    }
    layout.appendChild(left);

    // Right: radar + dims
    const right = el('div', { cls: 'detail-right' });
    const radarWrap = el('div', { cls: 'detail-radar-wrap' });
    radarWrap.appendChild(el('canvas', { id: 'detail-radar' }));
    right.appendChild(radarWrap);

    // Dimension bars
    if (h.dimensions) {
      const dimsEl = el('div', { cls: 'detail-dims' });
      const dimDefs = [
        ['startup_cost', 'Startup cost'], ['ongoing_cost', 'Ongoing cost'],
        ['time_per_session', 'Time/session'], ['consistency_required', 'Consistency'],
        ['physical_demand', 'Physical'], ['space_required', 'Space'],
        ['social_dependency', 'Social'], ['learning_curve', 'Learning curve'],
        ['creative_expression', 'Creativity'],
      ];
      dimDefs.forEach(([key, label]) => {
        const v = h.dimensions[key] || 0;
        const row = el('div', { cls: 'detail-dim-row' });
        row.appendChild(el('span', { cls: 'detail-dim-label' }, label));
        const bar = el('div', { cls: 'detail-dim-bar' });
        bar.appendChild(el('div', { cls: 'detail-dim-fill', style: 'width:' + (v * 100) + '%' }));
        row.appendChild(bar);
        row.appendChild(el('span', { cls: 'detail-dim-value' }, (v * 100).toFixed(0)));
        dimsEl.appendChild(row);
      });
      right.appendChild(dimsEl);
    }
    layout.appendChild(right);
    page.appendChild(layout);

    app.appendChild(page);
    if (h.radar) renderRadar('detail-radar', h.radar, h.name);
  } catch (err) {
    page.appendChild(el('div', { cls: 'empty' }, [
      el('p', null, 'Couldn\u2019t load details.'),
      el('button', { cls: 'btn-secondary', onClick: () => renderDetail(id) }, 'Retry'),
    ]));
    app.appendChild(page);
  }
}

// ════════════ SHARED ════════════
function buildDimTable(hobbies) {
  const dims = ['startup_cost','ongoing_cost','time_per_session','consistency_required','physical_demand','space_required','social_dependency','learning_curve','creative_expression','age_longevity','injury_risk','portability','gear_dependency','first_win_difficulty','historical_cultural_depth'];
  const labels = { startup_cost:'Startup cost', ongoing_cost:'Ongoing cost', time_per_session:'Time/session', consistency_required:'Regularity', physical_demand:'Physical', space_required:'Space', social_dependency:'Social', learning_curve:'Learning curve', creative_expression:'Creativity', age_longevity:'Longevity', injury_risk:'Injury risk', portability:'Portability', gear_dependency:'Gear', first_win_difficulty:'First win', historical_cultural_depth:'Culture' };
  const table = el('table', { cls: 'dim-table' });
  const thead = el('thead');
  const headerRow = el('tr');
  headerRow.appendChild(el('th', null, ''));
  hobbies.forEach(h => headerRow.appendChild(el('th', null, h.name)));
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = el('tbody');
  dims.forEach(d => {
    const tr = el('tr');
    tr.appendChild(el('td', null, labels[d] || d));
    hobbies.forEach(h => {
      const v = (h.dimensions && h.dimensions[d]) || 0;
      const td = el('td');
      const barWrap = el('div', { style: 'display:flex;align-items:center;gap:6px' });
      const bg = el('div', { style: 'flex:1;background:var(--y-pale);border-radius:2px;height:4px' });
      bg.appendChild(el('div', { cls: 'dim-bar', style: 'width:' + (v * 100) + '%' }));
      barWrap.appendChild(bg);
      barWrap.appendChild(el('span', { style: 'font-family:Geist Mono,monospace;font-size:10px;color:var(--ink-3);min-width:18px' }, (v * 100).toFixed(0)));
      td.appendChild(barWrap);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const wrap = el('div', { cls: 'dim-table-wrap' });
  wrap.appendChild(table);
  return wrap;
}

// ════════════ RADAR CHARTS ════════════
const radarLabels = ['Commitment', 'Cost', 'Body', 'Environment', 'Social', 'Depth'];

function renderRadar(canvasId, radar, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: [{
        label: label,
        data: [radar.commitment, radar.cost, radar.body, radar.environment, radar.social, radar.depth],
        backgroundColor: 'rgba(255,214,0,0.08)',
        borderColor: 'rgba(255,214,0,0.6)',
        borderWidth: 1.5,
        pointRadius: 2,
        pointBackgroundColor: 'rgba(255,214,0,0.6)',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: {
        beginAtZero: true, max: 1,
        ticks: { display: false, stepSize: 0.25 },
        grid: { color: 'rgba(0,0,0,0.05)' },
        pointLabels: { color: '#aaa', font: { size: 9, family: 'Inter' } },
        angleLines: { color: 'rgba(0,0,0,0.03)' },
      }},
      plugins: { legend: { display: false } }
    }
  });
  state.charts[canvasId] = chart;
}

function renderRadarOverlay(canvasId, items) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: items.map(item => ({
        label: item.label,
        data: [item.radar.commitment, item.radar.cost, item.radar.body, item.radar.environment, item.radar.social, item.radar.depth],
        backgroundColor: item.color.slice(0, 7) + '0F',
        borderColor: item.color,
        borderWidth: 1.5, pointRadius: 2,
        pointBackgroundColor: item.color,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: {
        beginAtZero: true, max: 1,
        ticks: { display: false, stepSize: 0.25 },
        grid: { color: 'rgba(0,0,0,0.05)' },
        pointLabels: { color: '#aaa', font: { size: 10, family: 'Inter' } },
        angleLines: { color: 'rgba(0,0,0,0.03)' },
      }},
      plugins: { legend: { display: true, labels: { color: '#888', font: { size: 11, family: 'Inter' } } } }
    }
  });
  state.charts[canvasId] = chart;
}
