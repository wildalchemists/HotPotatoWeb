# Hot Potato — website

Official site of **Hot Potato**, the party brawler by [Wild Alchemists](https://www.instagram.com/wild.alchemists/) (Madrid), coming to Steam ([app 3650190](https://store.steampowered.com/app/3650190/)). Bilingual (EN at `/`, ES at `/es/`), static, zero dependencies, published on GitHub Pages from `dist/`.

## Where things live

| Path | What |
| --- | --- |
| `content/site.json` | **The content.** Every string in EN + ES, every link, every list. Validated by `content/schema.json`. |
| `assets/img/` | Real image files: `<name>-1200.webp` and `<name>-2400.webp` per picture, favicons, Open Graph image. Never base64. |
| `assets/fonts/` | Self-hosted WOFF2 (licences inside). |
| `src/template.html`, `src/styles.css`, `src/main.js` | The site. Vanilla HTML/CSS/JS. Text is baked in at build time; `main.js` only adds behaviour. |
| `src/links.html`, `src/qr.html`, `src/links.css` | `/links/`: the one-page links hub (Steam, Discord, Instagram, the rest, plus a QR to itself). `/qr/`: the convention sheet, four big QR codes (Steam wishlist, Discord, Instagram, links hub) with a print stylesheet that fits one A4 page. QR images come from `python3 scripts/qr.py` (needs `pip install segno`); rerun it if a URL changes. |
| `scripts/build.mjs` | Renders template + content into `dist/` for both languages. |
| `scripts/check.mjs` | Validation. Errors block publishing. |
| `scripts/serve.mjs` | 30-line local server. |
| `scripts/extract-legacy.mjs`, `scripts/palette.mjs` | One-off tools used to recover content and colours from the old page. |
| `docs/` | `art-direction.md` (the look and the ban list), `content-contract.md` (how the template and the editor address content), `build-report.md`, mockups and screenshots. |
| `legacy/index.html` | The previous 29 MB single-file site. Content source only; not served. |
| `OPEN_QUESTIONS.md` | Facts the site still needs from the team. Each one is a visible `TODO` in `site.json`. |

## Run it locally

```sh
node scripts/build.mjs          # → dist/index.html and dist/es/index.html
node scripts/serve.mjs dist 8080  # → http://localhost:8080/
node scripts/check.mjs          # validation (add --offline to skip the link checks)
```

Node 18+ is enough; there is nothing to install.

## Edit content

Today: edit `content/site.json`, run the build and the check, commit, push. Every string is `{ "en": "…", "es": "…" }`. Images are referenced by base name (`"src": "shot-2"` → `assets/img/shot-2-1200.webp` + `-2400.webp`), with `width`, `height` and `alt` in both languages. Unknown facts stay as `"TODO: …"` so they are visible and block publishing. See `docs/content-contract.md`.

The in-browser editor (`editor/`, opened with `?edit`) is the next step of the rebuild; it will read and write the same file and commit through GitHub.

## What the check enforces

Errors (block the push and the deploy): schema violations · a string missing its EN or ES value · a `TODO` that reaches the page · legacy filler ("Short description", "Nombre del Mapa", "∞", lorem ipsum…) · emoji in copy · an image that is missing, over 400 KB or without alt text in both languages · base64 `data:` URIs in HTML/CSS · a Steam link not pointing to app 3650190 · a `/cdn-cgi/` obfuscated address · a first view over 600 KB (HTML + CSS + JS gzipped, preloaded fonts, non-lazy images).

Warnings (reported, not blocking): a `TODO` in a field the template does not render · ES identical to EN on strings of 13+ characters · copy over the length limits in the schema · banned copy words from `docs/art-direction.md` · external links answering 4xx/5xx or unreachable · a Discord invite that is not permanent (checked through Discord's API).

`scripts/check.mjs` is an ES module: `checkContent(site, schema, opts)` runs in the browser too, so the editor and CI share one source of truth.

## Publishing

1. **Locally**, enable the hook once per clone so every push builds and checks first:
   ```sh
   git config core.hooksPath .githooks
   ```
2. **On GitHub**, `.github/workflows/pages.yml` runs build + check on every push and pull request. On `main` it also deploys `dist/` with `actions/deploy-pages`. A failed check never deploys.
3. The first run on `main` switches the repository's Pages source to GitHub Actions by itself (`actions/configure-pages` with `enablement: true`); if that step is ever refused, set it by hand under *Settings → Pages → Source: GitHub Actions*. The site is served at `https://wildalchemists.github.io/HotPotatoWeb/` (change `meta.siteUrl` in `site.json` if a custom domain is added).

Commits made by the editor go through the same workflow, so they are checked too.

## Firebase

Not used. The contact form opens the visitor's mail client (`mailto:` with subject and body) and works without JavaScript. If a newsletter or playtest sign-up is wanted later, the plan is Firestore with create-only security rules and App Check; the public web config would live in `site.json → meta.firebase` and no secret enters the repo. Firebase Auth for the editor would need the Blaze plan; a GitHub fine-grained token does not.
