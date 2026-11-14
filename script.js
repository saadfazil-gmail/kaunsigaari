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
      <a class="car__link" href="${linkOf(c)}" aria-label="${c.brand} ${c.name} details"></a>
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
document.getElementById('hero-chat').textContent =
  `${no1.brand} ${no1.name}! ${fmt(no1.sales)} biki, pichle mahine se ${pct(no1.change)}. Hot score ${no1.score} 🔥`;
document.getElementById('stat-riser').textContent = `${riser.name} ${pct(riser.change)}`;

// ===== Top 10 sales chart (one colour, hover tooltip, table view) =====
const top10 = [...cars].sort((a, b) => b.sales - a.sales).slice(0, 10);
const chart = document.getElementById('chart');
chart.innerHTML = top10.map((c, i) => `
  <a class="bar-row" href="${linkOf(c)}" data-i="${i}">
    <span class="bar-row__label">${c.brand} ${c.name}</span>
    <span class="bar-row__track">
      <span class="bar" style="width:0" data-w="${(c.sales / top10[0].sales) * 88}%"></span>
      <span class="bar-row__val">${fmt(c.sales)}</span>
    </span>
  </a>`).join('');
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
    return `<a class="price-card" href="${linkOf(c)}">
      <img src="${photoOf(c)}" alt="" loading="lazy">
      <div><h3>${c.brand} ${c.name}</h3><p>Now from Rs ${lakh(c.price[0])}</p></div>
      <span class="delta ${up ? 'delta--up' : 'delta--down'}">${up ? '▲ Up' : '▼ Down'} ${Math.abs(c.priceChange)} lakh</span>
    </a>`;
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
