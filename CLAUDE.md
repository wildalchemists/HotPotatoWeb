# Hot Potato — website rebuild

You are rebuilding the official website for HOT POTATO, a multiplayer party brawler made in Unreal Engine 5 by Wild Alchemists (Madrid), coming to Steam (app 3650190). Repo: wildalchemists/HotPotatoWeb, served on GitHub Pages.

## Goal

A bilingual (EN/ES) game landing page that looks like it was made by the team that made the game, not by a template or a model. A player should be able to wishlist within 5 seconds; press should find the press kit and contact in under 15.

## The old site (`legacy/index.html`, read it but do not extend it)

- 29.5 MB because 7 PNGs are base64-embedded. Treat it as a content source only.
- Its look (cream/crimson/teal, typewriter font, gold rules, emoji icons) has nothing to do with the game. Do not carry any of it forward.
- Its editor (6 clicks on the title → localStorage → "Export HTML") is being replaced.

## Target architecture

Same philosophy as the team's portfolio site: zero dependencies, editable in the browser, publishes to GitHub.

- `content/site.json` — single source of truth: every string in EN + ES, every link, every list (modes, characters, awards, quotes, team, socials).
- `assets/img/` — real image files (WebP + JPEG fallback where needed), never base64 in HTML.
- `src/template.html` + `src/styles.css` + `src/main.js` — the public site. Vanilla HTML/CSS/JS. No frameworks, no npm runtime deps, no CDN JS. Google Fonts allowed, or self-hosted fonts in `assets/fonts/`.
- `scripts/build.mjs` — Node, zero deps: renders template + site.json into `dist/index.html` with real text baked in (works without JS, good for SEO and link previews).
- `editor/` — the in-browser editor, loaded only on demand, never shipped to normal visitors.
- `scripts/check.mjs` + `.githooks/pre-push` — validation before anything is published.
- `.github/workflows/pages.yml` — build and deploy `dist/` to Pages on push to main.
- Firebase (optional, use only where a static site can't do the job): Firestore for contact-form and playtest/newsletter sign-ups (strict security rules + App Check), Firebase Auth if teammates should log into the editor with Google instead of pasting a GitHub token. Content stays in the repo, not in Firestore. Flag anything that needs the Blaze (paid) plan before using it.

## Rules for every step

1. Never invent facts: release date, player count, prices, platforms, awards, quotes, team names. Missing → write it to `OPEN_QUESTIONS.md` and leave a visible TODO in `site.json`.
2. Every user-facing string lives in `site.json` in both languages. No hardcoded copy in templates.
3. No emoji as icons or decoration. No generic stock-SaaS patterns (see the ban list in `docs/art-direction.md` once it exists).
4. Accessibility: semantic HTML, alt text from `site.json`, visible focus, `prefers-reduced-motion` respected, contrast ≥ 4.5:1 for body text.
5. Performance budget: first view ≤ 600 KB transferred excluding the trailer embed; LCP image ≤ 250 KB; YouTube loads only on click (lite embed).
6. Small, reviewable commits with clear messages. Stop at each checkpoint and show what changed before continuing.
7. When something asked conflicts with these rules, say so instead of quietly choosing.

## Working notes

- Dev-time image tools: `scripts/extract-legacy.mjs` and `scripts/palette.mjs` are zero-dependency Node. WebP encoding is not possible in bare Node, so the extract script shells out to whichever encoder is installed (`cwebp`, ImageMagick, or Python Pillow) and says which one it used. None of these ships to the site.
- Prompt pack for this rebuild lives outside the repo (Claude doc "Hot Potato Web — Redesign Prompt Pack"); the checkpoints referenced there are the stopping points.
