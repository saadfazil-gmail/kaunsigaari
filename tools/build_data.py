"""Build data/cars.js from the raw research files in data/raw/.

  data/raw/pama-YYYY-MM.json   PAMA monthly sales (one file per month; the
                               newest one is used, and it also holds the
                               month before)
  data/raw/prices-*.json       variant prices from official brand websites
                               (or, where a site was unreachable, news
                               reports, which the page labels as such)

Run:  python3 tools/build_data.py

Rules: nothing is invented. A missing number stays null and the site says
"not published". Pickups and vans are left out (the site covers cars and SUVs).
"""
import glob
import json
import os
from collections import Counter
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "cars.js")

SKIP_BODIES = {"Pickup", "Van"}
BODY_MAP = {"Crossover": "SUV"}          # the site filters by Hatchback / Sedan / SUV
FUEL_ORDER = ["Petrol", "Hybrid", "Plug-in hybrid", "Diesel", "Electric"]

# PAMA rows -> which models on our site they count. PAMA sometimes reports
# several models as ONE number; "label" is how we name that group.
GROUPS = {
    "Suzuki Alto": ("Suzuki", "Alto", ["Alto"]),
    "Suzuki Swift": ("Suzuki", "Swift", ["Swift"]),
    "Suzuki Cultus": ("Suzuki", "Cultus", ["Cultus"]),
    "Suzuki WagonR": ("Suzuki", "WagonR", ["WagonR"]),
    "SUZUKI FRONX": ("Suzuki", "Fronx", ["Fronx"]),
    "Toyota (Corolla, Yaris & Corolla Cross)": ("Toyota", "Corolla, Yaris & Corolla Cross", ["Corolla", "Yaris", "Corolla Cross"]),
    "TOYOTA (Fortuner & IMVs)": ("Toyota", "Fortuner & Hilux", ["Fortuner", "Hilux"]),
    "Honda Cars (Civic & City)": ("Honda", "City & Civic", ["City", "Civic"]),
    "HONDA BR-V & HR-V": ("Honda", "HR-V & BR-V", ["HR-V", "BR-V"]),
    "Hyundai Elantra": ("Hyundai", "Elantra", ["Elantra", "Elantra Hybrid"]),
    "Hyundai Sonata": ("Hyundai", "Sonata", ["Sonata", "Sonata N Line"]),
    "HYUNDAI TUCSON": ("Hyundai", "Tucson", ["Tucson", "Tucson Hybrid"]),
    "HYUNDAI SANTA FE": ("Hyundai", "Santa Fe", ["Santa Fe", "Santa Fe Hybrid"]),
    "HYUNDAI PALISADE": ("Hyundai", "Palisade", ["Palisade", "Palisade Hybrid"]),
    "HAVAL / TANK SAZGAR": ("Haval", "Haval & Tank", ["H6", "H6 HEV", "H6 PHEV", "H6 GT", "Jolion", "Tank 300", "Tank 500"]),
    "BAIC D20 Sazgar": ("BAIC", "D20", ["D20"]),
    "BAIC X25 SAZGAR": ("BAIC", "X25", ["X25"]),
    "BAIC BJ40L SAZGAR": ("BAIC", "BJ40L", ["BJ40L", "BJ40 Plus"]),
    "JETOUR UNITED MOTORS": ("Jetour", "Jetour (all models)", ["X70 Plus", "Dashing", "T2", "X90 Plus"]),
    "DEWAN Honri-Ve": ("Honri", "VE", ["VE"]),
}
# Official brand websites. A price from any other site is a news report,
# and the car page says so.
OFFICIAL_DOMAINS = {
    "suzukipakistan.com", "toyota-indus.com", "honda.com.pk", "hyundai-nishat.com",
    "kia-luckymotorcorp.com", "peugeot-luckymotorcorp.com", "changan.com.pk", "deepal.com.pk",
    "gwm-pakistan.com", "mgmotors.com.pk", "proton.com.pk",
}
NEWS_NAMES = {"propakistani.pk": "ProPakistani", "en.dailypakistan.com.pk": "Daily Pakistan", "gari.pk": "Gari.pk"}


def domain(url):
    d = url.split("//")[-1].split("/")[0].lower()
    return d[4:] if d.startswith("www.") else d

# Brands whose site models live under a different brand name in GROUPS
BRAND_ALIASES = {"Tank": "Haval", "GWM Tank": "Haval"}


def slug(*parts):
    return "-".join(p.lower() for p in parts).replace(" ", "-").replace("&", "and").replace("(", "").replace(")", "")


def load(path):
    with open(path) as f:
        return json.load(f)


# ---- Sales: the newest PAMA file ----
pama_files = sorted(glob.glob(os.path.join(RAW, "pama-*.json")))
pama = load(pama_files[-1])
groups = []
for row in pama["rows"]:
    if row["pamaName"] not in GROUPS:
        continue                                   # pickups, vans and the like
    brand, label, models = GROUPS[row["pamaName"]]
    groups.append({
        "id": slug(brand, label),
        "brand": brand,
        "label": label,
        "pamaName": row["pamaName"],
        "models": models,
        "sales": [
            {"month": pama["prevMonth"], "units": row["prevSales"]},
            {"month": pama["month"], "units": row["sales"]},
        ],
    })


def group_for(brand, model):
    b = BRAND_ALIASES.get(brand, brand)
    for g in groups:
        if g["brand"] == b and model in g["models"]:
            return g["id"]
    return None


# ---- Prices: every prices-*.json file ----
variants = []
for path in sorted(glob.glob(os.path.join(RAW, "prices-*.json"))):
    variants += load(path)["variants"]

by_model = {}
for v in variants:
    if v.get("body") in SKIP_BODIES:
        continue
    by_model.setdefault((v["brand"], v["model"]), []).append(v)

models = []
for (brand, name), vs in by_model.items():
    bodies = Counter(BODY_MAP.get(v["body"], v["body"]) for v in vs if v.get("body"))
    fuels = {v["fuel"] for v in vs if v.get("fuel")}
    assemblies = {v.get("assembly") for v in vs if v.get("assembly")}
    models.append({
        "brand": brand,
        "name": name,
        "body": bodies.most_common(1)[0][0] if bodies else "Other",
        "fuels": [f for f in FUEL_ORDER if f in fuels] or ["Not stated"],
        "assembly": assemblies.pop() if len(assemblies) == 1 else None,
        "salesGroup": group_for(brand, name),
        "variants": [{
            "name": v["variant"],
            "price": v.get("price"),
            "fuel": v.get("fuel"),
            "engineCc": v.get("engineCc"),
            "batteryKwh": v.get("batteryKwh"),
            "transmission": v.get("transmission"),
            "source": v.get("source"),
            "official": domain(v.get("source") or "") in OFFICIAL_DOMAINS,
            "sourceName": v.get("sourceName") or NEWS_NAMES.get(domain(v.get("source") or ""), domain(v.get("source") or "")),
            "effectiveFrom": v.get("effectiveFrom"),
        } for v in vs],
    })
models.sort(key=lambda m: (m["brand"], m["name"]))

checked = date.today()
data = {
    "builtOn": checked.isoformat(),
    "salesMonth": pama["month"],
    "prevMonth": pama["prevMonth"],
    "salesSource": pama["source"],
    "pricesChecked": checked.isoformat(),
    "pricesCheckedLabel": f"{checked.day} {checked.strftime('%b %Y')}",
    "salesGroups": groups,
    "models": models,
}
with open(OUT, "w") as f:
    f.write("// Generated by tools/build_data.py from data/raw/. Don't edit by hand: edit the raw files and rebuild.\n")
    f.write("const DATA = " + json.dumps(data, indent=1, ensure_ascii=False) + ";\n")

linked = sum(1 for m in models if m["salesGroup"])
print(f"Wrote data/cars.js: {len(models)} models ({linked} with PAMA sales), {len(groups)} PAMA rows, sales month {pama['month']}.")
for m in models:
    if not m["salesGroup"]:
        print(f"  no PAMA sales: {m['brand']} {m['name']}")
