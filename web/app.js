// State
const state = {
  hobbies: [],
  compareIds: new Set(),
  charts: {},
};

// API
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
const recommend = (signals, filters, limit) => api('/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signals, filters: filters || {}, limit: limit || 20 }) });

// Router
function route() {
  const hash = location.hash || '#/';
  const path = hash.slice(1);
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
  destroyCharts();
  if (path === '/' || path === '') renderHome();
  else if (path === '/explore') renderExplore();
  else if (path === '/compare') renderCompare();
  else if (path === '/match') renderMatch();
  else renderHome();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

function destroyCharts() {
  Object.values(state.charts).forEach(c => c.destroy());
  state.charts = {};
}

// Safe text escaping
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Safe DOM helpers — used instead of innerHTML for user-controlled content
function setText(el, text) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.textContent = text;
}

function createEl(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k === 'textContent') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  if (children) {
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) children.forEach(c => { if (c) el.appendChild(c); });
    else el.appendChild(children);
  }
  return el;
}

// Render: Home
function renderHome() {
  const app = document.getElementById('app');
  app.replaceChildren();
  const div = createEl('div', { className: 'home' });
  const h1 = createEl('h1');
  h1.append('Find Your Next ', createEl('span', {}, 'Hobby'));
  div.appendChild(h1);
  div.appendChild(createEl('p', {}, 'Discover hobbies that match your interests, lifestyle, and goals.'));
  const cta = createEl('div', { className: 'cta-row' });
  const matchBtn = createEl('a', { href: '#/match', className: 'btn btn-primary' }, 'Paste Your Memory');
  const browseBtn = createEl('a', { href: '#/explore', className: 'btn' }, 'Browse Hobbies');
  cta.append(matchBtn, browseBtn);
  div.appendChild(cta);
  app.appendChild(div);
}

// Render: Explore
async function renderExplore() {
  const app = document.getElementById('app');
  app.replaceChildren();

  const layout = createEl('div', { className: 'explore-layout' });

  // Filter panel
  const filterPanel = createEl('div', { className: 'filter-panel' });
  filterPanel.appendChild(createEl('h3', {}, 'Filters'));

  const filterDefs = [
    { id: 'cost', label: 'Startup Cost' },
    { id: 'phys', label: 'Physical Demand' },
    { id: 'time', label: 'Time Per Session' },
    { id: 'space', label: 'Space Required' },
    { id: 'social', label: 'Social Dependency' },
  ];
  filterDefs.forEach(fd => {
    const group = createEl('div', { className: 'filter-group' });
    const label = createEl('label');
    label.append(fd.label + ' ', createEl('span', { id: 'f-' + fd.id + '-val' }, 'any'));
    group.appendChild(label);
    const range = createEl('input', { type: 'range', id: 'f-' + fd.id, min: '0', max: '1', step: '0.1', value: '1' });
    range.addEventListener('input', () => {
      const v = parseFloat(range.value);
      setText('f-' + fd.id + '-val', v >= 1 ? 'any' : v.toFixed(1));
    });
    group.appendChild(range);
    filterPanel.appendChild(group);
  });
  const applyBtn = createEl('button', { className: 'btn btn-sm', style: 'width:100%;margin-top:8px', onClick: () => applyFilters() }, 'Apply');
  filterPanel.appendChild(applyBtn);
  layout.appendChild(filterPanel);

  // Main area
  const main = createEl('div');
  const searchBar = createEl('div', { className: 'search-bar' });
  const searchInput = createEl('input', { type: 'text', id: 'search-input', placeholder: 'Search hobbies...' });
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  const searchBtn = createEl('button', { className: 'btn btn-sm', onClick: doSearch }, 'Search');
  searchBar.append(searchInput, searchBtn);
  main.appendChild(searchBar);
  const grid = createEl('div', { id: 'hobby-grid', className: 'card-grid' });
  grid.appendChild(createEl('div', { className: 'loading-text' }, [createEl('span', { className: 'spinner' }), document.createTextNode(' Loading...')]));
  main.appendChild(grid);
  layout.appendChild(main);
  app.appendChild(layout);

  loadHobbies();
}

async function loadHobbies(query) {
  const grid = document.getElementById('hobby-grid');
  if (!grid) return;
  grid.replaceChildren(createEl('div', { className: 'loading-text' }, [createEl('span', { className: 'spinner' }), document.createTextNode(' Loading...')]));
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
    renderHobbyGrid(hobbies);
  } catch (err) {
    grid.replaceChildren(createEl('div', { className: 'empty' }, 'Error: ' + err.message));
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

function renderHobbyGrid(hobbies) {
  const grid = document.getElementById('hobby-grid');
  if (!grid) return;
  grid.replaceChildren();
  if (!hobbies.length) { grid.appendChild(createEl('div', { className: 'empty' }, 'No hobbies found')); return; }

  hobbies.forEach(h => {
    const card = createEl('div', { className: 'card' });
    card.appendChild(createEl('h3', {}, h.name));
    card.appendChild(createEl('div', { className: 'slug' }, h.slug));
    card.appendChild(createEl('div', { className: 'desc' }, h.shortDesc));
    const radarWrap = createEl('div', { className: 'radar-wrap' });
    radarWrap.appendChild(createEl('canvas', { id: 'radar-' + h.id }));
    card.appendChild(radarWrap);
    const actions = createEl('div', { className: 'card-actions' });
    actions.appendChild(createEl('button', { className: 'btn btn-sm', onClick: () => showDetail(h.id) }, 'Details'));
    const cmpBtn = createEl('button', { className: 'btn btn-sm btn-ghost', onClick: () => { toggleCompare(h.id); cmpBtn.textContent = state.compareIds.has(h.id) ? 'Remove' : 'Compare'; } }, state.compareIds.has(h.id) ? 'Remove' : 'Compare');
    actions.appendChild(cmpBtn);
    card.appendChild(actions);
    grid.appendChild(card);
  });
  hobbies.forEach(h => renderRadar('radar-' + h.id, h.radar, h.name, 140));
}

// Render: Compare
async function renderCompare() {
  const app = document.getElementById('app');
  app.replaceChildren();

  if (state.compareIds.size < 2) {
    const wrapper = createEl('div', { className: 'empty', style: 'padding:60px 0' });
    wrapper.appendChild(createEl('h2', {}, 'Compare Hobbies'));
    wrapper.appendChild(createEl('p', {}, 'Select 2-4 hobbies from Explore to compare them side by side.'));
    wrapper.appendChild(createEl('a', { href: '#/explore', className: 'btn', style: 'display:inline-block;margin-top:16px' }, 'Browse Hobbies'));
    const searchDiv = createEl('div', { style: 'max-width:400px;margin:24px auto 0' });
    const sb = createEl('div', { className: 'search-bar' });
    const input = createEl('input', { type: 'text', placeholder: 'Or search to add...' });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doCompareSearch(input); });
    sb.append(input, createEl('button', { className: 'btn btn-sm', onClick: () => doCompareSearch(input) }, 'Search'));
    searchDiv.appendChild(sb);
    searchDiv.appendChild(createEl('div', { id: 'compare-search-results' }));
    wrapper.appendChild(searchDiv);
    app.appendChild(wrapper);
    return;
  }

  app.appendChild(createEl('div', { className: 'loading-text' }, [createEl('span', { className: 'spinner' }), document.createTextNode(' Loading comparison...')]));
  try {
    const ids = Array.from(state.compareIds);
    const hobbies = await compareHobbies(ids);
    app.replaceChildren();
    const wrap = createEl('div', { style: 'padding:24px 0' });
    wrap.appendChild(createEl('h2', {}, 'Comparing ' + hobbies.length + ' Hobbies'));

    const overlay = createEl('div', { className: 'compare-overlay' });
    const overlayRadar = createEl('div', { className: 'radar-wrap' });
    overlayRadar.appendChild(createEl('canvas', { id: 'compare-overlay-radar' }));
    overlay.appendChild(overlayRadar);
    wrap.appendChild(overlay);

    const grid = createEl('div', { className: 'compare-grid cols-' + hobbies.length });
    hobbies.forEach(h => {
      const cc = createEl('div', { className: 'compare-card' });
      cc.appendChild(createEl('h3', {}, h.name));
      const rw = createEl('div', { className: 'radar-wrap' });
      rw.appendChild(createEl('canvas', { id: 'cmp-' + h.id }));
      cc.appendChild(rw);
      cc.appendChild(createEl('p', { style: 'font-size:13px;color:var(--text-dim)' }, h.shortDesc));
      grid.appendChild(cc);
    });
    wrap.appendChild(grid);

    // Dimension table
    wrap.appendChild(buildDimTable(hobbies));

    const clearWrap = createEl('div', { style: 'text-align:center;margin-top:24px' });
    clearWrap.appendChild(createEl('button', { className: 'btn', onClick: () => { state.compareIds.clear(); location.hash = '#/compare'; } }, 'Clear All'));
    wrap.appendChild(clearWrap);
    app.appendChild(wrap);

    const colors = ['rgba(99,102,241,0.7)', 'rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'];
    renderRadarOverlay('compare-overlay-radar', hobbies.map((h, i) => ({ label: h.name, radar: h.radar, color: colors[i] })));
    hobbies.forEach(h => renderRadar('cmp-' + h.id, h.radar, h.name, 200));
  } catch (err) {
    app.replaceChildren(createEl('div', { className: 'empty' }, 'Error: ' + err.message));
  }
}

async function doCompareSearch(input) {
  const q = input?.value?.trim();
  if (!q) return;
  const resultsEl = document.getElementById('compare-search-results');
  if (!resultsEl) return;
  resultsEl.replaceChildren(createEl('div', { className: 'loading-text' }, [createEl('span', { className: 'spinner' })]));
  try {
    const hobbies = await getHobbies('q=' + encodeURIComponent(q) + '&limit=5');
    resultsEl.replaceChildren();
    hobbies.forEach(h => {
      const row = createEl('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)' });
      row.appendChild(createEl('span', {}, h.name));
      row.appendChild(createEl('button', { className: 'btn btn-sm', onClick: () => {
        if (state.compareIds.size < 4) { state.compareIds.add(h.id); if (state.compareIds.size >= 2) renderCompare(); }
      }}, 'Add'));
      resultsEl.appendChild(row);
    });
  } catch (_) {
    resultsEl.replaceChildren(createEl('div', { className: 'empty' }, 'No results'));
  }
}

function buildDimTable(hobbies) {
  const dims = ['startup_cost','ongoing_cost','time_per_session','consistency_required','physical_demand','space_required','social_dependency','learning_curve','creative_expression','age_longevity','injury_risk','portability','gear_dependency','first_win_difficulty','historical_cultural_depth'];
  const labels = { startup_cost:'Startup Cost', ongoing_cost:'Ongoing Cost', time_per_session:'Time/Session', consistency_required:'Consistency', physical_demand:'Physical', space_required:'Space', social_dependency:'Social', learning_curve:'Learning Curve', creative_expression:'Creative', age_longevity:'Longevity', injury_risk:'Injury Risk', portability:'Portability', gear_dependency:'Gear', first_win_difficulty:'First Win', historical_cultural_depth:'Cultural Depth' };

  const table = createEl('table', { className: 'dim-table' });
  const thead = createEl('thead');
  const headerRow = createEl('tr');
  headerRow.appendChild(createEl('th', {}, 'Dimension'));
  hobbies.forEach(h => headerRow.appendChild(createEl('th', {}, h.name)));
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createEl('tbody');
  dims.forEach(d => {
    const tr = createEl('tr');
    tr.appendChild(createEl('td', {}, labels[d] || d));
    hobbies.forEach(h => {
      const v = (h.dimensions && h.dimensions[d]) || 0;
      const td = createEl('td');
      const barWrap = createEl('div', { style: 'display:flex;align-items:center;gap:8px' });
      const bgBar = createEl('div', { style: 'flex:1;background:var(--surface2);border-radius:3px;height:6px' });
      bgBar.appendChild(createEl('div', { className: 'dim-bar', style: 'width:' + (v * 100) + '%' }));
      barWrap.appendChild(bgBar);
      barWrap.appendChild(createEl('span', { style: 'font-size:12px;color:var(--text-dim)' }, (v * 100).toFixed(0)));
      td.appendChild(barWrap);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

// Render: Match
function renderMatch() {
  const app = document.getElementById('app');
  app.replaceChildren();
  const section = createEl('div', { className: 'match-section' });
  section.appendChild(createEl('h2', {}, 'Paste Your Memory'));
  section.appendChild(createEl('p', { style: 'color:var(--text-dim);margin:8px 0 16px' }, "Tell us about your interests, lifestyle, and what you're looking for in a hobby."));
  const textarea = createEl('textarea', { id: 'memory-input', placeholder: "Example: I've always been fascinated by Japanese history and culture. I want something disciplined, meaningful, that I can do long-term. I have limited space but don't mind some physical activity." });
  section.appendChild(textarea);
  const btnRow = createEl('div', { style: 'display:flex;gap:8px;margin-top:12px' });
  const matchBtn = createEl('button', { className: 'btn btn-primary', id: 'match-btn', onClick: runMatch }, 'Find My Hobbies');
  btnRow.appendChild(matchBtn);
  section.appendChild(btnRow);
  section.appendChild(createEl('div', { id: 'match-signals' }));
  section.appendChild(createEl('div', { id: 'match-results' }));
  app.appendChild(section);
}

async function runMatch() {
  const textarea = document.getElementById('memory-input');
  const text = textarea?.value?.trim();
  if (!text) return;

  const btn = document.getElementById('match-btn');
  btn.disabled = true;
  btn.replaceChildren(createEl('span', { className: 'spinner' }), document.createTextNode(' Analyzing...'));

  const signalsEl = document.getElementById('match-signals');
  const resultsEl = document.getElementById('match-results');
  signalsEl.replaceChildren();
  resultsEl.replaceChildren();

  try {
    // Step 1: Extract signals
    const extracted = await extractMemory(text);
    const signals = extracted.signals;

    const panel = createEl('div', { className: 'signals-panel' });
    panel.appendChild(createEl('h3', { style: 'font-size:14px;margin-bottom:8px' }, 'Extracted Signals'));
    signals.forEach(s => {
      const tagClass = s.type === 'interest' ? 'interest' : s.type === 'lifestyle_constraint' ? 'constraint' : 'experience';
      const tag = createEl('span', { className: 'signal-tag ' + tagClass });
      tag.appendChild(document.createTextNode(s.text + ' '));
      tag.appendChild(createEl('span', { style: 'opacity:0.5' }, (s.weight * 100).toFixed(0) + '%'));
      panel.appendChild(tag);
    });
    signalsEl.replaceChildren(panel);

    // Step 2: Get recommendations
    resultsEl.replaceChildren(createEl('div', { className: 'loading-text' }, [createEl('span', { className: 'spinner' }), document.createTextNode(' Finding matches...')]));
    const domainSignals = signals.map(s => ({
      signalType: s.type,
      text: s.text,
      normalizedValue: s.normalizedValue,
      weight: s.weight,
      confidence: s.weight,
    }));
    const rec = await recommend(domainSignals, {}, 20);

    if (!rec.results || rec.results.length === 0) {
      resultsEl.replaceChildren(createEl('div', { className: 'empty' }, 'No matches found. Try providing more details.'));
      return;
    }

    resultsEl.replaceChildren();
    resultsEl.appendChild(createEl('h3', { style: 'margin:16px 0 12px' }, 'Top Matches'));

    rec.results.forEach(r => {
      const card = createEl('div', { className: 'result-card' });

      const info = createEl('div');
      const titleRow = createEl('div', { style: 'display:flex;align-items:baseline;gap:12px' });
      titleRow.appendChild(createEl('span', { className: 'rank' }, '#' + r.rank));
      titleRow.appendChild(createEl('h3', {}, r.hobbyName));
      info.appendChild(titleRow);
      info.appendChild(createEl('div', { className: 'score' }, 'Score: ' + (r.score * 100).toFixed(1) + '%'));

      const reasons = createEl('ul', { className: 'reasons' });
      (r.reasons || []).forEach(reason => {
        const li = createEl('li', {}, reason);
        reasons.appendChild(li);
      });
      info.appendChild(reasons);

      if (r.caution) {
        info.appendChild(createEl('div', { className: 'caution' }, r.caution));
      }
      card.appendChild(info);

      const radarWrap = createEl('div', { className: 'radar-wrap' });
      radarWrap.appendChild(createEl('canvas', { id: 'match-radar-' + r.rank }));
      card.appendChild(radarWrap);
      resultsEl.appendChild(card);
    });

    rec.results.forEach(r => {
      if (r.radar) renderRadar('match-radar-' + r.rank, r.radar, r.hobbyName, 160);
    });
  } catch (err) {
    resultsEl.replaceChildren(createEl('div', { className: 'empty' }, 'Error: ' + err.message));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Find My Hobbies';
  }
}

// Detail modal
async function showDetail(id) {
  try {
    const h = await getHobby(id);
    const overlay = createEl('div', { className: 'modal-overlay' });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = createEl('div', { className: 'modal' });
    const closeBtn = createEl('button', { className: 'close-btn', onClick: () => overlay.remove() });
    closeBtn.textContent = '\u00d7';
    modal.appendChild(closeBtn);
    modal.appendChild(createEl('h2', {}, h.name));

    const slugLine = h.slug + (h.aliases?.length ? ' \u00b7 ' + h.aliases.join(', ') : '');
    modal.appendChild(createEl('div', { className: 'slug', style: 'margin-bottom:12px' }, slugLine));

    const radarWrap = createEl('div', { className: 'radar-wrap' });
    radarWrap.appendChild(createEl('canvas', { id: 'detail-radar' }));
    modal.appendChild(radarWrap);
    modal.appendChild(createEl('p', { style: 'margin:12px 0' }, h.longDesc || h.shortDesc));

    if (h.difficultySummary) {
      const p = createEl('p', { style: 'font-size:13px;color:var(--text-dim);margin:8px 0' });
      p.appendChild(createEl('strong', {}, 'Difficulty: '));
      p.appendChild(document.createTextNode(h.difficultySummary));
      modal.appendChild(p);
    }
    if (h.starterPath) {
      const p = createEl('p', { style: 'font-size:13px;color:var(--text-dim);margin:8px 0' });
      p.appendChild(createEl('strong', {}, 'Getting Started: '));
      p.appendChild(document.createTextNode(h.starterPath));
      modal.appendChild(p);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    renderRadar('detail-radar', h.radar, h.name, 240);
  } catch (err) {
    console.error('detail error:', err);
  }
}

// Compare toggle
function toggleCompare(id) {
  if (state.compareIds.has(id)) state.compareIds.delete(id);
  else if (state.compareIds.size < 4) state.compareIds.add(id);
}

// Radar chart rendering
const radarLabels = ['Commitment', 'Cost', 'Body', 'Environment', 'Social', 'Depth'];

function renderRadar(canvasId, radar, label, size) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: [{
        label: label,
        data: [radar.commitment, radar.cost, radar.body, radar.environment, radar.social, radar.depth],
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(99, 102, 241, 0.8)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 1,
          ticks: { display: false, stepSize: 0.25 },
          grid: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#888', font: { size: 10 } },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
        }
      },
      plugins: { legend: { display: false } }
    }
  });
  state.charts[canvasId] = chart;
}

function renderRadarOverlay(canvasId, items) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: items.map(item => ({
        label: item.label,
        data: [item.radar.commitment, item.radar.cost, item.radar.body, item.radar.environment, item.radar.social, item.radar.depth],
        backgroundColor: item.color.replace('0.7', '0.1'),
        borderColor: item.color,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: item.color,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 1,
          ticks: { display: false, stepSize: 0.25 },
          grid: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#888', font: { size: 11 } },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
        }
      },
      plugins: { legend: { display: true, labels: { color: '#888', font: { size: 12 } } } }
    }
  });
  state.charts[canvasId] = chart;
}
