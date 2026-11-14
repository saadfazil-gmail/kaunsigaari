# KaunsiGaari

A website for people in Pakistan choosing a **new** car. It lists every model sold locally and ranks
them by what's hot, using real numbers. "Kaunsi gaari?" means "which car?".

The owner is learning Claude Code with this project. Explain things in plain words, keep steps small,
and suggest the next step at the end of each piece of work.

**Status (Nov 2026):** design mockup. Car names and photos are real. **Every number is made up**,
and a yellow strip at the top of each page says so. Keep that strip until real data is in.

---

## Scope

- New, locally sold cars only. **No used or second-hand imports** (maybe later).
- About 16 models from Suzuki, Toyota, Honda, Kia, Hyundai, Changan, Haval, MG and BYD so far. The
  goal is every locally available model and variant.

## Files

| File | What |
|---|---|
| `index.html` / `script.js` | Homepage: hero (No. 1 car), Hot List with filters, top-10 sales chart, price changes, brands |
| `car.html` / `car.js` | Detail page, `car.html?car=<slug>`: 6-month sales, Hot Score breakdown, variants, specs, similar cars |
| `data.js` | **All car data and numbers.** Shared by both pages. Swap this for real data, not the pages |
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

## Hot Score

`score = 45% sales + 30% growth + 25% search interest`, out of 100.
- **Sales:** units this month ÷ the month's best seller.
- **Growth:** month-on-month change, mapped from −30% (0 points) to +50% (full points).
- **Search:** Google Trends interest, 0–100.

The weights live in `data.js`. If they change, also update the text on both pages that explains them.

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

Bold and sporty, chosen by the owner:
- Near-black background with **one** accent, racing red `#FF2D3D`.
- Headlines in Barlow Condensed (uppercase, italic for car names). Body text in Inter.
- Charts use one colour: neutral grey bars with the leader or latest month in red. Hover tooltips and
  a table view.
- Green and orange show up and down, always with ▲/▼ and words, never colour alone.

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
