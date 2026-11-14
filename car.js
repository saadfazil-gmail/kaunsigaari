// ===== Car detail page: reads ?car=<slug> from the address and fills the page =====
const slug = new URLSearchParams(location.search).get('car');
const car = cars.find(c => c.slug === slug);

if (!car) {
  document.getElementById('detail').hidden = true;
  document.getElementById('notfound').hidden = false;
} else {
  const $ = id => document.getElementById(id);
  const full = `${car.brand} ${car.name}`;
  const e = car.entry;                                   // its PAMA sales entry, or null
  const others = e && e.combined ? e.cars.filter(x => x !== car) : [];
  const withText = others.length ? ` (with ${others.map(x => x.name).join(' & ')})` : '';
  document.title = `${full} | KaunsiGaari`;

  // Hero
  const imgBox = $('d-img').parentElement;
  if (photoOf(car)) {
    const img = $('d-img');
    img.onerror = () => { img.onerror = null; img.src = photoOf(car); };
    img.src = photoOf(car).replace(/\/\d+px-/, '/1280px-');
    img.alt = full;
  } else {
    imgBox.innerHTML = photoTag(car);
  }
  $('d-rank').textContent = car.rank ? `#${car.rank} on the hot list${withText}` : 'Not ranked this month';
  $('d-brand').textContent = car.brand;
  $('d-name').textContent = car.name;
  $('d-price').textContent = car.price ? priceText(car.price) : 'Price not published';
  const tags = [car.body, ...car.fuels];
  if (car.assembly) tags.push(car.assembly);
  $('d-tags').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

  // Quick numbers
  if (e && e.sales != null) {
    $('d-sales').textContent = fmt(e.sales);
    $('d-sales-label').textContent = `sold in ${monthLabel(SALES_MONTH)}${withText}`;
  } else {
    $('d-sales').textContent = '–';
    $('d-sales-label').textContent = e ? `${monthLabel(SALES_MONTH)} sales awaited from PAMA` : 'sales not published by PAMA';
  }
  $('d-change').innerHTML = e && e.change != null
    ? `<span class="${e.change >= 0 ? 'good' : 'bad'}">${e.change >= 0 ? '▲' : '▼'} ${pct(e.change)}</span>` : '–';
  $('d-change-label').textContent = `vs ${monthLabel(PREV_MONTH)}`;
  $('d-search').textContent = 'Soon';
  $('d-variants-count').textContent = car.variants.length;

  // Sales by month: the months we have, one colour, latest in pink
  const chart = $('d-chart');
  const hist = e ? e.history.filter(h => h.units != null) : [];
  if (!hist.length) {
    chart.outerHTML = `<p class="body-note">${e ? `PAMA hasn’t published ${monthLabel(SALES_MONTH)} sales for this one yet.`
      : `${car.brand} doesn’t report sales to PAMA, so we can’t show them. We won’t guess.`}</p>`;
  } else {
    const max = Math.max(...hist.map(h => h.units), 1);
    chart.style.gridTemplateColumns = `repeat(${Math.max(hist.length, 3)}, 1fr)`;
    chart.setAttribute('aria-label', `${e.combined ? e.label : full} sales by month: ` +
      hist.map(h => `${monthLabel(h.month)} ${fmt(h.units)}`).join(', '));
    chart.innerHTML = hist.map((h, i) => `
      <div class="col ${i === hist.length - 1 ? 'col--now' : ''}" data-i="${i}">
        <span class="col__val">${fmt(h.units)}</span>
        <span class="col__bar" style="height:0" data-h="${(h.units / max) * 74}%"></span>
        <span class="col__label">${monthShort(h.month)}</span>
      </div>`).join('');
    requestAnimationFrame(() => chart.querySelectorAll('.col__bar').forEach(b => (b.style.height = b.dataset.h)));
    const tip = $('tooltip');
    chart.addEventListener('mousemove', ev => {
      const col = ev.target.closest('.col');
      if (!col) { tip.hidden = true; return; }
      const i = +col.dataset.i, prev = hist[i - 1];
      tip.innerHTML = `<b>${monthLabel(hist[i].month)}</b>${fmt(hist[i].units)} sold` +
        (prev && prev.units ? `<br>${pct((hist[i].units - prev.units) / prev.units)} vs ${monthShort(prev.month)}` : '');
      tip.hidden = false;
      tip.style.left = Math.min(ev.clientX + 14, innerWidth - 180) + 'px';
      tip.style.top = ev.clientY + 14 + 'px';
    });
    chart.addEventListener('mouseleave', () => (tip.hidden = true));
  }
  $('d-sales-src').innerHTML = e
    ? `Source: <a href="${DATA.salesSource}" target="_blank" rel="noopener">PAMA, ${monthLabel(SALES_MONTH)}</a>.` +
      (e.combined ? ` PAMA counts ${e.label} together and doesn’t split them.` : '')
    : `PAMA covers its member companies only.`;

  // Hot Score breakdown
  if (car.score != null) {
    $('d-score').textContent = car.score;
    const s = e.signals;
    const rows = [
      ['Sales', s.sales, `${fmt(e.sales)} sold, compared with the month’s best seller`],
      ['Growth', s.growth, e.change == null ? 'Needs two months of sales' : e.prev < 50 ? `${pct(e.change)}, but last month was too small to count` : `${pct(e.change)} vs last month`],
      ['Search interest', s.search, 'Google Trends: coming soon'],
    ];
    $('d-meters').innerHTML = rows.map(([label, v, why]) => `
      <div class="meter">
        <div class="meter__top"><span>${label}</span><b>${v == null ? '<small>not used</small>' : `${Math.round(v * 100)}<small> / 100</small>`}</b></div>
        <div class="meter__track"><span style="width:${v == null ? 0 : v * 100}%"></span></div>
        <p class="meter__why">${why}</p>
      </div>`).join('');
  } else {
    $('d-score').textContent = '–';
    $('d-meters').innerHTML = `<p class="body-note">No Hot Score this month: ${e ? 'PAMA hasn’t published this month’s sales yet' : 'its sales aren’t published'}. We only rank cars with real sales numbers.</p>`;
  }

  // Variants (real names and prices)
  $('d-variants').innerHTML = `<thead><tr><th>Variant</th><th>Engine / gearbox</th><th>Price</th></tr></thead><tbody>` +
    car.variants.slice().sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12)).map(v => `<tr>
      <td>${v.name}</td>
      <td>${[v.engineCc ? `${fmt(v.engineCc)} cc` : v.batteryKwh ? `${v.batteryKwh} kWh` : '', v.transmission || ''].filter(Boolean).join(' · ') || '–'}</td>
      <td>${v.price != null ? `Rs ${fmt(v.price)}` : 'not published'}</td></tr>`).join('') + '</tbody>';
  // Where the prices come from: official site, or a news report (labelled as such)
  const srcMap = new Map();
  car.variants.forEach(v => v.source && srcMap.set(v.source, v));
  const srcLinks = [...srcMap.values()].map(v =>
    `<a href="${v.source}" target="_blank" rel="noopener">${v.official ? `${car.brand}’s official website` : `a news report (${v.sourceName})`}</a>`);
  const anyNews = [...srcMap.values()].some(v => !v.official);
  const eff = [...new Set(car.variants.map(v => v.effectiveFrom).filter(Boolean))];
  $('d-variants-src').innerHTML = `Prices as listed by ${srcLinks.join(' and ') || 'the brand'}` +
    `${eff.length ? `, effective ${eff.join(', ')}` : ''}; checked ${DATA.pricesCheckedLabel}. Usually ex-factory: freight, tax and registration may be extra.` +
    (anyNews ? ` <b>We couldn’t get an official price list for this car, so some prices come from news reports and may be out of date.</b>` : '');

  // Specs: only what the official price list says; the rest is "coming soon"
  const ccs = [...new Set(car.variants.map(v => v.engineCc).filter(Boolean))].sort((a, b) => a - b);
  const kwh = [...new Set(car.variants.map(v => v.batteryKwh).filter(Boolean))].sort((a, b) => a - b);
  const gears = [...new Set(car.variants.map(v => v.transmission).filter(Boolean))];
  const specs = [
    ['Body', car.body], ['Fuel', car.fuel],
    [kwh.length && !ccs.length ? 'Battery' : 'Engine', ccs.length ? ccs.map(x => `${fmt(x)} cc`).join(', ') : kwh.length ? kwh.map(x => `${x} kWh`).join(', ') : 'Coming soon'],
    ['Transmission', gears.length ? gears.join(', ') : 'Coming soon'],
    ['Fuel economy', 'Coming soon'], ['Seats', 'Coming soon'],
  ];
  $('d-specs').innerHTML = specs.map(([k, v]) =>
    `<div><dt>${k}</dt><dd class="${v === 'Coming soon' ? 'soon' : ''}">${v}</dd></div>`).join('');

  // Similar cars: same body type, closest starting price
  const similar = cars.filter(c => c !== car && c.body === car.body && c.price && car.price)
    .sort((a, b) => Math.abs(a.price[0] - car.price[0]) - Math.abs(b.price[0] - car.price[0]))
    .slice(0, 3);
  $('d-similar-sub').textContent = similar.length
    ? `Other ${car.body === 'SUV' ? 'SUVs' : car.body.toLowerCase() + 's'} at a similar price.` : '';
  $('d-similar').innerHTML = similar.map(c => `
    <li class="car">
      <a class="car__link" href="${linkOf(c)}" aria-label="${c.brand} ${c.name} details"></a>
      <div class="car__photo">
        ${photoTag(c)}
        ${c.rank ? `<span class="car__rank">${c.rank}</span>` : ''}
        <span class="score">${c.score != null ? `Hot score <b>${c.score}</b>` : 'Not ranked'}</span>
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
