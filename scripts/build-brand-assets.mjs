#!/usr/bin/env node
/**
 * build-brand-assets.mjs
 *
 * One-shot asset pipeline: reads master brand PNGs from the founder's local
 * brand folder, produces web-optimized derivatives in `assets/brand/`, and
 * emits `brand/assets.json` — the canonical manifest used by the /brand/ page
 * and any downstream consumers (partner embeds, future automation).
 *
 * Outputs per master:
 *   - .png (optimized, for email signatures / Outlook / partner downloads)
 *   - .webp (for modern browsers, ~4x smaller than PNG)
 *   - @2x variant for retina where useful
 *
 * Run: node scripts/build-brand-assets.mjs
 *
 * --check mode (CI-safe, no sharp needed, no master sources needed):
 *   Verifies every slug in JOBS+SIGNATURE_JOBS has matching PNG (and WEBP where
 *   applicable) on disk, and that each file's byte count matches the committed
 *   `brand/assets.json` manifest. Catches hand-edits to brand outputs and
 *   drift between the manifest and the real files.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BRAND_ROOT = '<user-home>/Documents/VaultSpark Studios/Brand Assets';
const OUT_DIR = path.resolve('assets/brand');
const MANIFEST_OUT = path.resolve('brand/assets.json');

const CHECK_MODE = process.argv.slice(2).includes('--check');

if (!CHECK_MODE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });
}

// variant recipes — [source path, output slug, dims, tagline]
const JOBS = [
  // The definitive cinematic logo — transparent bg is key for email
  { src: `${BRAND_ROOT}/Logos/vaultspark_cinematic_transparent.png`, slug: 'logo-cinematic',   width: 1200, usage: 'Full cinematic logo · transparent background · best for email signatures, press, partner embeds' },
  { src: `${BRAND_ROOT}/Logos/vaultspark_cinematic.png`,             slug: 'logo-cinematic-dark', width: 1200, usage: 'Full cinematic logo · dark background · for dark contexts only' },
  { src: `${BRAND_ROOT}/Logos/vaultspark_primary_black.png`,         slug: 'logo-primary-black', width: 1200, usage: 'Primary mark · black on transparent · for light backgrounds' },
  { src: `${BRAND_ROOT}/Logos/vaultspark_primary_white.png`,         slug: 'logo-primary-white', width: 1200, usage: 'Primary mark · white on transparent · for dark backgrounds' },
  { src: `${BRAND_ROOT}/Icon/vaultspark_icon_1024.png`,              slug: 'icon-square',    width: 512,  usage: 'Square icon · for favicons, avatars, social profiles' },
];

// Email-signature specialized sizes (Outlook/Gmail need PNG + modest dimensions)
const SIGNATURE_JOBS = [
  { src: `${BRAND_ROOT}/Logos/vaultspark_cinematic_transparent.png`, slug: 'logo-signature',    width: 400, usage: 'Email signature · PNG · ~200px display size · Outlook/Gmail compatible' },
  { src: `${BRAND_ROOT}/Logos/vaultspark_cinematic_transparent.png`, slug: 'logo-signature-2x', width: 800, usage: 'Email signature retina · PNG · for high-DPI email clients' },
];

const manifest = {
  generatedAt: new Date().toISOString(),
  generator: 'scripts/build-brand-assets.mjs',
  baseUrl: 'https://vaultsparkstudios.com/assets/brand',
  colors: {
    gold: '#FFC400',
    goldAmber: '#fbbf24',
    goldDeep: '#a07010',
    bg: '#000000',
    text: '#ffffff',
    muted: '#e5e7eb',
  },
  typography: {
    display: "Georgia, 'Times New Roman', serif",
    body: 'system-ui, -apple-system, sans-serif',
  },
  assets: [],
};

async function buildVariant(job, { signatureOnly = false } = {}) {
  if (!fs.existsSync(job.src)) {
    console.log(`  ⊘ skip (missing source): ${job.src}`);
    return;
  }
  const pngOut = path.join(OUT_DIR, `${job.slug}.png`);
  const webpOut = path.join(OUT_DIR, `${job.slug}.webp`);

  const image = sharp(job.src).resize({ width: job.width, withoutEnlargement: true });

  await image.clone().png({ compressionLevel: 9, palette: false, quality: 90 }).toFile(pngOut);
  const pngBytes = fs.statSync(pngOut).size;

  let webpBytes = null;
  if (!signatureOnly) {
    await image.clone().webp({ quality: 88, effort: 6 }).toFile(webpOut);
    webpBytes = fs.statSync(webpOut).size;
  }

  const entry = {
    slug: job.slug,
    usage: job.usage,
    width: job.width,
    formats: {
      png: { url: `/assets/brand/${job.slug}.png`, bytes: pngBytes },
    },
  };
  if (webpBytes != null) {
    entry.formats.webp = { url: `/assets/brand/${job.slug}.webp`, bytes: webpBytes };
  }
  manifest.assets.push(entry);
  console.log(`  ✓ ${job.slug}  png=${(pngBytes/1024).toFixed(1)}KB${webpBytes!=null?`  webp=${(webpBytes/1024).toFixed(1)}KB`:''}`);
}

let sharp;
if (CHECK_MODE) {
  runCheck();
} else {
  sharp = (await import('sharp')).default;
  console.log('Building brand asset derivatives…\n');
  for (const j of JOBS) await buildVariant(j);
  for (const j of SIGNATURE_JOBS) await buildVariant(j, { signatureOnly: true });

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n✓ Manifest → ${path.relative(process.cwd(), MANIFEST_OUT)}`);
  console.log(`✓ Assets  → ${path.relative(process.cwd(), OUT_DIR)}/`);
}

function runCheck() {
  if (!fs.existsSync(MANIFEST_OUT)) {
    console.error('brand-assets-drift · brand/assets.json missing — run build-brand-assets.mjs to regenerate');
    process.exit(1);
  }
  const mf = JSON.parse(fs.readFileSync(MANIFEST_OUT, 'utf8'));
  const bySlug = new Map((mf.assets || []).map((a) => [a.slug, a]));
  const findings = [];

  for (const job of [...JOBS, ...SIGNATURE_JOBS]) {
    const entry = bySlug.get(job.slug);
    if (!entry) {
      findings.push(`${job.slug}: missing from brand/assets.json manifest`);
      continue;
    }
    const pngPath = path.join(OUT_DIR, `${job.slug}.png`);
    if (!fs.existsSync(pngPath)) {
      findings.push(`${job.slug}: assets/brand/${job.slug}.png missing on disk`);
    } else {
      const actual = fs.statSync(pngPath).size;
      const claimed = entry?.formats?.png?.bytes;
      if (claimed != null && actual !== claimed) {
        findings.push(`${job.slug}.png: disk ${actual}B ≠ manifest ${claimed}B`);
      }
    }
    // WEBP only for JOBS list (signature jobs are PNG-only)
    if (JOBS.some((j) => j.slug === job.slug)) {
      const webpPath = path.join(OUT_DIR, `${job.slug}.webp`);
      if (!fs.existsSync(webpPath)) {
        findings.push(`${job.slug}: assets/brand/${job.slug}.webp missing on disk`);
      } else {
        const actual = fs.statSync(webpPath).size;
        const claimed = entry?.formats?.webp?.bytes;
        if (claimed != null && actual !== claimed) {
          findings.push(`${job.slug}.webp: disk ${actual}B ≠ manifest ${claimed}B`);
        }
      }
    }
  }

  if (findings.length === 0) {
    console.log(`brand-assets-drift · clean (${(mf.assets||[]).length} assets verified against brand/assets.json)`);
    process.exit(0);
  }
  console.error('brand-assets-drift · drift detected:');
  for (const f of findings) console.error(`  - ${f}`);
  console.error('\nFix: rerun `node scripts/build-brand-assets.mjs` to regenerate outputs + manifest.');
  process.exit(1);
}
