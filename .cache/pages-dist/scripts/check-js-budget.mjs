#!/usr/bin/env node
/**
 * check-js-budget.mjs — fail CI if a page's eager/blocking JS exceeds the budget.
 *
 * "Eager/blocking" = a `<script src=>` tag without `defer`, `async`, or
 * `type=module`. These block the parser until they finish loading +
 * executing, so they're the relevant load-perf budget — deferred scripts
 * are already off the critical path and ambient-block won't contribute.
 *
 * Default budget: 80 KB gzipped per page across all eager+blocking same-origin
 * scripts. First-party only (cross-origin scripts are out-of-scope for budget;
 * SRI/CSP covers those).
 *
 * Usage:
 *   node scripts/check-js-budget.mjs           # check, fail on overage
 *   node scripts/check-js-budget.mjs --report  # print every page's bytes
 *
 * Exits 0 clean, 1 on any overage.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_BUDGET_BYTES = 80 * 1024;     // 80 KB gzipped — public pages
const PORTAL_BUDGET_BYTES  = 120 * 1024;    // 120 KB gzipped — auth/portal surfaces
const REPORT = process.argv.includes('--report');

// Portal/auth pages get a higher budget — they're not landing surfaces and need
// dashboard / state / RPC scripts. Public marketing pages stay tight at 80 KB.
const PORTAL_PAGES = new Set([
  'vault-member/index.html',
  'vault-member/admin/ignis-spend/index.html',
  'investor-portal/index.html',
  'investor-portal/login/index.html',
  'investor-portal/apply/index.html',
  'investor-portal/admin/index.html',
  'investor-portal/documents/index.html',
  'investor-portal/message/index.html',
  'investor-portal/profile/index.html',
  'investor-portal/updates/index.html',
  'studio-hub/index.html',
]);

function budgetFor(rel) {
  return PORTAL_PAGES.has(rel) ? PORTAL_BUDGET_BYTES : DEFAULT_BUDGET_BYTES;
}

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  '.git', '.github', 'audits', 'docs', 'handoffs',
  'context', 'logs', 'data', '.cache', '.ops-cache',
  '.wrangler', '.well-known', 'cloudflare', 'config',
  'scripts', 'supabase', 'tests', 'ignis', 'api',
  'feedback',
]);

const SCRIPT_RE = /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi;
const SAMPLE_BLOCK_RE = /<(pre|code)\b[\s\S]*?<\/\1>/gi;

function findHtmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(p, acc);
    else if (entry.name === 'index.html' || entry.name === '404.html') acc.push(p);
  }
  return acc;
}

function isBlocking(attrs) {
  // Eager script blocks the parser unless defer, async, or module type.
  if (/\bdefer\b/i.test(attrs)) return false;
  if (/\basync\b/i.test(attrs)) return false;
  if (/\btype\s*=\s*["']module["']/i.test(attrs)) return false;
  return true;
}

function isFirstParty(src) {
  if (src.startsWith('//')) return false;
  if (/^https?:\/\//i.test(src)) return false;
  return true;
}

function resolveAssetPath(htmlPath, src) {
  const cleaned = src.replace(/[?#].*$/, '');
  if (cleaned.startsWith('/')) return join(ROOT, cleaned.slice(1));
  return normalize(join(dirname(htmlPath), cleaned));
}

let violations = 0;
const rows = [];
const files = findHtmlFiles(ROOT);

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const html = raw.replace(SAMPLE_BLOCK_RE, '');
  let m;
  let blockingBytes = 0;
  const blockingScripts = [];
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(html))) {
    const attrs = (m[1] || '') + ' ' + (m[3] || '');
    const src = m[2];
    if (!isBlocking(attrs)) continue;
    if (!isFirstParty(src)) continue; // cross-origin out of scope
    const assetPath = resolveAssetPath(f, src);
    if (!existsSync(assetPath)) continue; // unresolvable (build artifact)
    try {
      const bytes = gzipSync(readFileSync(assetPath)).length;
      blockingBytes += bytes;
      blockingScripts.push({ src, bytes });
    } catch (_) {}
  }
  const rel = f.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
  const budget = budgetFor(rel);
  rows.push({ rel, bytes: blockingBytes, scripts: blockingScripts, budget });
  if (blockingBytes > budget) {
    violations++;
    console.error(`✗ ${rel}: ${(blockingBytes/1024).toFixed(1)} KB blocking JS (budget ${budget/1024} KB)`);
    blockingScripts
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5)
      .forEach(s => console.error(`    ${(s.bytes/1024).toFixed(1)} KB  ${s.src}`));
  }
}

if (REPORT) {
  console.log('\nPer-page blocking-JS size (gzipped):\n');
  rows.sort((a, b) => b.bytes - a.bytes).slice(0, 25).forEach(r => {
    const bar = '█'.repeat(Math.min(40, Math.round(r.bytes / (r.budget / 40))));
    const tag = r.budget === PORTAL_BUDGET_BYTES ? '[portal]' : '         ';
    console.log(`  ${(r.bytes/1024).toFixed(1).padStart(6)} KB  ${tag} ${bar.padEnd(41)}  ${r.rel}`);
  });
}

if (violations) {
  console.error(`\n✗ check-js-budget: ${violations} page(s) over budget`);
  process.exit(1);
}
console.log(`✓ check-js-budget: ${files.length} pages within budget (80 KB public · 120 KB portal, gzipped)`);
