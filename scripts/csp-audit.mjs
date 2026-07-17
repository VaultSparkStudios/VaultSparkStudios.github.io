#!/usr/bin/env node
/**
 * csp-audit.mjs — verify CSP integrity across public HTML pages.
 *
 * Checks:
 * 1. Inline <script> hashes exist in the Worker CSP
 * 2. Legacy meta CSP tags, if present, match the canonical page CSP
 * 3. Legacy meta CSP tags, if present, also include their inline hashes
 *
 * S120 moved the public site to nonce-based HTTP CSP in the Cloudflare Worker,
 * so most pages intentionally have no meta CSP tag. This audit must still scan
 * page inline scripts against WORKER_CSP; a "0 files checked" pass is unsafe.
 *
 * Usage:
 *   node scripts/csp-audit.mjs
 *   node scripts/csp-audit.mjs --suggest-hash
 *     When a page has an inline script whose hash is not in the canonical CSP,
 *     print the exact JSON line(s) to paste into config/csp-policy.mjs — properly
 *     quoted, deduped, and alphabetically sorted against the existing list so
 *     the final array stays canonically ordered. Collapses the ad-hoc
 *     `node -e "console.log(crypto.createHash…)"` dance used in S102 CSP fixes.
 */

import crypto from 'crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { PAGE_CSP, WORKER_CSP } from '../config/csp-policy.mjs';

const SUGGEST_HASH = process.argv.includes('--suggest-hash');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER_TOML = join(ROOT, 'cloudflare', 'wrangler.toml');
const NONCE_CSP_ENABLED = (() => {
  if (!existsSync(WRANGLER_TOML)) return false;
  const text = readFileSync(WRANGLER_TOML, 'utf8');
  return /NONCE_CSP_ENABLED\s*=\s*["']1["']/.test(text);
})();

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  '.git', '.well-known', 'scripts',
]);

const CANON_SKIP_DIRS = new Set(['vaultsparked']);
const CANON_SKIP_FILES = new Set(['franchise-architect/game.html', '404.html', 'offline.html']);

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
    const body = match[2] || '';
    if (!body.trim()) continue;
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
let metaChecked = 0;
let inlineScriptsChecked = 0;

for (const rel of files) {
  const full = join(ROOT, rel);
  const html = readFileSync(full, 'utf8');
  const metaMatch = html.match(CSP_META_RE);

  checked += 1;
  const skipCanonical = shouldSkipCanonical(rel);
  const fileCsp = metaMatch?.[1] || null;

  if (fileCsp) {
    metaChecked += 1;
    if (!skipCanonical && fileCsp !== canonicalCsp) {
      failures.push(`${rel}: file CSP does not match canonical CSP`);
    }
  }

  const hashes = extractInlineHashes(html);
  inlineScriptsChecked += hashes.length;
  hashes.forEach((hash) => {
    if (fileCsp && !fileCsp.includes(hash)) {
      failures.push(`${rel}: missing ${hash} in page CSP`);
    }
    if (!NONCE_CSP_ENABLED && !workerCsp.includes(hash)) {
      failures.push(`${rel}: missing ${hash} in Worker CSP`);
    }
    if (!NONCE_CSP_ENABLED && !skipCanonical && !canonicalCsp.includes(hash)) {
      failures.push(`${rel}: missing ${hash} in canonical CSP`);
    }
  });
}

if (SUGGEST_HASH) {
  // Collect all inline-script hashes that are missing from the canonical CSP
  // so the reporter can print a ready-to-paste addition to config/csp-policy.mjs.
  const missingCanonical = new Map(); // hash → Set<file>
  for (const rel of files) {
    const full = join(ROOT, rel);
    const html = readFileSync(full, 'utf8');
    if (!CSP_META_RE.test(html)) continue;
    if (shouldSkipCanonical(rel)) continue;
    for (const hash of extractInlineHashes(html)) {
      if (canonicalCsp.includes(hash)) continue;
      if (!missingCanonical.has(hash)) missingCanonical.set(hash, new Set());
      missingCanonical.get(hash).add(rel);
    }
  }

  if (missingCanonical.size === 0) {
    console.log('✓ No missing inline-script hashes — canonical CSP is in sync.');
  } else {
    // Reconstruct the current SCRIPT_HASHES list from the canonical CSP so
    // we can print the new entry in its correct alphabetical slot and flag
    // neighbors for the operator.
    const existingHashes = Array.from(
      canonicalCsp.matchAll(/'sha256-[A-Za-z0-9+/=]+='/g),
      (m) => m[0]
    );
    const sortKey = (s) => s.replace(/^'sha256-/, '').replace(/=*'$/, '').toLowerCase();
    const allSorted = Array.from(new Set([
      ...existingHashes,
      ...Array.from(missingCanonical.keys()).map((h) => `'${h}'`),
    ])).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

    console.log(`⚠  ${missingCanonical.size} inline-script hash(es) missing from canonical CSP.\n`);
    console.log('Paste into config/csp-policy.mjs SCRIPT_HASHES array (alphabetically sorted):\n');
    for (const [hash, fileSet] of missingCanonical) {
      const quoted = `'${hash}'`;
      const idx = allSorted.indexOf(quoted);
      const after = idx > 0 ? allSorted[idx - 1] : '(top of list)';
      console.log(`  ${JSON.stringify(quoted)},`);
      console.log(`      └─ insert after: ${after}`);
      console.log(`      └─ sources:     ${[...fileSet].slice(0, 4).join(', ')}${fileSet.size > 4 ? ` (+${fileSet.size - 4} more)` : ''}`);
      console.log('');
    }
    console.log('After pasting, run: node scripts/propagate-csp.mjs && node scripts/csp-audit.mjs');
  }
  process.exit(missingCanonical.size === 0 ? 0 : 1);
}

if (failures.length) {
  console.error(`CSP audit failed on ${failures.length} issue(s) across ${checked} HTML files.\n`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (checked === 0) {
  console.error('CSP audit failed: scanned 0 HTML files.');
  process.exit(1);
}

const mode = NONCE_CSP_ENABLED ? 'nonce mode' : 'hash mode';
console.log(`CSP audit passed (${mode}). Checked ${checked} HTML files, ${inlineScriptsChecked} inline script hashes, ${metaChecked} legacy meta CSP tags.`);
