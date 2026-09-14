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

// ── S341: the window this probe was actually looking through ────────────────
// The original fetch asked for the repo's last 120 runs ACROSS ALL WORKFLOWS and
// then filtered to the scheduled ones. Measured live on 2026-09-03, those 120
// runs spanned 4.6 HOURS — push-triggered work dominates them (33
// pages-build-deployment, 18 CI Status Beacon, 9 Cloudflare Pages Deploy). Of
// the 14 scheduled workflows the probe reported checking, 11 came back with zero
// rows, and `noData` was classified as `!broken` — so a probe built to catch a
// dead cron was blind to precisely the crons most able to die unnoticed, and
// reported them fine. A daily, weekly or monthly cron CANNOT appear in a 4.6-hour
// window; a monthly digest could be dead for a quarter with this green throughout.
//
// A fixed-size scan window goes blind as churn grows. The fix is to give each
// cron its own bounded window (one query per workflow) and to judge it against
// its OWN cadence — plus a second verdict the probe never had: a cron that is not
// failing because it is not RUNNING. GitHub disables schedules on inactive repos,
// a cron edit can silently stop matching, and neither produces a failed run.
const RUNS_PER_WORKFLOW = 10;
const MAX_SILENT_HOURS = 45 * 24; // never wait longer than GitHub's own 60-day disable

/** Approximate a 5-field cron's interval in hours. Coarse on purpose: it decides
 *  a staleness threshold, not a schedule. */
export function cronIntervalHours(expr) {
  const f = String(expr).trim().split(/\s+/);
  if (f.length < 5) return 24;
  const [min, hour, dom, , dow] = f;
  let m;
  if ((m = /^\*\/(\d+)$/.exec(min))) return Math.max(Number(m[1]), 1) / 60;
  if ((m = /^\*\/(\d+)$/.exec(hour))) return Math.max(Number(m[1]), 1);
  if (min.includes(',')) return 24 / (min.split(',').length || 1);
  if (hour.includes(',')) return 24 / (hour.split(',').length || 1);
  if (dom !== '*') return 24 * 30;   // monthly
  if (dow !== '*') return 24 * 7;    // weekly
  return 24;                          // daily
}

/** Tolerate two missed cycles before calling a cron silent, capped so a monthly
 *  job cannot hide behind its own cadence past GitHub's auto-disable window. */
export function silentThresholdHours(intervalHours) {
  return Math.min(Math.max(intervalHours * 3, 2), MAX_SILENT_HOURS);
}

/**
 * Pure, testable core.
 * @param {Array<{name:string, runs:Array<{conclusion:string,status?:string,event:string}>}>} workflows
 *   runs are most-recent-first.
 * @returns {Array<{name:string, broken:boolean, streak:number, recent:string[]}>}
 */
export function evaluateStaleness(workflows, now = Date.now()) {
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
    // A cron that is not failing may simply not be RUNNING. That is a distinct
    // verdict and the one the old whole-repo window could never reach: with no
    // rows at all it recorded `noData` and counted it as healthy.
    const newest = completed[0]?.createdAt ? Date.parse(completed[0].createdAt) : null;
    const ageHours = newest == null ? null : (now - newest) / 36e5;
    const interval = wf.intervalHours ?? 24;
    const threshold = silentThresholdHours(interval);
    const broken = streak >= MIN_CONSECUTIVE;

    out.push({
      name: wf.name,
      broken,
      streak,
      recent: completed.slice(0, 3).map((r) => r.conclusion),
      intervalHours: interval,
      ageHours: ageHours == null ? null : Math.round(ageHours * 10) / 10,
      // Never observed at all: honestly unmeasured, never folded into "healthy".
      unmeasured: completed.length === 0,
      silent: !broken && ageHours != null && ageHours > threshold,
      silentThresholdHours: Math.round(threshold),
    });
  }
  return out;
}

// ── workflow discovery ──────────────────────────────────────────────────────
/**
 * S355: a scheduled publisher can PRESERVE instead of publishing and still conclude
 * success. Vault Narrative did that for 13 days (S353). Since S353 it emits a
 * `::warning title=Vault narrative held::` annotation when it holds, so a held run is
 * observable: a warning-level annotation whose title says "held" on the newest
 * completed scheduled run that concluded success. Runtime warnings such as the
 * Node 20 deprecation notice carry an empty title and never match.
 *
 * Advisory by design: held is reported by name but never changes `ok` or the exit
 * code, which scripts/lib/scheduled-probe-result.mjs pins as broken + silent only.
 */
export function isHeldAnnotation(annotation) {
  return Boolean(annotation) && annotation.annotation_level === 'warning' && /held/i.test(String(annotation.title || ''));
}

const HELD_MARKER = 'held::';
/** True when the workflow, or a script it runs directly, can emit a held annotation. */
export function canEmitHeldMarker(workflowSource, readScript = (rel) => readFileSync(join(ROOT, rel), 'utf8')) {
  const src = String(workflowSource || '');
  if (src.includes('title=') && src.includes(HELD_MARKER)) return true;
  const scripts = new Set();
  for (const line of src.split('\n')) {
    const code = line.split(' #')[0];
    if (code.trim().startsWith('#')) continue;
    let at = code.indexOf('node scripts/');
    while (at >= 0) {
      const rest = code.slice(at + 'node '.length);
      const end = rest.search(/[\s"'`;|&]/);
      scripts.add(end < 0 ? rest : rest.slice(0, end));
      at = code.indexOf('node scripts/', at + 1);
    }
  }
  for (const rel of scripts) {
    // The observer is not an emitter: this probe's own comments and fixtures quote the marker.
    if (rel.endsWith('check-scheduled-workflow-staleness.mjs')) continue;
    let body = '';
    try { body = readScript(rel); } catch { continue; }
    if (body.includes('title=') && body.includes(HELD_MARKER)) return true;
  }
  return false;
}

export function heldVerdicts(observed, annotationsFor, { now = Date.now, budgetMs = 12000 } = {}) {
  const deadline = now() + budgetMs;
  const held = [];
  let unmeasured = 0;
  for (const wf of observed) {
    const newest = (wf.runs || []).find(
      (r) => r.event === 'schedule' && (r.status ? r.status === 'completed' : true) && r.conclusion,
    );
    if (wf.emitsHeldMarker === false) continue;
    if (!newest || newest.conclusion !== 'success' || !newest.databaseId) continue;
    if (now() >= deadline) { unmeasured += 1; continue; }
    const result = annotationsFor(newest.databaseId, Math.max(1000, Math.floor(deadline - now())));
    if (!result || !result.ok) { unmeasured += 1; continue; }
    const marker = (result.annotations || []).find(isHeldAnnotation);
    if (marker) held.push({ name: wf.name, runId: newest.databaseId, title: String(marker.title) });
  }
  return { held, unmeasured };
}

function fetchRunAnnotations(runId, timeout = 8000) {
  const opts = { cwd: ROOT, encoding: 'utf8', timeout };
  const jobs = spawnSync('gh', ['api', `repos/{owner}/{repo}/actions/runs/${runId}/jobs`, '--jq', '[.jobs[].id]'], opts);
  if (jobs.status !== 0 || !jobs.stdout) return { ok: false };
  let ids;
  try { ids = JSON.parse(jobs.stdout); } catch { return { ok: false }; }
  if (!Array.isArray(ids)) return { ok: false };
  const annotations = [];
  for (const id of ids) {
    const res = spawnSync('gh', ['api', `repos/{owner}/{repo}/check-runs/${id}/annotations`], opts);
    if (res.status !== 0 || !res.stdout) return { ok: false };
    try { annotations.push(...JSON.parse(res.stdout)); } catch { return { ok: false }; }
  }
  return { ok: true, annotations };
}

function scheduledWorkflows() {
  if (!existsSync(WF_DIR)) return [];
  const out = [];
  for (const file of readdirSync(WF_DIR)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const src = readFileSync(join(WF_DIR, file), 'utf8');
    if (!/^\s*schedule:/m.test(src)) continue;
    const m = src.match(/^name:\s*(.+?)\s*$/m);
    const crons = [...src.matchAll(/^\s*-\s*cron:\s*['"]?([^'"\n]+?)['"]?\s*$/gm)].map((c) => c[1]);
    // The FASTEST schedule sets the expectation: a workflow with both a daily and
    // an hourly trigger is late the moment the hourly one stops.
    const intervalHours = crons.length ? Math.min(...crons.map(cronIntervalHours)) : 24;
    out.push({
      file,
      // gh keys runs by the workflow's `name:`; the FILE is the stable query key.
      name: m ? m[1].replace(/^["']|["']$/g, '') : file.replace(/\.ya?ml$/, ''),
      intervalHours,
      emitsHeldMarker: canEmitHeldMarker(src),
    });
  }
  return out;
}

// ── live run history — one bounded window PER WORKFLOW ──────────────────────
// One query per cron instead of one shared window over the whole repo. Slightly
// more calls, but each cron's window is set by its own history rather than by how
// busy the repo happened to be, which is the property that failed.
function fetchRunsFor(wf, timeout = 24000) {
  const res = spawnSync(
    'gh',
    ['run', 'list', '--workflow', wf.file, '-L', String(RUNS_PER_WORKFLOW),
     '--json', 'databaseId,conclusion,status,event,createdAt'],
    { cwd: ROOT, encoding: 'utf8', timeout },
  );
  if (res.status !== 0 || !res.stdout) {
    return { ok: false, reason: (res.stderr || res.error?.message || 'gh unavailable').trim().split('\n')[0] };
  }
  try {
    const runs = JSON.parse(res.stdout);
    if (!Array.isArray(runs)) throw new Error('workflow runs must be an array');
    return { ok: true, runs };
  } catch (e) {
    return { ok: false, reason: `parse error: ${e.message}` };
  }
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

  // ── S341: cadence + silence ───────────────────────────────────────────────
  assert(Math.abs(cronIntervalHours('*/30 * * * *') - 0.5) < 1e-9, '*/30 minutes → 0.5h');
  assert(cronIntervalHours('0 */4 * * *') === 4, 'every 4 hours → 4h');
  assert(cronIntervalHours('0 9 * * *') === 24, 'daily → 24h');
  assert(cronIntervalHours('0 9 * * 1') === 24 * 7, 'weekly (day-of-week set) → 168h');
  assert(cronIntervalHours('0 9 1 * *') === 24 * 30, 'monthly (day-of-month set) → 720h');
  assert(cronIntervalHours('nonsense') === 24, 'an unparseable cron falls back to daily, never to zero');
  assert(silentThresholdHours(24 * 30) <= MAX_SILENT_HOURS,
    'a monthly cron cannot hide behind its own cadence past the 45-day cap');

  const NOW = Date.parse('2026-09-03T00:00:00Z');
  const at = (hoursAgo) => new Date(NOW - hoursAgo * 36e5).toISOString();
  const cadence = evaluateStaleness([
    // The exact class the old whole-repo window could not see: a daily cron that
    // has not run for three days is not failing, it has stopped.
    { name: 'silent-daily', intervalHours: 24, runs: [{ event: 'schedule', conclusion: 'success', createdAt: at(80) }] },
    { name: 'fresh-daily',  intervalHours: 24, runs: [{ event: 'schedule', conclusion: 'success', createdAt: at(5) }] },
    // A monthly digest 40 days quiet is inside 3× cadence but must still flag,
    // because GitHub disables schedules at 60 days of inactivity.
    { name: 'quiet-monthly', intervalHours: 24 * 30, runs: [{ event: 'schedule', conclusion: 'success', createdAt: at(46 * 24) }] },
    { name: 'never-observed', intervalHours: 24, runs: [] },
    // Silence is only reported when the cron is not already red: a dead cron is
    // reported once, as dead, not twice.
    { name: 'dead-and-old', intervalHours: 24, runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(100) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(124) },
    ] },
  ], NOW);
  const c = (n) => cadence.find((v) => v.name === n);
  assert(c('silent-daily').silent, 'a daily cron silent for 80h must flag as silent');
  assert(!c('fresh-daily').silent, 'a daily cron that ran 5h ago must NOT flag');
  assert(c('quiet-monthly').silent, 'a monthly cron quiet for 46 days must flag despite its cadence');
  assert(c('never-observed').unmeasured && !c('never-observed').silent,
    'a never-observed cron is unmeasured — neither silent nor healthy');
  assert(c('dead-and-old').broken && !c('dead-and-old').silent, 'a dead cron is reported as dead, not also as silent');

  // S345 — the silent verdict is exercised HERE and, as of this session, nowhere
  // else: the live repo reports silent: 0. These fixtures are therefore the only
  // proof the detector works, which is exactly why the run now declares that.
  assert(c('silent-daily').silent && !c('silent-daily').broken,
    'the silent verdict is fixture-proven: a silent cron is silent and not broken');

  // ── S355: held publishers (advisory) ─────────────────────────────────────
  const heldRun = { event: 'schedule', status: 'completed', conclusion: 'success', databaseId: 101 };
  const annotations = {
    101: { ok: true, annotations: [{ annotation_level: 'warning', title: 'Vault narrative held', message: 'kept previous' }] },
    102: { ok: true, annotations: [{ annotation_level: 'warning', title: '', message: 'Node.js 20 is deprecated' }] },
    103: { ok: false },
  };
  const heldResult = heldVerdicts([
    { name: 'held-publisher', runs: [heldRun] },
    { name: 'runtime-warning-only', runs: [{ ...heldRun, databaseId: 102 }] },
    { name: 'annotations-unreadable', runs: [{ ...heldRun, databaseId: 103 }] },
    { name: 'failed-newest', runs: [{ ...heldRun, databaseId: 101, conclusion: 'failure' }] },
  ], (id) => annotations[id]);
  assert(heldResult.held.length === 1 && heldResult.held[0].name === 'held-publisher' && heldResult.held[0].runId === 101,
    'a success run with a warning titled "held" is reported as held, by name and run');
  assert(!heldResult.held.some((h) => h.name === 'runtime-warning-only'),
    'an untitled runtime warning (Node 20 deprecation) is not a held marker');
  assert(heldResult.unmeasured === 1 && !heldResult.held.some((h) => h.name === 'annotations-unreadable'),
    'unreadable annotations are counted unmeasured, never held');
  assert(!heldResult.held.some((h) => h.name === 'failed-newest'),
    'a failed newest run is the broken verdict\'s business, not held');
  let clock = 0;
  const exhausted = heldVerdicts([{ name: 'late', runs: [heldRun] }], () => { throw new Error('must not fetch'); },
    { now: () => clock, budgetMs: 0 });
  assert(exhausted.unmeasured === 1 && exhausted.held.length === 0, 'an exhausted budget skips fetching and counts unmeasured');

  const skipped = heldVerdicts([{ name: 'cannot-hold', emitsHeldMarker: false, runs: [heldRun] }],
    () => { throw new Error('must not fetch a workflow that cannot emit a held marker'); });
  assert(skipped.held.length === 0 && skipped.unmeasured === 0, 'a workflow that cannot emit a held marker is skipped, not unmeasured');
  assert(canEmitHeldMarker('run: node scripts/fx.mjs', () => 'console.log("::warning title=Fx held::kept")'),
    'a workflow whose script emits a titled held annotation can hold');
  assert(!canEmitHeldMarker('run: node scripts/fx.mjs', () => 'console.log("plain output")'),
    'a workflow whose scripts never emit a held marker cannot hold');
  assert(!canEmitHeldMarker('run: node scripts/check-scheduled-workflow-staleness.mjs --json'),
    'a workflow that only runs this probe cannot hold (the probe quotes the marker, it does not emit it)');
  const narrative = join(ROOT, '.github', 'workflows', 'vault-narrative.yml');
  assert(!existsSync(narrative) || canEmitHeldMarker(readFileSync(narrative, 'utf8')),
    'the live Vault Narrative workflow is recognised as able to hold');

  console.log('check-scheduled-workflow-staleness self-test passed (28/28)');
}

export function collectWorkflowObservations(workflows, { fetch = fetchRunsFor, now = Date.now, budgetMs = 24000 } = {}) {
  const deadline = now() + budgetMs;
  const observed = [];
  const unreachableWorkflows = [];
  let firstFailure = null;
  let timedOut = false;
  for (const wf of workflows) {
    const remaining = Math.floor(deadline - now());
    if (remaining <= 0) {
      timedOut = true;
      firstFailure ??= 'total observation deadline exhausted';
      unreachableWorkflows.push(wf.name);
      continue;
    }
    const fetched = fetch(wf, remaining);
    if (!fetched.ok) {
      firstFailure ??= fetched.reason;
      unreachableWorkflows.push(wf.name);
    } else {
      observed.push({ ...wf, runs: fetched.runs });
    }
  }
  timedOut ||= now() >= deadline;
  return { observed, unreachableWorkflows, firstFailure, timedOut };
}

function main() {
  const workflows = scheduledWorkflows();
  const { observed, firstFailure, unreachableWorkflows, timedOut } = collectWorkflowObservations(workflows);

  // Only a TOTAL inability to reach CI is a skip. A partial read is reported as
  // what it is, with the unreachable workflows named — not quietly rounded up.
  if (!observed.length) {
    const reason = firstFailure || 'gh unavailable';
    const payload = { ok: true, skipped: true, reason, scheduledCount: workflows.length, unreachableWorkflows, timedOut };
    if (JSON_OUT) { console.log(JSON.stringify(payload)); return 0; }
    console.log(`scheduled-workflow staleness: SKIPPED (${reason}) · ${workflows.length} scheduled workflows known`);
    return 0; // advisory — never false-alarm when CI is unreachable
  }

  const verdicts = evaluateStaleness(observed);
  const { held, unmeasured: heldUnmeasured } = heldVerdicts(observed, fetchRunAnnotations);
  const broken = verdicts.filter((v) => v.broken);
  const silent = verdicts.filter((v) => v.silent);
  const unmeasured = verdicts.filter((v) => v.unmeasured);
  const unreachable = workflows.length - observed.length;

  // S345 — declare which verdicts this RUN actually exercised against live data.
  //
  // The `silent` verdict (a cron that is not failing because it is not running)
  // has always been proven by fixtures alone: no live cron has ever tripped it.
  // That is not a defect — it is the healthy state — but it means the code path
  // is untested in production, and `silent: 0` reads identically whether the
  // detector works or is quietly broken. So the run reports its own corroboration
  // rather than leaving a claim in a doc to rot: a 0 here means fixture-proven
  // only, and says so, instead of being mistaken for a verified all-clear.
  const liveCorroboration = {
    broken: broken.length,
    silent: silent.length,
    unmeasured: unmeasured.length,
  };
  const fixtureOnly = Object.entries(liveCorroboration)
    .filter(([, n]) => n === 0).map(([k]) => k);

  if (JSON_OUT) {
    console.log(JSON.stringify({
      ok: broken.length === 0 && silent.length === 0,
      broken,
      silent: silent.map((v) => ({ name: v.name, ageHours: v.ageHours, expectEveryHours: v.intervalHours, thresholdHours: v.silentThresholdHours })),
      checked: verdicts.length,
      // S355 advisory: success runs that logged a held marker. Not part of ok/exit.
      held,
      heldUnmeasured,
      // Retained under its historical key for existing readers, but it is no
      // longer a synonym for "fine": these are workflows with no observed
      // scheduled run at all, which is unmeasured, not healthy.
      noData: unmeasured.map((v) => v.name),
      unreachable,
      unreachableWorkflows,
      timedOut,
      liveCorroboration,
      // Verdict classes with no live instance in THIS run — correct today,
      // exercised only by --self-test fixtures. Not a failure; a scope statement.
      fixtureOnlyVerdicts: fixtureOnly,
    }));
    return broken.length === 0 && silent.length === 0 ? 0 : 1;
  }

  const suffix = [
    unmeasured.length ? `${unmeasured.length} unmeasured` : null,
    unreachable ? `${unreachable} unreachable` : null,
  ].filter(Boolean).join(' · ');

  if (broken.length === 0 && silent.length === 0) {
    console.log(`scheduled-workflow staleness ✓ (${verdicts.length} scheduled workflows, none red ≥${MIN_CONSECUTIVE} runs, none silent past cadence)${suffix ? ` · ${suffix}` : ''}`);
    if (unmeasured.length) console.log(`  unmeasured (no scheduled run observed): ${unmeasured.map((v) => v.name).join(', ')}`);
    if (held.length) console.log(`  ⚠ held (concluded success but held instead of publishing): ${held.map((h) => `${h.name} · run ${h.runId}`).join(', ')}`);
    if (fixtureOnly.length) console.log(`  fixture-proven only this run (no live instance): ${fixtureOnly.join(', ')}`);
    return 0;
  }
  if (broken.length) {
    console.error(`scheduled-workflow staleness ⛔ — ${broken.length} dead cron(s) (red ≥${MIN_CONSECUTIVE} consecutive scheduled runs):`);
    for (const b of broken) console.error(`  - ${b.name}: ${b.streak} consecutive failures [${b.recent.join(', ')}]`);
  }
  if (silent.length) {
    console.error(`scheduled-workflow staleness ⛔ — ${silent.length} silent cron(s) (not failing — not running):`);
    for (const s of silent) {
      console.error(`  - ${s.name}: last scheduled run ${s.ageHours}h ago, expected every ~${s.intervalHours}h (threshold ${s.silentThresholdHours}h)`);
    }
  }
  if (held.length) console.error(`  ⚠ held (concluded success but held instead of publishing): ${held.map((h) => `${h.name} · run ${h.runId}`).join(', ')}`);
  if (fixtureOnly.length) console.error(`  fixture-proven only this run (no live instance): ${fixtureOnly.join(', ')}`);
  return 1;
}

if (SELF_TEST && process.argv[1]?.endsWith('check-scheduled-workflow-staleness.mjs')) {
  runSelfTest();
} else if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-scheduled-workflow-staleness.mjs')) {
  process.exit(main());
}
