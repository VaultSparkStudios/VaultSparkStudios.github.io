#!/usr/bin/env node
/**
 * propagate-csp.mjs — Propagate the canonical CSP meta tag to all HTML pages.
 *
 * Edit CSP_VALUE below, then run:
 *   node scripts/propagate-csp.mjs [--dry-run]
 *
 * Only files that already have a CSP meta tag are updated. Files without one
 * are reported so you can add one manually.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';

// Usage: node scripts/propagate-csp.mjs [--dry-run] [--check-skipped]
//   --dry-run        Report stale pages without writing (used in CI)
//   --check-skipped  Verify SKIP_DIRS/SKIP_FILES CSP against csp-hash-registry.json

// ─── CANONICAL CSP — edit here only ───────────────────────────────────────────
const CSP_VALUE =
  "default-src 'self'; " +
  "script-src 'self' 'sha256-pc92owTgV6BIa8Xc5NXyUVrfAQZaJSy2Rp+VITHyeQ8=' 'sha256-JujKqvQ+wLaBwZQ+rK0dDSeBX3rT7sN0wby2YNyIlDs=' 'sha256-aizFzz4bZutx7qgu7RXmRZGMRd5mYvlspNnLIvS4rkI=' 'sha256-XdHcZWQrqgwOuuIEs9J5a0nYI4/agz9wQE8ikMlG4Gs=' 'sha256-1UY3+YG3/aghZuROwdh01e6q3uBGn09YVftjxTlBqTE=' 'sha256-tzcyzRA1BVljjKPxQcsqyEn62T2GndOkIweuNdj2DbI=' 'sha256-dZNuqX91zJojUg7FRdKg5d3LknfbrNLsddyjo/JDQiQ=' 'sha256-6LhxaKZePez9MP4tlBaCqBzlgynkabWjj7FWyMEaYng=' 'sha256-GEw0AdBFktwtVecnKrmGqCnQhddgYdiccv8eggRcnA0=' https://fjnpzjjyhnpmunfoycrp.supabase.co https://cdn.jsdelivr.net https://www.googletagmanager.com https://browser.sentry-cdn.com https://challenges.cloudflare.com https://static.cloudflareinsights.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' https: data:; " +
  "connect-src 'self' https://fjnpzjjyhnpmunfoycrp.supabase.co https://api.github.com https://www.google-analytics.com https://o4511104924909568.ingest.us.sentry.io https://api.convertkit.com https://api.web3forms.com https://challenges.cloudflare.com https://browser.sentry-cdn.com; " +
  "frame-src 'self' https://challenges.cloudflare.com; " +
  "font-src 'self'; " +
  "frame-ancestors 'self'; " +
  "base-uri 'self'; " +
  "form-action 'self' https://api.web3forms.com";
// ──────────────────────────────────────────────────────────────────────────────

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DRY_RUN = process.argv.includes('--dry-run');

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  'investor', 'studio-hub', '.git', '.well-known', 'scripts',
  'vaultsparked',  // page-specific CSP managed directly — do not overwrite
]);

const SKIP_FILES = new Set([
  'vaultspark-football-gm/game.html',
  '404.html', 'offline.html'
]);

// Matches both quote styles; content value may contain single quotes ('self' etc.)
const CSP_RE = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="[^"]*"\s*\/?>/i;
const CSP_TAG = `<meta http-equiv="Content-Security-Policy" content="${CSP_VALUE}" />`;

let updated = 0, skipped = 0, missing = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel  = relative(ROOT, full).replace(/\\/g, '/');
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full);
    } else if (entry.endsWith('.html') && !SKIP_FILES.has(rel)) {
      processFile(full, rel);
    }
  }
}

function processFile(full, rel) {
  const src = readFileSync(full, 'utf8');
  if (!CSP_RE.test(src)) {
    missing.push(rel);
    return;
  }
  const next = src.replace(CSP_RE, CSP_TAG);
  if (next === src) { skipped++; return; }
  if (!DRY_RUN) writeFileSync(full, next, 'utf8');
  updated++;
  console.log(`${DRY_RUN ? '[dry] ' : ''}updated  ${rel}`);
}

if (process.argv.includes('--check-skipped')) {
  checkSkipped();
} else {
  walk(ROOT);
  console.log(`\nDone. Updated: ${updated} · Unchanged: ${skipped} · Missing CSP tag: ${missing.length}`);
  if (missing.length) {
    console.log('Files without CSP tag (add manually):');
    missing.forEach(f => console.log('  ' + f));
  }
  if (DRY_RUN && updated > 0) {
    console.error(`\nDRY RUN FAILED: ${updated} file(s) have a stale CSP tag. Run without --dry-run to fix.`);
    process.exit(1);
  }
}

/**
 * --check-skipped: reads csp-hash-registry.json and verifies each page's
 * current CSP content matches the last-verified snapshot. Exits 1 on drift.
 */
function checkSkipped() {
  const registryPath = join(ROOT, 'scripts', 'csp-hash-registry.json');
  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch {
    console.error('ERROR: scripts/csp-hash-registry.json not found or invalid JSON.');
    console.error('       Create it by running: node scripts/propagate-csp.mjs (normal run) then manually populate.');
    process.exit(1);
  }

  let drifted = 0;
  let checked = 0;
  const CONTENT_RE = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]*)"/i;

  for (const [rel, entry] of Object.entries(registry.pages)) {
    const full = join(ROOT, rel);
    let src;
    try {
      src = readFileSync(full, 'utf8');
    } catch {
      console.warn(`WARN  ${rel} — file not found (skipped)`);
      continue;
    }
    const match = src.match(CONTENT_RE);
    const current = match ? match[1] : null;
    if (!current) {
      console.warn(`WARN  ${rel} — no CSP meta tag found`);
      continue;
    }
    checked++;
    if (current === entry.cspContent) {
      console.log(`OK    ${rel}`);
    } else {
      console.error(`DRIFT ${rel}`);
      console.error(`      Expected (registry): ...${entry.cspContent.slice(-80)}`);
      console.error(`      Current  (file):      ...${current.slice(-80)}`);
      drifted++;
    }
  }

  console.log(`\nChecked: ${checked} · Drifted: ${drifted}`);
  if (drifted > 0) {
    console.error(`\nCSP DRIFT DETECTED on ${drifted} page(s).`);
    console.error('Update scripts/csp-hash-registry.json or restore the expected CSP on the page.');
    process.exit(1);
  }
}
