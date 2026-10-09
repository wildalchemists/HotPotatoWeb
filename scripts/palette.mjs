#!/usr/bin/env node
// Samples the dominant colours of the game's PNG assets. Zero dependencies:
// a minimal PNG decoder (zlib is built into Node) + a coarse colour histogram.
//
// Usage: node scripts/palette.mjs [dir=assets/img/legacy] [--json docs/palette.json] [--top 8]
// Supports 8-bit RGB / RGBA PNGs without interlacing (what the legacy site embedded).

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join, basename, resolve } from 'node:path';

const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) || 'assets/img/legacy');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const TOP = Number(args.includes('--top') ? args[args.indexOf('--top') + 1] : 8);

// ---------- PNG decode ----------
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace) {
    throw new Error(`unsupported PNG (bitDepth ${bitDepth}, colorType ${colorType}, interlace ${interlace})`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = px.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; break; }
        default: throw new Error('bad filter ' + filter);
      }
      out[i] = v & 255;
    }
    prev = out;
  }
  return { width, height, bpp, px };
}

// ---------- colour helpers ----------
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const name = (h, s, l) => {
  if (l > 0.92) return 'white';
  if (l < 0.1) return 'black';
  if (s < 0.14) return l > 0.6 ? 'light grey' : l > 0.3 ? 'grey' : 'dark grey';
  const names = [['red', 0, 15], ['orange', 15, 42], ['yellow', 42, 68], ['green', 68, 165], ['cyan', 165, 200], ['blue', 200, 255], ['purple', 255, 290], ['magenta', 290, 345], ['red', 345, 360]];
  return names.find(([, a, b]) => h >= a && h < b)[0];
};

/** Dominant colours by 6-bit-per-channel histogram, merged when within ΔRGB ≤ 40. */
function dominant(img, top = TOP, step = 3) {
  const bins = new Map();
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const i = (y * img.width + x) * img.bpp;
      if (img.bpp === 4 && img.px[i + 3] < 128) continue;
      const r = img.px[i], g = img.px[i + 1], b = img.px[i + 2];
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      bins.set(key, e);
    }
  }
  const total = [...bins.values()].reduce((a, e) => a + e.n, 0);
  const sorted = [...bins.values()].map((e) => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n })).sort((a, b) => b.n - a.n);
  const merged = [];
  for (const c of sorted) {
    const near = merged.find((m) => Math.abs(m.r - c.r) + Math.abs(m.g - c.g) + Math.abs(m.b - c.b) <= 40);
    if (near) { const n = near.n + c.n; near.r = (near.r * near.n + c.r * c.n) / n; near.g = (near.g * near.n + c.g * c.n) / n; near.b = (near.b * near.n + c.b * c.n) / n; near.n = n; }
    else merged.push({ ...c });
    if (merged.length > 200) break;
  }
  return merged.sort((a, b) => b.n - a.n).slice(0, top).map((c) => {
    const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
    return { hex: hex(c.r, c.g, c.b), share: +(100 * c.n / total).toFixed(1), name: name(h, s, l), h: Math.round(h), s: +(s).toFixed(2), l: +(l).toFixed(2) };
  });
}

/** "Lit" accent per hue family: mean of the brightest 10 % of saturated pixels in that hue
 *  (what the colour looks like in sunlight, rather than averaged with its shadows). */
function litAccents(img, step = 3) {
  const fam = new Map();
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const i = (y * img.width + x) * img.bpp;
      if (img.bpp === 4 && img.px[i + 3] < 128) continue;
      const r = img.px[i], g = img.px[i + 1], b = img.px[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 0.5 || l < 0.2 || l > 0.85) continue;
      const n = name(h, s, l);
      if (!fam.has(n)) fam.set(n, []);
      fam.get(n).push([l, r, g, b]);
    }
  }
  const out = [];
  const total = (img.width / step) * (img.height / step);
  for (const [n, arr] of fam) {
    if (arr.length < total * 0.002) continue; // ignore specks below 0.2 % of the image
    arr.sort((a, b) => b[0] - a[0]);
    const top = arr.slice(0, Math.max(1, Math.floor(arr.length * 0.1)));
    const m = top.reduce((a, p) => [a[0] + p[1], a[1] + p[2], a[2] + p[3]], [0, 0, 0]).map((v) => v / top.length);
    out.push({ name: n, hex: hex(...m), share: +(100 * arr.length / total).toFixed(1) });
  }
  return out.sort((a, b) => b.share - a.share);
}

// ---------- run ----------
const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const report = {};
for (const f of files) {
  try {
    const img = decodePNG(readFileSync(join(dir, f)));
    const colours = dominant(img);
    const lit = litAccents(img);
    report[basename(f, '.png')] = { width: img.width, height: img.height, colours, lit };
    console.log(`\n${f} (${img.width}×${img.height})`);
    for (const c of colours) console.log(`  ${c.hex}  ${String(c.share).padStart(5)}%  ${c.name}`);
    console.log(`  lit: ${lit.map((c) => `${c.name} ${c.hex} (${c.share}%)`).join(' · ')}`);
  } catch (e) {
    console.error(`  ! ${f}: ${e.message}`);
  }
}
// Saturated accents across all images (s ≥ 0.45, 0.25 ≤ l ≤ 0.7), weighted by share
const accents = new Map();
for (const [img, r] of Object.entries(report)) {
  for (const c of r.colours) {
    if (c.s < 0.45 || c.l < 0.25 || c.l > 0.7) continue;
    const e = accents.get(c.name) || { name: c.name, samples: [] };
    e.samples.push({ hex: c.hex, share: c.share, from: img });
    accents.set(c.name, e);
  }
}
const accentList = [...accents.values()].map((a) => ({ ...a, samples: a.samples.sort((x, y) => y.share - x.share).slice(0, 4) }));
console.log('\nSaturated accents by hue (best sample first):');
for (const a of accentList) console.log(`  ${a.name.padEnd(8)} ${a.samples.map((s) => `${s.hex} (${s.share}% of ${s.from})`).join(', ')}`);
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ generatedAt: new Date().toISOString(), source: dir.replace(process.cwd() + '/', ''), images: report, accents: accentList }, null, 2) + '\n');
  console.log(`\nwritten ${jsonOut}`);
}
