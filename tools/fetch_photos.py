"""Find a free, credited photo for each car on the site, from Wikimedia Commons.

Reads the model list from data/cars.js and only looks up cars that don't
have a photo yet (photos already in photos.js are kept). Writes photos.js:
for each car, the image URL (hot-linked from Wikimedia, nothing is
downloaded), the photographer credit, the licence and the source page.

Run:  /usr/bin/python3 tools/fetch_photos.py
(The Mac's built-in Python; the python.org one here fails on SSL certificates.)

After running, LOOK at the photos (wrong car, wrong generation, rear views
happen) and fix them with PINNED, then run again.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://en.wikipedia.org/w/api.php"
UA = {"User-Agent": "gaari-mockup/0.1 (personal learning project)"}

# Search words for the version sold in Pakistan, where "brand + name" isn't enough
QUERIES = {
    "Suzuki Fronx": "Suzuki Fronx",
    "Toyota Corolla Cross": "Toyota Corolla Cross front",
    "Toyota Camry": "Toyota Camry XV80",
    "Toyota Land Cruiser Prado": "Toyota Land Cruiser Prado 250",
    "Toyota Land Cruiser 300": "Toyota Land Cruiser 300 front",
    "Honda HR-V": "Honda HR-V RV 2022 front",
    "Hyundai Elantra": "Hyundai Elantra CN7 front",
    "Hyundai Sonata": "Hyundai Sonata DN8 facelift",
    "Hyundai Santa Fe Hybrid": "Hyundai Santa Fe MX5",
    "Hyundai Palisade Hybrid": "Hyundai Palisade LX3",
    "Hyundai IONIQ 5": "Hyundai Ioniq 5 front",
    "Hyundai IONIQ 6": "Hyundai Ioniq 6 front",
    "Kia Sportage L": "Kia Sportage NQ5 front",
    "Kia Sorento": "Kia Sorento MQ4 front",
    "Kia Stonic": "Kia Stonic front",
    "Kia Carnival": "Kia Carnival KA4 front",
    "Kia EV5": "Kia EV5",
    "Kia EV9": "Kia EV9 front",
    "Changan Oshan X7": "Changan Oshan X7",
    "Deepal S05": "Deepal S05",
    "Deepal S07": "Deepal S07",
    "Deepal L07": "Deepal L07",
    "Deepal E07": "Deepal E07",
    "Haval Jolion": "Haval Jolion front",
    "Haval H6 GT": "Haval H6 GT",
    "Tank Tank 500": "Tank 500 SUV",
    "GWM Ora 5": "Ora 5 GWM",
    "MG ZS": "MG ZS second generation",
    "MG MG4": "MG4 Electric front",
    "MG Binguo": "Wuling Binguo",
    "BYD Atto 2": "BYD Atto 2",
    "BYD Seal": "BYD Seal front",
    "BYD Sealion 7": "BYD Sealion 7",
    "Proton Saga": "Proton Saga third generation",
    "Proton X70": "Proton X70 front",
    "Chery Tiggo 7 PHEV": "Chery Tiggo 7 Pro",
    "Chery Tiggo 8 PHEV": "Chery Tiggo 8 Pro",
    "Chery Tiggo 9 PHEV": "Chery Tiggo 9",
    "Peugeot 2008": "Peugeot 2008 second generation front",
}

# Same car underneath (or same body): reuse another car's photo
SHARE = {
    "Haval H6": "Haval H6 HEV",
    "Haval H6 PHEV": "Haval H6 HEV",
    "Hyundai Elantra Hybrid": "Hyundai Elantra",
    "Hyundai Sonata N Line": "Hyundai Sonata",
    "MG HS PHEV": "MG HS",
}

# Hand-picked files where the search picks the wrong car or generation
PINNED = {
    "Honda Civic": "File:2022 Honda Civic e-HEV RS.jpg",
    "Hyundai Tucson Hybrid": "File:Hyundai Tucson NX4 1.6 GLS HEV Pine Green Matte - front.jpg",
    "Honda HR-V": "File:2022 Honda HR-V 1.5 E (Indonesia) front view.jpg",
    "BYD Seal": "File:2023 BYD Seal front.jpg",
    "Haval H6 GT": "File:2022 Haval H6 GT Coupe grey front.jpg",
    "Peugeot 2008": "File:Peugeot 2008 II 001.jpg",
    "Proton Saga": "File:2018 Proton Saga Premium 1.3 front.jpg",
}

SKIP = re.compile(r"rear|interior|engine|dashboard|messe|tuned|seat|wheel|badge|logo|cockpit|trunk", re.I)


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(6 * (attempt + 1))   # politely back off when rate-limited
    raise RuntimeError("Still rate-limited, try again in a minute")


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def load_js(path, name):
    if not os.path.exists(path):
        return {}
    s = open(path).read()
    return json.loads(s[s.index("{"):s.rindex("}") + 1])


cars_data = load_js(os.path.join(ROOT, "data", "cars.js"), "DATA")
wanted = [f"{m['brand']} {m['name']}" for m in cars_data["models"]]
photos = load_js(os.path.join(ROOT, "photos.js"), "photos")
photos = {k: v for k, v in photos.items() if k in wanted}     # drop cars no longer on the site

# 1. Search for each car that has no photo (pinned ones skip the search)
files = {}
for car in wanted:
    if car in photos and car not in PINNED:
        continue
    if car in SHARE:
        continue
    if car in PINNED:
        files[car] = PINNED[car]
        continue
    q = QUERIES.get(car, car)
    res = get({"action": "query", "list": "search", "srnamespace": 6,
               "srsearch": f"{q} filetype:bitmap", "srlimit": 8})
    hits = [h["title"] for h in res["query"]["search"]
            if re.search(r"\.(jpe?g|png|webp)$", h["title"], re.I) and not SKIP.search(h["title"])]
    if hits:
        files[car] = hits[0]
        print(f"  found: {car} <- {hits[0]}")
    else:
        print(f"  none:  {car}")
    time.sleep(1.2)

# 2. URL, author and licence for the new photos (in batches of 40 titles)
titles = list(dict.fromkeys(files.values()))
info_by_title = {}
for i in range(0, len(titles), 40):
    info = get({"action": "query", "titles": "|".join(titles[i:i + 40]), "prop": "imageinfo",
                "iiprop": "url|extmetadata", "iiurlwidth": 900})
    norm = {n["from"]: n["to"] for n in info["query"].get("normalized", [])}
    pages = {p["title"]: p for p in info["query"]["pages"].values()}
    for t in titles[i:i + 40]:
        p = pages.get(norm.get(t, t))
        if p and p.get("imageinfo"):
            info_by_title[t] = p["imageinfo"][0]
    time.sleep(1)

for car, title in files.items():
    ii = info_by_title.get(title)
    if not ii:
        continue
    meta = ii["extmetadata"]
    photos[car] = {
        "url": ii["thumburl"],
        "author": strip_html(meta.get("Artist", {}).get("value")) or "Unknown",
        "license": meta.get("LicenseShortName", {}).get("value", ""),
        "source": ii["descriptionurl"],
        "file": title,
    }
for car, other in SHARE.items():
    if car in wanted and other in photos:
        photos[car] = photos[other]

photos = {k: photos[k] for k in wanted if k in photos}         # site order
with open(os.path.join(ROOT, "photos.js"), "w") as f:
    f.write("// Generated by tools/fetch_photos.py. Photos from Wikimedia Commons, credited on the page.\n")
    f.write("const photos = " + json.dumps(photos, indent=2, ensure_ascii=False) + ";\n")
missing = [c for c in wanted if c not in photos]
print(f"\nphotos.js: {len(photos)} of {len(wanted)} cars have a photo.")
if missing:
    print("Still missing: " + ", ".join(missing))
