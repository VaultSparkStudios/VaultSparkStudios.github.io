#!/usr/bin/env node
// check-content-freshness.mjs — advisory gate: is the human-VOICE content stale?
//
// The site auto-publishes machine feeds (forge-ledger, dispatches) on every
// closeout, but the CURATED surfaces (journal essays, changelog) drift silently.
// S187 found journal frozen ~11 weeks and changelog ~8. This makes "the studio's
// voice went quiet" a CI signal instead of a thing a visitor notices first.
//
// WARN-ONLY for short drifts (a stale devlog must never block a routine deploy),
// but a surface may declare a HARD `blockDays` ceiling beyond which it BLOCKS the
// build even without --strict. S230: the public /changelog/ went 75 days stale on
// a SPARKED site — a real trust failure no warn-only signal ever stopped. The
// changelog now blocks at 60d so that class can never silently recur; the journal
// stays advisory. Pair with scripts/draft-changelog-entry.mjs to clear it.
//
//   node scripts/check-content-freshness.mjs            # warn-only + hard blockDays (build:check)
//   node scripts/check-content-freshness.mjs --strict   # exit 1 on ANY stale surface
//   node scripts/check-content-freshness.mjs --self-test
//
// Per DECISIONS (S178): exports pure; side effects gate on RUN_DIRECT.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EDITORIAL_RECEIPT = 'api/forge-editorial-freshness.json';

const SURFACES = [
  { name: 'journal', dir: 'journal', maxDays: 30 },
  // blockDays: a months-stale public changelog is a SPARKED trust failure → hard fail.
  { name: 'changelog', dir: 'changelog', maxDays: 30, blockDays: 60 },
];
const DATE_RE = /20\d\d-[01]\d-[0-3]\d/g;

// Pure: newest YYYY-MM-DD found in any *.html under dir (recursive, shallow ok).
export function newestDateIn(dir, readDir = readdirSync, readFile = readFileSync) {
  let newest = null;
  const visit = (d) => {
    let entries;
    try { entries = readDir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (e.name.endsWith('.html')) {
        let txt; try { txt = readFile(full, 'utf8'); } catch { continue; }
        const m = txt.match(DATE_RE);
        if (m) for (const ds of m) { if (!newest || ds > newest) newest = ds; }
      }
    }
  };
  visit(dir);
  return newest;
}

// Pure: classify one surface given its newest date + a reference "now".
// `blocked` is true only when the surface declares a blockDays ceiling and the
// age exceeds it — a hard failure independent of --strict.
export function classify(newest, nowMs, maxDays, blockDays = null) {
  if (!newest) return { status: 'unknown', ageDays: null, blocked: false };
  const ageDays = Math.floor((nowMs - new Date(newest + 'T00:00:00Z').getTime()) / 86400000);
  const blocked = blockDays != null && ageDays > blockDays;
  return { status: ageDays > maxDays ? 'stale' : 'fresh', ageDays, blocked };
}

export function runFreshness({ nowMs, root = '.' } = {}) {
  const results = [];
  for (const s of SURFACES) {
    const dir = join(root, s.dir);
    if (!existsSync(dir)) { results.push({ ...s, status: 'missing', ageDays: null, newest: null }); continue; }
    const newest = newestDateIn(dir);
    results.push({ ...s, newest, ...classify(newest, nowMs, s.maxDays, s.blockDays ?? null) });
  }
  return results;
}

export function readEditorialReceipt(root = '.') {
  try {
    const receipt = JSON.parse(readFileSync(join(root, EDITORIAL_RECEIPT), 'utf8'));
    return { state: receipt.state, latest: receipt.latest || null, publishable: receipt.publishable === true, nextAction: receipt.nextAction || null };
  } catch {
    return { state: 'missing', latest: null, publishable: false, nextAction: 'Run node scripts/manage-forge-editorial.mjs --draft' };
  }
}

function selfTest() {
  let pass = 0, fail = 0;
  const check = (n, c) => { c ? pass++ : (fail++, console.log('  ✗ ' + n)); };
  const now = new Date('2026-06-11T00:00:00Z').getTime();
  check('stale when old', classify('2026-03-22', now, 30).status === 'stale');
  check('fresh when recent', classify('2026-06-05', now, 30).status === 'fresh');
  check('unknown when null', classify(null, now, 30).status === 'unknown');
  check('age computed', classify('2026-06-01', now, 30).ageDays === 10);
  check('blocked when past blockDays', classify('2026-03-22', now, 30, 60).blocked === true);
  check('not blocked within blockDays', classify('2026-05-09', now, 30, 60).blocked === false);
  check('no blockDays → never blocked', classify('2024-01-01', now, 30).blocked === false);
  // newestDateIn against fake fs
  const fakeDirs = { 'j': [{ name: 'a', isDirectory: () => false, }, { name: 'b.html', isDirectory: () => false }] };
  const fakeRead = (d) => (d === 'j' ? fakeDirs.j : []);
  const fakeFile = () => 'posted 2026-04-01 and 2026-05-09 here';
  check('newest picks latest date', newestDateIn('j', fakeRead, fakeFile) === '2026-05-09');
  check('missing editorial receipt is honest', readEditorialReceipt('__missing__').state === 'missing');
  console.log(`check-content-freshness self-test: ${pass}/${pass + fail} passing`);
  return fail === 0;
}

const RUN_DIRECT = (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('check-content-freshness.mjs')));

if (RUN_DIRECT) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const ni = argv.indexOf('--now');
  const nowMs = ni >= 0 ? new Date(argv[ni + 1]).getTime() : Date.now();
  const strict = argv.includes('--strict');

  const results = runFreshness({ nowMs });
  const editorial = readEditorialReceipt();
  let anyStale = false, anyBlocked = false;
  for (const r of results) {
    const icon = r.blocked ? '⛔' : r.status === 'stale' ? '⚠' : r.status === 'fresh' ? '✓' : '∅';
    const age = r.ageDays == null ? 'no dated entry' : `${r.ageDays}d old (newest ${r.newest})`;
    console.log(`${icon}  ${r.name.padEnd(10)} ${r.status.padEnd(8)} ${age}`);
    if (r.blocked) {
      anyBlocked = true;
      console.log(`     ⛔ BLOCKING — public ${r.name} exceeds its ${r.blockDays}d trust ceiling on a SPARKED site.`);
      console.log(`        Run: node scripts/draft-changelog-entry.mjs → review the paste-ready HTML → publish to ${r.dir}/index.html.`);
    } else if (r.status === 'stale') {
      anyStale = true;
      console.log(`     → curated voice is stale. Run: node scripts/draft-weekly-forge.mjs, then review + publish.`);
    }
  }
  const editorialIcon = editorial.state === 'fresh' ? '✓' : editorial.publishable ? '◐' : '⚠';
  console.log(`${editorialIcon}  forge-edit ${editorial.state}${editorial.latest ? ` · ${editorial.latest.id} (${editorial.latest.status})` : ''}`);
  if (editorial.nextAction) console.log(`     → ${editorial.nextAction}`);
  if (anyBlocked) process.exit(1);          // hard ceiling — blocks regardless of --strict
  if (anyStale && strict) process.exit(1);
  process.exit(0); // warn-only by default
}
