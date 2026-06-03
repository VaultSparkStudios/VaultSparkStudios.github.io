#!/usr/bin/env node
// check-image-formats.mjs — structural gate that asserts hero-size raster images
// reachable from HTML `<img src>` or `<picture><source srcset>` declarations
// have an AVIF sibling, OR are explicitly opted-out via [data-no-avif].
//
// Drift class this gate catches: a new hero image added without running the
// AVIF pipeline (`convert-images-to-avif.mjs --write`) — silently regresses
// the perf gain we shipped in S131. Without this gate, the next page that
// adds a 100 KB PNG never gets AVIF until the founder notices LCP drift.
//
// Threshold: 30 KB. Anything smaller doesn't benefit enough to justify the
// decode overhead. Matches the S131 generator's effective scan range.
//
// Usage:
//   node scripts/check-image-formats.mjs           # exit 1 on coverage miss
//   node scripts/check-image-formats.mjs --report  # always exit 0, print missing
//   node scripts/check-image-formats.mjs --strict  # also require large <img> to be wrapped in <picture>

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT = process.argv.includes('--report');
const STRICT = process.argv.includes('--strict');
const THRESHOLD = 30 * 1024;

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.cache', '.wrangler', 'dist', 'build',
  'coverage', 'test-results', 'playwright-report',
]);

function* walk(dir, exts) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full, exts);
    else if (exts.some(e => name.endsWith(e))) yield full;
  }
}

const RASTER_EXT = /\.(png|jpe?g|webp)$/i;
// Capture <img src="..."> and <source srcset="..."> values
const SRC_RE = /<(?:img|source)\b[^>]*\b(?:src|srcset)\s*=\s*["']([^"']+)["']/gi;

const referenced = new Map(); // resolved-fs-path → { fromHtml, refCount }
const unwrapped = [];

for (const file of walk(ROOT, ['.html'])) {
  const text = readFileSync(file, 'utf8');
  const fileDir = dirname(file);
  let m;
  while ((m = SRC_RE.exec(text)) !== null) {
    const raw = m[1].split(/\s+/)[0]; // strip srcset density descriptors
    if (!RASTER_EXT.test(raw)) continue;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) continue;
    // Resolve absolute vs relative.
    const resolved = raw.startsWith('/')
      ? resolve(ROOT, raw.replace(/^\/+/, ''))
      : resolve(fileDir, raw);
    if (!existsSync(resolved)) continue; // dead reference — not our problem here
    if (!referenced.has(resolved)) referenced.set(resolved, { from: relative(ROOT, file), count: 0 });
    referenced.get(resolved).count += 1;
  }
  if (STRICT) {
    const imgRe = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let img;
    while ((img = imgRe.exec(text)) !== null) {
      const raw = img[1].split(/\s+/)[0];
      if (!/\.(png|jpe?g)$/i.test(raw)) continue;
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) continue;
      const resolved = raw.startsWith('/')
        ? resolve(ROOT, raw.replace(/^\/+/, ''))
        : resolve(fileDir, raw);
      if (!existsSync(resolved)) continue;
      let st;
      try { st = statSync(resolved); } catch { continue; }
      if (st.size < THRESHOLD) continue;
      const before = text.slice(0, img.index);
      const open = before.lastIndexOf('<picture');
      const close = before.lastIndexOf('</picture>');
      if (open > close) continue;
      const base = raw.replace(/\.(png|jpe?g)$/i, '');
      unwrapped.push({
        img: relative(ROOT, resolved),
        referencedBy: relative(ROOT, file),
        expected: `<picture><source srcset="${base}.avif" type="image/avif"><source srcset="${base}.webp" type="image/webp">...`,
      });
    }
  }
}

const missing = [];
let scanned = 0;

for (const [imgPath, info] of referenced) {
  let st;
  try { st = statSync(imgPath); } catch { continue; }
  if (st.size < THRESHOLD) continue;
  scanned += 1;
  // AVIF is canonical — if the image is itself an AVIF, fine.
  if (/\.avif$/i.test(imgPath)) continue;
  const base = imgPath.replace(/\.(png|jpe?g|webp)$/i, '');
  if (existsSync(base + '.avif')) continue;
  // S134: honor `.avif.skip` markers written by convert-images-to-avif.mjs when
  // AVIF encoding produces a larger file than the source (already-optimized
  // WebPs hit this). The marker is a JSON sidecar recording the size diff.
  if (existsSync(base + '.avif.skip')) continue;
  missing.push({
    img: relative(ROOT, imgPath),
    sizeKB: Math.round(st.size / 1024),
    referencedBy: info.from,
    expectedAvif: relative(ROOT, base + '.avif'),
  });
}

console.log('check-image-formats');
console.log('──────────────────────────────────────────────');
console.log(`  Scanned: ${scanned} raster images ≥${THRESHOLD / 1024} KB referenced from HTML`);
console.log(`  Missing AVIF siblings: ${missing.length}`);
if (STRICT) console.log(`  Unwrapped large raster <img>: ${unwrapped.length}`);

if (missing.length || unwrapped.length) {
  console.log('');
  for (const m of missing) {
    console.log(`  ✗ ${m.img}  (${m.sizeKB} KB · referenced by ${m.referencedBy})`);
    console.log(`      expected sibling: ${m.expectedAvif}`);
  }
  for (const m of unwrapped) {
    console.log(`  ✗ ${m.img}  (referenced by ${m.referencedBy})`);
    console.log(`      expected wrapper: ${m.expected}`);
  }
  console.log('');
  console.log('  Fix: node scripts/convert-images-to-avif.mjs --threshold-kb 25 --include-webp --include-jpg --write');
  if (!REPORT) process.exit(1);
} else {
  console.log(`\n  ✓ all hero images have an AVIF sibling${STRICT ? ' and picture wrapper' : ''}`);
}
