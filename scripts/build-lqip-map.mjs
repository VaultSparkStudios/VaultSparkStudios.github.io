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
const FORCE = process.argv.includes('--force');

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

  // S232 — coverage-preserving write: REUSE the committed base64 for any image already
  // in the map; only encode genuinely-new keys. sharp/libvips emits different WebP bytes
  // per platform (Win↔Linux) and even across Linux builds, so re-encoding every run churns
  // all ~200 entries with non-canonical bytes the moment a dev runs `npm run build` on a
  // different OS than CI — a 200-line no-signal diff that diverges from the canonical map.
  // Preserving existing bytes makes the artifact platform-stable in practice: whoever wrote
  // a key first owns its (cosmetic ~16px blur) bytes; only new/removed images move the file.
  // `--force` re-encodes everything (use when intentionally refreshing placeholders).
  let prior = {};
  if (!FORCE) {
    try { prior = JSON.parse(fs.readFileSync(OUT, 'utf8')).map ?? {}; } catch {}
  }

  const map = {};
  let reused = 0, encoded = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (!FORCE && typeof prior[rel] === 'string') {
      map[rel] = prior[rel];
      reused++;
      continue;
    }
    try {
      map[rel] = await lqipFor(abs);
      encoded++;
    } catch (e) {
      // unreadable or unsupported — skip silently (build:check shouldn't fail on art assets)
    }
  }

  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  const json = JSON.stringify({ generatedAt: '2026-05-22', count: Object.keys(sorted).length, map: sorted }, null, 2);

  if (CHECK) {
    // S231: validate COVERAGE (the image key-set), NOT the base64 bytes.
    // sharp/libvips encodes the blurred WebP differently across platforms and even
    // across Linux-runner builds (the bytes are non-deterministic), so a byte compare
    // false-fails on every environment that didn't write the committed map — a
    // green-locally/red-in-CI trap (the committed map here is byte-identical to the
    // Linux Action that wrote it, yet CI's regen still differs). The placeholder is a
    // cosmetic ~16px blur loaded at runtime from the JSON; its exact bytes carry no
    // correctness signal. What MUST hold is that every tracked image ≥ MIN_BYTES has a
    // placeholder and no orphaned entries remain. (S183: validate structure, not bytes.)
    let existing = {};
    try { existing = JSON.parse(fs.readFileSync(OUT, 'utf8')).map ?? {}; } catch {}
    const expectedKeys = Object.keys(sorted);
    const actualKeys = Object.keys(existing).sort((a, b) => a.localeCompare(b));
    const missing = expectedKeys.filter((k) => !(k in existing));
    const extra = actualKeys.filter((k) => !(k in sorted));
    if (missing.length === 0 && extra.length === 0) {
      console.log(`build-lqip-map --check: coverage in sync (${expectedKeys.length} images)`);
      return;
    }
    console.error('build-lqip-map --check: coverage drift in data/lqip-map.json.');
    if (missing.length) console.error(`  missing placeholder(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ` … +${missing.length - 8}` : ''}`);
    if (extra.length) console.error(`  orphaned entry(ies): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ` … +${extra.length - 8}` : ''}`);
    console.error('  Run: node scripts/build-lqip-map.mjs');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  console.log(`build-lqip-map: wrote ${Object.keys(sorted).length} placeholder(s) → data/lqip-map.json (${reused} reused, ${encoded} encoded${FORCE ? ', --force' : ''})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
