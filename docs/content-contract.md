# Content contract

How `content/site.json`, the template and the editor agree on what is editable. The build bakes text into HTML; the editor (Prompt 4) binds to the attributes below and writes back to `site.json`, never to the HTML.

## Source of truth

- `content/site.json`, validated by `content/schema.json`.
- Every user-facing string is a **text object** `{ "en": "…", "es": "…" }`. A value starting with `TODO` is a known gap: it renders (so nobody forgets it) and blocks publishing in `scripts/check.mjs`.
- Images are **image objects**: `{ "src": "shot-2", "widths": [1200, 2400], "width": 2193, "height": 1234, "alt": {en, es}, "focal": {x, y}? }`. The file on disk is `assets/img/<src>-<width>.webp`. `width`/`height` are the intrinsic size of the largest variant and are written into the `<img>` to prevent layout shift.
- Links are **link objects**: `{ "label": {en, es}, "href": "…", "external": bool }`.

## Attributes the template emits

| Attribute | On | Meaning for the editor |
| --- | --- | --- |
| `data-k="path.in.site.json"` | any element whose text comes from one key | Text field. If the key is a text object, edit EN and ES side by side; if it is a plain string (names, years, emails), one field. |
| `data-img="path"` | `<img>` | Image slot: replace the file, alt text (EN + ES) and focal point. Paths point at an image object. |
| `data-href="path"` | `<a>` | URL field. Steam and YouTube URLs are validated; label is the sibling `data-k`. |
| `data-list="path"` | the container of a repeatable group (`<ul>`, `<ol>`, `<div>`, `<select>`) | Add, duplicate, delete, reorder. Each child's keys use `path[index]` (the template's `*_path` variable). New items start from the schema's defaults. |
| `data-lang-switch="es"` | language links | Not editable; marks the links that store the language preference. |

Paths use dots for objects and `[n]` for array items: `howItPlays.beats[2].title`, `socials.items[0].href`. Nothing else on the page is editable: layout, rotations and colours live in `src/styles.css`.

## Template syntax (`src/template.html`, rendered by `scripts/build.mjs`)

| Tag | Output |
| --- | --- |
| `{{t path}}` | localized string, escaped. `{{t path\|md}}` allows `**bold**` and line breaks |
| `{{= path}}` | plain value (string/number), escaped; also context vars (`lang`, `base`, `url`, `otherUrl`, `v`, `year`) |
| `{{raw path}}` | unescaped (only `jsonld`) |
| `{{#each path as x}} … {{/each}}` | loop; inside: `x`, `x_index`, `x_n` (1-based), `x_first`, `x_last`, `x_path` |
| `{{#if path}} … {{else}} … {{/if}}`, `{{#if path == value}}`, `{{#unless path}}` | conditionals |
| `{{img path sizes="…" loading="eager"}}` | responsive `<img>` with `srcset`, `width`, `height`, localized `alt`, `object-position` from `focal`, and `data-img` |
| `{{status path}}` | a mode status rendered through `modes.statusLabels` |

The build throws on any missing key, so a template can never silently render an empty string.

## Output

- `dist/index.html` (EN) and `dist/es/index.html` (ES). Relative asset paths via `{{= base}}` (`""` or `"../"`).
- Both pages carry `<link rel="alternate" hreflang>` for `en`, `es` and `x-default`, their own `<title>`, meta description, Open Graph + Twitter card, JSON-LD `VideoGame`, canonical URL.
- `dist/sitemap.xml`, `robots.txt`, `site.webmanifest`, `favicon.ico`, `.nojekyll`.
- Language choice: clicking a language link stores `hp-lang` in `localStorage`; on the next visit, a one-line inline script redirects once per session to the stored language (guarded by `sessionStorage`, wrapped in try/catch, never loops).

## Behaviour that is not content

`src/main.js` adds: phone menu, external-link `rel`, lite YouTube (iframe injected on click, `youtube-nocookie.com`), gallery lightbox (Escape, arrows, swipe, focus kept inside), contact form → `mailto:` with subject and body (the no-JS fallback is the form's own `action="mailto:"`). With `meta.firebase` present, Prompt 5 swaps the form handler for a Firestore write.
