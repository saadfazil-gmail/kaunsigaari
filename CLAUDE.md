# KaunsiGaari

A website for people in Pakistan choosing a **new** car. It lists every model sold locally and ranks
them by what's hot, using real numbers. "Kaunsi gaari?" means "which car?".

The owner is learning Claude Code with this project. Explain things in plain words, keep steps small,
and suggest the next step at the end of each piece of work.

**Status (14 Nov 2026):** real data, early version. Sales are PAMA's October 2026 report; prices come
from official brand websites (news reports where a site was unreachable, and the page says so). Search
interest (Google Trends) is not in yet. The strip at the top of each page says where the numbers come from.

---

## Scope

- New, locally sold cars only. **No used or second-hand imports** (maybe later).
- 57 models from 17 brands (Nov 2026). Pickups and vans are left out. The goal is every locally
  available model and variant.

## Files

| File | What |
|---|---|
| `index.html` / `script.js` | Homepage: hero (No. 1), Hot List with filters, top-10 sales chart, cheapest cars, brands |
| `car.html` / `car.js` | Detail page, `car.html?car=<slug>`: sales by month, Hot Score breakdown, variants with sources, specs, similar cars |
| `data/raw/*.json` | **The real data, as researched**: `pama-YYYY-MM.json` (sales) and `prices-*.json` (variant prices, each with its source URL) |
| `tools/build_data.py` | Turns `data/raw/` into `data/cars.js`. Holds the PAMA-row-to-model mapping (`GROUPS`) and the list of official domains |
| `data/cars.js` | Generated. Don't edit by hand: edit the raw files and run `/usr/bin/python3 tools/build_data.py` |
| `data.js` | Shared logic for both pages: price ranges, sales entries, Hot Score, formatting helpers |
| `photos.js` | Photo URLs and credits. Generated, don't edit by hand |
| `tools/fetch_photos.py` | Finds free photos on Wikimedia Commons and writes `photos.js` |
| `style.css` | All styling, mobile first (breakpoints at 640px and 960px) |

Plain HTML, CSS and JavaScript. No framework, no build step.

## Preview

```bash
python3 -m http.server 8813
```

Then open http://localhost:8813. The browser-pane tools need the page served over http, not opened as
a file. After CSS or JS changes, bump the `?v=` number on the `<link>`/`<script>` tags (or reload with
a new query string) to beat the browser cache.

## Monthly update

1. Get the new PAMA PDF from pama.org.pk; save its numbers as `data/raw/pama-YYYY-MM.json` (same shape
   as the last one: both months, `null` for "Awaited", `0` for "-").
2. Re-check prices on the official sites; update or add `data/raw/prices-*.json`.
3. Run `/usr/bin/python3 tools/build_data.py`, preview, check the numbers against the sources, commit.

**PAMA quirks:** some rows are combined (Toyota Corolla/Yaris/Corolla Cross, Honda City/Civic, Honda
HR-V/BR-V, Toyota Fortuner/Hilux, Haval/Tank, Jetour). Sales and the Hot Score belong to the PAMA row
("sales entry"); the site shows combined rows as one entry and never splits them. Kia, MG, BYD,
Changan, Deepal, Proton, Chery, Peugeot don't report to PAMA: they're listed but not ranked.

## Hot Score

`score = 45% sales + 30% growth + 25% search interest`, out of 100.
- **Sales:** units this month ÷ the month's best seller.
- **Growth:** month-on-month change, mapped from −30% (0 points) to +50% (full points).
- **Search:** Google Trends interest, 0–100.

The weights live in `data.js`. If they change, also update the text on both pages that explains them.
Missing signals (search, for now) are left out and the rest scaled up to 100. Growth only counts when
last month had 50+ units. Entries with no published sales get no score and aren't ranked.

## Where real data will come from

| Data | Source | Notes |
|---|---|---|
| Models, variants, prices, specs | Each brand's official Pakistani website | Claude reads the pages and updates `data.js`, the owner approves |
| Monthly sales | PAMA (Pakistan Automotive Manufacturers Association) monthly PDF | A script parses it. Some newer brands may not report to PAMA: show "not published", never guess |
| Price changes | This month's brand prices vs last month's | Automatic once prices are tracked over time |
| Search interest | Google Trends | Free `pytrends` library (unofficial, can break) or Google's official Trends API |
| Reviews | YouTube Data API (official, free quota) | Show views and links to review videos. Don't copy review text |
| Photos | Wikimedia Commons now | Brand press photos later, only with permission |

**Rules:**
- **Do not scrape PakWheels** or similar sites. Their terms forbid it. A data partnership by email is fine.
- Check a site's terms and robots.txt before automating it.
- **Never invent a fact.** No made-up specs, prices, "locally assembled" claims or reviews. If unknown,
  show "Coming soon" or "not published".

## Photos

- Hot-linked from Wikimedia Commons; nothing is downloaded. Credits are shown in the footer (home) and
  per car (detail page) because the free licences require it. Keep the credits.
- Some photos are other-market versions (Cultus = Celerio, Yaris = Vios, WagonR = Indonesian model,
  Tucson is a rear view). Fine for now, better photos later.
- `fetch_photos.py` needs `/usr/bin/python3` (the python.org Python here fails on SSL certificates).
  Wikipedia rate-limits fast requests, so the script spaces them out. `PINNED` in the script fixes cars
  where search picks the wrong photo.
- Wikimedia only serves certain thumbnail widths (1280px works for the hero, with a fallback).

## Design

Funky and friendly (Nov 2026; replaced an earlier dark "sporty" look the owner didn't like).
Inspired by the feel of usesentira.com, but **not copied**: our own colours, fonts and layout.
- Warm cream pages `#FFF7EA`, ink `#17130E`, truck-art accents: hot pink `#FF3E8A`, sunny yellow
  `#FFC83D`, teal `#00A99A`, dark plum `#2A1B3D` for the footer.
- Chunky shapes: 2px ink outlines, big rounded corners, hard offset shadows, slight tilts, stickers.
- Headlines in Bricolage Grotesque, body in DM Sans. Logo: a tilted yellow "?" badge + "kaunsi**gaari**".
- Roman Urdu touches in labels and the hero chat ("Kaunsi gaari lein? Data se poochein.").
- Yellow pill buttons with a round ink arrow.
- Charts use one colour: ink bars with the leader or latest month in pink. Hover tooltips and a table view.
- Green and orange show up and down, always with ▲/▼ and words, never colour alone.
- The brand deck (Slides artifact) holds the full brand guide.

## Next steps (in order)

1. **Real catalogue:** build `data.js` from official brand websites (all models, variants, prices).
2. **PAMA sales parser:** script that turns the monthly PDF into sales numbers.
3. **Go online:** free hosting (GitHub Pages or Netlify), then the domain. Favourite: kaunsigaari.pk
   (availability not checked yet).
4. **Monthly routine:** one "update the cars" step that fetches sales, checks prices and rebuilds.
5. **Extras:** YouTube reviews, compare page, Google Trends, Urdu version.

## Git

- Commit after each working step with a plain message.
- No remote yet. Ask before pushing anywhere or publishing.
