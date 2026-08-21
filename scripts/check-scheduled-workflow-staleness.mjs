#!/usr/bin/env node
// @verification-scope doctor — networked GitHub Actions cadence probe.
/**
 * check-scheduled-workflow-staleness.mjs  (S222)
 *
 * THE BLINDNESS IT CLOSES: scheduled workflows fail SILENTLY. There is no PR,
 * no human watching a red check — an every-4h data-refresh or a nightly og-image
 * build can break and stay broken for MONTHS before anyone notices (S221 found
 * og-images broken since 2026-03 and refresh-live-data dead every run). A
 * push-triggered gate never covers this class because scheduled runs have no
 * pull_request to gate.
 *
 * WHAT IT DOES: a read-only doctor probe. It enumerates every workflow with an
 * `on: schedule:` trigger, asks the GitHub API for recent run conclusions, and
 * flags any scheduled workflow whose latest >=2 COMPLETED scheduled runs all
 * failed — the "red for two runs in a row" signal that a cron is dead, not just
 * flaky. Advisory (non-blocking): it surfaces in `ops doctor`, it does not gate
 * build:check (which is already at the Windows cmd.exe length ceiling).
 *
 * DEGRADES GRACEFULLY: if `gh` is unavailable or the network call fails, it
 * emits an INFO line and exits 0 — a probe that can't see CI must not false-alarm.
 *
 * Usage:
 *   node scripts/check-scheduled-workflow-staleness.mjs            # human report
 *   node scripts/check-scheduled-workflow-staleness.mjs --json     # machine output
 *   node scripts/check-scheduled-workflow-staleness.mjs --self-test # pure-logic test
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WF_DIR = join(ROOT, '.github', 'workflows');
const JSON_OUT = process.argv.includes('--json');
const SELF_TEST = process.argv.includes('--self-test');

// Conclusions that mean a run did NOT succeed (a dead cron). `cancelled` and
// `skipped` are excluded — they're intentional, not breakage. `null` conclusion
// with status != completed means still running; we only count completed runs.
const FAILED = new Set(['failure', 'timed_out', 'startup_failure', 'action_required']);
const MIN_CONSECUTIVE = 2;

/**
 * Pure, testable core.
 * @param {Array<{name:string, runs:Array<{conclusion:string,status?:string,event:string}>}>} workflows
 *   runs are most-recent-first.
 * @returns {Array<{name:string, broken:boolean, streak:number, recent:string[]}>}
 */
export function evaluateStaleness(workflows) {
  const out = [];
  for (const wf of workflows) {
    // Only completed, schedule-triggered runs count toward the streak.
    const completed = (wf.runs || []).filter(
      (r) => r.event === 'schedule' && (r.status ? r.status === 'completed' : true) && r.conclusion,
    );
    let streak = 0;
    for (const r of completed) {
      if (FAILED.has(r.conclusion)) streak += 1;
      else break; // a success breaks the failing streak
    }
    out.push({
      name: wf.name,
      broken: streak >= MIN_CONSECUTIVE,
      streak,
      recent: completed.slice(0, 3).map((r) => r.conclusion),
    });
  }
  return out;
}

// ── workflow discovery ──────────────────────────────────────────────────────
function scheduledWorkflowNames() {
  if (!existsSync(WF_DIR)) return [];
  const names = [];
  for (const file of readdirSync(WF_DIR)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const src = readFileSync(join(WF_DIR, file), 'utf8');
    if (!/^\s*schedule:/m.test(src)) continue;
    const m = src.match(/^name:\s*(.+?)\s*$/m);
    // gh keys runs by the workflow's `name:`; fall back to the filename stem.
    names.push(m ? m[1].replace(/^["']|["']$/g, '') : file.replace(/\.ya?ml$/, ''));
  }
  return names;
}

// ── live run history (single gh call, bucketed) ─────────────────────────────
function fetchRuns() {
  const res = spawnSync(
    'gh',
    ['run', 'list', '-L', '120', '--json', 'workflowName,conclusion,status,event,createdAt'],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 },
  );
  if (res.status !== 0 || !res.stdout) {
    return { ok: false, reason: (res.stderr || res.error?.message || 'gh unavailable').trim().split('\n')[0] };
  }
  try {
    return { ok: true, runs: JSON.parse(res.stdout) };
  } catch (e) {
    return { ok: false, reason: `parse error: ${e.message}` };
  }
}

function bucket(runs, names) {
  const byName = new Map(names.map((n) => [n, []]));
  for (const r of runs) {
    if (byName.has(r.workflowName)) byName.get(r.workflowName).push(r);
  }
  // gh returns newest-first already; preserve order.
  return names.map((name) => ({ name, runs: byName.get(name) || [] }));
}

function runSelfTest() {
  const verdicts = evaluateStaleness([
    { name: 'healthy-daily', runs: [
      { event: 'schedule', conclusion: 'success' },
      { event: 'schedule', conclusion: 'failure' },
    ] },
    { name: 'dead-cron', runs: [
      { event: 'schedule', conclusion: 'failure' },
      { event: 'schedule', conclusion: 'failure' },
      { event: 'schedule', conclusion: 'success' },
    ] },
    { name: 'one-off-blip', runs: [
      { event: 'schedule', conclusion: 'failure' },
      { event: 'schedule', conclusion: 'success' },
    ] },
    { name: 'ignore-manual', runs: [
      { event: 'workflow_dispatch', conclusion: 'failure' },
      { event: 'workflow_dispatch', conclusion: 'failure' },
      { event: 'schedule', conclusion: 'success' },
    ] },
    { name: 'cancelled-not-broken', runs: [
      { event: 'schedule', conclusion: 'cancelled' },
      { event: 'schedule', conclusion: 'cancelled' },
    ] },
  ]);
  const get = (n) => verdicts.find((v) => v.name === n);
  const assert = (c, m) => { if (!c) throw new Error(`self-test FAIL: ${m}`); };

  assert(get('dead-cron').broken && get('dead-cron').streak === 2, 'dead-cron must flag (2 consecutive failures)');
  assert(!get('healthy-daily').broken, 'healthy-daily (success on top) must NOT flag');
  assert(!get('one-off-blip').broken, 'single failure then success must NOT flag');
  assert(!get('ignore-manual').broken, 'manual-dispatch failures must NOT count toward scheduled streak');
  assert(!get('cancelled-not-broken').broken, 'cancelled runs are intentional, must NOT flag');
  console.log('check-scheduled-workflow-staleness self-test passed (5/5)');
}

function main() {
  const names = scheduledWorkflowNames();
  const fetched = fetchRuns();

  if (!fetched.ok) {
    const payload = { ok: true, skipped: true, reason: fetched.reason, scheduledCount: names.length };
    if (JSON_OUT) { console.log(JSON.stringify(payload)); return 0; }
    console.log(`scheduled-workflow staleness: SKIPPED (${fetched.reason}) · ${names.length} scheduled workflows known`);
    return 0; // advisory — never false-alarm when CI is unreachable
  }

  const verdicts = evaluateStaleness(bucket(fetched.runs, names));
  const broken = verdicts.filter((v) => v.broken);
  const noData = verdicts.filter((v) => !v.broken && v.recent.length === 0);

  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: broken.length === 0, broken, checked: verdicts.length, noData: noData.map((v) => v.name) }));
    return broken.length === 0 ? 0 : 1;
  }

  if (broken.length === 0) {
    console.log(`scheduled-workflow staleness ✓ (${verdicts.length} scheduled workflows, none red ≥${MIN_CONSECUTIVE} runs)`);
    return 0;
  }
  console.error(`scheduled-workflow staleness ⛔ — ${broken.length} dead cron(s) (red ≥${MIN_CONSECUTIVE} consecutive scheduled runs):`);
  for (const b of broken) console.error(`  - ${b.name}: ${b.streak} consecutive failures [${b.recent.join(', ')}]`);
  return 1;
}

if (SELF_TEST) {
  runSelfTest();
} else if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-scheduled-workflow-staleness.mjs')) {
  process.exit(main());
}
