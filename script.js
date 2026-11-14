// ===== Notice strip and source lines: say exactly where today's numbers come from =====
document.getElementById('data-note').textContent =
  `Early version. Sales: PAMA, ${monthLabel(SALES_MONTH)}. Prices: official brand websites, checked ${DATA.pricesCheckedLabel}. Search interest coming soon.`;
document.querySelectorAll('[data-src="sales"]').forEach(el => {
  el.innerHTML = `Source: <a href="${DATA.salesSource}" target="_blank" rel="noopener">PAMA monthly sales, ${monthLabel(SALES_MONTH)}</a>. Brands that don’t report to PAMA aren’t in this chart.`;
});
document.querySelectorAll('[data-src="prices"]').forEach(el => {
  el.textContent = `Source: each brand’s official price list, checked ${DATA.pricesCheckedLabel}. Ex-factory prices; freight and registration are extra.`;
});
document.querySelectorAll('[data-month]').forEach(el => (el.textContent = monthLabel(SALES_MONTH)));

// ===== What's hot list (responds to filters and search) =====
const state = { budget: 'all', body: 'all', fuel: 'all', q: '' };

function matches(c) {
  if (state.body !== 'all' && c.body !== state.body) return false;
  if (state.fuel !== 'all' && !c.fuels.includes(state.fuel)) return false;
  if (state.budget !== 'all') {
    if (!c.price) return false;
    const [lo, hi] = state.budget.split('-').map(Number);
    if (c.price[0] < lo || c.price[0] >= hi) return false;   // judged by starting price
  }
  if (state.q && !`${c.brand} ${c.name}`.toLowerCase().includes(state.q)) return false;
  return true;
}

const changeHtml = x => x.change == null
  ? `<b>–</b>vs last month`
  : `<b class="${x.change >= 0 ? 'up' : 'dn'}">${x.change >= 0 ? '▲' : '▼'} ${pct(x.change)}</b>vs ${monthShort(PREV_MONTH)}`;
const titleOf = e => e.combined ? e.label : e.lead.name;

// A card for a ranked sales entry (one PAMA row; may cover several models)
function entryCard(e) {
  const c = e.lead;
  return `
    <li class="car ${e.rank === 1 ? 'car--top' : ''}">
      <a class="car__link" href="${linkOf(c)}" aria-label="${e.brand} ${titleOf(e)} details"></a>
      <div class="car__photo">
        ${photoTag(c)}
        <span class="car__rank">${e.rank}</span>
        <span class="score" title="Hot Score out of 100">Hot score <b>${e.score}</b></span>
      </div>
      <div class="car__body">
        <span class="car__brand">${e.brand}</span>
        <h3 class="car__name">${titleOf(e)}</h3>
        <p class="car__price">${e.price ? priceText(e.price) : 'Price not published'}</p>
        <p class="car__meta">${e.combined ? `${e.cars.length} models, counted together by PAMA` : `${c.body} · ${c.fuel}`}</p>
        ${e.combined ? `<div class="group-links">${e.cars.map(x => `<a href="${linkOf(x)}">${x.name}</a>`).join('')}</div>` : ''}
        <div class="car__signals">
          <span class="signal"><b>${fmt(e.sales)}</b>sold in ${monthShort(SALES_MONTH)}</span>
          <span class="signal">${changeHtml(e)}</span>
          <span class="signal"><b>Soon</b>search interest</span>
        </div>
      </div>
    </li>`;
}

// A card for a car that isn't ranked (no published sales this month)
function plainCard(c) {
  const why = c.entry && c.entry.sales == null ? `${monthShort(SALES_MONTH)} sales awaited`
    : c.entry && c.entry.sales === 0 ? `none sold in ${monthShort(SALES_MONTH)}` : 'sales not published';
  return `
    <li class="car">
      <a class="car__link" href="${linkOf(c)}" aria-label="${c.brand} ${c.name} details"></a>
      <div class="car__photo">
        ${photoTag(c)}
        <span class="score">Not ranked</span>
      </div>
      <div class="car__body">
        <span class="car__brand">${c.brand}</span>
        <h3 class="car__name">${c.name}</h3>
        <p class="car__price">${c.price ? priceText(c.price) : 'Price not published'}</p>
        <p class="car__meta">${c.body} · ${c.fuel}</p>
        <div class="car__signals">
          <span class="signal"><b>–</b>${why}</span>
          <span class="signal"><b>–</b>vs last month</span>
          <span class="signal"><b>Soon</b>search interest</span>
        </div>
      </div>
    </li>`;
}

function renderHot() {
  const okCars = cars.filter(matches);
  // Ranked entries with at least one matching car, by Hot Score; then unranked matching cars, cheapest first
  const top = ranked.filter(e => e.cars.some(c => okCars.includes(c)));
  const rest = okCars.filter(c => c.rank == null).sort((a, b) => (a.price?.[0] ?? 1e9) - (b.price?.[0] ?? 1e9));
  const items = [...top.map(entryCard), ...rest.map(plainCard)].slice(0, 9);
  document.getElementById('hot-list').innerHTML = items.join('');
  document.getElementById('result-count').textContent =
    `${okCars.length} matching model${okCars.length === 1 ? '' : 's'} · ranked ones first`;
  document.getElementById('empty').hidden = okCars.length > 0;
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
const withSales = entries.filter(e => e.sales != null && e.sales > 0);
const totalSales = withSales.reduce((s, e) => s + e.sales, 0);
const riser = withSales.filter(e => e.change != null && e.prev >= 50).sort((a, b) => b.change - a.change)[0];
document.getElementById('stat-total').textContent = fmt(totalSales);
document.getElementById('stat-models').textContent = cars.length;
document.getElementById('stat-riser').textContent = riser ? `${riser.combined ? riser.brand : riser.lead.name} ${pct(riser.change)}` : '–';

// Hero: the No. 1 entry on the Hot List
const no1 = ranked[0];
const heroCar = no1.lead;
if (photoOf(heroCar)) {
  const heroImg = document.getElementById('hero-img');
  // Ask Wikimedia for a bigger copy; if that size isn't available, use the normal one
  heroImg.onerror = () => { heroImg.onerror = null; heroImg.src = photoOf(heroCar); };
  heroImg.src = photoOf(heroCar).replace(/\/\d+px-/, '/1280px-');
  heroImg.alt = `${heroCar.brand} ${heroCar.name}`;
} else {
  document.querySelector('.hero__photo').insertAdjacentHTML('afterbegin', photoTag(heroCar));
  document.getElementById('hero-img').remove();
}
document.getElementById('hero-brand').textContent = no1.brand;
document.getElementById('hero-name').textContent = titleOf(no1);
document.getElementById('hero-sales').textContent = fmt(no1.sales);
document.getElementById('hero-change').textContent = no1.change == null ? '–' : (no1.change >= 0 ? '▲ ' : '▼ ') + pct(no1.change);
document.getElementById('hero-change-label').textContent = `vs ${monthShort(PREV_MONTH)}`;
document.getElementById('hero-price').textContent = no1.price ? `Rs ${lakh(no1.price[0])}` : '–';
document.getElementById('hero-chat').textContent =
  `${no1.brand} ${titleOf(no1)}! ${monthLabel(SALES_MONTH)} mein ${fmt(no1.sales)} biki` +
  (no1.change != null ? `, pichle mahine se ${pct(no1.change)}` : '') + `. Hot score ${no1.score} 🔥`;

// ===== Top 10 sales chart (one colour, hover tooltip, table view) =====
const top10 = [...withSales].sort((a, b) => b.sales - a.sales).slice(0, 10);
const chartLabel = e => `${e.brand} ${titleOf(e)}`;
const chart = document.getElementById('chart');
chart.innerHTML = top10.map((e, i) => `
  <a class="bar-row" href="${linkOf(e.lead)}" data-i="${i}" title="${chartLabel(e)}">
    <span class="bar-row__label">${chartLabel(e)}</span>
    <span class="bar-row__track">
      <span class="bar" style="width:0" data-w="${(e.sales / top10[0].sales) * 88}%"></span>
      <span class="bar-row__val">${fmt(e.sales)}</span>
    </span>
  </a>`).join('');
requestAnimationFrame(() => chart.querySelectorAll('.bar').forEach(b => (b.style.width = b.dataset.w)));

const tip = document.getElementById('tooltip');
chart.addEventListener('mousemove', ev => {
  const row = ev.target.closest('.bar-row');
  if (!row) { tip.hidden = true; return; }
  const e = top10[row.dataset.i];
  tip.innerHTML = `<b>${chartLabel(e)}</b>${monthLabel(SALES_MONTH)}: ${fmt(e.sales)}` +
    (e.prev != null ? `<br>${monthLabel(PREV_MONTH)}: ${fmt(e.prev)}${e.change != null ? ` (${pct(e.change)})` : ''}` : '');
  tip.hidden = false;
  tip.style.left = Math.min(ev.clientX + 14, innerWidth - 220) + 'px';
  tip.style.top = ev.clientY + 14 + 'px';
});
chart.addEventListener('mouseleave', () => (tip.hidden = true));

document.getElementById('th-month').textContent = monthLabel(SALES_MONTH);
document.getElementById('th-prev').textContent = monthLabel(PREV_MONTH);
document.querySelector('#data-table tbody').innerHTML = top10.map(e =>
  `<tr><td>${chartLabel(e)}</td><td>${fmt(e.sales)}</td><td>${e.prev != null ? fmt(e.prev) : '–'}</td><td>${e.change != null ? pct(e.change) : '–'}</td></tr>`).join('');
const toggle = document.getElementById('table-toggle');
toggle.addEventListener('click', () => {
  const showTable = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', showTable);
  toggle.textContent = showTable ? 'Show as chart' : 'Show as table';
  document.getElementById('data-table').hidden = !showTable;
  chart.hidden = showTable;
});

// ===== Cheapest new cars right now (price changes need a second month of tracking) =====
document.getElementById('price-grid').innerHTML = cars
  .filter(c => c.price)
  .sort((a, b) => a.price[0] - b.price[0])
  .slice(0, 6)
  .map(c => `<a class="price-card" href="${linkOf(c)}">
      ${photoTag(c, 'price-card__img')}
      <div><h3>${c.brand} ${c.name}</h3><p>${c.variants.length} variant${c.variants.length > 1 ? 's' : ''} · ${c.body}</p></div>
      <span class="delta delta--price">from Rs ${lakh(c.price[0])}</span>
    </a>`).join('');

// ===== Brands =====
const brandCounts = {};
cars.forEach(c => (brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1));
document.getElementById('brands').innerHTML = Object.entries(brandCounts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
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
