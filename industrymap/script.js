/* ==========================================================
 *  industrymap.js  –  grid-based revenue clustering  (v3 2025-08-07)
 * ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ----------  MAP  ---------- */
  const map = L.map('map').setView([44.5, -89.5], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  /* ----------  STATE  ---------- */
  let allData = [];
  let filtered = [];
  let heatLayer = null;
  let canvas = null;
  const canvasId = 'revenue-canvas';

  /* ----------  SAFE REVENUE PARSER  ---------- */
  function parseAnnualSales(str) {
    if (!str || typeof str !== 'string') return 0;
    str = str.toLowerCase().replace(/[\s,$()]/g, '').replace(/est/gi, '');
    const toN = (v) => {
      let n = parseFloat(v);
      if (v.includes('bil')) n *= 1e9;
      if (v.includes('mil') || v.includes('m')) n *= 1e6;
      if (v.includes('k')) n *= 1e3;
      return n;
    };
    let n = str.includes('-')
      ? str.split('-').map(toN).reduce((a, b) => a + b, 0) / 2
      : toN(str);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /* ----------  CLUSTER HELPERS  ---------- */
// current table
const CLUSTER_PX = {
  4: 100,  // world / continent view
  5: 85,
  6: 75,
  7: 60,  // state view
  8: 50,
  9: 40,  // metro view
 10: 30,
 11: 25,
 12: 20,
 13: 15,  // city / suburb
 14: 10,
 15: 7,
 16: 6,
 17: 5,
 18: 3   // street view and beyond
};

  function clusterRadiusPx(z) { return CLUSTER_PX[z] ?? 2; }

  /* grid-bucket clustering: O(n) */
  function clusterGrid(points, pxRad) {
    const cell = pxRad * 2;                  // square cell side
    const buckets = new Map();
    points.forEach((p) => {
      const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
      let b = buckets.get(key);
      if (!b) {
        b = { x: 0, y: 0, rev: 0, count: 0 };
        buckets.set(key, b);
      }
      b.x += p.x;
      b.y += p.y;
      b.rev += p.rev;
      b.count += 1;
    });
    return [...buckets.values()].map((b) => ({
      x: b.x / b.count,
      y: b.y / b.count,
      rev: b.rev
    }));
  }

  function revToRadius(rev) {
    if (rev < 1e5) return 2;
    if (rev < 1e6) return 4;
    if (rev < 1e8) return 8;
    if (rev < 5e8) return 10;
    if (rev < 7.5e8) return 14;
    if (rev < 1e9) return 22;
    return 25;
  }

  function radiusColor(r) {
    const stops = [
      { r: 183, g: 255, b: 176, s: 4 },
      { r: 255, g: 255, b: 102, s: 8 },
      { r: 255, g: 200, b: 51,  s: 10 },
      { r: 255, g: 153, b: 51,  s: 14 },
      { r: 255, g: 102, b: 51,  s: 22 },
      { r: 180, g: 0,   b: 0,   s: 25 }
    ];
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (r >= stops[i].s && r <= stops[i + 1].s) { lo = stops[i]; hi = stops[i + 1]; break; }
    }
    const t = (r - lo.s) / (hi.s - lo.s);
    const lerp = (a, b) => Math.round(a + (b - a) * t);
    return `rgba(${lerp(lo.r, hi.r)},${lerp(lo.g, hi.g)},${lerp(lo.b, hi.b)},0.7)`;
  }

  /* ----------  CANVAS DRAW  ---------- */
  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:500;';
    map.getContainer().appendChild(canvas);
    return canvas;
  }

  function clearCanvas() {
    if (canvas) { canvas.remove(); canvas = null; }
  }

    function drawClusters() {
    const c = ensureCanvas();
    const { x: w, y: h } = map.getSize();
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const z = map.getZoom();
    const pxRad = clusterRadiusPx(z);
    const pts = [];

    filtered.forEach((d) => {
        if (!d.Latitude || !d.Longitude) return;
        const g = map.project([d.Latitude, d.Longitude], z);          // global px
        const s = map.latLngToContainerPoint([d.Latitude, d.Longitude]); // screen px
        if (s.x < -pxRad || s.y < -pxRad || s.x > w + pxRad || s.y > h + pxRad) return;
        pts.push({ x: g.x, y: g.y, rev: parseAnnualSales(d['Annual Sales']) });
    });

    const clusters = clusterGrid(pts, pxRad).map((cl) => {
        const latlng = map.unproject([cl.x, cl.y], z);
        const scr = map.latLngToContainerPoint(latlng);
        return { x: scr.x, y: scr.y, rev: cl.rev, r: revToRadius(cl.rev) };
    }).sort((a, b) => a.r - b.r);

    clusters.forEach(({ x, y, r, rev }) => {
      /* glow */
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.shadowColor = radiusColor(r);
      ctx.shadowBlur = r * 2.2;
      ctx.fillStyle = radiusColor(r);
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.restore();

      /* label */
      ctx.save();
      ctx.font = `${Math.max(10, Math.round(r * 1.1))}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#222';
      const txt =
        rev >= 1e12 ? (rev / 1e12).toFixed(1).replace(/\.0$/, '') + 'T' :
        rev >= 1e9  ? (rev / 1e9 ).toFixed(1).replace(/\.0$/, '') + 'B' :
        rev >= 1e6  ? (rev / 1e6 ).toFixed(1).replace(/\.0$/, '') + 'M' :
        rev >= 1e3  ? (rev / 1e3 ).toFixed(0) + 'K' : rev.toString();
      ctx.fillText(txt, x, y);
      ctx.restore();
    });
  }

  /* ----------  HEATMAP / CLUSTER TOGGLE  ---------- */
  const toggleBtn = document.getElementById('heatmap-toggle-btn');
  let revenueMode = false;
  toggleBtn?.addEventListener('click', () => {
    revenueMode = !revenueMode;
    toggleBtn.textContent = revenueMode ? 'Switch to Normal Heatmap' : 'Switch to Revenue Heatmap';
    refreshVisual();
  });

  function refreshVisual() {
    if (revenueMode) {
      if (heatLayer) map.removeLayer(heatLayer);
      drawClusters();
    } else {
      clearCanvas();
      if (heatLayer) map.removeLayer(heatLayer);
      const pts = filtered
        .filter((p) => p.Latitude && p.Longitude)
        .map((p) => [p.Latitude, p.Longitude, 1]);
      heatLayer = L.heatLayer(pts, {
        radius: 12, blur: 5, minOpacity: 0.5,
        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
      }).addTo(map);
    }
  }

  map.on('move zoom resize', () => { if (revenueMode) drawClusters(); });

  /* ----------  DATA LOAD  ---------- */
  fetch('industrymap.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((json) => {
      allData = json;
      filtered = allData;
      populateIndustryFilter(allData);
      populateMajorCategoryFilter();
      populateCards(allData.slice(0, 11000));
      updateCompanyCounter(allData.length);
      refreshVisual();
    })
    .catch(console.error);

  /* ----------  UI: cards & filters (unchanged, condensed)  ---------- */
  const markers = L.markerClusterGroup().addTo(map);

  function populateCards(data) {
    const wrap = document.getElementById('cards-container');
    if (!wrap) return;
    wrap.innerHTML = ''; markers.clearLayers();
    data.forEach((d) => {
      const card = document.createElement('div');
      card.className = 'company-card';
      card.innerHTML = `
        <h3>${d.Company}</h3>
        <p><strong>Industry:</strong> ${d['Primary SIC Code Description']}</p>
        <p><strong>Employees:</strong> ${d.Employees}</p>
        <p><strong>Annual Sales:</strong> ${d['Annual Sales']}</p>
        <p><strong>Year Established:</strong> ${d['Year Established'] ?? ''}</p>
        <p><strong>Business Description:</strong> ${d['Business Description'] ?? ''}</p>
        <p><strong>SIC Description:</strong> ${d['Primary SIC Code Description'] ?? ''}</p>`;
      if (d.Latitude && d.Longitude) {
        const m = L.marker([d.Latitude, d.Longitude]).bindPopup(`
          <b>${d.Company}</b><br>
          <strong>SIC Description:</strong> ${d['Primary SIC Code Description'] ?? 'N/A'}<br>
          <strong>Year Established:</strong> ${d['Year Established'] ?? 'N/A'}<br>
          <strong>Business Description:</strong> ${d['Business Description'] ?? 'N/A'}<br>
          <strong>Brand Names:</strong> ${d['Brand Names'] ?? 'N/A'}
        `);
        markers.addLayer(m);
        card.addEventListener('click', () => { map.setView([d.Latitude, d.Longitude], 13); m.openPopup(); });
      }
      wrap.appendChild(card);
    });
  }

  /* ---- industry / major-category filters (same API, minified) ---- */
  function populateIndustryFilter(data) {
    const sel = document.getElementById('industry-filter');
    if (!sel) return;
    [...new Set(data.map((d) => d['Primary SIC Code Description']).filter(Boolean))]
      .sort().forEach((v) => {
        const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
      });
  }

  const SIC = { 20:'Food & Kindred',21:'Tobacco',22:'Textile',23:'Apparel',24:'Lumber',
    25:'Furniture',26:'Paper',27:'Printing',28:'Chemicals',29:'Petroleum',30:'Rubber/Plastics',
    31:'Leather',32:'Stone/Clay/Glass',33:'Primary Metal',34:'Fabricated Metal',35:'Machinery',
    36:'Electrical',37:'Transport Equip',38:'Instruments',39:'Misc Manufacturing' };

  function populateMajorCategoryFilter() {
    const sel = document.getElementById('major-category-filter');
    if (!sel) return;
    Object.entries(SIC).forEach(([k, v]) => {
      const o = document.createElement('option'); o.value = k; o.textContent = `${k} - ${v}`; sel.appendChild(o);
    });
  }

  /* --- filtering --- */
  [
    'search-bar','industry-filter','revenue-filter',
    'employee-filter','highway-filter','major-category-filter'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', filterAndDisplay);
      el.addEventListener('input', () => {
        if (typeof updateConnectionsFiltered === 'function') updateConnectionsFiltered();
      });
    }
  });

  function filterAndDisplay() {
    const qName = (document.getElementById('search-bar')?.value || '').toLowerCase();
    const qInd  = document.getElementById('industry-filter')?.value || '';
    const qRev  = document.getElementById('revenue-filter')?.value || '';
    const qEmp  = document.getElementById('employee-filter')?.value || '';
    const qHwy  = document.getElementById('highway-filter')?.checked;
    const qMaj  = document.getElementById('major-category-filter')?.value || '';

    let revMin=null, revMax=null;
    if (qRev) [revMin,revMax]=qRev.split('-').map(Number);

    filtered = allData.filter((c) => {
      const nameOK = c.Company.toLowerCase().includes(qName);
      const indOK  = !qInd || c['Primary SIC Code Description']===qInd;

      let empOK = true;
      if (qEmp) {
        const e = c.Employees; empOK = qEmp.includes('+') ? e>=parseInt(qEmp) :
          (e>=parseInt(qEmp.split('-')[0]) && e<=parseInt(qEmp.split('-')[1]));
      }

      let revOK = true;
      if (qRev) { const r=parseAnnualSales(c['Annual Sales']); revOK = r>=revMin && r<revMax; }

      const hwyOK = !qHwy || (c.distanceToHighway && c.distanceToHighway<=3);

      let majOK = true;
      if (qMaj) majOK = String(c['Primary SIC Code']||'').startsWith(qMaj);

      return nameOK && indOK && empOK && revOK && hwyOK && majOK;
    });

    populateCards(filtered);
    updateCompanyCounter(filtered.length);
    // Only refresh visual if not in connections mode
    if (typeof window.updateConnectionsFiltered === 'function' && window.updateConnectionsFiltered.on) {
      window.updateConnectionsFiltered();
    } else {
      refreshVisual();
    }
  }
  /* Handles light/dark theme toggle */
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
});

/* Update company counter after your existing filtering logic */
function updateCompanyCounter(count) {
  document.getElementById('company-counter').textContent = `${count} companies`;
}

/* Update status text helper */
function setStatus(text) {
  document.getElementById('status-text').textContent = text;
}

// --- County/Per Capita Stats Table ---
let countiesData = [];
fetch('counties.json', { cache: 'no-cache' })
  .then(r => r.json())
  .then(json => { countiesData = json; buildCountyStats(); });

function buildCountyStats() {
  if (!Array.isArray(countiesData) || !allData.length) return;

  /* ---------- helpers ---------- */
  const distMi = (la1, lo1, la2, lo2) => {
    const R = 3959, toRad = d => d * Math.PI / 180;
    const dLat = toRad(la2 - la1), dLng = toRad(lo2 - lo1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(la1))*Math.cos(toRad(la2))*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  // attach each company to nearest county (cached per company id)
  const nearest = new Map();
  const getCounty = c => {
    if (nearest.has(c)) return nearest.get(c);
    let min = 1e9, best = null;
    countiesData.forEach(cty => {
      const d = distMi(c.Latitude, c.Longitude, cty.lat, cty.lng);
      if (d < min) { min = d; best = cty.name; }
    });
    nearest.set(c, best);
    return best;
  };

  /* ---------- gather stats ---------- */
  const stats = countiesData.map(cty => {
    const list = allData.filter(p => p.Latitude && getCounty(p) === cty.name);
    const pop = cty.population || 1;
    const revenue = list.reduce((s,p)=>s+parseAnnualSales(p['Annual Sales']),0);
    return {
      county : cty.name,
      population : pop,
      companies  : list.length,
      industries : new Set(list.map(p=>p['Primary SIC Code Description'])).size,
      revenue,
      compPer10k : +(list.length / pop * 1e4).toFixed(2),
      revPerCap  : +(revenue / pop).toFixed(2)
    };
  });

  /* ---------- build table ---------- */
  const cols = [
    {key:'county',  label:'County',    type:'text'},
    {key:'population', label:'Population', type:'num'},
    {key:'companies',  label:'# Companies', type:'num'},
    {key:'industries', label:'# Industries', type:'num'},
    {key:'revenue',    label:'Total Revenue', type:'num', fmt:v=>`$${v.toLocaleString()}`},
    {key:'compPer10k', label:'Companies/10k', type:'num'},
    {key:'revPerCap',  label:'Revenue/Capita', type:'num', fmt:v=>`$${v.toLocaleString()}`}
  ];

  const tbl = document.createElement('table'),
        thead = tbl.createTHead(),
        tbody = tbl.createTBody();

  /* header */
  const hr = thead.insertRow();
  cols.forEach((c,i) => {
    const th = document.createElement('th');
    th.textContent = c.label;
    th.dataset.col = c.key;
    th.classList.add('sortable');
    hr.appendChild(th);
  });

  /* rows */
  stats.forEach(r => {
    const tr = tbody.insertRow();
    cols.forEach(c=>{
      const td = tr.insertCell();
      const val = r[c.key];
      td.textContent = c.fmt ? c.fmt(val) : val;
      if (c.type==='num') td.dataset.sort = val; // for faster sort later
    });
  });

  /* inject + decorate */
  const wrap = document.getElementById('county-stats');
  wrap.innerHTML = '<h2>County Industry & Revenue Per Capita</h2>';
  wrap.appendChild(tbl);
  shadeColumns(tbl);
  makeSortable(tbl);
  wrap.style.display = 'none';           // keep default hidden
}

/* ---------- gradient shading per numeric column ---------- */
function shadeColumns(table){
  const rows = [...table.tBodies[0].rows];
  if(!rows.length) return;
  const nCols = table.tHead.rows[0].cells.length;

  for(let c=1;c<nCols;c++){                  // col 0 is county name
    const values = rows.map(r=>+r.cells[c].dataset.sort);
    const min = Math.min(...values), max = Math.max(...values);
    rows.forEach(r=>{
      const v = +r.cells[c].dataset.sort;
      const pct = (v - min) / (max - min || 1); // 0-1
      const hue = 140 - pct * 120;              // green → red
      const light = 92 - pct * 45;
      r.cells[c].style.background = `hsl(${hue} 85% ${light}%)`;
    });
  }
}

/* ---------- sortable headers ---------- */
function makeSortable(table){
  table.querySelectorAll('th.sortable').forEach((th,idx)=>{
    let dir = null;                       // null, 'asc', 'desc'
    th.addEventListener('click',()=>{
      dir = dir==='asc' ? 'desc' : 'asc';
      table.querySelectorAll('th').forEach(t=>t.classList.remove('asc','desc'));
      th.classList.add(dir);

      const rows = [...table.tBodies[0].rows];
      rows.sort((a,b)=>{
        const va = a.cells[idx].dataset.sort || a.cells[idx].textContent.trim();
        const vb = b.cells[idx].dataset.sort || b.cells[idx].textContent.trim();
        const num = !isNaN(va) && !isNaN(vb);
        const cmp = num ? (+va - +vb) : va.localeCompare(vb);
        return dir==='asc' ? cmp : -cmp;
      });
      rows.forEach(r=>table.tBodies[0].appendChild(r));
      shadeColumns(table);
    });
  });
}

// Rebuild stats after data load
setTimeout(buildCountyStats, 2000);

// --- County Stats Toggle Logic ---
const countyStatsDiv = document.getElementById('county-stats');
const mainLayout = document.querySelector('main.layout');
const countyStatsBtn = document.getElementById('county-stats-toggle-btn');
const heatmapBtn = document.getElementById('heatmap-toggle-btn');
let countyStatsMode = false;

countyStatsBtn?.addEventListener('click', () => {
  countyStatsMode = !countyStatsMode;
  if (countyStatsMode) {
    if (heatLayer) map.removeLayer(heatLayer);
    mainLayout.style.display = 'none';
    countyStatsDiv.style.display = 'block';
    countyStatsBtn.textContent = 'Back to Map';
    heatmapBtn.style.display = 'none';
    window.scrollTo(0, 0);
  } else {
    mainLayout.style.display = '';
    countyStatsDiv.style.display = 'none';
    countyStatsBtn.textContent = 'Toggle County Stats';
    heatmapBtn.style.display = '';
    refreshVisual();
  }
});

// Hide county stats by default
countyStatsDiv.style.display = 'none';

// --- Industry Stats Table ---
let industryStatsDiv = document.createElement('div');
industryStatsDiv.id = 'industry-stats';
industryStatsDiv.style.display = 'none';
document.body.appendChild(industryStatsDiv);

function buildIndustryStats() {
  if (!Array.isArray(allData) || !allData.length) return;

  /* ---- aggregate by SIC code ---- */
  const by = {};
  allData.forEach(c => {
    const sic = c['Primary SIC Code'] || 'Unknown';
    const desc = c['Primary SIC Code Description'] || 'Unknown';
    const key = `${sic} - ${desc}`;
    (by[key] ??= []).push(c);
  });

  const rows = Object.entries(by).map(([sicdesc, list]) => {
    const totalRev = list.reduce((s,p)=>s + parseAnnualSales(p['Annual Sales']), 0);
    const totalEmp = list.reduce((s,p)=>s + (+p.Employees || 0), 0);
    return {
      sicdesc,
      n         : list.length,
      totalRev  : totalRev,
      totalEmp  : totalEmp,
      revPerEmp : totalEmp ? totalRev / totalEmp : 0
    };
  });

  /* ---- columns meta ---- */
  const COLS = [
    { key:'sicdesc',   label:'SIC Industry', type:'text' },
    { key:'n',         label:'# Companies',    type:'num' },
    { key:'totalRev',  label:'Total Revenue',  type:'num',
                       fmt:v=>`$${v.toLocaleString()}` },
    { key:'totalEmp',  label:'Total Employees',type:'num' },
    { key:'revPerEmp', label:'Revenue/Employee',type:'num',
                       fmt:v=>`$${v.toLocaleString(undefined,{maximumFractionDigits:0})}` }
  ];

  /* ---- build table ---- */
  const tbl  = document.createElement('table'),
        thead= tbl.createTHead(),
        tbody= tbl.createTBody();

  // header
  const hr = thead.insertRow();
  COLS.forEach(c=>{
    const th = document.createElement('th');
    th.textContent = c.label;
    th.dataset.col = c.key;
    th.classList.add('sortable');
    hr.appendChild(th);
  });

  // body
  rows.forEach(r=>{
    const tr = tbody.insertRow();
    COLS.forEach(c=>{
      const td = tr.insertCell();
      const val = r[c.key];
      td.textContent = c.fmt ? c.fmt(val) : val;
      if (c.type === 'num') td.dataset.sort = val;
    });
  });

  /* ---- inject, shade, make sortable ---- */
  industryStatsDiv.innerHTML =
    '<h2>Industry Stats by SIC Code</h2>';
  industryStatsDiv.appendChild(tbl);
  shadeColumns(tbl);      // reuse helper from county-table
  makeSortable(tbl);      // reuse helper from county-table
}

// --- Industry Stats Toggle Logic ---
const industryStatsBtn = document.getElementById('industry-stats-toggle-btn');
let industryStatsMode = false;
industryStatsBtn?.addEventListener('click', () => {
  industryStatsMode = !industryStatsMode;
  if (industryStatsMode) {
    if (heatLayer) map.removeLayer(heatLayer);
    mainLayout.style.display = 'none';
    countyStatsDiv.style.display = 'none';
    industryStatsDiv.style.display = 'block';
    countyStatsBtn.style.display = '';
    heatmapBtn.style.display = '';
    industryStatsBtn.textContent = 'Back to Map';
    buildIndustryStats();
    window.scrollTo(0, 0);
  } else {
    mainLayout.style.display = '';
    countyStatsDiv.style.display = 'none';
    industryStatsDiv.style.display = 'none';
    countyStatsBtn.textContent = 'Toggle County Stats';
    heatmapBtn.textContent = revenueMode ? 'Switch to Normal Heatmap' : 'Switch to Revenue Heatmap';
    industryStatsBtn.textContent = 'Industry Stats';
    refreshVisual();
  }
});
industryStatsDiv.style.display = 'none';

/* ────────────────────────────────────────────────
 * INDUSTRY CONNECTIONS  (single, trimmed version)
 * ────────────────────────────────────────────────
 * Requires globals that already exist in your app:
 *   • map            (Leaflet map instance)
 *   • allData        (array of company rows)
 *   • refreshVisual  (your heat-map / cluster refresh fn)
 * Place this block **after** allData is filled but
 * inside the same DOMContentLoaded callback.
 * ──────────────────────────────────────────────── */


(() => {
  const btn = document.getElementById('connections-toggle-btn');
  if (!btn) return; // safety-guard
  btn.disabled = true; // Disable until data is loaded

  /* ── state ───────────────────────────── */
  let on          = false;                        // toggle flag
  let canvas      = null;                         // <canvas> for lines
  const labels    = L.layerGroup().addTo(map);    // centroid text
  let industryPointsLayer = null;                 // for unclustered points

  /* ── NAICS 3-digit → title lookup ─────── */
  const titleOf = Object.create(null);            // e.g. {311:"Food Mfg"}
  fetch('naics-titles.json')
    .then(r => r.json())
    .then(list => list.forEach(o => titleOf[o.code] = o.title))
    .catch(console.error);

  /* ── build one-time groups ────────────── */
  let groups = null; // will be rebuilt each time
  function buildGroups() {
    groups = Object.create(null);
    filtered.forEach(c => {
      const pre = String(c['NAICS Code'] || '').slice(0,3);
      if (!pre || !c.Latitude || !c.Longitude) return;
      (groups[pre] ??= []).push({ lat: c.Latitude, lng: c.Longitude });
    });
  }

  // Enable the button after allData is loaded
  const origSet = Object.getOwnPropertyDescriptor(window, 'allData');
  function enableConnBtnWhenReady() {
    if (Array.isArray(allData) && allData.length) {
      btn.disabled = false;
    } else {
      setTimeout(enableConnBtnWhenReady, 200);
    }
  }
  enableConnBtnWhenReady();

  /* ── canvas helpers ───────────────────── */
  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = 'connections-canvas';
    canvas.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;z-index:450;';
    map.getContainer().appendChild(canvas);
    return canvas;
  }
  function dropCanvas() {
    if (canvas) { canvas.remove(); canvas = null; }
  }

  /* ── rendering ────────────────────────── */
  function render() {
    if (!on) return;

    const z   = map.getZoom();
    if (z < 6) { dropCanvas(); labels.clearLayers(); return; }

    const { x: W, y: H } = map.getSize();
    const ctx  = ensureCanvas().getContext('2d');
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0,0,W,H);
    labels.clearLayers();

    Object.entries(groups).forEach(([pre, list]) => {
      if (list.length < 2) return;

      const hue      = (parseInt(pre) % 24) * 15;   // distinct colour
      const maxEdges = z < 8 ? 300 : 1000;
      let   edges    = 0;

      /* nearest-neighbour edges */
      for (let i = 0; i < list.length && edges < maxEdges; i++) {
        let best = -1, bestD = 1e9;
        for (let j = i+1; j < list.length; j++) {
          const dLat = list[i].lat - list[j].lat;
          const dLng = list[i].lng - list[j].lng;
          const d2   = dLat*dLat + dLng*dLng;
          if (d2 < bestD) { bestD = d2; best = j; }
        }
        if (best !== -1) {
          const a = map.latLngToContainerPoint([list[i].lat, list[i].lng]);
          const b = map.latLngToContainerPoint([list[best].lat, list[best].lng]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `hsla(${hue},70%,50%,0.4)`;
          ctx.lineWidth   = z < 8 ? 1 : 2;
          ctx.stroke();
          edges++;
        }
      }

      /* centroid label when zoomed in */
      if (z > 8) {
        const c = list.reduce((s,p)=>[s[0]+p.lat,s[1]+p.lng],[0,0])
                      .map(v=>v/list.length);
        L.marker(c, {
          icon: L.divIcon({
            className:'conn-label',
            html:`<span>${titleOf[pre] || pre}</span>`
          })
        }).addTo(labels);
      }
    });
  }

  /* ── button toggle ────────────────────── */
  btn.addEventListener('click', () => {
    on = !on;
    // Expose state for filterAndDisplay
    window.updateConnectionsFiltered.on = on;
    btn.textContent = on ? 'Back to Map' : 'Industry Connections';
    if (on) {
      // Hide heatmap and cluster canvas
      if (typeof heatLayer !== 'undefined' && heatLayer) {
        map.removeLayer(heatLayer);
      }
      if (typeof clearCanvas === 'function') {
        clearCanvas(); // remove revenue cluster canvas
      }
      // Hide marker clusters
      if (typeof markers !== 'undefined' && map.hasLayer(markers)) {
        map.removeLayer(markers);
      }
      // Show individual industry points (filtered)
      if (industryPointsLayer) {
        map.removeLayer(industryPointsLayer);
        industryPointsLayer = null;
      }
      industryPointsLayer = L.layerGroup();
      filtered.forEach(d => {
        if (d.Latitude && d.Longitude) {
          const m = L.circleMarker([d.Latitude, d.Longitude], {
            radius: 5,
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.85,
            weight: 1
          }).bindPopup(`<b>${d.Company}</b>`);
          industryPointsLayer.addLayer(m);
        }
      });
      industryPointsLayer.addTo(map);
      buildGroups();
      ensureCanvas();
      render();                             // first frame
      map.on('move zoom resize', render);
    } else {
      map.off('move zoom resize', render);
      dropCanvas();
      labels.clearLayers();
      // Remove individual points
      if (industryPointsLayer) {
        map.removeLayer(industryPointsLayer);
        industryPointsLayer = null;
      }
      // Restore marker clusters
      if (typeof markers !== 'undefined' && !map.hasLayer(markers)) {
        map.addLayer(markers);
      }
      refreshVisual(); // restore heatmap/clusters
    }
  });

  // Listen for filter changes and update points/connections if in connections mode
  function updateConnectionsFiltered() {
    if (!on) return;
    // Remove old layer
    if (industryPointsLayer) {
      map.removeLayer(industryPointsLayer);
      industryPointsLayer = null;
    }
    // Add new filtered points
    industryPointsLayer = L.layerGroup();
    filtered.forEach(d => {
      if (d.Latitude && d.Longitude) {
        const m = L.circleMarker([d.Latitude, d.Longitude], {
          radius: 5,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.85,
          weight: 1
        }).bindPopup(`<b>${d.Company}</b>`);
        industryPointsLayer.addLayer(m);
      }
    });
    industryPointsLayer.addTo(map);
    buildGroups();
    render();
  }
  window.updateConnectionsFiltered = updateConnectionsFiltered;
})();

/* ----------  GPS / LIVE-LOCATION TRACKING  ---------- */
(() => {
  /* custom blue-dot icon rendered via CSS */
  const blueDot = L.divIcon({
    className: 'gps-bluedot',
    html: '<div class="dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]      // centre of icon = lat-lng point
  });

  let watchId        = null;  // id from navigator.geolocation.watchPosition
  let userMarker     = null;  // L.Marker instance
  let accuracyCircle = null;  // L.Circle instance
  let firstFix       = true;  // recentre only once

  /* start watching the user’s position */
  function startTracking() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude, longitude, accuracy } = coords;
        const ll = [latitude, longitude];

        // create marker + circle once, update thereafter
        if (!userMarker) {
          userMarker = L.marker(ll, { icon: blueDot }).addTo(map);
          accuracyCircle = L.circle(ll, {
            radius: accuracy,
            color: '#136aec',
            fillColor: '#4a90e2',
            fillOpacity: 0.15,
            weight: 2
          }).addTo(map);
        } else {
          userMarker.setLatLng(ll);
          accuracyCircle.setLatLng(ll).setRadius(accuracy);
        }

        // zoom to first fix; afterwards pan only when off-screen
        if (firstFix) {
          map.setView(ll, Math.max(map.getZoom(), 13));
          firstFix = false;
        } else if (!map.getBounds().contains(ll)) {
          map.panTo(ll, { animate: true });
        }
      },
      (err) => {
        console.error('GPS error:', err);
        alert('Unable to retrieve your location.');
        stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  /* stop watching and clean up layers */
  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (userMarker)       { map.removeLayer(userMarker);     userMarker = null; }
    if (accuracyCircle)   { map.removeLayer(accuracyCircle); accuracyCircle = null; }
    btn.textContent = 'Track My Location';
    firstFix = true;
  }

  /* toggle button */
  const btn = document.createElement('button');
  btn.textContent = 'Track My Location';
  btn.style.cssText =
    'position:absolute;top:10px;left:10px;z-index:1000;' +
    'background:#fff;padding:4px 8px;border:1px solid #888;cursor:pointer;';
  btn.addEventListener('click', () => {
    if (watchId === null) {
      startTracking();
      btn.textContent = 'Stop Tracking';
    } else {
      stopTracking();
    }
  });
  map.getContainer().appendChild(btn);

  /* blue-dot CSS */
  const css = document.createElement('style');
  css.textContent = `
    .gps-bluedot .dot{
      width:12px;height:12px;border-radius:50%;
      background:#3182f6;border:2px solid #fff;
      box-shadow:0 0 6px 2px rgba(49,130,246,0.75);
    }`;
  document.head.appendChild(css);
})();   // end GPS IIFE

});     // end DOMContentLoaded
