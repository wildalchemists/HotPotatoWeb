#!/usr/bin/env node
// Renders src/template.html + content/site.json into dist/ for both languages.
// Zero dependencies. Text is baked into the HTML; main.js only adds behaviour.
//
//   node scripts/build.mjs            → dist/index.html (EN) + dist/es/index.html (ES)
//   node scripts/build.mjs --out tmp  → another output dir
//
// Template syntax (see docs/content-contract.md):
//   {{t path}}                 localized string (en/es object), HTML-escaped; `|md` allows **bold** and line breaks
//   {{= path}}                 plain value (string/number), escaped        {{raw path}} unescaped
//   {{#each path as x}}…{{/each}}   loops; x, x_index, x_first, x_last available inside
//   {{#if path}}…{{else}}…{{/if}}   truthy test; {{#if path == value}} compares; {{#unless path}}
//   {{img path attr="…" …}}    responsive <img> from an image object; add data-img automatically
//   {{status path}}            mode status → localized label
//   Context vars: lang, otherLang, base, url, otherUrl, v (cache-buster), siteUrl, year, jsonld

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist');
const LANGS = ['en', 'es'];

const site = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8'));
const template = readFileSync(join(ROOT, 'src/template.html'), 'utf8');
const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');
const js = readFileSync(join(ROOT, 'src/main.js'), 'utf8');
const hash8 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const v = hash8(css + js + template);

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const isText = (o) => o && typeof o === 'object' && 'en' in o && 'es' in o;

const rendered = new Set(); // absolute site.json paths whose value reaches the page (for scripts/check.mjs and the editor)

function get(path, scope, record = false) {
  if (path === 'this') return scope.vars.this;
  const parts = path.split('.');
  let cur, abs = null;
  if (parts[0] in scope.vars) { cur = scope.vars[parts[0]]; if (scope.vars[parts[0] + '_path']) abs = scope.vars[parts[0] + '_path']; }
  else if (parts[0] in scope.ctx) cur = scope.ctx[parts[0]];
  else { cur = site[parts[0]]; abs = parts[0]; }
  for (let i = 1; i < parts.length && cur != null; i++) { cur = cur[parts[i]]; if (abs !== null) abs += /^\d+$/.test(parts[i]) ? `[${parts[i]}]` : `.${parts[i]}`; }
  if (record && abs !== null) rendered.add(abs);
  return cur;
}
const truthy = (v) => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== false && v !== '' && v !== 0;

function parseAttrs(str) {
  const out = {};
  for (const m of str.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function imgTag(img, attrs, scope, path) {
  if (!img || !img.src) throw new Error(`{{img ${path}}}: not an image object`);
  const base = scope.ctx.base;
  const widths = img.widths || [1200, 2400];
  const largest = Math.max(...widths);
  const srcset = widths.map((w) => `${base}assets/img/${img.src}-${w}.webp ${w === largest ? Math.min(img.width, w) : w}w`).join(', ');
  const alt = isText(img.alt) ? img.alt[scope.ctx.lang] : (img.alt || '');
  const a = { src: `${base}assets/img/${img.src}-${Math.min(...widths)}.webp`, srcset, sizes: attrs.sizes || '100vw', width: img.width, height: img.height, alt, decoding: 'async', ...attrs };
  if (!a.loading && a.fetchpriority !== 'high') a.loading = 'lazy';
  if (img.focal) a.style = `${a.style ? a.style + ';' : ''}object-position:${Math.round(img.focal.x * 100)}% ${Math.round(img.focal.y * 100)}%`;
  a['data-img'] = path;
  return '<img ' + Object.entries(a).filter(([, val]) => val !== undefined && val !== '').map(([k, val]) => `${k}="${esc(val)}"`).join(' ') + '>';
}

// ---------- template engine ----------
const TAG = /\{\{\s*(#each|#if|#unless|\/each|\/if|\/unless|else|t|=|raw|img|status)?\s*([^}]*?)\s*\}\}/g;

function tokenize(src) {
  const tokens = [];
  let last = 0, m;
  while ((m = TAG.exec(src))) {
    if (m.index > last) tokens.push({ type: 'text', value: src.slice(last, m.index) });
    tokens.push({ type: m[1] || '=', arg: m[2] });
    last = m.index + m[0].length;
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });
  return tokens;
}

function parse(tokens, i = 0, closeTag = null) {
  const nodes = [];
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === closeTag || (closeTag && t.type === 'else')) return { nodes, i };
    if (t.type === '#each' || t.type === '#if' || t.type === '#unless') {
      const close = '/' + t.type.slice(1);
      const body = parse(tokens, i + 1, close);
      let alt = null;
      if (tokens[body.i] && tokens[body.i].type === 'else') { alt = parse(tokens, body.i + 1, close); body.i = alt.i; }
      if (!tokens[body.i] || tokens[body.i].type !== close) throw new Error(`Unclosed ${t.type} ${t.arg}`);
      nodes.push({ type: t.type, arg: t.arg, body: body.nodes, alt: alt ? alt.nodes : null });
      i = body.i + 1;
      continue;
    }
    nodes.push(t);
    i++;
  }
  return { nodes, i };
}

function evaluate(nodes, scope) {
  let out = '';
  for (const n of nodes) {
    switch (n.type) {
      case 'text': out += n.value; break;
      case 't': {
        const [path, mod] = n.arg.split('|');
        const val = get(path.trim(), scope, true);
        if (val === undefined) throw new Error(`{{t ${path}}}: missing in site.json`);
        const s = isText(val) ? val[scope.ctx.lang] : val;
        if (typeof s !== 'string') throw new Error(`{{t ${path}}}: not a string`);
        out += mod && mod.trim() === 'md' ? md(s) : esc(s);
        break;
      }
      case '=': {
        const val = get(n.arg, scope, true);
        if (val === undefined) throw new Error(`{{= ${n.arg}}}: missing`);
        out += esc(isText(val) ? val[scope.ctx.lang] : val);
        break;
      }
      case 'raw': { const val = get(n.arg, scope); out += val == null ? '' : String(val); break; }
      case 'img': {
        const [path, ...rest] = n.arg.split(/\s+(.+)/);
        out += imgTag(get(path, scope, true), parseAttrs(rest.join(' ') || ''), scope, path);
        break;
      }
      case 'status': {
        const st = get(n.arg, scope, true);
        const label = site.modes.statusLabels[st];
        if (!label) throw new Error(`unknown status ${st}`);
        out += esc(label[scope.ctx.lang]);
        break;
      }
      case '#each': {
        const m = n.arg.match(/^(\S+)\s+as\s+(\w+)$/);
        if (!m) throw new Error(`bad each: ${n.arg}`);
        const list = get(m[1], scope) || [];
        if (!Array.isArray(list)) throw new Error(`{{#each ${m[1]}}}: not an array`);
        if (list.length === 0 && n.alt) { out += evaluate(n.alt, scope); break; }
        list.forEach((item, idx) => {
          const vars = { ...scope.vars, [m[2]]: item, [`${m[2]}_index`]: idx, [`${m[2]}_n`]: idx + 1, [`${m[2]}_first`]: idx === 0, [`${m[2]}_last`]: idx === list.length - 1, [`${m[2]}_path`]: `${m[1]}[${idx}]` };
          out += evaluate(n.body, { ...scope, vars });
        });
        break;
      }
      case '#if': case '#unless': {
        let ok;
        const cmp = n.arg.match(/^(\S+)\s*==\s*(.+)$/);
        if (cmp) ok = String(get(cmp[1], scope)) === cmp[2].replace(/^['"]|['"]$/g, '');
        else ok = truthy(get(n.arg, scope));
        if (n.type === '#unless') ok = !ok;
        out += evaluate(ok ? n.body : (n.alt || []), scope);
        break;
      }
      default: throw new Error(`Unexpected tag ${n.type}`);
    }
  }
  return out;
}

const AST = parse(tokenize(template)).nodes;

// ---------- per-language render ----------
function jsonLd(lang, url) {
  const m = site.meta;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: m.shortName,
    url,
    inLanguage: lang,
    description: m.description[lang],
    image: m.siteUrl + m.ogImage,
    author: { '@type': 'Organization', name: m.studio },
    publisher: { '@type': 'Organization', name: m.studio },
    applicationCategory: 'Game',
    gamePlatform: (m.platforms || []).filter((p) => !/^TODO/.test(p)),
    genre: (m.genreTags || []).filter((g) => !/^TODO/.test(g)),
    trailer: { '@type': 'VideoObject', name: site.trailer.title[lang], embedUrl: `https://www.youtube-nocookie.com/embed/${site.trailer.youtubeId}`, thumbnailUrl: `https://i.ytimg.com/vi/${site.trailer.youtubeId}/hqdefault.jpg` },
    award: site.awards.items.map((a) => `${a.award[lang]} — ${a.event}`),
  };
  if (m.price && m.price.public) ld.offers = { '@type': 'Offer', price: m.price.amount, priceCurrency: m.price.currency, url: m.steamUrl };
  for (const k of ['gamePlatform', 'genre']) if (!ld[k].length) delete ld[k];
  return JSON.stringify(ld);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const report = [];
for (const lang of LANGS) {
  const other = lang === 'en' ? 'es' : 'en';
  const dir = lang === 'en' ? OUT : join(OUT, 'es');
  const base = lang === 'en' ? '' : '../';
  const url = site.meta.siteUrl + (lang === 'en' ? '' : 'es/');
  const otherUrl = base + (other === 'en' ? '' : 'es/');
  const ctx = { lang, otherLang: other, base, url, otherUrl, otherUrlAbs: site.meta.siteUrl + (other === 'en' ? '' : 'es/'), v, siteUrl: site.meta.siteUrl, year: String(site.meta.copyrightYear), jsonld: jsonLd(lang, url), hasFirebase: Boolean(site.meta.firebase), showPrice: Boolean(site.meta.price && site.meta.price.public) };
  const html = evaluate(AST, { ctx, vars: {} });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  report.push([`${lang === 'en' ? '' : 'es/'}index.html`, Buffer.byteLength(html)]);
}

// ---------- static files ----------
writeFileSync(join(OUT, 'styles.css'), css);
writeFileSync(join(OUT, 'main.js'), js);
mkdirSync(join(OUT, 'assets/img'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'assets/img'))) {
  const p = join(ROOT, 'assets/img', f);
  if (statSync(p).isDirectory()) continue; // legacy originals never ship
  cpSync(p, join(OUT, 'assets/img', f));
}
if (existsSync(join(ROOT, 'assets/fonts'))) cpSync(join(ROOT, 'assets/fonts'), join(OUT, 'assets/fonts'), { recursive: true });
cpSync(join(OUT, 'assets/img/favicon.ico'), join(OUT, 'favicon.ico'));
writeFileSync(join(OUT, 'site.webmanifest'), JSON.stringify({
  name: site.meta.shortName, short_name: site.meta.shortName, start_url: './', display: 'browser', background_color: '#0B1230', theme_color: site.meta.themeColor,
  icons: [{ src: 'assets/img/favicon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/img/favicon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.meta.siteUrl}sitemap.xml\n`);
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  LANGS.map((l) => { const u = site.meta.siteUrl + (l === 'en' ? '' : 'es/'); return `  <url><loc>${u}</loc>` + LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a}" href="${site.meta.siteUrl + (a === 'en' ? '' : 'es/')}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${site.meta.siteUrl}"/></url>`; }).join('\n') + `\n</urlset>\n`);
writeFileSync(join(OUT, '.nojekyll'), '');
writeFileSync(join(OUT, 'content-manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), rendered: [...rendered].sort() }, null, 2) + '\n');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`built → ${OUT.replace(ROOT + '/', '')}/  (v=${v})`);
for (const [f, n] of report) console.log(`  ${f.padEnd(16)} ${kb(n)}`);
console.log(`  styles.css       ${kb(Buffer.byteLength(css))}\n  main.js          ${kb(Buffer.byteLength(js))}\n  ${rendered.size} content paths rendered (content-manifest.json)`);
