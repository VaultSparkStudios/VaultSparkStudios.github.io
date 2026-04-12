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

// ─── CANONICAL CSP — edit here only ───────────────────────────────────────────
const CSP_VALUE =
  "default-src 'self'; " +
  "script-src 'self' 'sha256-pc92owTgV6BIa8Xc5NXyUVrfAQZaJSy2Rp+VITHyeQ8=' 'sha256-JujKqvQ+wLaBwZQ+rK0dDSeBX3rT7sN0wby2YNyIlDs=' https://fjnpzjjyhnpmunfoycrp.supabase.co https://cdn.jsdelivr.net https://www.googletagmanager.com https://browser.sentry-cdn.com https://challenges.cloudflare.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' https: data:; " +
  "connect-src 'self' https://fjnpzjjyhnpmunfoycrp.supabase.co https://api.github.com https://www.google-analytics.com https://o4511104924909568.ingest.us.sentry.io https://api.convertkit.com https://api.web3forms.com https://challenges.cloudflare.com; " +
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
  'investor', 'studio-hub', '.git', '.well-known', 'scripts'
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
