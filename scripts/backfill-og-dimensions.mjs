#!/usr/bin/env node
/**
 * backfill-og-dimensions.mjs
 *
 * Adds missing og:image:width, og:image:height, og:image:type, and og:image:alt
 * to every git-tracked HTML page that already has og:image but lacks these
 * companion properties. All generated OG cards are 1200×630 PNG (build-og-cards.mjs).
 *
 * Social platforms use these dimensions to pre-fetch and frame thumbnails without
 * downloading the image first, improving share-preview rendering fidelity.
 *
 * Safe: only touches files that already have og:image. Files with og:image:width
 * already set are skipped. Dark (auth/internal) pages are skipped.
 *
 * Usage:
 *   node scripts/backfill-og-dimensions.mjs            # apply changes
 *   node scripts/backfill-og-dimensions.mjs --check    # report without writing
 *   node scripts/backfill-og-dimensions.mjs --self-test
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOgDark } from './check-og-images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

// All generated OG cards from build-og-cards.mjs are 1200×630 PNG.
const OG_WIDTH = '1200';
const OG_HEIGHT = '630';
const OG_TYPE = 'image/png';

function extractMeta(html, property) {
  // Double-quoted content — captures anything except " (allows ' in values like "We've")
  const reDq = new RegExp(`<meta\\s+(?:property|name)=["']${property.replace(/[.:]/g, '\\$&')}["']\\s+content="([^"]*)"`, 'i');
  // Single-quoted fallback
  const reSq = new RegExp(`<meta\\s+(?:property|name)=["']${property.replace(/[.:]/g, '\\$&')}["']\\s+content='([^']*)'`, 'i');
  const m = html.match(reDq) || html.match(reSq);
  return m ? m[1] : null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

export function buildAltText(html) {
  const title = extractMeta(html, 'og:title') || extractMeta(html, 'title');
  if (!title) return 'VaultSpark Studios social preview';
  const decoded = decodeHtmlEntities(title.trim());
  // Truncate to 100 chars; screen readers and social platforms clip long alt text
  return decoded.length > 100 ? decoded.slice(0, 97) + '…' : decoded;
}

export function patchHtml(html) {
  const hasOgImage = /property=["']og:image["']/i.test(html);
  const hasWidth = /property=["']og:image:width["']/i.test(html);
  if (!hasOgImage) return null; // no og:image to augment

  const correctAlt = buildAltText(html);
  const escCorrectAlt = correctAlt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // If all four companion tags already exist, check if alt needs repair
  if (hasWidth) {
    const altMatch = html.match(/property="og:image:alt" content="([^"]*)"/i);
    if (!altMatch) return null; // no alt tag to repair
    const currentAlt = altMatch[1];
    if (currentAlt === escCorrectAlt) return null; // already correct
    // Repair the truncated/wrong alt
    return html.replace(
      /( *<meta property="og:image:alt" content=")[^"]*(")/i,
      `$1${escCorrectAlt}$2`
    );
  }

  const alt = buildAltText(html);
  const escAlt = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const injection = [
    `  <meta property="og:image:width" content="${OG_WIDTH}" />`,
    `  <meta property="og:image:height" content="${OG_HEIGHT}" />`,
    `  <meta property="og:image:type" content="${OG_TYPE}" />`,
    `  <meta property="og:image:alt" content="${escAlt}" />`,
  ].join('\n');

  // Insert the 4 tags immediately after the og:image line (handles both /> and > endings)
  return html.replace(
    /( *<meta property="og:image" content="[^"]*" ?\/?>)/,
    `$1\n${injection}`
  );
}

function scanFiles() {
  return execSync('git ls-files "*.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.startsWith('docs/') && !isOgDark(f));
}

function runSelfTest() {
  let fail = 0;
  const ok = (label) => console.log(`  ✓ ${label}`);
  const err = (label) => { console.error(`  ✗ ${label}`); fail++; };

  // 1. Page with og:image but no dimensions → gets patched
  const basic = `<head>
  <meta property="og:title" content="Test Page | VaultSpark Studios" />
  <meta property="og:image" content="https://vaultsparkstudios.com/assets/og/og-test.png" />
</head>`;
  const out1 = patchHtml(basic);
  if (!out1) { err('basic page returned null (not patched)'); }
  else {
    if (out1.includes('og:image:width" content="1200"')) ok('width injected');
    else err('width not injected');
    if (out1.includes('og:image:height" content="630"')) ok('height injected');
    else err('height not injected');
    if (out1.includes('og:image:type" content="image/png"')) ok('type injected');
    else err('type not injected');
    if (out1.includes('og:image:alt" content="Test Page | VaultSpark Studios"')) ok('alt derived from og:title');
    else err('alt not derived correctly');
  }

  // 2. Page already having og:image:width → skipped (returns null)
  const alreadyPatched = `<head>
  <meta property="og:image" content="..." />
  <meta property="og:image:width" content="1200" />
</head>`;
  const out2 = patchHtml(alreadyPatched);
  if (out2 === null) ok('already-patched page correctly skipped');
  else err('already-patched page returned non-null (would double-patch)');

  // 3. Page with no og:image → skipped
  const noOg = `<head><title>No OG</title></head>`;
  const out3 = patchHtml(noOg);
  if (out3 === null) ok('no-og:image page correctly skipped');
  else err('no-og:image page returned non-null');

  // 4. HTML entity decoding in alt text
  const entities = `<head>
  <meta property="og:title" content="Intellectual Property &amp; Rights | VaultSpark Studios" />
  <meta property="og:image" content="https://vaultsparkstudios.com/assets/og/og-ip.png" />
</head>`;
  const out4 = patchHtml(entities);
  if (out4 && out4.includes('content="Intellectual Property &amp; Rights | VaultSpark Studios"')) ok('HTML entities decoded + re-encoded in alt');
  else err('alt text entity handling incorrect: ' + (out4 ? out4.slice(0, 300) : 'null'));

  // 5. Long title truncated
  const longTitle = 'A'.repeat(120);
  const longHtml = `<head>
  <meta property="og:title" content="${longTitle}" />
  <meta property="og:image" content="https://example.com/img.png" />
</head>`;
  const out5 = patchHtml(longHtml);
  if (out5) {
    const altMatch = out5.match(/og:image:alt" content="([^"]*)"/);
    if (altMatch && altMatch[1].length <= 100) ok('long title truncated to ≤100 chars');
    else err('long title not truncated');
  } else err('long title page not patched');

  if (fail) { console.error(`\n${fail} self-test(s) failed`); process.exit(1); }
  console.log('\nAll self-tests passed.');
}

if (SELF_TEST) {
  runSelfTest();
  process.exit(0);
}

const files = scanFiles();
let patched = 0, skipped = 0;
const report = [];

for (const rel of files) {
  const abs = join(ROOT, rel);
  let html;
  try { html = readFileSync(abs, 'utf8'); } catch { continue; }
  const result = patchHtml(html);
  if (result === null) { skipped++; continue; }
  report.push(rel);
  if (!CHECK) writeFileSync(abs, result, 'utf8');
  patched++;
}

const verb = CHECK ? 'Would patch' : 'Patched';
console.log(`${verb} ${patched} page(s), skipped ${skipped} (already correct or no og:image).`);
if (report.length) {
  report.forEach((f) => console.log(`  • ${f}`));
}
if (CHECK && patched > 0) process.exit(1); // non-zero = drift detected
