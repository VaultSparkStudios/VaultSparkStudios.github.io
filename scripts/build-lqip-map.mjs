#!/usr/bin/env node
/**
 * build-lqip-map.mjs — sharp-based low-quality-image-placeholder generator.
 *
 * Scans every local raster image referenced from HTML (jpg/png/webp/avif),
 * emits a base64-encoded ~16×16 blurred WebP placeholder per image into
 * `data/lqip-map.json`. The map is consumed at runtime by `assets/lqip.js`,
 * which paints `background-image:url(<base64>);background-size:cover` onto
 * every `<img data-lqip>` it sees, then removes the bg once the real image
 * decodes — perceived perf jump on slow connections without a layout shift.
 *
 * Idempotent: re-runs with no image changes produce the same map.
 *
 * Usage:
 *   node scripts/build-lqip-map.mjs            # write map
 *   node scripts/build-lqip-map.mjs --check    # fail if map is stale
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'data', 'lqip-map.json');

const CHECK = process.argv.includes('--check');

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MIN_BYTES = 20 * 1024; // skip icons/tiny graphics

// Only scan git-tracked files so local gitignored dirs (e.g. docs/mobile-audit/)
// are excluded — keeps local and CI output identical.
function trackedImages() {
  const res = spawnSync('git', ['ls-files', '--', '*.jpg', '*.jpeg', '*.png', '*.webp', '*.avif'], {
    cwd: ROOT, encoding: 'utf8',
  });
  if (res.status !== 0) {
    // git unavailable — fall back to walk (should not happen in normal use)
    return null;
  }
  return res.stdout.trim().split('\n').filter(Boolean).map((rel) => path.join(ROOT, rel));
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (RASTER.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

async function lqipFor(absPath) {
  const buf = await sharp(absPath)
    .resize(16, null, { fit: 'inside' })
    .blur(1.2)
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

async function main() {
  const tracked = trackedImages();
  const files = (tracked ?? walk(ROOT)).filter((p) => {
    try { return fs.statSync(p).size >= MIN_BYTES; } catch { return false; }
  });

  const map = {};
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    try {
      map[rel] = await lqipFor(abs);
    } catch (e) {
      // unreadable or unsupported — skip silently (build:check shouldn't fail on art assets)
    }
  }

  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  const json = JSON.stringify({ generatedAt: '2026-05-22', count: Object.keys(sorted).length, map: sorted }, null, 2);

  if (CHECK) {
    let existing = '';
    try { existing = fs.readFileSync(OUT, 'utf8'); } catch {}
    // Tolerant compare: ignore generatedAt + trailing whitespace.
    const norm = (s) => s.replace(/"generatedAt":\s*"[^"]+"/, '"generatedAt":""').replace(/\s+$/, '');
    if (norm(existing) === norm(json)) {
      console.log(`build-lqip-map --check: in sync (${Object.keys(sorted).length} images)`);
      return;
    }
    console.error('build-lqip-map --check: data/lqip-map.json is stale.');
    console.error('  Run: node scripts/build-lqip-map.mjs');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  console.log(`build-lqip-map: wrote ${Object.keys(sorted).length} placeholder(s) → data/lqip-map.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
