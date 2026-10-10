#!/usr/bin/env python3
"""Generates the QR codes for /qr/ and /links/ from content/site.json.
Dev-time only (needs `pip install segno`); the SVG/PNG files are committed.
    python3 scripts/qr.py
"""
import json, os, sys
try:
    import segno
except ImportError:
    sys.exit("segno is not installed: pip install segno")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "content", "site.json")
OUT = os.path.join(ROOT, "assets", "img")
site = json.load(open(SITE, encoding="utf-8"))
socials = {s["id"]: s for s in site["socials"]["items"]}
links_url = site["meta"]["siteUrl"] + "links/"

# id → (href, label EN, label ES)
targets = [
    ("steam", site["meta"]["steamUrl"], "Wishlist on Steam", "Lista de deseados en Steam"),
    ("discord", socials["discord"]["href"], "Join the Discord", "Entra en el Discord"),
    ("instagram", socials["instagram"]["href"], "Instagram", "Instagram"),
    ("links", links_url, "All the links", "Todos los enlaces"),
]
for extra in site.get("qr", {}).get("extraTargets", []):
    targets.append((extra["id"], extra["href"], extra["label"]["en"], extra["label"]["es"]))
items = []
for key, href, en, es in targets:
    q = segno.make(href, error="q")
    q.save(os.path.join(OUT, f"qr-{key}.svg"), scale=12, border=2, dark="#0B1230", light=None, xmldecl=False, svgclass=None, lineclass=None)
    q.save(os.path.join(OUT, f"qr-{key}-1024.png"), scale=28, border=2, dark="#0B1230", light="#FFFFFF")
    items.append({"id": key, "href": href, "label": {"en": en, "es": es}, "file": f"qr-{key}"})
    print(f"  qr-{key}: v{q.version} → {href}")

site.setdefault("qr", {})
site["qr"]["items"] = items
json.dump(site, open(SITE, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
open(SITE, "a", encoding="utf-8").write("\n")
print(f"{len(items)} QR codes written to assets/img/ and content/site.json → qr.items")
