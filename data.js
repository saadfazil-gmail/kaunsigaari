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

// ===== Extra sample data for the detail page (also made up) =====
const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const slugOf = c => `${c.brand}-${c.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const linkOf = c => `car.html?car=${slugOf(c)}`;

cars.forEach((c, n) => {
  c.slug = slugOf(c);
  // Six months of sales ending with Sep (prev) and Oct (sales); earlier months
  // are a gentle made-up wobble so the chart has a shape.
  let seed = n * 97 + 13;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const hist = [c.prev, c.sales];
  for (let i = 0; i < 4; i++) hist.unshift(Math.round(hist[0] * (0.85 + rand() * 0.3) / 10) * 10);
  c.history = hist;
  // Three price tiers spread across the price range (real variant names come later)
  const [lo, hi] = c.price;
  c.variants = [
    { name: 'Base', price: lo },
    { name: 'Mid', price: Math.round((lo + hi) / 2) },
    { name: 'Top', price: hi },
  ];
  c.parts = {   // the three pieces of the Hot Score, each out of its share
    sales: Math.round(45 * c.sales / maxSales),
    momentum: Math.round(30 * Math.min(Math.max((c.change + 0.3) / 0.8, 0), 1)),
    search: Math.round(25 * c.search / 100),
  };
});
const ranked = [...cars].sort((a, b) => b.score - a.score);
cars.forEach(c => (c.rank = ranked.indexOf(c) + 1));
