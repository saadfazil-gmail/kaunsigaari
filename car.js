// ===== Car detail page: reads ?car=<slug> from the address and fills the page =====
const slug = new URLSearchParams(location.search).get('car');
const car = cars.find(c => c.slug === slug);

if (!car) {
  document.getElementById('detail').hidden = true;
  document.getElementById('notfound').hidden = false;
} else {
  const $ = id => document.getElementById(id);
  const full = `${car.brand} ${car.name}`;
  document.title = `${full} | KaunsiGaari`;

  // Hero
  const img = $('d-img');
  img.onerror = () => { img.onerror = null; img.src = photoOf(car); };
  img.src = photoOf(car).replace(/\/\d+px-/, '/1280px-');
  img.alt = full;
  $('d-rank').textContent = `#${car.rank} on the hot list`;
  $('d-brand').textContent = car.brand;
  $('d-name').textContent = car.name;
  $('d-price').textContent = priceText(car.price);
  $('d-tags').innerHTML = [car.body, car.fuel].map(t => `<span class="tag">${t}</span>`).join('');

  // Quick numbers
  $('d-sales').textContent = fmt(car.sales);
  $('d-change').innerHTML = `<span class="${car.change >= 0 ? 'good' : 'bad'}">${car.change >= 0 ? '▲' : '▼'} ${pct(car.change)}</span>`;
  $('d-search').textContent = car.search;
  $('d-pricechange').innerHTML = car.priceChange === 0
    ? 'No change'
    : `<span class="${car.priceChange > 0 ? 'bad' : 'good'}">${car.priceChange > 0 ? '▲ Up' : '▼ Down'} ${Math.abs(car.priceChange)} lakh</span>`;

  // Sales: 6 columns, one colour, latest month in red, hover for the number
  const max = Math.max(...car.history);
  const chart = $('d-chart');
  chart.setAttribute('aria-label', `${full} sales for the last six months: ` +
    MONTHS.map((m, i) => `${m} ${fmt(car.history[i])}`).join(', '));
  chart.innerHTML = car.history.map((v, i) => `
    <div class="col ${i === car.history.length - 1 ? 'col--now' : ''}" data-i="${i}">
      <span class="col__val">${i === car.history.length - 1 || v === max ? fmt(v) : ''}</span>
      <span class="col__bar" style="height:0" data-h="${(v / max) * 74}%"></span>
      <span class="col__label">${MONTHS[i]}</span>
    </div>`).join('');
  requestAnimationFrame(() => chart.querySelectorAll('.col__bar').forEach(b => (b.style.height = b.dataset.h)));
  const tip = $('tooltip');
  chart.addEventListener('mousemove', e => {
    const col = e.target.closest('.col');
    if (!col) { tip.hidden = true; return; }
    const i = +col.dataset.i;
    const prev = car.history[i - 1];
    tip.innerHTML = `<b>${MONTHS[i]} 2026</b>${fmt(car.history[i])} sold` +
      (prev ? `<br>${pct((car.history[i] - prev) / prev)} vs ${MONTHS[i - 1]}` : '');
    tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, innerWidth - 180) + 'px';
    tip.style.top = e.clientY + 14 + 'px';
  });
  chart.addEventListener('mouseleave', () => (tip.hidden = true));

  // Hot Score breakdown
  $('d-score').textContent = car.score;
  const parts = [
    ['Sales', car.parts.sales, 45, `${fmt(car.sales)} sold`],
    ['Growth', car.parts.momentum, 30, `${pct(car.change)} vs last month`],
    ['Search interest', car.parts.search, 25, `${car.search}/100 on Google Trends`],
  ];
  $('d-meters').innerHTML = parts.map(([label, got, of, why]) => `
    <div class="meter">
      <div class="meter__top"><span>${label}</span><b>${got}<small> / ${of}</small></b></div>
      <div class="meter__track"><span style="width:${(got / of) * 100}%"></span></div>
      <p class="meter__why">${why}</p>
    </div>`).join('');

  // Variants
  $('d-variants').innerHTML = `<thead><tr><th>Variant</th><th>Price</th></tr></thead><tbody>` +
    car.variants.map(v => `<tr><td>${car.name} ${v.name}</td><td>Rs ${lakh(v.price)}</td></tr>`).join('') + '</tbody>';

  // Specs (placeholders until real data)
  const specs = [['Body', car.body], ['Fuel', car.fuel], ['Engine', 'Coming soon'], ['Transmission', 'Coming soon'],
                 ['Fuel economy', 'Coming soon'], ['Seats', 'Coming soon']];
  $('d-specs').innerHTML = specs.map(([k, v]) =>
    `<div><dt>${k}</dt><dd class="${v === 'Coming soon' ? 'soon' : ''}">${v}</dd></div>`).join('');

  // Similar cars: same body type, closest starting price
  const similar = cars.filter(c => c !== car && c.body === car.body)
    .sort((a, b) => Math.abs(a.price[0] - car.price[0]) - Math.abs(b.price[0] - car.price[0]))
    .slice(0, 3);
  $('d-similar-sub').textContent = `Other ${car.body === 'SUV' ? 'SUVs' : car.body.toLowerCase() + 's'} at a similar price.`;
  $('d-similar').innerHTML = similar.map(c => `
    <li class="car">
      <a class="car__link" href="${linkOf(c)}" aria-label="${c.brand} ${c.name} details"></a>
      <div class="car__photo">
        <img src="${photoOf(c)}" alt="" loading="lazy">
        <span class="car__rank">${c.rank}</span>
        <span class="score">Hot score <b>${c.score}</b></span>
      </div>
      <div class="car__body">
        <span class="car__brand">${c.brand}</span>
        <h3 class="car__name">${c.name}</h3>
        <p class="car__price">${priceText(c.price)}</p>
      </div>
    </li>`).join('');

  // Photo credit (required by the free licence)
  const p = photos[full];
  if (p) $('d-credit').innerHTML = `Photo: <a href="${p.source}" target="_blank" rel="noopener">${full}</a> by ${p.author}, ${p.license}, via Wikimedia Commons.`;
}
