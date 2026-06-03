#!/usr/bin/env node
/**
 * convert-images-to-avif — bulk-converts heavy PNGs in /assets/ to AVIF + WebP.
 *
 * Strategy: scan assets/ for PNGs > 100 KB, generate AVIF (q70) + WebP (q80)
 * siblings, leave originals in place for fallback. The HTML can then use
 * <picture> elements like:
 *
 *   <picture>
 *     <source srcset="/assets/foo.avif" type="image/avif" />
 *     <source srcset="/assets/foo.webp" type="image/webp" />
 *     <img src="/assets/foo.png" alt="…" />
 *   </picture>
 *
 * Requires `sharp` (npm install --save-dev sharp). If sharp is not installed,
 * this script prints what it WOULD convert and exits 0 — safe to run in CI
 * without the dependency until you're ready to flip the pipeline on.
 *
 * Usage:
 *   node scripts/convert-images-to-avif.mjs              # report only
 *   node scripts/convert-images-to-avif.mjs --write      # actually write files
 *   node scripts/convert-images-to-avif.mjs --threshold-kb 80 --write
 *
 * The threshold defaults to 100 KB — small icons stay as PNG since AVIF
 * decoding overhead would erase the byte win on tiny files.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, 'assets');
const WRITE = process.argv.includes('--write');
// Accept both `--threshold-kb=N` and `--threshold-kb N` forms.
let threshold = 100;
const eqArg = process.argv.find((a) => a.startsWith('--threshold-kb='));
if (eqArg) threshold = Number(eqArg.split('=')[1]);
else {
  const idx = process.argv.indexOf('--threshold-kb');
  if (idx !== -1 && process.argv[idx + 1]) threshold = Number(process.argv[idx + 1]);
}
const THRESHOLD_BYTES = threshold * 1024;
// Source extension filter — also convert WebP and JPG sources to AVIF.
const INCLUDE_WEBP = process.argv.includes('--include-webp');
const INCLUDE_JPG = process.argv.includes('--include-jpg');
const SOURCE_RE = INCLUDE_WEBP && INCLUDE_JPG ? /\.(png|webp|jpe?g)$/i
  : INCLUDE_WEBP ? /\.(png|webp)$/i
  : INCLUDE_JPG ? /\.(png|jpe?g)$/i
  : /\.png$/i;

if (!fs.existsSync(ASSETS)) {
  console.error('No assets/ directory found.');
  process.exit(2);
}

let sharp = null;
if (WRITE) {
  try {
    sharp = (await import('sharp')).default;
  } catch (err) {
    console.error('sharp is not installed. Install with: npm install --save-dev sharp');
    process.exit(1);
  }
}

const files = fs.readdirSync(ASSETS).filter((f) => SOURCE_RE.test(f));
const candidates = [];

for (const f of files) {
  const full = path.join(ASSETS, f);
  const stat = fs.statSync(full);
  if (stat.size < THRESHOLD_BYTES) continue;

  const isWebpSource = /\.webp$/i.test(f);
  const base = f.replace(/\.(png|webp|jpe?g)$/i, '');
  const avifPath = path.join(ASSETS, base + '.avif');
  // Only emit a sibling .webp when source is PNG/JPG (don't re-emit webp from webp).
  const webpPath = isWebpSource ? null : path.join(ASSETS, base + '.webp');

  candidates.push({
    src: full,
    name: f,
    sizeKB: Math.round(stat.size / 1024),
    avifPath,
    webpPath,
    avifExists: fs.existsSync(avifPath),
    webpExists: webpPath ? fs.existsSync(webpPath) : true,
  });
}

if (!candidates.length) {
  console.log(`No PNGs above ${THRESHOLD_BYTES / 1024} KB. Nothing to convert.`);
  process.exit(0);
}

console.log(`Found ${candidates.length} candidates above ${THRESHOLD_BYTES / 1024} KB:\n`);
console.log('file                              size   AVIF   WebP');
console.log('───────────────────────────────── ──── ───── ─────');
for (const c of candidates) {
  console.log(`${c.name.padEnd(33)} ${(c.sizeKB + 'KB').padStart(5)} ${(c.avifExists ? 'have' : 'todo').padStart(5)} ${(c.webpExists ? 'have' : 'todo').padStart(5)}`);
}
console.log('');

if (!WRITE) {
  console.log('Re-run with --write to generate AVIF + WebP siblings.');
  process.exit(0);
}

// S134 size-floor guard: when AVIF is larger than the source (common with
// already-optimized WebPs), discard the AVIF and report it as negative-gain.
// `--prune` additionally removes any pre-existing oversized AVIF siblings.
const PRUNE = process.argv.includes('--prune');
// AVIF must be at most this fraction of source to be worth keeping.
const AVIF_GAIN_THRESHOLD = 0.95;

let written = 0;
let skippedAvif = 0;
let prunedAvif = 0;
for (const c of candidates) {
  const buf = fs.readFileSync(c.src);
  // ── AVIF: encode to buffer first, then size-guard before writing ──────
  if (!c.avifExists) {
    const avifBuf = await sharp(buf).avif({ quality: 70 }).toBuffer();
    if (avifBuf.length >= buf.length * AVIF_GAIN_THRESHOLD) {
      skippedAvif++;
      // Write a `.avif.skip` marker so check-image-formats knows this source is
      // documented-negative-gain and not an oversight. Marker contains JSON
      // recording the encoded vs source size for future audit.
      fs.writeFileSync(c.avifPath + '.skip', JSON.stringify({
        source: c.name,
        sourceBytes: buf.length,
        avifBytes: avifBuf.length,
        reason: 'avif-encode-exceeded-source · negative gain',
        thresholdRatio: AVIF_GAIN_THRESHOLD,
        recordedAt: new Date().toISOString().slice(0, 10),
      }, null, 2));
      console.log(`  ↷ ${path.basename(c.avifPath)} skipped — AVIF ${Math.round(avifBuf.length/1024)}KB ≥ ${Math.round(buf.length*AVIF_GAIN_THRESHOLD/1024)}KB threshold (source ${c.sizeKB}KB) · marker written`);
    } else {
      fs.writeFileSync(c.avifPath, avifBuf);
      written++;
      console.log(`  ✓ ${path.basename(c.avifPath)} (${Math.round(avifBuf.length/1024)}KB)`);
    }
  } else if (PRUNE) {
    // Check existing AVIF — prune if it's now larger than source.
    const existingAvif = fs.statSync(c.avifPath).size;
    if (existingAvif >= buf.length * AVIF_GAIN_THRESHOLD) {
      fs.unlinkSync(c.avifPath);
      fs.writeFileSync(c.avifPath + '.skip', JSON.stringify({
        source: c.name,
        sourceBytes: buf.length,
        avifBytes: existingAvif,
        reason: 'avif-encode-exceeded-source · pruned (negative gain)',
        thresholdRatio: AVIF_GAIN_THRESHOLD,
        recordedAt: new Date().toISOString().slice(0, 10),
      }, null, 2));
      prunedAvif++;
      console.log(`  ✗ ${path.basename(c.avifPath)} pruned — ${Math.round(existingAvif/1024)}KB ≥ source ${c.sizeKB}KB (negative gain) · marker written`);
    }
  }
  if (!c.webpExists && c.webpPath) {
    await sharp(buf).webp({ quality: 80 }).toFile(c.webpPath);
    written++;
    console.log(`  ✓ ${path.basename(c.webpPath)}`);
  }
}
console.log(`\nWrote ${written} new image variants · skipped ${skippedAvif} negative-gain AVIF${PRUNE ? ` · pruned ${prunedAvif} oversized AVIF` : ''}.`);
console.log('Next step: update <img> tags to <picture> with the new sources.');
