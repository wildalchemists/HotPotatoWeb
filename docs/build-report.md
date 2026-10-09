# Build report — Prompt 3 checkpoint (2026-10-09)

Direction B (Tagged), title in one colour as requested. Rendered from `content/site.json` by `scripts/build.mjs` into `dist/` (EN) and `dist/es/` (ES). Served locally with `node scripts/serve.mjs dist 8080` (gzip on) for every measurement below.

## Screenshots

`docs/screenshots/`: `en-1440.jpg`, `es-1440.jpg`, `en-390.jpg`, `es-390.jpg`, plus the side-by-side sheets `desktop-1440-en-es.jpg` and `mobile-390-en-es.jpg`. Full page, Playwright Chromium, lazy images forced so the whole page shows.

## Lighthouse 12, mobile emulation, simulated slow 4G + 4× CPU

| Page | Performance | Accessibility | SEO | Best practices | FCP | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EN `/` | 97 | 100 | 100 | 100 | 1.1 s | 2.6 s | 0 | 0 ms |
| ES `/es/` | 96 | 100 | 100 | 100 | 1.1 s | 2.7 s | 0 | 0 ms |

The only remaining non-perfect audit is the informational "network dependency tree". LCP element is the `<h1>`; its time is the 117 KB Rubik Spray Paint file over the simulated connection (preloaded, `font-display: swap`).

## First view transfer (what the browser downloads before any scroll, gzip for text)

| Page @ viewport | Transferred | Requests | Text | Images | Fonts |
| --- | --- | --- | --- | --- | --- |
| EN @ 390 | 464 KB | 12 | 57 KB | 226 KB | 181 KB |
| EN @ 1440 | 464 KB | 12 | 57 KB | 226 KB | 181 KB |
| ES @ 390 | 464 KB | 12 | 57 KB | 226 KB | 181 KB |
| ES @ 1440 | 464 KB | 12 | 57 KB | 226 KB | 181 KB |

Budget: ≤ 600 KB excluding the trailer embed (the YouTube iframe only loads on click). LCP image is `keyart-logo-1200.webp` at 46 KB (budget ≤ 250 KB). "Images" includes four lazy pictures Chromium fetches early because of its generous lazy-load distance; the hero itself is 77 KB of images.

Fonts are self-hosted in `assets/fonts/` (latin + latin-ext WOFF2, licences in `assets/fonts/LICENSE.md`). Self-hosting removed the render-blocking Google Fonts CSS and took Performance from 84 to 97; Rubik is the single variable file (35 KB) rather than four static weights.

## Checks run

- No horizontal scroll at 320, 390, 768, 1440, 2560 px, EN and ES.
- No console errors, no failed requests, no 4xx.
- `content/site.json` validates against `content/schema.json`; the build throws on any missing key.
- JSON-LD `VideoGame`, hreflang (en, es, x-default), canonical, Open Graph 1200×630, Twitter card, favicon set, manifest, sitemap, robots.

## Known gaps (all visible on the page as TODOs, all in `OPEN_QUESTIONS.md`)

- Modes intro and the rules of Infected / Team deathmatch.
- Press kit URL (the button is rendered, its target is the TODO).
- Permanent Discord invite.
- Clean logo file: the hero still uses a brightened crop of the key art.
- Price is stored but not rendered (`meta.price.public = false`).
