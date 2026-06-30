#!/usr/bin/env node
/**
 * check-ci-status-dead-crons.mjs (S225)
 *
 * Reads api/ci-status.json (emitted by ci-status-beacon.yml which tracks scheduled
 * workflow staleness per the S224 ci-health-monitor pattern) and warns when any
 * scheduled workflow has gone dead.
 *
 * Advisory only — exits 0 always. A dead cron is an attention signal, not a blocker
 * (the S222 incident: refresh-live-data dead for 7 runs before anyone noticed).
 *
 * Run: node scripts/check-ci-status-dead-crons.mjs [--self-test]
 * Exit: always 0
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STATUS_FILE = path.join(ROOT, 'api', 'ci-status.json');

function check(statusJson) {
  if (!statusJson) {
    console.log('check-ci-status-dead-crons: api/ci-status.json not found — skipping (run will populate it)');
    return;
  }

  const { hasDeadCron, scheduledWorkflows = [] } = statusJson;
  if (typeof hasDeadCron !== 'boolean' || !Array.isArray(scheduledWorkflows)) {
    console.warn('check-ci-status-dead-crons: WARNING api/ci-status.json is missing the scheduled-workflow contract; run ci-status beacon');
    console.log('check-ci-status-dead-crons: WARNING scheduled-workflow contract missing');
    return;
  }
  const dead = scheduledWorkflows.filter(w => w.dead);

  if (!hasDeadCron && dead.length === 0) {
    console.log(`check-ci-status-dead-crons: ✓ ${scheduledWorkflows.length} scheduled workflow(s) healthy`);
    return;
  }

  // Advisory warning — list dead workflows with their last known state
  console.log(`check-ci-status-dead-crons: WARNING ${dead.length} scheduled workflow(s) dead`);
  console.warn(`check-ci-status-dead-crons: ⚠  DEAD CRON(S) DETECTED — ${dead.length} scheduled workflow(s) have stopped running:`);
  for (const w of dead) {
    const age = w.lastUpdatedAt
      ? ` (last run: ${w.lastUpdatedAt.slice(0, 10)})`
      : ' (never recorded)';
    console.warn(`  ✗  ${w.name}${age}`);
  }
  console.warn('  → Fix: check .github/workflows/ for the broken schedule or gitignored trigger input (S222 pattern)');
  console.warn('  → Gate: node ../vaultspark-studio-ops/scripts/ops.mjs blocker-preflight');
}

const isSelfTest = process.argv.includes('--self-test');

if (isSelfTest) {
  let pass = 0;
  let fail = 0;
  const assert = (ok, label) => { if (ok) { pass++; } else { fail++; console.error('FAIL: ' + label); } };

  // Case 1: missing file → advisory, no crash
  let threw = false;
  try { check(null); } catch (e) { threw = true; }
  assert(!threw, 'case-1: missing file → no crash');

  // Case 2: all healthy
  let warned = false;
  const origWarn = console.warn;
  console.warn = () => { warned = true; };
  check({ hasDeadCron: false, scheduledWorkflows: [{ name: 'my-cron', dead: false }] });
  console.warn = origWarn;
  assert(!warned, 'case-2: healthy → no warning');

  // Case 3: one dead cron
  warned = false;
  const lines = [];
  console.warn = (l) => { warned = true; lines.push(l || ''); };
  check({ hasDeadCron: true, scheduledWorkflows: [{ name: 'my-dead-cron', dead: true, lastUpdatedAt: '2026-06-01T00:00:00Z' }, { name: 'ok-cron', dead: false }] });
  console.warn = origWarn;
  assert(warned, 'case-3: dead cron → warning emitted');
  assert(lines.some(l => l.includes('my-dead-cron')), 'case-3: dead cron name in warning');
  assert(lines.some(l => l.includes('2026-06-01')), 'case-3: last run date in warning');

  console.log(`Self-test: ${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

// Live check
let statusJson = null;
if (existsSync(STATUS_FILE)) {
  try {
    statusJson = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
  } catch (err) {
    console.warn(`check-ci-status-dead-crons: WARNING api/ci-status.json is malformed (${err.message})`);
    console.log('check-ci-status-dead-crons: WARNING malformed api/ci-status.json');
    process.exit(0);
  }
}
check(statusJson);
