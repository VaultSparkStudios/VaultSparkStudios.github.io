#!/usr/bin/env node
/**
 * build-public-status.mjs (S191 · trust-manifest-seed-rot-guard)
 *
 * api/public-status.json was a HAND-COMMITTED SEED stamped 2026-05-22 with a
 * 720h (30d) staleAfter in the status-proof manifest — it had no generator, so
 * it would silently cross its threshold on 2026-06-21 and drag the public
 * trustScore down while reporting a month-old "live" posture. A trust manifest
 * whose own feed rots into a false-stale signal is the opposite of trustworthy.
 *
 * This derives public-status.json from REAL public-safe feeds so every number
 * traces to a live source and generatedAt tracks reality:
 *   - reposOnline / sparked / forge / sealed  ← api/public-intelligence.json (portfolio)
 *   - activeThisWeek                          ← api/heartbeat.json (projects with pulses7d>0)
 *   - ignisHeartbeatAt                        ← api/heartbeat.json generatedAt
 *   - lastArkBroadcastAt / lastShipped        ← api/commit-map.json newest entry
 *   - lastShippedSession                      ← public-intelligence portfolio.silCategories
 *
 * DETERMINISM CONTRACT (mirrors funnel-summary / field-win): generatedAt is the
 * date of the FRESHEST source signal, NOT wall-clock — so --check re-derives
 * from the same committed feeds and byte-compares without drift.
 *
 * Usage:
 *   node scripts/build-public-status.mjs              # derive + write
 *   node scripts/build-public-status.mjs --check      # re-derive, fail on drift
 *   node scripts/build-public-status.mjs --self-test  # synthetic-fixture proof
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'api');
const OUT = path.join(API, 'public-status.json');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function dayOf(ts) {
  const t = Date.parse(ts);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

function ago(ts) {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return 'recently';
  // Coarse, source-derived label (no wall-clock): just the calendar day.
  return 'on ' + new Date(t).toISOString().slice(0, 10);
}

/**
 * Pure derivation from the three source feeds. Exported for self-test.
 * Returns the public-status manifest object.
 */
export function derive({ heartbeat, intelligence, commitMap }) {
  const portfolio = (intelligence && intelligence.portfolio) || {};
  const hbProjects = (heartbeat && heartbeat.projects) || [];
  const activeThisWeek = hbProjects.filter((p) => (p.pulses7d || 0) > 0).length;
  const newest = (commitMap && commitMap.entries && commitMap.entries[0]) || null;
  // ignisHeartbeatAt must be DETERMINISTIC: derive from the freshest activity-derived
  // project.lastActivity (a real git/pulse timestamp, stable across rebuilds), NOT
  // heartbeat.generatedAt (wall-clock — it changes every regeneration and would
  // break the --check byte-compare).
  const lastActivities = hbProjects.map((p) => p.lastActivity).filter(Boolean)
    .map((t) => Date.parse(t)).filter((n) => !Number.isNaN(n));
  const ignisHeartbeatAt = lastActivities.length
    ? new Date(Math.max(...lastActivities)).toISOString()
    : null;
  const lastShipTs = newest ? newest.ts : null;

  const reposOnline = portfolio.total ?? hbProjects.length;
  const sparked = portfolio.sparked ?? null;
  const forge = portfolio.forge ?? null;
  const sealed = portfolio.sealedCount ?? null;
  const sessionN = portfolio.silCategories && portfolio.silCategories.updatedSession;
  const lastShippedSession = sessionN ? `S${sessionN}` : null;

  // generatedAt = freshest source signal date (deterministic, not wall-clock).
  const sourceDates = [ignisHeartbeatAt, lastShipTs, intelligence && intelligence.generatedAt]
    .map(dayOf).filter(Boolean).sort();
  const generatedAt = sourceDates.length ? sourceDates[sourceDates.length - 1] : null;

  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-public-status.mjs',
    generatedAt,
    publicSafe: true,
    source: 'Derived from public feeds (public-intelligence + heartbeat + commit-map) until the Hub Worker /public-status endpoint is wired. Every value traces to a live source.',
    studio: {
      reposOnline,
      sparked,
      forge,
      sealed,
      activeThisWeek,
      lastArkBroadcastAt: lastShipTs,
      ignisHeartbeatAt,
      lastShippedSession,
    },
    nervousSystem: [
      { label: 'Repos in the studio', value: reposOnline },
      { label: 'Live (Sparked)', value: sparked },
      { label: 'In the Forge', value: forge },
      { label: 'Sealed', value: sealed },
      { label: 'Active this week', value: activeThisWeek },
      { label: 'Last shipped', value: lastShippedSession || ago(lastShipTs) },
    ],
  };
}

function build() {
  return derive({
    heartbeat: readJson(path.join(API, 'heartbeat.json')),
    intelligence: readJson(path.join(API, 'public-intelligence.json')),
    commitMap: readJson(path.join(API, 'commit-map.json')),
  });
}

function selfTest() {
  const fixture = {
    heartbeat: {
      generatedAt: '2026-06-12T04:05:56.022Z', // wall-clock — deliberately NOT used for ignisHeartbeatAt
      projects: [
        { slug: 'website', pulses7d: 6, lastActivity: '2026-06-12T01:48:41.900Z' },
        { slug: 'a', pulses7d: 0, lastActivity: '2026-06-10T00:00:00.000Z' },
        { slug: 'b', pulses7d: 2, lastActivity: '2026-06-11T00:00:00.000Z' },
      ],
    },
    intelligence: {
      generatedAt: '2026-06-12',
      portfolio: { total: 27, sparked: 3, forge: 8, sealedCount: 16, silCategories: { updatedSession: 190 } },
    },
    commitMap: { entries: [{ ts: '2026-06-12T01:28:20.000Z' }, { ts: '2026-06-11T00:00:00.000Z' }] },
  };
  const m = derive(fixture);
  assert(m.studio.reposOnline === 27, `reposOnline=27, got ${m.studio.reposOnline}`);
  assert(m.studio.activeThisWeek === 2, `activeThisWeek=2 (pulses7d>0), got ${m.studio.activeThisWeek}`);
  assert(m.studio.lastShippedSession === 'S190', `lastShipped S190, got ${m.studio.lastShippedSession}`);
  assert(m.studio.ignisHeartbeatAt === '2026-06-12T01:48:41.900Z', `ignisHeartbeatAt = freshest stable lastActivity (NOT wall-clock generatedAt), got ${m.studio.ignisHeartbeatAt}`);
  assert(m.generatedAt === '2026-06-12', `generatedAt freshest-source date, got ${m.generatedAt}`);
  assert(Array.isArray(m.nervousSystem) && m.nervousSystem.length === 6, 'nervousSystem array preserved');
  assert(m.nervousSystem.every((r) => 'label' in r && 'value' in r), 'nervousSystem rows keep {label,value}');
  // Determinism: derive is pure.
  assert(JSON.stringify(derive(fixture)) === JSON.stringify(derive(fixture)), 'derive must be deterministic');
  // Honest-empty: missing sources don't throw.
  const empty = derive({ heartbeat: null, intelligence: null, commitMap: null });
  assert(empty.generatedAt === null && empty.studio.reposOnline === 0, 'empty sources → honest nulls/0');
  console.log('build-public-status --self-test: OK (9 assertions)');
}

function assert(ok, msg) { if (!ok) { console.error('build-public-status --self-test FAIL:', msg); process.exit(1); } }

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }
  const fresh = JSON.stringify(build(), null, 2) + '\n';
  if (args.includes('--check')) {
    let committed = '';
    try { committed = fs.readFileSync(OUT, 'utf8'); } catch {}
    if (fresh !== committed) {
      console.error('build-public-status --check: api/public-status.json drifts from its source feeds.');
      console.error('  fix: node scripts/build-public-status.mjs');
      process.exit(1);
    }
    console.log('build-public-status --check: OK (public-status in sync with live feeds)');
    return;
  }
  fs.writeFileSync(OUT, fresh);
  const m = JSON.parse(fresh);
  console.log(`✓ api/public-status.json — ${m.studio.reposOnline} repos · ${m.studio.activeThisWeek} active this week · ${m.studio.lastShippedSession} · asOf ${m.generatedAt}`);
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) main();
