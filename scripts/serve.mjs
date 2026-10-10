#!/usr/bin/env node
// 30-line zero-dependency static server for dist/.   node scripts/serve.mjs [dir=dist] [port=8080]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const dir = resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(dir, path));
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    const type = types[extname(file)] || 'application/octet-stream';
    const gz = /text|javascript|json|xml|svg/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
    res.end(gz ? gzipSync(body) : body);
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); }
}).listen(port, () => console.log(`serving ${dir} at http://localhost:${port}/`));
