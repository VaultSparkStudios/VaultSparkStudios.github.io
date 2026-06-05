#!/usr/bin/env node
/**
 * sample-prod-perf.mjs (S172 audit #10 · closeout-prod-perf-sample)
 *
 * One gated production perf sample per closeout, rotating through key routes,
 * so perf history accrues continuously instead of in audit bursts. The S154
 * carry designed this; S172 ships it. 43 (route × profile) groups currently
 * sit "insufficient" in check-perf-budget — this fills them one closeout at
 * a time, and gives the S172 forensic correlator tighter regression windows.
 *
 * Gates (any failure → silent skip, exit 0 — closeout must never block on this):
 *   1. disk headroom  (check-disk-headroom.mjs)
 *   2. deploy parity  (check-deploy-parity.mjs — only sample what's actually live)
 *
 * Rotation state: .cache/prod-perf-rotation.json (next route index).
 * Output trace: docs/PERF_TRACE_PROD_AUTO_<date>.json → ingested into
 * data/perf-history.ndjson by append-perf-history.mjs.
 *
 * Usage:
 *   node scripts/sample-prod-perf.mjs           # gated sample (closeout step)
 *   node scripts/sample-prod-perf.mjs --force   # skip gates (manual runs)
 *   node scripts/sample-prod-perf.mjs --dry-run # show what would run
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY = args.includes('--dry-run');

const ROUTES = ['/', '/membership/', '/studio-pulse/', '/games/', '/projects/'];
const STATE_PATH = path.join(ROOT, '.cache', 'prod-perf-rotation.json');

function run(script, scriptArgs = [], opts = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...scriptArgs], {
    cwd: ROOT, encoding: 'utf8', timeout: opts.timeout || 60000,
  });
}

// Gate 1 — disk headroom
if (!FORCE) {
  const disk = run('check-disk-headroom.mjs');
  if (disk.status !== 0) {
    console.log('sample-prod-perf: skipped (disk headroom gate)');
    process.exit(0);
  }
  // Gate 2 — deploy parity (sample only what is actually live)
  const parity = run('check-deploy-parity.mjs', ['--local'], { timeout: 120000 });
  if (parity.status !== 0) {
    console.log('sample-prod-perf: skipped (deploy parity gate — local != production)');
    process.exit(0);
  }
}

// Rotation
let state = { index: 0 };
try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch {}
const route = ROUTES[(state.index || 0) % ROUTES.length];
const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const out = `docs/PERF_TRACE_PROD_AUTO_${date}.json`;

const measureArgs = [
  '--check', '--base=https://vaultsparkstudios.com', '--allow-external',
  `--routes=${route}`, '--profiles=desktop:1366x900:dark:2400',
  `--out=${out}`, '--batch-size=1', '--min-disk-mb=256',
  '--wait-until=domcontentloaded', '--observe-ms=2500',
];

if (DRY) {
  console.log(`sample-prod-perf (dry-run): route ${route} → ${out}`);
  process.exit(0);
}

console.log(`sample-prod-perf: sampling ${route} (rotation ${(state.index || 0) % ROUTES.length + 1}/${ROUTES.length})`);
const measure = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'measure-page-performance.mjs'), ...measureArgs], {
  cwd: ROOT, encoding: 'utf8', stdio: 'inherit', timeout: 300000,
});

// Advance rotation regardless of outcome so one flaky route can't wedge the cycle
fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
fs.writeFileSync(STATE_PATH, JSON.stringify({ index: ((state.index || 0) + 1) % ROUTES.length, lastRoute: route, lastRun: new Date().toISOString() }));

if (measure.status !== 0) {
  console.log('sample-prod-perf: trace failed (non-fatal — closeout continues)');
  process.exit(0);
}

// Ingest into perf history
const ingest = run('append-perf-history.mjs', [], { timeout: 60000 });
console.log(ingest.stdout?.trim() || '');
console.log(`sample-prod-perf: done — ${route} appended to perf history`);
process.exit(0);
