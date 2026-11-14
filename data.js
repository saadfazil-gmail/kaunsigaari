// ===================================================================
// Turns the real data in data/cars.js (built by tools/build_data.py)
// into what the pages show: price ranges, sales change and Hot Score.
// Nothing here makes up a number: a missing value stays null and the
// pages say "not published" or "coming soon".
//
// Sales come from PAMA, which reports some models together (for example
// "Toyota Corolla, Yaris & Corolla Cross" is one number). So sales and the
// Hot Score belong to a SALES ENTRY (one PAMA row), and each car points
// to the entry it is counted in.
// ===================================================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = ym => { const [y, m] = ym.split('-'); return `${MONTH_NAMES[+m - 1]} ${y}`; };
const monthShort = ym => MONTH_NAMES[+ym.split('-')[1] - 1];

// ===== Helpers =====
const fmt = n => n.toLocaleString('en-PK');
const pct = x => (x >= 0 ? '+' : '') + Math.round(x * 100) + '%';
function lakh(n) {
  const r = Math.round(n * 10) / 10;                 // round first, so 99.99 becomes 1 crore, not "100 lakh"
  return r >= 100 ? (+(r / 100).toFixed(2)) + ' crore' : r + ' lakh';
}
const priceText = ([a, b]) => a === b ? `Rs ${lakh(a)}` : `Rs ${lakh(a)} – ${lakh(b)}`;
const slugOf = c => `${c.brand}-${c.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
const linkOf = c => `car.html?car=${slugOf(c)}`;

// Photo for a car (photos.js, from Wikimedia Commons), or '' if we don't have one yet
const photoOf = c => (photos[`${c.brand} ${c.name}`] || {}).url || '';
// <img> when there's a photo, otherwise a friendly placeholder tile
function photoTag(c, cls = '') {
  const url = photoOf(c);
  return url
    ? `<img class="${cls}" src="${url}" alt="${c.brand} ${c.name}" loading="lazy">`
    : `<div class="nophoto ${cls}" role="img" aria-label="${c.brand} ${c.name}, photo coming soon"><span>${c.brand}</span><b>${c.name}</b></div>`;
}

const SALES_MONTH = DATA.salesMonth;      // e.g. '2026-10'
const PREV_MONTH = DATA.prevMonth;        // e.g. '2026-09'

// ===== Cars (one per model) =====
const cars = DATA.models.map(m => {
  const prices = m.variants.map(v => v.price).filter(p => p != null);
  const c = {
    ...m,
    fuel: m.fuels.join(' / '),
    price: prices.length ? [Math.min(...prices) / 1e5, Math.max(...prices) / 1e5] : null,
    search: null,                       // Google Trends: coming soon
  };
  c.slug = slugOf(c);
  return c;
});

// ===== Sales entries (one per PAMA row) =====
const entries = DATA.salesGroups.map(g => {
  const unitsIn = month => { const r = g.sales.find(s => s.month === month); return r ? r.units : null; };
  const e = { ...g, sales: unitsIn(SALES_MONTH), prev: unitsIn(PREV_MONTH) };
  e.cars = cars.filter(c => c.salesGroup === g.id);
  e.lead = e.cars[0] || null;                         // the car whose photo/link represents the entry
  e.history = g.sales.slice().sort((a, b) => a.month.localeCompare(b.month));
  e.change = e.sales != null && e.prev ? (e.sales - e.prev) / e.prev : null;
  e.combined = g.models.length > 1;
  const prices = e.cars.filter(c => c.price).flatMap(c => c.price);
  e.price = prices.length ? [Math.min(...prices), Math.max(...prices)] : null;
  return e;
}).filter(e => e.cars.length);                        // only entries for cars on the site

// ===== Hot Score =====
// Weights: sales 45, growth 30, search 25. A signal we don't have yet is
// left out and the others are scaled up, so the score is still out of 100.
// An entry with no published sales this month gets no score (not ranked).
const maxSales = Math.max(...entries.map(e => e.sales || 0));
const WEIGHTS = { sales: 45, growth: 30, search: 25 };
entries.forEach(e => {
  e.signals = {
    sales: e.sales != null ? e.sales / maxSales : null,
    // Growth: -30% or worse = 0, +50% or better = 1. Small bases (under 50 units) are too noisy to count.
    growth: e.change != null && e.prev >= 50 ? Math.min(Math.max((e.change + 0.3) / 0.8, 0), 1) : null,
    search: null,
  };
  if (e.signals.sales == null) { e.score = null; return; }
  let sum = 0, wsum = 0;
  for (const k in WEIGHTS) if (e.signals[k] != null) { sum += WEIGHTS[k] * e.signals[k]; wsum += WEIGHTS[k]; }
  e.score = Math.round(100 * sum / wsum);
});
const ranked = entries.filter(e => e.score != null && e.sales > 0).sort((a, b) => b.score - a.score || b.sales - a.sales);
entries.forEach(e => (e.rank = ranked.includes(e) ? ranked.indexOf(e) + 1 : null));

// Give each car its entry's numbers
cars.forEach(c => {
  const e = entries.find(x => x.id === c.salesGroup) || null;
  c.entry = e;
  c.sales = e ? e.sales : null;
  c.prev = e ? e.prev : null;
  c.change = e ? e.change : null;
  c.score = e ? e.score : null;
  c.rank = e ? e.rank : null;
});
