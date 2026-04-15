#!/usr/bin/env node
/**
 * csp-audit.mjs — verify CSP integrity across public HTML pages.
 *
 * Checks:
 * 1. Non-skipped pages match the canonical CSP in scripts/propagate-csp.mjs
 * 2. Inline <script> hashes exist in the page CSP
 * 3. Inline <script> hashes also exist in the Worker CSP
 *
 * Usage:
 *   node scripts/csp-audit.mjs
 */

import crypto from 'crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';
import { PAGE_CSP, WORKER_CSP } from '../config/csp-policy.mjs';

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  'investor', 'studio-hub', '.git', '.well-known', 'scripts',
]);

const CANON_SKIP_DIRS = new Set(['vaultsparked']);
const CANON_SKIP_FILES = new Set(['vaultspark-football-gm/game.html', '404.html', 'offline.html']);

const CSP_META_RE = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]*)"\s*\/?>/i;
const INLINE_SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, files);
      continue;
    }
    if (entry.endsWith('.html')) files.push(rel);
  }
  return files;
}

function shouldSkipCanonical(rel) {
  if (CANON_SKIP_FILES.has(rel)) return true;
  const top = rel.split('/')[0];
  return CANON_SKIP_DIRS.has(top);
}

function sha256Base64(input) {
  return crypto.createHash('sha256').update(input).digest('base64');
}

function extractInlineHashes(html) {
  const hashes = [];
  let match;
  while ((match = INLINE_SCRIPT_RE.exec(html))) {
    const attrs = match[1] || '';
    const body = (match[2] || '').trim();
    if (!body) continue;
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/type=["']application\/ld\+json["']/.test(attrs)) continue;
    hashes.push(`sha256-${sha256Base64(body)}`);
  }
  return hashes;
}

const canonicalCsp = PAGE_CSP;
const workerCsp = WORKER_CSP;
const files = walk(ROOT);
const failures = [];
let checked = 0;

for (const rel of files) {
  const full = join(ROOT, rel);
  const html = readFileSync(full, 'utf8');
  const metaMatch = html.match(CSP_META_RE);
  if (!metaMatch) continue;

  checked += 1;
  const fileCsp = metaMatch[1];
  const skipCanonical = shouldSkipCanonical(rel);
  if (!skipCanonical && fileCsp !== canonicalCsp) {
    failures.push(`${rel}: file CSP does not match canonical CSP`);
  }

  const hashes = extractInlineHashes(html);
  hashes.forEach((hash) => {
    if (!fileCsp.includes(hash)) {
      failures.push(`${rel}: missing ${hash} in page CSP`);
    }
    if (!workerCsp.includes(hash)) {
      failures.push(`${rel}: missing ${hash} in Worker CSP`);
    }
    if (!skipCanonical && !canonicalCsp.includes(hash)) {
      failures.push(`${rel}: missing ${hash} in canonical CSP`);
    }
  });
}

if (failures.length) {
  console.error(`CSP audit failed on ${failures.length} issue(s) across ${checked} HTML files.\n`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`CSP audit passed. Checked ${checked} HTML files.`);
