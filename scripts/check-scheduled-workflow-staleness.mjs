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

/**
 * S362: every `- cron:` expression in a workflow's source. The old pattern ended in
 * `['"]?\s*$`, so a line carrying a YAML comment (`- cron: '0 6 * * 1'  # Monday`)
 * matched nothing — 11 of this repo's cron lines. Those workflows fell back to a
 * daily expectation, and the weekly maintenance job was reported `silent` 135h
 * after a run that was exactly on time. Read up to the closing quote, or, when
 * unquoted, up to a comment.
 */
export function parseCronLines(src) {
  const out = [];
  for (const m of String(src).matchAll(/^\s*-\s*cron:\s*(.+)$/gm)) {
    const raw = m[1].trim();
    const q = /^(['"])(.*?)\1/.exec(raw);
    const expr = (q ? q[2] : raw.replace(/\s+#.*$/, '')).trim();
    if (expr) out.push(expr);
  }
  return out;
}

/**
 * S362: several cron lines fire independently, so their RATES add. `news-publish`
 * has four daily slots — one run every 6h — and taking the minimum interval
 * expected it once a day, so a three-day stall stayed under the silent threshold.
 */
export function combinedIntervalHours(crons) {
  if (!crons.length) return 24;
  const rate = crons.reduce((sum, c) => sum + 1 / cronIntervalHours(c), 0);
  return 1 / rate;
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
    const redStreak = streak >= MIN_CONSECUTIVE;

    // ── S363: "repaired, awaiting its next run" is not the same as "broken" ──
    // This probe judges a cron purely on run history, so a cron that has ALREADY
    // been fixed keeps reporting dead until its next scheduled occurrence — for a
    // monthly job, up to 30 more days of red. Measured live: Monthly Member
    // Newsletter carried streak 6 while both causes of those six failures were
    // already repaired (the missing edge function was deployed; the unarmed
    // schedule now holds instead of failing). Worse than the noise, during that
    // window a genuinely NEWLY broken monthly cron is indistinguishable from it.
    //
    // The missing evidence was never in CI — it was in git: did the workflow's own
    // source change AFTER the newest failing run? If it did, the failures are
    // pre-fix and have not yet been retried.
    //
    // This must not become a mute button, so it is bounded at both ends:
    //   · source unchanged since the failures  → stays broken (a claim needs a fix)
    //   · a NEW run fails                      → that run postdates the change, so
    //                                            the streak is real again
    //   · one full interval elapses            → the downgrade EXPIRES and broken
    //                                            returns; a repair that never ran
    //                                            is not a repair, and silence is
    //                                            not a pass
    //   · an undated run in the streak         → no downgrade at all (absence of
    //                                            evidence is not evidence of repair)
    // And `silent` is still computed below from the FINAL verdict, so a cron that
    // is quiet past its cadence keeps saying so even while repaired-untested.
    const changedAt = wf.sourceChangedAt ? Date.parse(wf.sourceChangedAt) : NaN;
    let repairedUntested = false;
    let repairExpiresAt = null;
    if (redStreak && Number.isFinite(changedAt)) {
      const streakRuns = completed.slice(0, streak);
      const allDated = streakRuns.every((r) => Number.isFinite(Date.parse(r.createdAt ?? '')));
      const allPredateFix = allDated && streakRuns.every((r) => Date.parse(r.createdAt) < changedAt);
      const expiresAt = changedAt + interval * 36e5;
      if (allPredateFix && now < expiresAt) {
        repairedUntested = true;
        repairExpiresAt = new Date(expiresAt).toISOString();
      }
    }
    const broken = redStreak && !repairedUntested;

    out.push({
      name: wf.name,
      broken,
      repairedUntested,
      repairExpiresAt,
      sourceChangedAt: wf.sourceChangedAt ?? null,
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

/**
 * S363: ISO commit time of the last change to a workflow's own source, or null.
 * Null on any doubt (no git, untracked file, unparseable output) — a missing
 * timestamp must never produce a downgrade.
 */
export function workflowSourceChangedAt(file, run = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 8000 })) {
  const res = run(['log', '-1', '--format=%cI', '--', `.github/workflows/${file}`]);
  if (!res || res.status !== 0) return null;
  const iso = String(res.stdout || '').trim();
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

function scheduledWorkflows() {
  if (!existsSync(WF_DIR)) return [];
  const out = [];
  for (const file of readdirSync(WF_DIR)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const src = readFileSync(join(WF_DIR, file), 'utf8');
    if (!/^\s*schedule:/m.test(src)) continue;
    const m = src.match(/^name:\s*(.+?)\s*$/m);
    // Combined rate of every cron line: never slower than the fastest one, so a
    // workflow with both a daily and an hourly trigger is late the moment the
    // hourly one stops.
    const intervalHours = combinedIntervalHours(parseCronLines(src));
    out.push({
      file,
      // S363: when this workflow's own source last changed. A failing streak that
      // entirely predates it is pre-fix history, not a live break.
      sourceChangedAt: workflowSourceChangedAt(file),
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

  // S362 — the real text of weekly-maintenance.yml and news-publish.yml.
  const weekly = "on:\n  schedule:\n    - cron: '0 6 * * 1'   # Every Monday at 06:00 UTC\n";
  assert(JSON.stringify(parseCronLines(weekly)) === '["0 6 * * 1"]',
    'a cron line with a trailing comment is read, not dropped');
  assert(combinedIntervalHours(parseCronLines(weekly)) === 24 * 7,
    'the commented weekly cron is expected weekly, not daily');
  const desk = [
    '    - cron: "7 6 * * *"   # The Wire      06:00 UTC',
    '    - cron: "7 12 * * *"  # Midday Desk   12:00 UTC',
    '    - cron: "7 18 * * *"  # The Close     18:00 UTC',
    '    - cron: "7 22 * * *"  # Late Night    22:00 UTC',
  ].join('\n');
  assert(parseCronLines(desk).length === 4, 'all four commented desk slots are read');
  assert(Math.abs(combinedIntervalHours(parseCronLines(desk)) - 6) < 1e-9,
    'four daily slots are one run every 6h, not one a day');
  assert(JSON.stringify(parseCronLines('    - cron: 0 9 * * *  # unquoted\n')) === '["0 9 * * *"]',
    'an unquoted cron stops at its comment');
  assert(combinedIntervalHours([]) === 24, 'no cron lines falls back to daily');

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

  // ── S363: repaired-untested (bounded downgrade) ──────────────────────────
  // The live case: a monthly cron with 6 failures, every one of them older than
  // the commit that fixed the workflow, and the next occurrence not yet due.
  const MONTH = 24 * 30;
  const fixedAt = (hoursAgo) => new Date(NOW - hoursAgo * 36e5).toISOString();
  const repair = evaluateStaleness([
    { name: 'repaired-monthly', intervalHours: MONTH, sourceChangedAt: fixedAt(20), runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(430) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(1150) },
    ] },
    // No fix has landed — history alone, so the streak stands.
    { name: 'never-fixed', intervalHours: MONTH, sourceChangedAt: fixedAt(5000), runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(430) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(1150) },
    ] },
    // The fix ran and failed again: the newest failure POSTDATES it.
    { name: 'fix-did-not-work', intervalHours: MONTH, sourceChangedAt: fixedAt(800), runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(430) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(1150) },
    ] },
    // A full interval has passed since the fix with no new run: the downgrade expires.
    { name: 'repair-expired', intervalHours: 24, sourceChangedAt: fixedAt(30), runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(50) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(74) },
    ] },
    // No git timestamp at all — absence of evidence is not evidence of repair.
    { name: 'no-source-date', intervalHours: MONTH, runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(430) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(1150) },
    ] },
    // A run in the streak carries no createdAt: cannot prove it predates the fix.
    { name: 'undated-run', intervalHours: MONTH, sourceChangedAt: fixedAt(20), runs: [
      { event: 'schedule', conclusion: 'failure' },
      { event: 'schedule', conclusion: 'failure', createdAt: at(1150) },
    ] },
    // Repaired, but quiet far past its cadence: the repair does not explain the silence.
    { name: 'repaired-but-silent', intervalHours: 24, sourceChangedAt: fixedAt(2), runs: [
      { event: 'schedule', conclusion: 'failure', createdAt: at(200) },
      { event: 'schedule', conclusion: 'failure', createdAt: at(224) },
    ] },
  ], NOW);
  const r = (n) => repair.find((v) => v.name === n);

  assert(r('repaired-monthly').repairedUntested && !r('repaired-monthly').broken,
    'a red streak entirely older than the fix is repaired-untested, not broken');
  assert(r('repaired-monthly').streak === 2 && r('repaired-monthly').repairExpiresAt,
    'a downgraded verdict still reports its streak and names when it expires');
  assert(r('never-fixed').broken && !r('never-fixed').repairedUntested,
    'THE MUTE-BUTTON GUARD: an untouched workflow stays broken — a claim of repair needs a fix');
  assert(r('fix-did-not-work').broken && !r('fix-did-not-work').repairedUntested,
    'a failure POSTDATING the fix means the fix did not work — broken again');
  assert(r('repair-expired').broken && !r('repair-expired').repairedUntested,
    'the downgrade expires after one full interval: a repair that never ran is not a repair');
  assert(r('no-source-date').broken && !r('no-source-date').repairedUntested,
    'no source timestamp → no downgrade (absence of evidence is not evidence of repair)');
  assert(r('undated-run').broken && !r('undated-run').repairedUntested,
    'an undated run in the streak cannot be proven pre-fix → no downgrade');
  assert(r('repaired-but-silent').repairedUntested && r('repaired-but-silent').silent,
    'silence past cadence is still reported while repaired-untested — the repair does not explain it');
  assert(workflowSourceChangedAt('x.yml', () => ({ status: 0, stdout: 'not-a-date' })) === null
    && workflowSourceChangedAt('x.yml', () => ({ status: 1, stdout: '' })) === null,
    'an unparseable or failed git read yields null, never a fabricated timestamp');

  // ── S363 [SIL, carried from S362]: the verdict is bound to its denominator ──
  // collectWorkflowObservations is the seam where coverage is lost, so prove the
  // loss is observable rather than silent. S362 saw 11 of 14 crons and reported the
  // same clean line as a run that saw all 14.
  const budgetFetch = (wf) => (wf.file === 'reachable.yml'
    ? { ok: true, runs: [{ event: 'schedule', status: 'completed', conclusion: 'success', createdAt: new Date(NOW).toISOString() }] }
    : { ok: false, reason: 'gh: API rate limit exceeded' });
  const partial = collectWorkflowObservations(
    [{ file: 'reachable.yml', name: 'reachable' }, { file: 'budget-capped.yml', name: 'budget-capped' }],
    { fetch: budgetFetch, now: () => NOW, budgetMs: 10_000 },
  );
  assert(partial.observed.length === 1 && partial.unreachableWorkflows.length === 1,
    'a cron the scan could not reach is recorded as unreachable, not dropped');
  assert(partial.unreachableWorkflows[0] === 'budget-capped' && /rate limit/i.test(partial.firstFailure),
    'the unreached cron is named, with the reason that stopped it');
  assert(evaluateStaleness(partial.observed, NOW).every((v) => !v.broken && !v.silent),
    'THE S362 SHAPE: the reachable subset alone reads perfectly clean — which is why '
    + 'the verdict must consult coverage and not just this list');
  const fullBudget = collectWorkflowObservations(
    [{ file: 'reachable.yml', name: 'reachable' }],
    { fetch: budgetFetch, now: () => NOW, budgetMs: 10_000 },
  );
  assert(fullBudget.unreachableWorkflows.length === 0 && !fullBudget.timedOut,
    'a scan that reaches every discovered cron reports complete coverage');

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

  console.log('check-scheduled-workflow-staleness self-test passed (41/41)');
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
  // ── S363: the budget has to scale with the number of crons it must reach ───
  // THE ROOT CAUSE OF THE S362 FLICKER. The budget was a flat 24s for the WHOLE
  // sweep, one sequential `gh` call per workflow. At ~1s per call that reaches all
  // 14; at ~6s per call it reaches 4, and the count "flickered" purely with GitHub
  // API latency. Measured live this session: 4/14 reached, deadline exhausted —
  // while the very same probe had reported a clean `checked: 14` minutes earlier.
  // Both readings were produced by the same code; only the network differed.
  //
  // Budget per discovered workflow instead, so a repo with more crons is given
  // proportionally more time, with a floor for tiny repos and a ceiling so a
  // pathological API cannot hang the doctor. When it still runs out, the coverage
  // verdict above reports the partial honestly rather than shrinking the claim.
  const observationBudgetMs = Math.min(Math.max(workflows.length * 8000, 24000), 150000);
  const { observed, firstFailure, unreachableWorkflows, timedOut } =
    collectWorkflowObservations(workflows, { budgetMs: observationBudgetMs });

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
  const repaired = verdicts.filter((v) => v.repairedUntested);
  const silent = verdicts.filter((v) => v.silent);
  const unmeasured = verdicts.filter((v) => v.unmeasured);
  const unreachable = workflows.length - observed.length;

  // ── S363 [SIL, carried from S362]: bind the verdict to its own denominator ──
  // S362 recorded that the checked count flickered (14 vs 11 workflows a minute
  // apart) when `gh` calls hit the per-run budget, and asked for the verdict to be
  // bound to the discovered workflow count. Until now `ok` was computed purely from
  // broken/silent, so a run that could only SEE 11 of 14 crons reported exactly the
  // same clean line as a run that saw all 14 — the three it never reached simply did
  // not exist as far as the verdict was concerned. A shrinking denominator silently
  // strengthened the claim.
  //
  // S363 first tried to close this item by observing a stable `checked: 14`. That
  // was one reading under a healthy budget, not a bound denominator, and the item
  // was reopened rather than closed on it.
  //
  // Coverage is now part of the verdict: a scan that did not reach every discovered
  // cron is `partial` and is NOT ok. This probe is advisory (it surfaces in doctor,
  // it does not gate build:check), so the cost of an honest partial is a visible
  // doctor line — which is the point.
  const coverageComplete = unreachable === 0 && !timedOut;
  const coverage = {
    discovered: workflows.length,
    observed: observed.length,
    unreachable,
    timedOut,
    complete: coverageComplete,
  };
  const cleanVerdict = broken.length === 0 && silent.length === 0;
  const ok = cleanVerdict && coverageComplete;

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
    repairedUntested: repaired.length,
  };
  const fixtureOnly = Object.entries(liveCorroboration)
    .filter(([, n]) => n === 0).map(([k]) => k);

  if (JSON_OUT) {
    console.log(JSON.stringify({
      ok,
      // S363 — the denominator the verdict was computed over. `cleanVerdict` is the
      // historical broken/silent reading; `ok` additionally requires that the scan
      // reached every discovered cron, so a partial scan can never read as a pass.
      cleanVerdict,
      coverage,
      broken,
      silent: silent.map((v) => ({ name: v.name, ageHours: v.ageHours, expectEveryHours: v.intervalHours, thresholdHours: v.silentThresholdHours })),
      checked: verdicts.length,
      // S363 advisory: red streaks that entirely predate a change to the workflow's
      // own source, with the next scheduled occurrence not yet due. Reported by name
      // with the instant the downgrade expires — never part of ok/exit, and never
      // open-ended.
      repairedUntested: repaired.map((v) => ({
        name: v.name, streak: v.streak, sourceChangedAt: v.sourceChangedAt, expiresAt: v.repairExpiresAt,
      })),
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
    return ok ? 0 : 1;
  }

  const suffix = [
    unmeasured.length ? `${unmeasured.length} unmeasured` : null,
    unreachable ? `${unreachable} unreachable` : null,
  ].filter(Boolean).join(' · ');

  // S363 — a clean reading over an INCOMPLETE scan is reported as partial, never as
  // a pass. The line names the denominator it was computed over, so "none red" can
  // no longer stand in for "none red out of all of them".
  if (cleanVerdict && !coverageComplete) {
    console.error(`scheduled-workflow staleness ⚠ PARTIAL — clean over ${coverage.observed}/${coverage.discovered} discovered cron(s); the rest were never reached, so this is not an all-clear${timedOut ? ' (observation deadline exhausted)' : ''}:`);
    for (const name of unreachableWorkflows) console.error(`   unreached: ${name}`);
    if (repaired.length) console.error(`  ⟳ repaired-untested: ${repaired.map((v) => `${v.name} · expires ${v.repairExpiresAt}`).join(', ')}`);
    return 1;
  }

  if (cleanVerdict) {
    console.log(`scheduled-workflow staleness ✓ (${verdicts.length}/${coverage.discovered} scheduled workflows reached, none red ≥${MIN_CONSECUTIVE} runs, none silent past cadence)${suffix ? ` · ${suffix}` : ''}`);
    if (unmeasured.length) console.log(`  unmeasured (no scheduled run observed): ${unmeasured.map((v) => v.name).join(', ')}`);
    if (repaired.length) console.log(`  ⟳ repaired-untested (fixed since the failures, awaiting the next scheduled run): ${repaired.map((v) => `${v.name} · ${v.streak} pre-fix failure(s) · expires ${v.repairExpiresAt}`).join(', ')}`);
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
  if (repaired.length) console.error(`  ⟳ repaired-untested (fixed since the failures, awaiting the next scheduled run): ${repaired.map((v) => `${v.name} · ${v.streak} pre-fix failure(s) · expires ${v.repairExpiresAt}`).join(', ')}`);
  if (held.length) console.error(`  ⚠ held (concluded success but held instead of publishing): ${held.map((h) => `${h.name} · run ${h.runId}`).join(', ')}`);
  if (fixtureOnly.length) console.error(`  fixture-proven only this run (no live instance): ${fixtureOnly.join(', ')}`);
  return 1;
}

if (SELF_TEST && process.argv[1]?.endsWith('check-scheduled-workflow-staleness.mjs')) {
  runSelfTest();
} else if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-scheduled-workflow-staleness.mjs')) {
  process.exit(main());
}
