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


## Checks (Prompt 5 checkpoint, 2026-10-10)

`scripts/check.mjs` runs locally through `.githooks/pre-push` and in CI through `.github/workflows/pages.yml`. Below, the deliberately broken state (an emptied ES string `howItPlays.intro.es` and a 503 KB `shot-big-1200.webp` added to the gallery) and what happened.

### Local check on the broken content

```
· offline: external links and the Discord invite were not checked
  · first view es/index.html: 243 KB of 600 KB (7 files)
  · first view index.html: 243 KB of 600 KB (7 files)

23 warnings:
  ⚠ modes.items[0].name: ES is identical to EN ("Tag, you're it…"): untranslated?
  ⚠ modes.items[2].name: ES is identical to EN ("Team deathmatch…"): untranslated?
  ⚠ meta.officialName: TODO (not rendered): "TODO: confirm the official name. Steam slug reads "Hot Potato: Tag Out"
  ⚠ meta.platforms[0]: TODO (not rendered): "TODO: platforms as listed on Steam"
  ⚠ meta.players.en: TODO (not rendered): "TODO: player count (local / online, min–max)"
  ⚠ meta.players.es: TODO (not rendered): "TODO: número de jugadores"
  ⚠ meta.genreTags[0]: TODO (not rendered): "TODO: genre tags as on Steam"
  ⚠ meta.ageRating: TODO (not rendered): "TODO: PEGI / age rating, or remove"
  ⚠ hero.logo: TODO (not rendered): "TODO: assets/img/logo.svg (the graffiti HOT POTATO logo as a clean SVG"
  ⚠ features.items[0].title.en: TODO (not rendered): "TODO: mechanic 1 (name)"
  ⚠ features.items[0].title.es: TODO (not rendered): "TODO: mecánica 1 (nombre)"
  ⚠ features.items[0].body.en: TODO (not rendered): "TODO: mechanic 1 in one concrete sentence from the team"
  ⚠ features.items[0].body.es: TODO (not rendered): "TODO: mecánica 1 en una frase concreta del equipo"
  ⚠ features.items[1].title.en: TODO (not rendered): "TODO: mechanic 2 (name)"
  ⚠ features.items[1].title.es: TODO (not rendered): "TODO: mecánica 2 (nombre)"
  ⚠ features.items[1].body.en: TODO (not rendered): "TODO: mechanic 2 in one concrete sentence from the team"
  ⚠ features.items[1].body.es: TODO (not rendered): "TODO: mecánica 2 en una frase concreta del equipo"
  ⚠ features.items[2].title.en: TODO (not rendered): "TODO: mechanic 3 (name)"
  ⚠ features.items[2].title.es: TODO (not rendered): "TODO: mecánica 3 (nombre)"
  ⚠ features.items[2].body.en: TODO (not rendered): "TODO: mechanic 3 in one concrete sentence from the team"
  ⚠ features.items[2].body.es: TODO (not rendered): "TODO: mecánica 3 en una frase concreta del equipo"
  ⚠ hero.communityCta.href: Discord invite https://discord.gg/tNm9bszS: confirm it is permanent (the CLI checks the API)
  ⚠ socials.items[1].href: Discord invite https://discord.gg/tNm9bszS: confirm it is permanent (the CLI checks the API)

12 errors (publishing blocked):
  ✗ howItPlays.intro.es: schema: is empty
  ✗ howItPlays.intro.es: missing ES value
  ✗ modes.intro.en: TODO reaches the page: "TODO: the team says two modes are current; the old page listed one in "
  ✗ modes.intro.es: TODO reaches the page: "TODO: el equipo dice que hay dos modos actuales; la web antigua listab"
  ✗ modes.items[1].rules.en: TODO reaches the page: "TODO: rules in one line (from the team)"
  ✗ modes.items[1].rules.es: TODO reaches the page: "TODO: reglas en una línea (del equipo)"
  ✗ modes.items[2].rules.en: TODO reaches the page: "TODO: rules in one line (from the team)"
  ✗ modes.items[2].rules.es: TODO reaches the page: "TODO: reglas en una línea (del equipo)"
  ✗ pressKit.cta.href: TODO reaches the page: "#TODO-press-kit-url"
  ✗ gallery.items[4].image.src: assets/img/shot-big-1200.webp is 503 KB, limit 400 KB
  ✗ dist/es/index.html: references missing assets/img/shot-big-2400.webp
  ✗ dist/index.html: references missing assets/img/shot-big-2400.webp

FAIL — fix the errors above before publishing.
```

The two deliberate breaks show up as `howItPlays.intro.es: missing ES value` (plus the schema's `is empty`) and `shot-big-1200.webp is 503 KB, limit 400 KB`. The check also caught a real template bug: the lightbox link hardcoded a `-2400.webp` file that an image with `widths: [1200]` does not have (`references missing assets/img/shot-big-2400.webp`). That is fixed with a `{{imgsrc}}` tag that always points at the largest variant.

The seven `TODO reaches the page` errors are the team's open facts (Modes intro, the rules of Infected and Team deathmatch, the press-kit URL). They block every push and every deploy until `content/site.json` has them.

### The pre-push hook

```
$ git config core.hooksPath .githooks
$ git push origin claude/cool-dirac-a0i9ro
  ✗ gallery.items[4].image.src: assets/img/shot-big-1200.webp is 503 KB, limit 400 KB
  ✗ dist/es/index.html: references missing assets/img/shot-big-2400.webp
  ✗ dist/index.html: references missing assets/img/shot-big-2400.webp

FAIL — fix the errors above before publishing.
error: failed to push some refs to 'https://github.com/wildalchemists/HotPotatoWeb'
```

### CI

The workflow runs build + check on every push and pull request and deploys `dist/` only from `main`. Until the seven TODOs are filled, CI is red by design and nothing deploys. After that, a push to `main` deploys to GitHub Pages once the repository's Pages source is set to *GitHub Actions*.
