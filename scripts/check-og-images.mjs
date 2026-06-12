#!/usr/bin/env node
/* check-og-images.mjs — S194 social-card integrity gate.

   The failure this closes: the /_og/ Worker returns image/svg+xml, and SVG
   og:image renders BLANK on Facebook, X/Twitter, LinkedIn, Discord, Slack and
   iMessage (they reject SVG — it can carry script). For 193 sessions 73 pages
   served a primary share-card no social platform would display, masked by a
   source comment that falsely claimed "social platforms rasterize SVG fine."

   This gate makes that regression impossible:
     • og:image / twitter:image pointing at an SVG (incl the /_og/ endpoint) → ERROR
     • og:image / twitter:image pointing at a missing local asset            → ERROR
     • page with no og:image at all                                          → WARN

   A share card that doesn't render is a silent conversion leak on a
   traffic-starved site; this keeps every crawler-facing image a real raster.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/check-og-images.mjs            # scan tracked HTML pages
     node scripts/check-og-images.mjs --self-test
*/
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Extract the content URL of a given OG/Twitter meta image property.
export function metaImage(html, key) {
  // og:image uses property=, twitter:image uses name= — accept either.
  const re = new RegExp(`<meta (?:property|name)="${key.replace(/[:]/g, '\\:')}" content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

// Classify a single image URL against the rules. Returns {level, msg} or null.
export function classifyImage(url, label, assetExists) {
  if (!url) return null;
  // SVG anywhere — including the dynamic /_og/ endpoint which serves image/svg+xml.
  if (/\.svg(\?|$)/i.test(url) || /\/_og\//.test(url)) {
    return { level: 'error', msg: `${label} is an SVG/_og endpoint (${url}) — renders BLANK on FB/X/LinkedIn/Discord/Slack. Use a PNG/JPG.` };
  }
  // Local asset must exist. Absolute prod URLs to /assets/ map to a repo file.
  const m = url.match(/^https:\/\/vaultsparkstudios\.com(\/assets\/[^"?]+)/) || url.match(/^(\/assets\/[^"?]+)/);
  if (m) {
    const rel = m[1].replace(/^\//, '');
    if (!assetExists(rel)) return { level: 'error', msg: `${label} → ${url} but ${rel} is missing` };
  }
  return null;
}

export function scanPage(html, assetExists) {
  const findings = [];
  const og = metaImage(html, 'og:image');
  const tw = metaImage(html, 'twitter:image');
  if (!og) findings.push({ level: 'warn', msg: 'no og:image meta — link shares render with no card' });
  for (const [url, label] of [[og, 'og:image'], [tw, 'twitter:image']]) {
    const r = classifyImage(url, label, assetExists);
    if (r) findings.push(r);
  }
  return findings;
}

function runSelfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  const exists = (rel) => rel === 'assets/og-cod.png'; // only this one "exists" in the fixture

  // SVG og:image → error
  let f = scanPage('<meta property="og:image" content="https://vaultsparkstudios.com/_og/?title=X" />', exists);
  assert(f.some((x) => x.level === 'error' && /BLANK/.test(x.msg)), 'flags /_og SVG og:image as error');

  // explicit .svg → error
  f = classifyImage('https://vaultsparkstudios.com/assets/card.svg', 'og:image', exists);
  assert(f && f.level === 'error', 'flags explicit .svg as error');

  // valid PNG that exists → clean
  f = classifyImage('https://vaultsparkstudios.com/assets/og-cod.png', 'og:image', exists);
  assert(f === null, 'valid existing PNG passes');

  // PNG that does not exist → error
  f = classifyImage('https://vaultsparkstudios.com/assets/og-missing.png', 'og:image', exists);
  assert(f && f.level === 'error' && /missing/.test(f.msg), 'flags missing asset');

  // no og:image → warn
  f = scanPage('<meta name="twitter:image" content="https://vaultsparkstudios.com/assets/og-cod.png" />', exists);
  assert(f.some((x) => x.level === 'warn'), 'warns when og:image absent');

  // clean page (both point at existing png) → no error
  f = scanPage('<meta property="og:image" content="https://vaultsparkstudios.com/assets/og-cod.png" /><meta name="twitter:image" content="https://vaultsparkstudios.com/assets/og-cod.png" />', exists);
  assert(!f.some((x) => x.level === 'error'), 'clean page has no errors');

  if (fail === 0) { console.log('✓ check-og-images --self-test: 6/6 passed'); process.exit(0); }
  console.error('✗ check-og-images --self-test: ' + fail + ' failed'); process.exit(1);
}

function runScan() {
  const files = execSync('git ls-files "*.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.startsWith('docs/'));
  const assetExists = (rel) => existsSync(join(ROOT, rel));
  let errors = 0, warns = 0;
  for (const f of files) {
    const findings = scanPage(readFileSync(join(ROOT, f), 'utf8'), assetExists);
    for (const x of findings) {
      if (x.level === 'error') { console.error(`✗ ${f}: ${x.msg}`); errors++; }
      else { warns++; }
    }
  }
  if (errors) {
    console.error(`✗ check-og-images: ${errors} broken social-card image(s) — fix before push`);
    process.exit(1);
  }
  console.log(`✓ check-og-images: ${files.length} page(s) scanned · all share-card images are real rasters` + (warns ? ` (${warns} no-og:image warning)` : ''));
  process.exit(0);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-og-images.mjs');
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) runSelfTest();
  else runScan();
}
