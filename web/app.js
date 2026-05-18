// ── State ──
const state = {
  hobbies: [],
  compareIds: new Set(),
  charts: {},
  visibleCount: 15,
  exploreSource: [],
  exploreQuery: '',
  lastMemory: null,
  lastSignals: null,
  lastResults: null,
};

// ── Explore Ranking Module ──
const APP_ASSET_VERSION = '20260409';
let EXPLORE_DIMS = [];
let rankExploreHobbies = (hobbies) => hobbies;
let getHobbies = async () => [];
let getHobby = async () => { throw new Error('hobby not found'); };
let compareHobbies = async () => [];
let extractMemory = async () => ({ signals: [] });
let recommend = async () => ({ results: [] });

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
  else if (path.startsWith('/share/')) renderShare(path.split('/share/')[1]);
  else renderLanding();
}

async function initApp() {
  const [exploreModule, staticApiModule] = await Promise.all([
    import('./explore-ranking.js?v=' + APP_ASSET_VERSION),
    import('./static-api.js?v=' + APP_ASSET_VERSION),
  ]);
  EXPLORE_DIMS = exploreModule.EXPLORE_DIMS;
  rankExploreHobbies = exploreModule.rankExploreHobbies;
  getHobbies = staticApiModule.getHobbies;
  getHobby = staticApiModule.getHobby;
  compareHobbies = staticApiModule.compareHobbies;
  extractMemory = staticApiModule.extractMemory;
  recommend = staticApiModule.recommend;
  window.addEventListener('hashchange', route);
  route();
}

initApp().catch((err) => {
  console.error('Failed to initialize app', err);
  const app = document.getElementById('app');
  if (app) {
    app.replaceChildren(el('div', { cls: 'empty' }, [
      el('p', null, 'Couldn’t load the app.'),
      el('p', null, 'Refresh and try again.'),
    ]));
  }
});

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

  // Signals (collapsible)
  if (state.lastSignals?.length) {
    const sigWrap = el('div', { cls: 'signals-wrap collapsed' });
    const sigToggle = el('button', { cls: 'signals-toggle', onClick: () => {
      sigWrap.classList.toggle('collapsed');
      const isCollapsed = sigWrap.classList.contains('collapsed');
      sigToggle.querySelector('.signals-toggle-count').textContent = state.lastSignals.length + ' signals extracted';
      sigToggle.querySelector('.signals-toggle-arrow').textContent = isCollapsed ? '\u25B8' : '\u25BE';
    }});
    sigToggle.appendChild(el('span', { cls: 'signals-toggle-arrow' }, '\u25B8'));
    sigToggle.appendChild(el('span', { cls: 'signals-toggle-count' }, state.lastSignals.length + ' signals extracted'));
    sigWrap.appendChild(sigToggle);

    const sigSection = el('div', { cls: 'signals-section' });
    const grouped = {};
    const typeLabels = { interest: 'INTERESTS', lifestyle_constraint: 'LIFESTYLE', experience: 'EXPERIENCE', desired_experience: 'DESIRED EXPERIENCE' };
    state.lastSignals.forEach(s => {
      const key = s.type || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    Object.entries(grouped).forEach(([type, sigs]) => {
      const group = el('div', { cls: 'signal-group' });
      group.setAttribute('data-type', type);
      group.appendChild(el('span', { cls: 'signal-group-label' }, typeLabels[type] || type.replace(/_/g, ' ').toUpperCase()));
      const pills = el('div', { cls: 'signal-pills' });
      sigs.forEach(s => pills.appendChild(el('span', { cls: 'signal-pill' }, s.text)));
      group.appendChild(pills);
      sigSection.appendChild(group);
    });
    sigWrap.appendChild(sigSection);
    memSection.appendChild(sigWrap);
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
    const card = el('div', { cls: 'result-card', style: 'animation-delay:' + (i * 0.06) + 's', onClick: () => {
      location.hash = '#/hobby/' + (r.hobbyId || r.rank);
    }});

    // Thumbnail
    if (r.slug) {
      const thumbWrap = el('div', { cls: 'result-card-thumb' });
      const img = el('img', { src: '/thumbnails/' + r.slug + '.jpg', alt: r.hobbyName, decoding: 'async', loading: i > 3 ? 'lazy' : 'eager' });
      img.onerror = () => { thumbWrap.remove(); };
      thumbWrap.appendChild(img);
      // Rank badge
      thumbWrap.appendChild(el('span', { cls: 'result-rank' }, '#' + (i + 1)));
      card.appendChild(thumbWrap);
    }

    const body = el('div', { cls: 'result-card-body' });

    const header = el('div', { cls: 'card-header' });
    const content = el('div', { cls: 'card-content' });
    content.appendChild(el('h3', null, r.hobbyName));

    // Short description from hobby data
    if (r.shortDesc) {
      const desc = r.shortDesc.length > 120 ? r.shortDesc.slice(0, 120) + '…' : r.shortDesc;
      content.appendChild(el('p', { cls: 'card-desc' }, desc));
    }
    header.appendChild(content);

    const radarWrap = el('div', { cls: 'card-radar' });
    radarWrap.appendChild(el('canvas', { id: 'result-radar-' + i }));
    header.appendChild(radarWrap);
    body.appendChild(header);

    // Chips — tagged match reasons
    const taggedReasons = [];
    (r.reasons || []).forEach(reason => {
      if (reason.startsWith('Matches your interest') || reason.startsWith('Relates to') || reason.startsWith('Fits your goal') || reason === 'Discovered via knowledge graph') {
        taggedReasons.push(reason);
      }
    });
    const chips = el('div', { cls: 'card-chips' });
    taggedReasons.slice(0, 3).forEach(reason => {
      let chipCls = 'chip chip-info';
      if (reason.startsWith('Matches your interest')) chipCls = 'chip chip-match';
      else if (reason.startsWith('Relates to')) chipCls = 'chip chip-experience';
      else if (reason.startsWith('Fits your goal')) chipCls = 'chip chip-goal';
      chips.appendChild(el('span', { cls: chipCls }, reason));
    });
    if (r.caution) chips.appendChild(el('span', { cls: 'chip chip-muted' }, r.caution));
    body.appendChild(chips);

    // Footer
    const footer = el('div', { cls: 'card-footer' });
    footer.appendChild(el('button', { cls: 'card-explore-link', onClick: (e) => {
      e.stopPropagation();
      location.hash = '#/hobby/' + (r.hobbyId || r.rank);
    }}, 'Explore this hobby \u2192'));
    body.appendChild(footer);

    card.appendChild(body);
    grid.appendChild(card);
  });
  page.appendChild(grid);
  page.appendChild(buildShareBanner());
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
  headerLeft.appendChild(el('p', null, 'Keep sliders centered to browse everything. Pull an axis left or right to favor hobbies near that profile.'));
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
    const normalizedQuery = query?.trim() || '';
    if (normalizedQuery) {
      params.set('q', normalizedQuery);
    }
    params.set('limit', normalizedQuery ? '50' : '250');
    const hobbies = await getHobbies(params.toString());
    state.exploreSource = hobbies;
    state.exploreQuery = normalizedQuery;
    state.visibleCount = 15;
    applyFilters();
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

function getExploreTargets() {
  return EXPLORE_DIMS.reduce((targets, dd) => {
    targets[dd.id] = parseFloat(document.getElementById('f-' + dd.id)?.value || '0.5');
    return targets;
  }, {});
}

function applyFilters() {
  const ranked = rankExploreHobbies(state.exploreSource || [], getExploreTargets(), {
    query: state.exploreQuery,
  });
  state.hobbies = ranked;
  renderHobbyList(ranked);
}

function resetExploreControls() {
  const si = document.getElementById('search-input');
  if (si) si.value = '';
  state.exploreQuery = '';
  EXPLORE_DIMS.forEach(dd => {
    const slider = document.getElementById('f-' + dd.id);
    if (slider) slider.value = '0.5';
    updateDimVisuals(dd, 0.5);
  });
}

function renderHobbyList(hobbies) {
  const list = document.getElementById('hobby-list');
  if (!list) return;
  destroyCharts();
  list.replaceChildren();

  if (!hobbies.length) {
    list.appendChild(el('div', { cls: 'empty' }, [
      el('p', null, state.exploreQuery ? 'No hobbies matched that search.' : 'No hobbies are available right now.'),
      el('p', null, state.exploreQuery ? 'Try a broader query or reset back to the full catalogue.' : 'Refresh and try again.'),
      el('button', { cls: 'btn-secondary', onClick: () => {
        resetExploreControls();
        loadHobbies();
      }}, 'Reset explore'),
    ]));
    return;
  }

  const gridHeader = el('div', { cls: 'hobby-grid-header' });
  gridHeader.appendChild(el('h2', null, 'Best matches for your criteria'));
  list.appendChild(gridHeader);

  const grid = el('div', { cls: 'hobby-grid' });

  const visible = hobbies.slice(0, state.visibleCount);
  visible.forEach((h, i) => {
    const card = el('div', { cls: 'hobby-card', style: 'animation-delay:' + (i * 0.02) + 's', onClick: () => {
      location.hash = '#/hobby/' + h.id;
    }});

    // Thumbnail
    const thumb = el('div', { cls: 'hobby-card-thumb' });
    const imgAttrs = { src: '/thumbnails/' + h.slug + '.jpg', alt: h.name, decoding: 'async' };
    if (i >= 6) imgAttrs.loading = 'lazy';
    const img = el('img', imgAttrs);
    img.onerror = function() { this.style.display = 'none'; };
    thumb.appendChild(img);

    // Compare checkbox
    const cmp = el('div', {
      cls: 'hobby-card-compare' + (state.compareIds.has(h.id) ? ' selected' : ''),
      onClick: (e) => { e.stopPropagation(); toggleCompare(h.id); renderHobbyList(hobbies); },
    }, '\u2713');
    thumb.appendChild(cmp);
    card.appendChild(thumb);

    // Body
    const body = el('div', { cls: 'hobby-card-body' });
    body.appendChild(el('h3', null, h.name));
    body.appendChild(el('div', { cls: 'hobby-desc' }, h.shortDesc));

    // Compact dimension bars
    const dimsEl = el('div', { cls: 'hobby-card-dims' });
    const dimLabels = ['Commit', 'Cost', 'Body', 'Social', 'Depth'];
    const dimKeys = ['commitment', 'cost', 'body', 'social', 'depth'];
    dimKeys.forEach((key, di) => {
      const dim = el('div', { cls: 'hobby-card-dim' });
      dim.appendChild(el('span', { cls: 'hobby-card-dim-label' }, dimLabels[di]));
      const bar = el('div', { cls: 'hobby-card-dim-bar' });
      const v = h.radar ? (h.radar[key] || 0) : 0;
      bar.appendChild(el('div', { cls: 'hobby-card-dim-fill', style: 'width:' + (v * 100) + '%' }));
      dim.appendChild(bar);
      dimsEl.appendChild(dim);
    });
    body.appendChild(dimsEl);
    card.appendChild(body);

    grid.appendChild(card);
  });

  if (hobbies.length > state.visibleCount) {
    const remaining = hobbies.length - state.visibleCount;
    const more = el('div', { cls: 'show-more' });
    more.appendChild(el('button', { cls: 'btn-text', onClick: () => { state.visibleCount += 15; renderHobbyList(hobbies); } }, 'Show ' + remaining + ' more hobbies \u2193'));
    grid.appendChild(more);
  }

  list.appendChild(grid);
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

    const colors = ['#FFD600', '#2d7d32', '#b8860b', '#555555'];

    // Hobby cards with thumbnails
    const cards = el('div', { cls: 'compare-cards' });
    hobbies.forEach((h, i) => {
      const card = el('div', { cls: 'compare-card', style: 'border-bottom: 4px solid ' + colors[i], onClick: () => {
        location.hash = '#/hobby/' + h.id;
      }});
      const thumb = el('div', { cls: 'compare-card-thumb' });
      const img = el('img', { src: '/thumbnails/' + h.slug + '.jpg', alt: h.name, decoding: 'async' });
      img.onerror = function() { this.style.display = 'none'; };
      thumb.appendChild(img);
      card.appendChild(thumb);
      const body = el('div', { cls: 'compare-card-body' });
      body.appendChild(el('div', { cls: 'compare-card-name' }, h.name));
      body.appendChild(el('div', { cls: 'compare-card-desc' }, h.shortDesc || ''));
      card.appendChild(body);
      cards.appendChild(card);
    });
    page.appendChild(cards);

    // Radar chart
    const radarWrap = el('div', { cls: 'compare-radar-wrap' });
    radarWrap.appendChild(el('canvas', { id: 'compare-overlay-radar' }));
    page.appendChild(radarWrap);

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

    // Hero: portrait thumbnail left, title + radar right
    const hero = el('div', { cls: 'detail-hero' });
    const heroImg = el('img', { cls: 'detail-hero-img', src: '/thumbnails/' + h.slug + '.jpg', alt: h.name, decoding: 'async' });
    heroImg.onerror = function() { this.parentElement.style.display = 'none'; };
    hero.appendChild(heroImg);

    const heroInfo = el('div', { cls: 'detail-hero-info' });
    heroInfo.appendChild(el('h1', null, h.name));
    if (h.aliases?.length) heroInfo.appendChild(el('div', { cls: 'detail-aliases' }, h.aliases.join(', ')));

    const radarWrap = el('div', { cls: 'detail-radar-wrap' });
    radarWrap.appendChild(el('canvas', { id: 'detail-radar' }));
    heroInfo.appendChild(radarWrap);

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
      heroInfo.appendChild(dimsEl);
    }
    hero.appendChild(heroInfo);
    page.appendChild(hero);

    // Text sections below
    const sections = el('div', { cls: 'detail-sections' });
    if (h.longDesc || h.shortDesc) {
      const section = el('div', { cls: 'detail-section' });
      section.appendChild(el('h3', null, 'About'));
      section.appendChild(el('p', null, h.longDesc || h.shortDesc));
      sections.appendChild(section);
    }
    if (h.difficultySummary) {
      const section = el('div', { cls: 'detail-section' });
      section.appendChild(el('h3', null, 'Difficulty'));
      section.appendChild(el('p', null, h.difficultySummary));
      sections.appendChild(section);
    }
    if (h.starterPath) {
      const section = el('div', { cls: 'detail-section' });
      section.appendChild(el('h3', null, 'Getting started'));
      section.appendChild(el('p', null, h.starterPath));
      sections.appendChild(section);
    }
    page.appendChild(sections);

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

// ════════════ SHARE ════════════

function encodeShareData(results, signals) {
  const hobbies = (results || []).slice(0, 5).map(r => ({ n: r.hobbyName, s: r.slug || '' }));
  const traits = (signals || []).filter(s => s.type === 'interest').slice(0, 6).map(s => s.text);
  const json = JSON.stringify({ v: 1, h: hobbies, t: traits });
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeShareData(encoded) {
  try {
    const pad = encoded.length % 4 ? encoded + '='.repeat(4 - encoded.length % 4) : encoded;
    const json = decodeURIComponent(escape(atob(pad.replace(/-/g, '+').replace(/_/g, '/'))));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildShareBanner() {
  const encoded = encodeShareData(state.lastResults, state.lastSignals);
  const shareUrl = location.origin + location.pathname + '#/share/' + encoded;

  const section = el('div', { cls: 'share-banner' });

  const label = el('div', { cls: 'share-banner-label' });
  label.appendChild(el('span', { cls: 'share-banner-icon' }, '↗'));
  label.appendChild(el('span', null, 'Share your results'));
  section.appendChild(label);

  const row = el('div', { cls: 'share-url-row' });
  row.appendChild(el('input', { cls: 'share-url-input', type: 'text', readonly: '', value: shareUrl }));
  const copyBtn = el('button', { cls: 'share-copy-btn', onClick: () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
    });
  }}, 'Copy link');
  row.appendChild(copyBtn);
  section.appendChild(row);

  const previewLink = el('a', { cls: 'share-preview-link', href: '#/share/' + encoded }, 'Preview share card →');
  section.appendChild(previewLink);

  return section;
}

function renderShare(encoded) {
  const app = document.getElementById('app');
  app.replaceChildren();

  const data = decodeShareData(encoded);
  if (!data || !data.h?.length) {
    const errPage = el('div', { cls: 'share-page' });
    errPage.appendChild(el('div', { cls: 'empty' }, [
      el('p', null, 'This share link looks broken.'),
      el('a', { cls: 'btn-secondary', href: '#/' }, 'Try Hobby Map →'),
    ]));
    app.appendChild(errPage);
    return;
  }

  const page = el('div', { cls: 'share-page' });

  // Card
  const card = el('div', { cls: 'share-card' });

  const cardHeader = el('div', { cls: 'share-card-header' });
  const wordmark = el('span', { cls: 'share-card-wordmark' }, [
    'hobby', el('span', { cls: 'share-card-plus' }, '+'), 'map',
  ]);
  cardHeader.appendChild(wordmark);
  card.appendChild(cardHeader);

  card.appendChild(el('p', { cls: 'share-card-heading' }, 'My AI memory says I should try…'));

  const hobbyList = el('div', { cls: 'share-hobby-list' });
  data.h.forEach((h, i) => {
    const item = el('div', { cls: 'share-hobby-item' });
    item.appendChild(el('span', { cls: 'share-hobby-rank' }, '#' + (i + 1)));
    if (h.s) {
      const img = el('img', { cls: 'share-hobby-thumb', src: '/thumbnails/' + h.s + '.jpg', alt: h.n, loading: 'lazy', decoding: 'async' });
      img.onerror = () => img.remove();
      item.appendChild(img);
    }
    item.appendChild(el('span', { cls: 'share-hobby-name' }, h.n));
    hobbyList.appendChild(item);
  });
  card.appendChild(hobbyList);

  if (data.t?.length) {
    const traitWrap = el('div', { cls: 'share-traits' });
    traitWrap.appendChild(el('span', { cls: 'share-traits-label' }, "I'm:"));
    const pills = el('div', { cls: 'share-trait-pills' });
    data.t.forEach(t => pills.appendChild(el('span', { cls: 'share-trait-pill' }, t)));
    traitWrap.appendChild(pills);
    card.appendChild(traitWrap);
  }

  const footer = el('div', { cls: 'share-card-footer' });
  footer.appendChild(el('span', { cls: 'share-card-url' }, 'hobby-map.pages.dev'));
  card.appendChild(footer);

  page.appendChild(card);

  // CTA below card
  const cta = el('div', { cls: 'share-cta' });
  cta.appendChild(el('p', null, 'What does your AI memory say about you?'));
  const ctaBtn = el('a', { cls: 'cta-btn', href: '#/' });
  ctaBtn.textContent = 'Find your hobbies →';
  cta.appendChild(ctaBtn);
  page.appendChild(cta);

  app.appendChild(page);
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
