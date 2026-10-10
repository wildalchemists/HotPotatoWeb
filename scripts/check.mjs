#!/usr/bin/env node
// Validation before anything is published. Zero dependencies.
//
// Two layers:
//   • checkContent(site, schema, opts)  — pure, browser-safe. The editor imports this file and calls it before publishing.
//   • CLI (node scripts/check.mjs)      — adds the Node-only checks: dist/ inspection, first-view budget, external links.
//
// Errors block publishing; warnings are reported.  Exit code 1 on any error.
//   node scripts/check.mjs [--offline] [--json]

/* ============================== shared, browser-safe ============================== */

export const LEGACY_FILLER = ['Short description', 'Nombre del Mapa', 'Rol / Arquetipo', '∞', 'legendary potato', 'patata legendaria', 'lorem ipsum'];
export const BANNED_WORDS = {
  en: ['unleash', 'epic', 'ultimate', 'chaos-filled journey', 'experience the', 'get ready to'],
  es: ['desata', 'épico', 'épica', 'definitivo', 'definitiva', 'prepárate para', 'experimenta la', 'experimenta el'],
};
export const STEAM_APP_ID = '3650190';
export const MAX_IMAGE_BYTES = 400 * 1024;
export const FIRST_VIEW_BUDGET = 600 * 1024;
export const IDENTICAL_MIN_LENGTH = 13; // shorter identical EN/ES strings are usually proper nouns (Steam, Beta, Infected)

const isText = (o) => o && typeof o === 'object' && !Array.isArray(o) && 'en' in o && 'es' in o && Object.keys(o).every((k) => k === 'en' || k === 'es');
const isImage = (o) => o && typeof o === 'object' && typeof o.src === 'string' && 'width' in o && 'height' in o && 'alt' in o;
const isTodo = (s) => typeof s === 'string' && /^#?TODO\b/i.test(s.trim());
// Pictographic characters at or above U+2300 (clocks, arrows-with-boxes, all emoji); © ® ™ stay allowed.
const hasEmoji = (s) => [...s].some((ch) => ch.codePointAt(0) >= 0x2300 && /\p{Extended_Pictographic}/u.test(ch));

/* ---------- a small JSON Schema validator (the subset content/schema.json uses) ---------- */
export function validateSchema(data, schema, root = schema) {
  const errors = [], warnings = [];
  const resolve = (ref) => ref.split('/').slice(1).reduce((o, k) => (o || {})[k], root);
  const show = (p) => p || '(root)';
  function walk(value, sch, path) {
    if (!sch) return;
    if (sch.$ref) { walk(value, resolve(sch.$ref), path); }
    if (sch.allOf) sch.allOf.forEach((s) => walk(value, s, path));
    if (sch.enum && !sch.enum.includes(value)) errors.push({ path, message: `must be one of ${sch.enum.join(', ')} (got ${JSON.stringify(value)})` });
    const type = sch.type;
    if (type === 'object' || (!type && sch.properties && value && typeof value === 'object')) {
      if (type === 'object' && (value === null || typeof value !== 'object' || Array.isArray(value))) return errors.push({ path, message: `must be an object` });
      for (const k of sch.required || []) if (!(k in value)) errors.push({ path: `${path ? path + '.' : ''}${k}`, message: 'is required' });
      for (const [k, v] of Object.entries(value)) {
        if (sch.properties && k in sch.properties) walk(v, sch.properties[k], path ? `${path}.${k}` : k);
        else if (sch.additionalProperties && typeof sch.additionalProperties === 'object') walk(v, sch.additionalProperties, path ? `${path}.${k}` : k);
        else if (sch.additionalProperties === false) errors.push({ path: path ? `${path}.${k}` : k, message: 'is not a known key' });
      }
      return;
    }
    if (type === 'array') {
      if (!Array.isArray(value)) return errors.push({ path, message: 'must be an array' });
      if (sch.minItems != null && value.length < sch.minItems) errors.push({ path, message: `needs at least ${sch.minItems} items` });
      if (sch.maxItems != null && value.length > sch.maxItems) errors.push({ path, message: `allows at most ${sch.maxItems} items` });
      if (sch.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) errors.push({ path, message: 'has duplicate items' });
      if (sch.items) value.forEach((v, i) => walk(v, sch.items, `${path}[${i}]`));
      return;
    }
    if (type === 'string') {
      if (typeof value !== 'string') return errors.push({ path, message: 'must be a string' });
      if (sch.minLength != null && value.length < sch.minLength) errors.push({ path, message: value.length === 0 ? 'is empty' : `is shorter than ${sch.minLength}` });
      if (sch.maxLength != null && value.length > sch.maxLength) warnings.push({ path, message: `is ${value.length} characters, limit ${sch.maxLength}` });
      if (sch.pattern && !new RegExp(sch.pattern).test(value)) errors.push({ path, message: `does not match ${sch.pattern}` });
      if (sch.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push({ path, message: 'is not an email address' });
      return;
    }
    if (type === 'integer' || type === 'number') {
      if (typeof value !== 'number' || (type === 'integer' && !Number.isInteger(value))) return errors.push({ path, message: `must be a${type === 'integer' ? 'n integer' : ' number'}` });
      if (sch.minimum != null && value < sch.minimum) errors.push({ path, message: `must be ≥ ${sch.minimum}` });
      if (sch.maximum != null && value > sch.maximum) errors.push({ path, message: `must be ≤ ${sch.maximum}` });
      return;
    }
    if (type === 'boolean' && typeof value !== 'boolean') errors.push({ path, message: 'must be true or false' });
  }
  walk(data, schema, '');
  return { errors: errors.map((e) => ({ ...e, path: show(e.path) })), warnings: warnings.map((w) => ({ ...w, path: show(w.path) })) };
}

/* ---------- walk every string / text object / image object with its path ---------- */
export function collect(site) {
  const strings = [], texts = [], images = [], links = [];
  (function walk(node, path) {
    if (isText(node)) { texts.push({ path, value: node }); strings.push({ path: `${path}.en`, lang: 'en', value: node.en }, { path: `${path}.es`, lang: 'es', value: node.es }); return; }
    if (isImage(node)) images.push({ path, value: node });
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (node && typeof node === 'object') return Object.entries(node).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
    if (typeof node === 'string') {
      strings.push({ path, lang: null, value: node });
      if (/^(https?:|mailto:)/.test(node) || /^#/.test(node) && /href$/.test(path)) links.push({ path, value: node });
    }
  })(site, '');
  return { strings, texts, images, links };
}

/**
 * Content checks. opts:
 *   assets: { [filename]: bytes }  — files under assets/img/ (name → size). Missing map = skip image file checks.
 *   renderedPaths: Set<string>     — paths the build rendered (dist/content-manifest.json). Preferred.
 *   isRendered(str) → bool         — fallback: whether a TODO string appears in the page text. Neither given = every TODO is an error.
 */
export function checkContent(site, schema, opts = {}) {
  const errors = [], warnings = [];
  const E = (path, message) => errors.push({ path, message });
  const W = (path, message) => warnings.push({ path, message });

  if (schema) {
    const sv = validateSchema(site, schema);
    sv.errors.forEach((e) => E(e.path, `schema: ${e.message}`));
    sv.warnings.forEach((w) => W(w.path, `length: ${w.message}`));
  }
  const { strings, texts, images, links } = collect(site);

  for (const t of texts) {
    for (const lang of ['en', 'es']) {
      const v = t.value[lang];
      if (typeof v !== 'string' || !v.trim()) E(`${t.path}.${lang}`, `missing ${lang.toUpperCase()} value`);
    }
    if (typeof t.value.en === 'string' && t.value.en === t.value.es && t.value.en.length >= IDENTICAL_MIN_LENGTH && !isTodo(t.value.en)) W(t.path, `ES is identical to EN ("${t.value.en.slice(0, 40)}…"): untranslated?`);
  }
  for (const s of strings) {
    const v = s.value;
    if (typeof v !== 'string') continue;
    if (isTodo(v)) {
      const parent = s.path.replace(/\.(en|es)$/, '');
      const rendered = opts.renderedPaths ? (opts.renderedPaths.has(s.path) || opts.renderedPaths.has(parent)) : opts.isRendered ? opts.isRendered(v) : true;
      (rendered ? E : W)(s.path, `${rendered ? 'TODO reaches the page' : 'TODO (not rendered)'}: "${v.slice(0, 70)}"`);
    }
    const low = v.toLowerCase();
    for (const f of LEGACY_FILLER) if (low.includes(f.toLowerCase())) E(s.path, `legacy filler "${f}"`);
    if (hasEmoji(v)) E(s.path, `emoji in copy: "${v.slice(0, 50)}"`);
    for (const lang of s.lang ? [s.lang] : ['en', 'es']) for (const b of BANNED_WORDS[lang]) if (new RegExp(`(^|[^\\p{L}])${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(v)) W(s.path, `banned word "${b}"`);
  }
  for (const l of links) {
    const v = l.value;
    if (/store\.steampowered\.com/.test(v) && !new RegExp(`/app/${STEAM_APP_ID}(/|$)`).test(v)) E(l.path, `Steam link must point to app ${STEAM_APP_ID}: ${v}`);
    if (/\/cdn-cgi\//.test(v)) E(l.path, `Cloudflare-obfuscated link: ${v}`);
    if (/^mailto:\S*\/cdn-cgi\//.test(v)) E(l.path, `mailto points to /cdn-cgi/`);
    if (/discord\.gg\/[A-Za-z0-9]{6,10}$/.test(v) && !opts.discordVerified) W(l.path, `Discord invite ${v}: confirm it is permanent (the CLI checks the API)`);
  }
  for (const im of images) {
    const img = im.value;
    for (const lang of ['en', 'es']) {
      const a = img.alt && img.alt[lang];
      if (!a || !String(a).trim() || isTodo(a)) E(`${im.path}.alt.${lang}`, `image needs ${lang.toUpperCase()} alt text`);
    }
    if (opts.assets) {
      for (const w of img.widths || [1200, 2400]) {
        const name = `${img.src}-${w}.webp`;
        const bytes = opts.assets[name];
        if (bytes == null) E(`${im.path}.src`, `missing file assets/img/${name}`);
        else if (bytes > MAX_IMAGE_BYTES) E(`${im.path}.src`, `assets/img/${name} is ${(bytes / 1024).toFixed(0)} KB, limit 400 KB`);
      }
    }
  }
  return { errors, warnings };
}

/* ================================ Node-only part ================================ */

export async function cli() {
  const [{ readFileSync, readdirSync, statSync, existsSync }, { join, resolve, dirname }, { fileURLToPath }, { gzipSync }] = await Promise.all([import('node:fs'), import('node:path'), import('node:url'), import('node:zlib')]);
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const offline = args.includes('--offline');
  const asJson = args.includes('--json');
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

  const site = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8'));
  const schema = JSON.parse(readFileSync(join(ROOT, 'content/schema.json'), 'utf8'));
  const assets = {};
  for (const f of readdirSync(join(ROOT, 'assets/img'))) { const p = join(ROOT, 'assets/img', f); if (statSync(p).isFile()) assets[f] = statSync(p).size; }

  // dist: read every file so TODO rendering, base64, missing assets and the budget can be checked
  const dist = {};
  const DIST = join(ROOT, 'dist');
  const errors = [], warnings = [], info = [];
  if (existsSync(DIST)) {
    (function read(dir, rel) { for (const f of readdirSync(dir)) { const p = join(dir, f), r = rel ? `${rel}/${f}` : f; if (statSync(p).isDirectory()) read(p, r); else dist[r] = readFileSync(p); } })(DIST, '');
  } else warnings.push({ path: 'dist/', message: 'not built yet — run node scripts/build.mjs; build checks skipped' });
  const htmlFiles = Object.keys(dist).filter((f) => f.endsWith('.html'));
  const pageText = htmlFiles.map((f) => dist[f].toString('utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')).join('\n');
  const pageHtml = htmlFiles.map((f) => dist[f].toString('utf8')).join('\n');
  const isRendered = htmlFiles.length ? (s) => pageText.includes(s) || pageHtml.includes(s.replace(/&/g, '&amp;')) : undefined;
  const renderedPaths = dist['content-manifest.json'] ? new Set(JSON.parse(dist['content-manifest.json'].toString('utf8')).rendered) : undefined;

  // Discord permanence + external links (Node only)
  let discordVerified = false;
  const { links } = collect(site);
  const external = [...new Set(links.map((l) => l.value).filter((u) => /^https?:/.test(u)))];
  if (!offline) {
    const fetchOne = async (url, method = 'HEAD') => {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      try { return await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (HotPotatoWeb check)' } }); } finally { clearTimeout(t); }
    };
    for (const url of external) {
      try {
        let r = await fetchOne(url);
        if (r.status === 405 || r.status === 403) r = await fetchOne(url, 'GET');
        if (r.status >= 400) warnings.push({ path: url, message: `external link answers ${r.status}` });
      } catch (e) { warnings.push({ path: url, message: `external link unreachable from here (${e.name === 'AbortError' ? 'timeout' : (e.cause && e.cause.code) || e.message})` }); }
    }
    for (const url of external) {
      const m = url.match(/discord\.gg\/([A-Za-z0-9]+)/);
      if (!m) continue;
      try {
        const r = await fetchOne(`https://discord.com/api/v10/invites/${m[1]}?with_expiration=true`, 'GET');
        const j = await r.json();
        if (r.ok && j.expires_at) warnings.push({ path: url, message: `Discord invite expires at ${j.expires_at}: make it permanent` });
        else if (r.ok) discordVerified = true;
        else warnings.push({ path: url, message: `Discord API answered ${r.status} for this invite (${j.message || 'unknown'})` });
      } catch { warnings.push({ path: url, message: 'could not verify the Discord invite from here' }); }
    }
  } else info.push('offline: external links and the Discord invite were not checked');

  const content = checkContent(site, schema, { assets, renderedPaths, isRendered, discordVerified });
  errors.push(...content.errors); warnings.push(...content.warnings);

  if (htmlFiles.length) {
    for (const [f, buf] of Object.entries(dist)) {
      if (!/\.(html|css)$/.test(f)) continue;
      const txt = buf.toString('utf8');
      if (/data:[\w/+.-]*;base64,/.test(txt)) errors.push({ path: `dist/${f}`, message: 'base64 data: URI (images must be files)' });
      for (const m of txt.matchAll(/(?:\.\.\/)?(assets\/[\w\-./@]+\.(?:webp|png|jpg|jpeg|ico|svg|woff2|css|js))/g)) {
        if (!dist[m[1]]) errors.push({ path: `dist/${f}`, message: `references missing ${m[1]}` });
      }
    }
    // first-view budget: HTML + CSS + JS (gzip) + preloaded fonts + eager images, per page
    for (const page of htmlFiles) {
      const html = dist[page].toString('utf8');
      const base = page.includes('/') ? page.split('/').slice(0, -1).join('/') + '/' : '';
      const norm = (p) => p.replace(/^(\.\.\/)+/, '').replace(/\?.*$/, '');
      let total = gzipSync(dist[page]).length, items = [`html ${kb(gzipSync(dist[page]).length)}`];
      const add = (p, label) => { const f = norm(p); if (dist[f]) { const n = /\.(css|js)$/.test(f) ? gzipSync(dist[f]).length : dist[f].length; total += n; items.push(`${label || f} ${kb(n)}`); } };
      for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) add(m[1]);
      for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) add(m[1]);
      for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+as="font"[^>]+href="([^"]+)"/g)) add(m[1]);
      for (const m of html.matchAll(/<img\b[^>]*>/g)) { if (!/loading="lazy"/.test(m[0])) { const s = m[0].match(/\ssrc="([^"]+)"/); if (s) add(s[1]); } }
      if (total > FIRST_VIEW_BUDGET) errors.push({ path: `dist/${page}`, message: `first view ${kb(total)} exceeds the ${kb(FIRST_VIEW_BUDGET)} budget (${items.join(', ')})` });
      else info.push(`first view ${page}: ${kb(total)} of ${kb(FIRST_VIEW_BUDGET)} (${items.length} files)`);
      void base;
    }
  }

  // ---- report ----
  const result = { ok: errors.length === 0, errors, warnings, info };
  if (asJson) { console.log(JSON.stringify(result, null, 2)); }
  else {
    const gha = !!process.env.GITHUB_ACTIONS;
    for (const i of info) console.log(`  · ${i}`);
    if (warnings.length) { console.log(`\n${warnings.length} warning${warnings.length > 1 ? 's' : ''}:`); for (const w of warnings) { console.log(`  ⚠ ${w.path}: ${w.message}`); if (gha) console.log(`::warning title=check::${w.path}: ${w.message}`); } }
    if (errors.length) { console.log(`\n${errors.length} error${errors.length > 1 ? 's' : ''} (publishing blocked):`); for (const e of errors) { console.log(`  ✗ ${e.path}: ${e.message}`); if (gha) console.log(`::error title=check::${e.path}: ${e.message}`); } }
    console.log(errors.length ? `\nFAIL — fix the errors above before publishing.` : `\nOK — no errors${warnings.length ? `, ${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : ''}.`);
  }
  process.exitCode = errors.length ? 1 : 0;
  return result;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  await cli();
}
