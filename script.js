// ===================================================================
// SAMPLE DATA - every number here is made up for the design mockup.
// Later this list will be built from official brand price lists (prices),
// the PAMA monthly report (sales) and Google Trends (search interest).
//   price: [from, to] in lakh rupees
//   sales / prev: units sold this month / last month
//   search: Google search interest, 0-100
//   priceChange: lakh rupees vs last month (0 = no change)
// ===================================================================
const cars = [
  { brand: 'Suzuki',  name: 'Alto',      body: 'Hatchback', fuel: 'Petrol',   price: [31, 38],   sales: 4200, prev: 3800, search: 88, priceChange: 0.8 },
  { brand: 'Toyota',  name: 'Corolla',   body: 'Sedan',     fuel: 'Petrol',   price: [59, 75],   sales: 2100, prev: 2300, search: 80, priceChange: 2.5 },
  { brand: 'Honda',   name: 'City',      body: 'Sedan',     fuel: 'Petrol',   price: [47, 60],   sales: 1500, prev: 1200, search: 62, priceChange: 0 },
  { brand: 'Toyota',  name: 'Yaris',     body: 'Sedan',     fuel: 'Petrol',   price: [46, 61],   sales: 1400, prev: 1250, search: 58, priceChange: 0 },
  { brand: 'Suzuki',  name: 'Cultus',    body: 'Hatchback', fuel: 'Petrol',   price: [40, 46],   sales: 1300, prev: 1350, search: 55, priceChange: 0 },
  { brand: 'Suzuki',  name: 'WagonR',    body: 'Hatchback', fuel: 'Petrol',   price: [33, 39],   sales: 1100, prev: 900,  search: 50, priceChange: 0 },
  { brand: 'Kia',     name: 'Sportage',  body: 'SUV',       fuel: 'Petrol',   price: [90, 120],  sales: 900,  prev: 700,  search: 74, priceChange: -3 },
  { brand: 'Changan', name: 'Alsvin',    body: 'Sedan',     fuel: 'Petrol',   price: [43, 52],   sales: 700,  prev: 500,  search: 48, priceChange: 0 },
  { brand: 'Suzuki',  name: 'Swift',     body: 'Hatchback', fuel: 'Petrol',   price: [45, 52],   sales: 650,  prev: 700,  search: 46, priceChange: 0 },
  { brand: 'Haval',   name: 'H6 HEV',    body: 'SUV',       fuel: 'Hybrid',   price: [105, 130], sales: 600,  prev: 450,  search: 70, priceChange: 0 },
  { brand: 'Honda',   name: 'Civic',     body: 'Sedan',     fuel: 'Petrol',   price: [88, 98],   sales: 600,  prev: 650,  search: 66, priceChange: 1.5 },
  { brand: 'Hyundai', name: 'Tucson',    body: 'SUV',       fuel: 'Petrol',   price: [95, 115],  sales: 500,  prev: 520,  search: 52, priceChange: 0 },
  { brand: 'MG',      name: 'HS',        body: 'SUV',       fuel: 'Petrol',   price: [80, 100],  sales: 350,  prev: 420,  search: 44, priceChange: 0 },
  { brand: 'Kia',     name: 'Picanto',   body: 'Hatchback', fuel: 'Petrol',   price: [39, 41],   sales: 300,  prev: 280,  search: 30, priceChange: 0 },
  { brand: 'Toyota',  name: 'Fortuner',  body: 'SUV',       fuel: 'Diesel',   price: [160, 200], sales: 300,  prev: 310,  search: 40, priceChange: 4 },
  { brand: 'BYD',     name: 'Atto 3',    body: 'SUV',       fuel: 'Electric', price: [85, 95],   sales: 250,  prev: 120,  search: 82, priceChange: -5 },
];

// ===== Hot Score: 45% sales, 30% momentum, 25% search interest =====
const maxSales = Math.max(...cars.map(c => c.sales));
cars.forEach(c => {
  c.change = (c.sales - c.prev) / c.prev;                     // e.g. 0.25 = up 25%
  const momentum = Math.min(Math.max((c.change + 0.3) / 0.8, 0), 1); // -30%..+50% -> 0..1
  c.score = Math.round(100 * (0.45 * (c.sales / maxSales) + 0.30 * momentum + 0.25 * (c.search / 100)));
});

// ===== Helpers =====
const fmt = n => n.toLocaleString('en-PK');
const pct = x => (x >= 0 ? '+' : '') + Math.round(x * 100) + '%';
const priceText = ([a, b]) => `Rs ${lakh(a)} – ${lakh(b)}`;
function lakh(n) { return n >= 100 ? (n / 100).toFixed(2).replace(/\.?0+$/, '') + ' crore' : n + ' lakh'; }

// Photo for a car (from photos.js, Wikimedia Commons), or empty if none
const photoOf = c => (photos[`${c.brand} ${c.name}`] || {}).url || '';

// ===== What's hot list (responds to filters and search) =====
const state = { budget: 'all', body: 'all', fuel: 'all', q: '' };

function matches(c) {
  if (state.body !== 'all' && c.body !== state.body) return false;
  if (state.fuel !== 'all' && c.fuel !== state.fuel) return false;
  if (state.budget !== 'all') {
    const [lo, hi] = state.budget.split('-').map(Number);
    if (c.price[0] < lo || c.price[0] >= hi) return false;   // judged by starting price
  }
  if (state.q && !`${c.brand} ${c.name}`.toLowerCase().includes(state.q)) return false;
  return true;
}

function renderHot() {
  const list = cars.filter(matches).sort((a, b) => b.score - a.score).slice(0, 9);
  document.getElementById('hot-list').innerHTML = list.map((c, i) => `
    <li class="car ${i === 0 ? 'car--top' : ''}">
      <div class="car__photo">
        <img src="${photoOf(c)}" alt="${c.brand} ${c.name}" loading="lazy">
        <span class="car__rank">${i + 1}</span>
        <span class="score" title="Hot Score out of 100">Hot score <b>${c.score}</b></span>
      </div>
      <div class="car__body">
        <span class="car__brand">${c.brand}</span>
        <h3 class="car__name">${c.name}</h3>
        <p class="car__price">${priceText(c.price)}</p>
        <p class="car__meta">${c.body} · ${c.fuel}</p>
        <div class="car__signals">
          <span class="signal"><b>${fmt(c.sales)}</b>sold</span>
          <span class="signal"><b class="${c.change >= 0 ? 'up' : 'dn'}">${c.change >= 0 ? '▲' : '▼'} ${pct(c.change)}</b>vs last month</span>
          <span class="signal"><b>${c.search}</b>search /100</span>
        </div>
      </div>
    </li>`).join('');
  const total = cars.filter(matches).length;
  document.getElementById('result-count').textContent = `Showing ${list.length} of ${total} matching cars`;
  document.getElementById('empty').hidden = total > 0;
}

document.querySelectorAll('.chips').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    group.querySelectorAll('.chip').forEach(b => b.classList.toggle('is-on', b === btn));
    state[group.dataset.filter] = btn.dataset.value;
    renderHot();
  });
});
document.getElementById('search').addEventListener('input', e => {
  state.q = e.target.value.trim().toLowerCase();
  renderHot();
});

// ===== Month at a glance =====
const totalSales = cars.reduce((s, c) => s + c.sales, 0);
const best = [...cars].sort((a, b) => b.sales - a.sales)[0];
const riser = [...cars].sort((a, b) => b.change - a.change)[0];
document.getElementById('stat-total').textContent = fmt(totalSales);
document.getElementById('stat-models').textContent = cars.length;

// Hero: the No. 1 car on the Hot List
const no1 = [...cars].sort((a, b) => b.score - a.score)[0];
const heroImg = document.getElementById('hero-img');
// Ask Wikimedia for a bigger copy; if that size isn't available, use the normal one
heroImg.onerror = () => { heroImg.onerror = null; heroImg.src = photoOf(no1); };
heroImg.src = photoOf(no1).replace(/\/\d+px-/, '/1280px-');
heroImg.alt = `${no1.brand} ${no1.name}`;
document.getElementById('hero-brand').textContent = no1.brand;
document.getElementById('hero-name').textContent = no1.name;
document.getElementById('hero-sales').textContent = fmt(no1.sales);
document.getElementById('hero-change').textContent = (no1.change >= 0 ? '▲ ' : '▼ ') + pct(no1.change);
document.getElementById('hero-price').textContent = `Rs ${lakh(no1.price[0])}`;
document.getElementById('stat-riser').textContent = `${riser.name} ${pct(riser.change)}`;

// ===== Top 10 sales chart (one colour, hover tooltip, table view) =====
const top10 = [...cars].sort((a, b) => b.sales - a.sales).slice(0, 10);
const chart = document.getElementById('chart');
chart.innerHTML = top10.map((c, i) => `
  <div class="bar-row" data-i="${i}">
    <span class="bar-row__label">${c.brand} ${c.name}</span>
    <span class="bar-row__track">
      <span class="bar" style="width:0" data-w="${(c.sales / top10[0].sales) * 88}%"></span>
      <span class="bar-row__val">${fmt(c.sales)}</span>
    </span>
  </div>`).join('');
// Grow the bars in once the page has drawn
requestAnimationFrame(() => chart.querySelectorAll('.bar').forEach(b => (b.style.width = b.dataset.w)));

const tip = document.getElementById('tooltip');
chart.addEventListener('mousemove', e => {
  const row = e.target.closest('.bar-row');
  if (!row) { tip.hidden = true; return; }
  const c = top10[row.dataset.i];
  tip.innerHTML = `<b>${c.brand} ${c.name}</b>October: ${fmt(c.sales)}<br>September: ${fmt(c.prev)} (${pct(c.change)})`;
  tip.hidden = false;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - 200) + 'px';
  tip.style.top = e.clientY + 14 + 'px';
});
chart.addEventListener('mouseleave', () => (tip.hidden = true));

const tbody = document.querySelector('#data-table tbody');
tbody.innerHTML = top10.map(c => `<tr><td>${c.brand} ${c.name}</td><td>${fmt(c.sales)}</td><td>${fmt(c.prev)}</td><td>${pct(c.change)}</td></tr>`).join('');
const toggle = document.getElementById('table-toggle');
toggle.addEventListener('click', () => {
  const showTable = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', showTable);
  toggle.textContent = showTable ? 'Show as chart' : 'Show as table';
  document.getElementById('data-table').hidden = !showTable;
  chart.hidden = showTable;
});

// ===== Price changes =====
document.getElementById('price-grid').innerHTML = cars
  .filter(c => c.priceChange !== 0)
  .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
  .map(c => {
    const up = c.priceChange > 0;
    return `<div class="price-card">
      <img src="${photoOf(c)}" alt="" loading="lazy">
      <div><h3>${c.brand} ${c.name}</h3><p>Now from Rs ${lakh(c.price[0])}</p></div>
      <span class="delta ${up ? 'delta--up' : 'delta--down'}">${up ? '▲ Up' : '▼ Down'} ${Math.abs(c.priceChange)} lakh</span>
    </div>`;
  }).join('');

// ===== Brands =====
const brandCounts = {};
cars.forEach(c => (brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1));
document.getElementById('brands').innerHTML = Object.entries(brandCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([b, n]) => `<a href="#hot" class="brand" data-brand="${b}">${b}<small>${n} model${n > 1 ? 's' : ''}</small></a>`).join('');
document.getElementById('brands').addEventListener('click', e => {
  const a = e.target.closest('.brand');
  if (!a) return;
  const input = document.getElementById('search');
  input.value = a.dataset.brand;
  input.dispatchEvent(new Event('input'));
});

// ===== Photo credits (required by the photos' free licences) =====
document.getElementById('credits').innerHTML = Object.entries(photos).map(([car, p]) =>
  `<li>${car}: <a href="${p.source}" target="_blank" rel="noopener">photo</a> by ${p.author}, ${p.license}</li>`).join('');

renderHot();
