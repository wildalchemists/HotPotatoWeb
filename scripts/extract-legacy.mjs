#!/usr/bin/env node
// Extracts content and images from the legacy single-file site (legacy/index.html).
// Zero npm dependencies. WebP encoding is delegated to whichever encoder is installed
// (cwebp, ImageMagick or Python Pillow) because bare Node cannot encode WebP.
//
// Usage: node scripts/extract-legacy.mjs [path/to/legacy/index.html]
// Outputs:
//   assets/img/legacy/<data-ikey>.png      decoded originals (git-ignored, dev only)
//   assets/img/<data-ikey>-2400.webp       ≤ 2400 px wide (native width if smaller), q80
//   assets/img/<data-ikey>-1200.webp       ≤ 1200 px wide, q80
//   legacy-content.json                    every data-en/data-es pair, href and data-ukey

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SRC = resolve(process.argv[2] || join(ROOT, 'legacy/index.html'));
const PNG_DIR = join(ROOT, 'assets/img/legacy');
const IMG_DIR = join(ROOT, 'assets/img');
const WIDTHS = [2400, 1200];
const QUALITY = 80;

if (!existsSync(SRC)) {
  console.error(`Legacy file not found: ${SRC}`);
  process.exit(1);
}
const html = readFileSync(SRC, 'utf8');
mkdirSync(PNG_DIR, { recursive: true });

// ---------- helpers ----------
const decodeEntities = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : undefined;
};

function which(cmd) {
  const r = spawnSync('sh', ['-c', `command -v ${cmd}`], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Pick an available WebP encoder; returns {name, run(png, out, width)} */
function pickEncoder() {
  if (which('cwebp')) {
    return {
      name: 'cwebp',
      run: (png, out, w) => spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(w), '0', png, '-o', out]),
    };
  }
  const magick = which('magick') || which('convert');
  if (magick) {
    return {
      name: `ImageMagick (${magick})`,
      run: (png, out, w) => spawnSync(magick, [png, '-resize', `${w}x>`, '-quality', String(QUALITY), out]),
    };
  }
  if (which('python3')) {
    const probe = spawnSync('python3', ['-c', 'from PIL import features; import sys; sys.exit(0 if features.check("webp") else 1)']);
    if (probe.status === 0) {
      return {
        name: 'Python Pillow',
        run: (png, out, w) =>
          spawnSync('python3', [
            '-I', '-c',
            'import sys; from PIL import Image; im=Image.open(sys.argv[1]).convert("RGB"); w=int(sys.argv[3]); ' +
              'im.thumbnail((w, 100000)) if im.width > w else None; im.save(sys.argv[2], "WEBP", quality=int(sys.argv[4]), method=6)',
            png, out, String(w), String(QUALITY),
          ]),
      };
    }
  }
  return null;
}

/** Read PNG width/height from the IHDR chunk (no decoding needed). */
function pngSize(buf) {
  if (buf.readUInt32BE(12) !== 0x49484452) return null; // 'IHDR'
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ---------- 1. images ----------
const encoder = pickEncoder();
console.log(`WebP encoder: ${encoder ? encoder.name : 'NONE FOUND (PNGs decoded only)'}`);

const images = [];
const blobRe = /data:image\/(\w+);base64,([A-Za-z0-9+/=]+)/g;
let m;
while ((m = blobRe.exec(html))) {
  const before = html.slice(Math.max(0, m.index - 1500), m.index);
  const keys = [...before.matchAll(/data-ikey="([^"]+)"/g)].map((k) => k[1]);
  const key = keys.length ? keys[keys.length - 1] : `blob-${images.length}`;
  const buf = Buffer.from(m[2], 'base64');
  const pngPath = join(PNG_DIR, `${key}.${m[1]}`);
  writeFileSync(pngPath, buf);
  const size = m[1] === 'png' ? pngSize(buf) : null;
  const entry = { key, format: m[1], bytes: buf.length, ...size, original: `assets/img/legacy/${key}.${m[1]}`, webp: {} };

  if (encoder) {
    for (const w of WIDTHS) {
      // Encoders are told to shrink only ("2400x>" / -resize / thumbnail): an image narrower
      // than the target keeps its native width, so the -2400 file is simply "the largest one".
      const out = join(IMG_DIR, `${key}-${w}.webp`);
      const r = encoder.run(pngPath, out, w);
      if (r.status !== 0) {
        console.error(`  ! ${key} @${w}: ${(r.stderr || '').toString().trim()}`);
        continue;
      }
      entry.webp[w] = `assets/img/${key}-${w}.webp`;
    }
  }
  images.push(entry);
  console.log(`  ${key}: ${(buf.length / 1024 / 1024).toFixed(2)} MB ${size ? `${size.width}×${size.height}` : ''}`);
}

// ---------- 2. strings ----------
// Every element with data-en: collect id/ekey/class context so the merge step can map it.
const strings = [];
const tagRe = /<([a-z0-9]+)((?:\s+[^<>]*?)?)>/gi;
while ((m = tagRe.exec(html))) {
  const attrs = m[2];
  if (!/\sdata-en="/.test(attrs)) continue;
  strings.push({
    tag: m[1],
    ekey: attr(attrs, 'data-ekey'),
    ukey: attr(attrs, 'data-ukey'),
    class: attr(attrs, 'class'),
    en: attr(attrs, 'data-en'),
    es: attr(attrs, 'data-es'),
    placeholderEn: attr(attrs, 'data-en-placeholder'),
    placeholderEs: attr(attrs, 'data-es-placeholder'),
  });
}
// Elements with data-ekey but no data-en/data-es (EN only, text content lives in the node)
const ekeyOnly = [];
const ekRe = /<([a-z0-9]+)([^<>]*\sdata-ekey="([^"]+)"[^<>]*)>([^<]*)/gi;
while ((m = ekRe.exec(html))) {
  if (/\sdata-en="/.test(m[2])) continue;
  ekeyOnly.push({ tag: m[1], ekey: m[3], text: decodeEntities(m[4].trim()) });
}
// Placeholders (inputs) without data-en
const placeholders = [];
const phRe = /<(input|textarea)([^<>]*\sdata-en-placeholder="[^"]*"[^<>]*)>/gi;
while ((m = phRe.exec(html))) {
  placeholders.push({ tag: m[1], en: attr(m[2], 'data-en-placeholder'), es: attr(m[2], 'data-es-placeholder') });
}

// ---------- 3. links ----------
const links = [];
const aRe = /<a([^<>]*\shref="([^"]*)"[^<>]*)>/gi;
while ((m = aRe.exec(html))) {
  links.push({ href: decodeEntities(m[2]), ukey: attr(m[1], 'data-ukey'), class: attr(m[1], 'class'), en: attr(m[1], 'data-en'), es: attr(m[1], 'data-es') });
}
const iframes = [...html.matchAll(/<iframe[^<>]*\ssrc="([^"]*)"/gi)].map((x) => decodeEntities(x[1]));
const fonts = [...html.matchAll(/fonts\.googleapis\.com\/css2\?([^"]*)/g)].map((x) => decodeEntities(x[1]));
const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];

const out = {
  source: SRC.replace(ROOT + '/', ''),
  extractedAt: new Date().toISOString(),
  title,
  fonts,
  iframes,
  images,
  strings,
  ekeyOnly,
  placeholders,
  links,
};
writeFileSync(join(ROOT, 'legacy-content.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`\nlegacy-content.json: ${strings.length} bilingual strings, ${ekeyOnly.length} EN-only keys, ${links.length} links, ${images.length} images`);
