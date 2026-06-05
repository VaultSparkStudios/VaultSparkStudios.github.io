#!/usr/bin/env node
/**
 * check-orphan-assets.mjs (S163 audit #5 · dead-asset-sweep)
 *
 * Subtraction compounds on a 163-session codebase. This detector builds a
 * reference graph over the repo and lists assets/*.js + scripts/*.mjs that
 * NOTHING references — candidates for deletion.
 *
 * A file is "referenced" if its basename appears anywhere in the corpus other
 * than itself:
 *   • every *.html page (direct <script src> + inline refs)
 *   • every scripts/*.mjs (import / spawn / exec / npm-script string)
 *   • package.json (npm script bodies)
 *   • sw.js (STATIC_ASSETS precache list)
 *   • assets/ambient.bundle.js + scripts/build-ambient-bundle.mjs
 *     (bundled sources are listed by path in AMBIENT_SOURCES and the built bundle)
 *   • cloudflare/*.js + config/*
 *
 * Build artifacts (shell-hashed copies, the built ambient bundle) are excluded
 * as candidates — they are outputs, not sources.
 *
 * Report-only by default (advisory). `--strict` exits 1 if any orphan is found
 * — wire that in only after a clean baseline, since cross-repo (studio-ops)
 * callers can produce false positives that need manual confirmation first.
 *
 * Usage:
 *   node scripts/check-orphan-assets.mjs            # report (exit 0)
 *   node scripts/check-orphan-assets.mjs --strict    # exit 1 on any orphan
 *   node scripts/check-orphan-assets.mjs --json
 *   node scripts/check-orphan-assets.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_MODE = args.includes('--json');
const SELF_TEST = args.includes('--self-test');

const SKIP_DIRS = new Set(['node_modules', '.git', 'test-results', '.cache', 'handoffs', 'audits', 'logs']);
// Build artifacts: never flagged as orphans (they're outputs).
const ARTIFACT = /(\.shell-[0-9a-f]+\.(js|css)$)|(^ambient\.bundle\.js$)|(\.min\.js$)/;
// Self-contained or convention-loaded files that look unreferenced but aren't.
const ALLOW_ABSENT = new Set([
  'sw.js', // service worker — registered by name in inline bootstraps, path-vary safe
  // S172 membership-orphan-dossier: cross-project membership SDK with EXTERNAL
  // consumers (PromoGrind loads /vault-sdk.js). This repo's reference graph
  // can't see sibling repos — deleting it would break them in production.
  // Provenance: docs/MEMBERSHIP_ORPHAN_DOSSIER_S172.md
  'vault-sdk.js',
]);

/**
 * Pure: is `basename` referenced anywhere in `corpus` (already excludes self)?
 * Matches the full basename OR the extension-less stem, because dynamic loaders
 * often build the path at runtime (`load('/assets/' + name + '.js')`). Matching
 * the stem biases toward FALSE = "treat as referenced", the safe direction for a
 * deletion tool — better to under-report orphans than to delete a live file.
 */
function isReferenced(basename, corpus) {
  if (corpus.includes(basename)) return true;
  const stem = basename.replace(/\.(js|mjs)$/, '');
  // Require the stem to appear as a quoted/pathy token, not as a bare substring,
  // to avoid matching unrelated prose.
  return new RegExp(`["'\\/]${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\\.\\/]`).test(corpus);
}

function walk(dir, acc, exts) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const ent of ents) {
    if (ent.name.startsWith('.') && ent.name !== '.well-known') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, acc, exts);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      acc.push(full);
    }
  }
  return acc;
}

if (SELF_TEST) {
  const corpus = '<script src="/assets/used.js"></script> import("./helper.mjs"); ambient: assets/bundled.js';
  const cases = [
    ['referenced html script found', isReferenced('used.js', corpus) === true],
    ['referenced mjs import found', isReferenced('helper.mjs', corpus) === true],
    ['bundled asset found', isReferenced('bundled.js', corpus) === true],
    ['unreferenced file not found', isReferenced('ghost.js', corpus) === false],
    ['artifact regex matches shell hash', ARTIFACT.test('ambient.shell-29f2107b41.js') === true],
    ['artifact regex matches built bundle', ARTIFACT.test('ambient.bundle.js') === true],
    ['artifact regex spares a normal asset', ARTIFACT.test('rum-beacon.js') === false],
  ];
  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

// 1. Candidates: assets/*.js + scripts/*.mjs (non-artifact).
const candidates = [
  ...walk(path.join(ROOT, 'assets'), [], ['.js']),
  ...walk(path.join(ROOT, 'scripts'), [], ['.mjs']),
].filter((f) => !ARTIFACT.test(path.basename(f)) && !ALLOW_ABSENT.has(path.basename(f)));

// 2. Corpus: everything that could reference a candidate. CRITICAL: include all
// assets/*.js so asset→asset dynamic loads (idle-loaders, projectors building a
// path at runtime) are captured — omitting them produces false orphans.
const corpusFiles = [
  ...walk(ROOT, [], ['.html']),
  ...walk(path.join(ROOT, 'assets'), [], ['.js']),
  ...walk(path.join(ROOT, 'scripts'), [], ['.mjs']),
  ...walk(path.join(ROOT, 'cloudflare'), [], ['.js']),
  ...walk(path.join(ROOT, 'config'), [], ['.mjs', '.js', '.json']),
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'sw.js'),
].filter((f) => fs.existsSync(f));

// Per-file content keyed by absolute path, so a candidate can exclude its own file.
const fileText = new Map();
for (const f of corpusFiles) {
  try { fileText.set(f, fs.readFileSync(f, 'utf8')); } catch { /* skip unreadable */ }
}

const orphans = [];
for (const cand of candidates) {
  const base = path.basename(cand);
  let referenced = false;
  for (const [f, text] of fileText) {
    if (f === cand) continue; // a file referencing its own name doesn't count
    if (isReferenced(base, text)) { referenced = true; break; }
  }
  if (!referenced) orphans.push(path.relative(ROOT, cand).replace(/\\/g, '/'));
}
orphans.sort();
// Browser-shipped assets are the reliable signal — dead asset/*.js is weight
// shipped to real visitors. scripts/*.mjs are often manual one-shot tools or
// invoked cross-repo by studio-ops (ops.mjs), which this repo's corpus can't
// see, so script "orphans" are advisory only and never gate --strict.
const assetOrphans = orphans.filter((o) => o.startsWith('assets/'));
const scriptOrphans = orphans.filter((o) => o.startsWith('scripts/'));

if (JSON_MODE) {
  console.log(JSON.stringify({ candidates: candidates.length, assetOrphans, scriptOrphans }, null, 2));
  process.exit(STRICT && assetOrphans.length ? 1 : 0);
}

console.log('check-orphan-assets');
console.log('──────────────────────────────────────────────');
console.log(`  Candidates scanned: ${candidates.length} (assets/*.js + scripts/*.mjs)`);
console.log(`  Corpus files:       ${fileText.size}`);
console.log(`  Asset orphans:      ${assetOrphans.length}  (browser-shipped — actionable)`);
console.log(`  Script orphans:     ${scriptOrphans.length}  (advisory — may be manual/cross-repo tools)`);
if (assetOrphans.length) {
  console.log('\n  Browser assets with zero inbound references:');
  for (const o of assetOrphans) console.log(`  • ${o}`);
  console.log('\n  Confirm against git history before deleting; feature-bearing client code');
  console.log('  (membership/portal) needs founder confirmation per SOUL non-negotiable #2.');
}
if (STRICT && assetOrphans.length) {
  console.error(`\n✗ ${assetOrphans.length} browser asset(s) orphaned`);
  process.exit(1);
}
console.log(assetOrphans.length ? '\n(advisory mode — not blocking)' : '\n✓ no orphaned browser assets');
