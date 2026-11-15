"""Measure "buzz": how much people are talking about each car right now.

Writes data/raw/buzz-YYYY-MM-DD.json with, per car, how many times it was
mentioned in the last 30 days and a few example links (shown on the car page
so anyone can see WHY a car has buzz).

Sources:
  news     Google News (Pakistan edition), last 30 days, articles that mention
           the car AND Pakistan. Works with no key.
  youtube  YouTube videos about the car published in the last 30 days, and
           their total views. Needs a free key: set YOUTUBE_API_KEY.
  reddit   Not yet: Reddit blocks access without a (free) app login.

Run:  /usr/bin/python3 tools/fetch_buzz.py
With YouTube:  YOUTUBE_API_KEY=... /usr/bin/python3 tools/fetch_buzz.py

Counts volume, not good or bad: a car can trend because of complaints too,
which is why the example links are shown.
"""
import datetime as dt
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "kaunsigaari-buzz/0.1 (personal project)"}
TODAY = dt.date.today()

# How to search for each car where "brand + name" would be ambiguous or repeated
QUERY_NAMES = {
    ("MG", "MG4"): "MG4",
    ("Tank", "Tank 500"): "Tank 500",
    ("GWM", "Ora 5"): "GWM Ora 5",
    ("Toyota", "Camry"): "Toyota Camry",
    ("Honda", "City"): "Honda City",
    ("Hyundai", "Tucson Hybrid"): "Hyundai Tucson",          # the news says "Tucson", not "Tucson Hybrid"
    ("Hyundai", "Santa Fe Hybrid"): "Hyundai Santa Fe",
    ("Hyundai", "Palisade Hybrid"): "Hyundai Palisade",
}


def get(url, tries=4):
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"Gave up on {url}")


def load_models():
    s = open(os.path.join(ROOT, "data", "cars.js")).read()
    data = json.loads(s[s.index("{"):s.rindex("}") + 1])
    return [(m["brand"], m["name"]) for m in data["models"]]


def news(name):
    """Google News articles from the last 30 days mentioning the car and Pakistan."""
    q = f'"{name}" Pakistan when:30d'
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": q, "hl": "en-PK", "gl": "PK", "ceid": "PK:en"})
    root = ET.fromstring(get(url))
    seen, items = set(), []
    for it in root.iter("item"):
        title = html.unescape(it.findtext("title") or "")
        key = re.sub(r"\s+-\s+[^-]+$", "", title).lower()      # drop " - Publisher" to dedupe
        if key in seen:
            continue
        seen.add(key)
        items.append({"title": title, "url": it.findtext("link"), "date": it.findtext("pubDate")})
    # ids let the site count an article once when it mentions several models of one entry
    return {"count": len(items), "examples": items[:3], "ids": sorted(seen)}


def youtube(name, key):
    """Videos about the car published in the last 30 days, and their total views."""
    after = (dt.datetime.utcnow() - dt.timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    url = "https://www.googleapis.com/youtube/v3/search?" + urllib.parse.urlencode({
        "part": "snippet", "q": f"{name} Pakistan", "type": "video", "maxResults": 50,
        "publishedAfter": after, "regionCode": "PK", "relevanceLanguage": "en", "key": key})
    res = json.loads(get(url))
    ids = [i["id"]["videoId"] for i in res.get("items", [])]
    if not ids:
        return {"count": 0, "views": 0, "examples": []}
    stats = json.loads(get("https://www.googleapis.com/youtube/v3/videos?" + urllib.parse.urlencode(
        {"part": "statistics,snippet", "id": ",".join(ids), "key": key})))
    vids = [{"title": v["snippet"]["title"], "url": f"https://www.youtube.com/watch?v={v['id']}",
             "views": int(v["statistics"].get("viewCount", 0))} for v in stats.get("items", [])]
    vids.sort(key=lambda v: -v["views"])
    return {"count": len(vids), "views": sum(v["views"] for v in vids), "examples": vids[:3]}


# Keys live in a file called .env in the project folder (never uploaded: it's in .gitignore).
# Lines look like:  YOUTUBE_API_KEY=your-key-here
env_path = os.path.join(ROOT, ".env")
if os.path.exists(env_path):
    for line in open(env_path):
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.strip().split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

yt_key = os.environ.get("YOUTUBE_API_KEY")
out = {"collected": TODAY.isoformat(), "window": "last 30 days",
       "sources": ["news"] + (["youtube"] if yt_key else []), "cars": {}}
for brand, name in load_models():
    query = QUERY_NAMES.get((brand, name), name if name.startswith(brand) else f"{brand} {name}")
    entry = {"query": query}
    try:
        entry["news"] = news(query)
    except Exception as e:                       # one failure shouldn't stop the run
        entry["news"] = None
        print(f"  news failed for {query}: {e}")
    if yt_key:
        try:
            entry["youtube"] = youtube(query, yt_key)
        except Exception as e:
            entry["youtube"] = None
            print(f"  youtube failed for {query}: {e}")
    out["cars"][f"{brand} {name}"] = entry
    n = entry["news"]["count"] if entry["news"] else "?"
    print(f"  {query}: news {n}" + (f", youtube {entry['youtube']['count']} videos" if entry.get("youtube") else ""))
    time.sleep(1.2)

path = os.path.join(ROOT, "data", "raw", f"buzz-{TODAY.isoformat()}.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
print(f"\nWrote {os.path.relpath(path, ROOT)} for {len(out['cars'])} cars. Sources: {', '.join(out['sources'])}.")
