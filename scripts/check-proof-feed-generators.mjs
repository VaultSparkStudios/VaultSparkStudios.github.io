#!/usr/bin/env node
/**
 * check-proof-feed-generators.mjs (S192 · proof-feed-generator-gate)
 *
 * S191 caught two status-proof feeds rotting because they were hand-committed
 * SEEDS (frozen generatedAt, no generator) rather than live-derived artifacts —
 * and the only guard was a console.warn nobody reads in CI. This converts that
 * lesson into a permanent gate so "seeded, not generated" becomes structurally
 * impossible for any feed bundled into the public trust manifest.
 *
 * For every non-honestDark feed in build-status-proof.mjs's FEEDS list, assert:
 *   (a) api/<key>.json exists,
 *   (b) its `generatedBy` is NOT a hand-seed marker (manual-seed: / manual- / seed:),
 *   (c) the generator it names resolves to a script on disk (WARN if not — some
 *       feeds are emitted by a CI workflow rather than a scripts/*.mjs file).
 *
 * ERROR on a missing feed or a hand-seed generatedBy (fails build:check).
 * WARN on an unresolvable generator path (advisory — workflow-emitted feeds).
 *
 * Usage:
 *   node scripts/check-proof-feed-generators.mjs
 *   node scripts/check-proof-feed-generators.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { FEEDS } from './build-status-proof.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'api');

// generatedBy values that mean "a human pasted this once" — the exact rot class.
const SEED_MARKERS = [/^manual-seed:/i, /^manual-/i, /^seed:/i, /^hand-/i, /placeholder/i];

export function isSeedMarker(generatedBy) {
  if (!generatedBy || typeof generatedBy !== 'string') return true; // missing generatedBy is itself a seed-shaped smell
  return SEED_MARKERS.some((re) => re.test(generatedBy.trim()));
}

// Pull a scripts/*.mjs path out of a generatedBy string if it names one.
export function generatorScriptOf(generatedBy) {
  if (!generatedBy || typeof generatedBy !== 'string') return null;
  const m = generatedBy.match(/scripts\/[\w./-]+\.mjs/);
  return m ? m[0] : null;
}

/**
 * Pure evaluation over an injected feed surface (for self-test).
 * feeds: [{ key, honestDarkOk }]
 * read:  (key) => ({ generatedBy } | null)   // null = feed file missing
 * resolveScript: (relpath) => boolean         // does the generator file exist
 * Returns { errors:[], warnings:[], checked }
 */
export function evaluate(feeds, read, resolveScript) {
  const errors = [];
  const warnings = [];
  let checked = 0;
  for (const feed of feeds) {
    if (feed.honestDarkOk) continue; // honest-dark feeds may legitimately be frozen
    checked++;
    const data = read(feed.key);
    if (data === null) {
      errors.push(`${feed.key}: api/${feed.key}.json is missing (a bundled proof feed must exist).`);
      continue;
    }
    const gb = data.generatedBy;
    if (isSeedMarker(gb)) {
      errors.push(`${feed.key}: generatedBy="${gb ?? '(none)'}" is a hand-seed — give it a real generator (see build-public-status.mjs / build-security-posture.mjs).`);
      continue;
    }
    const script = generatorScriptOf(gb);
    if (script && !resolveScript(script)) {
      warnings.push(`${feed.key}: generator "${script}" not found on disk (workflow-emitted feed? confirm its refresh path).`);
    }
  }
  return { errors, warnings, checked };
}

function readFeed(key) {
  try { return JSON.parse(fs.readFileSync(path.join(API, `${key}.json`), 'utf8')); } catch { return null; }
}
function scriptExists(rel) {
  try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; }
}

function assert(ok, msg) { if (!ok) { console.error('check-proof-feed-generators --self-test FAIL:', msg); process.exit(1); } }

function selfTest() {
  assert(isSeedMarker('manual-seed:/implement-S167') === true, 'manual-seed: flagged');
  assert(isSeedMarker('hand-maintained') === true, 'hand- flagged');
  assert(isSeedMarker(undefined) === true, 'missing generatedBy flagged');
  assert(isSeedMarker('scripts/build-public-status.mjs') === false, 'real generator passes');
  assert(generatorScriptOf('scripts/build-site-health.mjs') === 'scripts/build-site-health.mjs', 'extracts script path');
  assert(generatorScriptOf('a CI workflow') === null, 'no script path → null');

  const feeds = [
    { key: 'good' },
    { key: 'seeded' },
    { key: 'missing' },
    { key: 'workflow' },
    { key: 'frozen', honestDarkOk: true },
  ];
  const read = (k) => ({
    good: { generatedBy: 'scripts/build-good.mjs' },
    seeded: { generatedBy: 'manual-seed:/implement-S167' },
    missing: null,
    workflow: { generatedBy: 'scripts/build-missing.mjs' },
  }[k] ?? null);
  const resolve = (p) => p === 'scripts/build-good.mjs'; // build-missing.mjs resolves false
  const r = evaluate(feeds, read, resolve);
  assert(r.checked === 4, `honestDark skipped → 4 checked, got ${r.checked}`);
  assert(r.errors.length === 2, `seeded + missing → 2 errors, got ${r.errors.length}`);
  assert(r.errors.some((e) => e.includes('seeded')) && r.errors.some((e) => e.includes('missing')), 'both error subjects present');
  assert(r.warnings.length === 1 && r.warnings[0].includes('workflow'), 'unresolvable generator → 1 warning');
  // All-clean case.
  const clean = evaluate([{ key: 'a' }], () => ({ generatedBy: 'scripts/build-a.mjs' }), () => true);
  assert(clean.errors.length === 0 && clean.warnings.length === 0, 'all-generated → clean');

  console.log('check-proof-feed-generators --self-test: OK (12 assertions)');
}

function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return; }
  const { errors, warnings, checked } = evaluate(FEEDS, readFeed, scriptExists);
  for (const w of warnings) console.warn(`⚠ proof-feed-generators: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`✗ proof-feed-generators: ${e}`);
    console.error(`proof-feed-generators: ${errors.length} feed(s) are hand-seeds or missing — every bundled proof feed must be live-derived.`);
    process.exit(1);
  }
  console.log(`proof-feed-generators ✓ ${checked} bundled feeds are live-derived (no hand-seeds)${warnings.length ? ` · ${warnings.length} advisory` : ''}`);
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) main();
