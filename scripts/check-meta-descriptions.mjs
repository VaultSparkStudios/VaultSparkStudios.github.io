#!/usr/bin/env node
// check-meta-descriptions.mjs — every indexable public page must carry a
// non-empty <meta name="description">.
//
// The meta description is the conversion copy that runs in the SERP before
// anyone clicks. This gate locks the current state — every indexable public
// page already has one — so the class of drift (a new page shipped with no
// description, or a propagator wiping one) can never reach production.
//
// HARD FAIL: an indexable, non-internal page with a missing or empty description.
// WARN only: description length outside the ideal ~70–200 char band (Google
// truncates near 155; very short reads as weak). Warnings never fail the gate.
//
// Skipped: noindex pages, internal/auth tools, build + dependency + report dirs.
//
// Usage:
//   node scripts/check-meta-descriptions.mjs
//   node scripts/check-meta-descriptions.mjs --self-test

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Directories never crawled (deps, build output, reports, internal tooling, dotdirs).
const EXCLUDE_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results', 'coverage', 'docs',
  // internal / auth-gated tools — their indexing posture is owned elsewhere.
  'studio-hub', 'investor-portal', 'vault-member', 'vault-treasury', 'ignis-health',
]);

const IDEAL_MIN = 70;
const IDEAL_MAX = 200;
// S197: game pages are the prime conversion + social-share surface ("a shared
// link sells the studio"), and they truncate hardest in SERP/Discord/AI unfurls.
// Hold them to a tighter SERP-safe ceiling so a complete sentence always survives.
const GAME_IDEAL_MAX = 160;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      walk(full, out);
    } else if (name === 'index.html') {
      out.push(full);
    }
  }
  return out;
}

// Pure analyzer so --self-test can feed HTML strings directly.
export function analyzeHtml(html) {
  const isNoindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  // Capture the content value up to the SAME quote char that opened it, so an
  // apostrophe inside a double-quoted description (VaultSpark's) is not a false stop.
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*?content=(["'])([\s\S]*?)\1/i);
  const description = m ? m[2].trim() : null;
  return { isNoindex, hasDescription: m != null, description, length: description ? description.length : 0 };
}

export function classify(html, relPath = '') {
  const a = analyzeHtml(html);
  if (a.isNoindex) return { verdict: 'skip', reason: 'noindex' };
  if (!a.hasDescription || a.length === 0) {
    return { verdict: 'error', reason: a.hasDescription ? 'empty description' : 'no description meta' };
  }
  const isGamePage = /(^|\/)games\/[^/]+\/index\.html$/.test(relPath.replace(/\\/g, '/'));
  const max = isGamePage ? GAME_IDEAL_MAX : IDEAL_MAX;
  if (a.length < IDEAL_MIN || a.length > max) {
    return { verdict: 'warn', reason: `length ${a.length} outside ideal ${IDEAL_MIN}-${max}` };
  }
  return { verdict: 'ok' };
}

function selfTest() {
  let fail = 0;
  const ok = (cond, msg) => { if (!cond) { console.error('  ✗ ' + msg); fail++; } else { console.log('  ✓ ' + msg); } };

  const good = '<meta name="description" content="' + 'x'.repeat(120) + '" />';
  ok(classify(good).verdict === 'ok', 'good description → ok');
  ok(classify('<title>no desc</title>').verdict === 'error', 'missing description → error');
  ok(classify('<meta name="description" content="" />').verdict === 'error', 'empty description → error');
  ok(classify('<meta name="description" content="too short" />').verdict === 'warn', 'short description → warn (not error)');
  ok(classify('<meta name="robots" content="noindex, nofollow" /><title>x</title>').verdict === 'skip', 'noindex → skip even with no description');
  ok(analyzeHtml("<meta name='description' content='single quoted ok and long enough to be fine here yes'>").hasDescription, "single-quoted attr parsed");
  const apos = analyzeHtml('<meta name="description" content="IGNIS is VaultSpark\'s internal score that tracks how fast the studio learns and ships." />');
  ok(apos.length > 60, "apostrophe inside double-quoted content does not truncate (regression guard)");
  const longOne = '<meta name="description" content="' + 'y'.repeat(260) + '" />';
  ok(classify(longOne).verdict === 'warn', 'over-long description → warn (not error)');
  // S197: a 175-char description is fine for a normal page but over the tighter
  // 160 game-page ceiling — warn for games, ok elsewhere.
  const mid = '<meta name="description" content="' + 'z'.repeat(175) + '" />';
  ok(classify(mid, 'about/index.html').verdict === 'ok', '175 chars on a normal page → ok');
  ok(classify(mid, 'games/call-of-doodie/index.html').verdict === 'warn', '175 chars on a game page → warn (tighter SERP-safe ceiling)');

  if (fail) { console.error(`check-meta-descriptions --self-test: ${fail} failure(s)`); process.exit(1); }
  console.log('check-meta-descriptions --self-test: all passed');
}

function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return; }

  const pages = walk(ROOT);
  const errors = [];
  const warnings = [];
  let checked = 0;
  let skipped = 0;

  for (const file of pages) {
    let html;
    try { html = readFileSync(file, 'utf8'); } catch { continue; }
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const r = classify(html, rel);
    if (r.verdict === 'skip') { skipped++; continue; }
    checked++;
    if (r.verdict === 'error') errors.push(`${rel} — ${r.reason}`);
    else if (r.verdict === 'warn') warnings.push(`${rel} — ${r.reason}`);
  }

  for (const w of warnings) console.warn('  ⚠ ' + w);

  if (errors.length) {
    console.error(`[meta-desc] ${errors.length} indexable page(s) missing a description:`);
    for (const e of errors) console.error('  • ' + e);
    process.exit(1);
  }
  console.log(`[meta-desc] ${checked} indexable page(s) carry a description (${skipped} skipped, ${warnings.length} length warning(s))`);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
