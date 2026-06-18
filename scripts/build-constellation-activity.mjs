#!/usr/bin/env node
/* build-constellation-activity.mjs — S206 audit item #10 (constellation-public-feed)
   Aggregates constellation unlock events from data/rum-ux-history.ndjson and
   produces api/constellation-activity.json for the public community feed.

   honestDark=true when totalUnlocks < 3 (insufficient data for community display).
   Wired into build + check-proof-surface as advisory.

   Exit codes: 0 = ok, 1 = error */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

// ── Self-test ──────────────────────────────────────────────────────────────
if (SELF_TEST) {
  let passed = 0;
  function assert(cond, msg) {
    if (!cond) { console.error('✗ ' + msg); process.exit(1); }
    console.log('  ✓ ' + msg);
    passed++;
  }

  // T1: honestDark when totalUnlocks < 3
  const t1 = buildActivity([], []);
  assert(t1.honestDark === true, 'T1: honestDark=true when 0 unlocks');

  // T2: honestDark=false when >= 3 unlocks
  const events = [
    { event: 'constellation:unlock:forge-path', count: 3 },
  ];
  const constellations = [{ id: 'forge-path', name: 'The Forge Path', badge: '⚡' }];
  const t2 = buildActivity(events, constellations);
  assert(t2.honestDark === false, 'T2: honestDark=false when totalUnlocks=3');

  // T3: unlocks aggregated per constellation
  const events3 = [
    { event: 'constellation:unlock:forge-path', count: 5 },
    { event: 'constellation:unlock:signal-seeker', count: 2 },
    { event: 'membership:momentum_strip_shown', count: 99 }, // noise — ignored
  ];
  const constellations3 = [
    { id: 'forge-path', name: 'The Forge Path', badge: '⚡' },
    { id: 'signal-seeker', name: 'Signal Seeker', badge: '📡' },
  ];
  const t3 = buildActivity(events3, constellations3);
  assert(t3.totalUnlocks === 7, 'T3: totalUnlocks counts only unlock events');
  assert(t3.challenges.length === 2, 'T3: 2 challenges with unlock data');

  // T4: schemaVersion present
  assert(t3.schemaVersion === '1.0', 'T4: schemaVersion is 1.0');

  console.log('build-constellation-activity --self-test: ' + passed + '/4 passed');
  process.exit(0);
}

// ── Core builder ───────────────────────────────────────────────────────────
function buildActivity(rumEvents, constellations) {
  const unlockPrefix = 'constellation:unlock:';
  const unlockCounts = {};

  for (const e of rumEvents) {
    if (typeof e.event === 'string' && e.event.startsWith(unlockPrefix)) {
      const id = e.event.slice(unlockPrefix.length);
      unlockCounts[id] = (unlockCounts[id] || 0) + (Number(e.count) || 0);
    }
  }

  const totalUnlocks = Object.values(unlockCounts).reduce((s, n) => s + n, 0);

  const challenges = constellations
    .map(c => ({
      id: c.id,
      name: c.name,
      badge: c.badge,
      unlocks: unlockCounts[c.id] || 0,
    }))
    .filter(c => c.unlocks > 0)
    .sort((a, b) => b.unlocks - a.unlocks);

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString().slice(0, 10),
    totalUnlocks,
    challenges,
    honestDark: totalUnlocks < 3,
  };
}

// ── Load data ──────────────────────────────────────────────────────────────
function loadRumEvents() {
  const p = path.join(ROOT, 'data/rum-ux-history.ndjson');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split('\n').filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch (_) { return null; } })
    .filter(Boolean);
}

function loadConstellations() {
  const p = path.join(ROOT, 'data/constellations.json');
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (_) { return []; }
}

// ── Main ───────────────────────────────────────────────────────────────────
const rumEvents = loadRumEvents();
const constellations = loadConstellations();
const out = buildActivity(rumEvents, constellations);

const outPath = path.join(ROOT, 'api/constellation-activity.json');

if (CHECK) {
  if (!existsSync(outPath)) {
    console.error('build-constellation-activity --check: api/constellation-activity.json missing (run without --check to generate)');
    process.exit(1);
  }
  const existing = JSON.parse(readFileSync(outPath, 'utf8'));
  if (existing.schemaVersion !== '1.0') {
    console.error('build-constellation-activity --check: schema version mismatch');
    process.exit(1);
  }
  console.log('build-constellation-activity --check: ok · totalUnlocks=' + existing.totalUnlocks + ' · honestDark=' + existing.honestDark + ' · challenges=' + existing.challenges.length);
  process.exit(0);
}

writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('build-constellation-activity → api/constellation-activity.json (totalUnlocks=' + out.totalUnlocks + ' honestDark=' + out.honestDark + ' challenges=' + out.challenges.length + ')');
