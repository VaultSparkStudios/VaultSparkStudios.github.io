#!/usr/bin/env node
// check-writeback-currency.mjs — did the last working session actually write back?
//
// THE GAP THIS CLOSES (S272, found live).
// Every pre-existing coherence probe compares surface against surface:
//   · closeout-session-coherence — status must not CLAIM more than the surfaces contain
//   · session-number-freshness   — PROJECT_STATUS must not LAG SIL/handoff
// Both are satisfied when every surface agrees at S<n>. Neither can see the
// opposite failure: the surfaces agree with each other and are all equally
// WRONG, because real work landed in git afterwards and closeout never ran.
//
// That is exactly what happened after S269: two working blocks (186 files,
// +38k lines — Studio Ops Console v1, CANON-054/055, CANON-053 bypass fixes,
// twin alwaysApprove, sanitize-by-content) were committed and pushed, but the
// closeout write-back never executed. Tree stayed clean, every surface still
// said S269, every coherence probe stayed green, and the drift was invisible.
//
// So this probe measures surfaces against GIT REALITY instead.
//
// ANCHOR CHOICE (deliberate): the newest commit touching
// context/SELF_IMPROVEMENT_LOOP.md. SIL is append-only and written exactly once
// per closeout, which makes it the only true closeout fingerprint. Do NOT anchor
// on PROJECT_STATUS.json — the live incident had a test-receipt-only commit
// (`chore(proof): S271 full-suite receipt`) touching PROJECT_STATUS without a
// closeout, which would have laundered the debt into a false green.
//
// WINDOW CHOICE (S320, found live). This probe originally read a FIXED 60-commit
// window. That is not enough to guarantee the anchor is visible: this repo's
// `[skip ci]` beacon/ledger crons push dozens of chore commits between closeouts.
// Once ~60 of them accumulate, the SIL anchor falls out of the window, the probe
// reports "cannot measure" — and, because `unmeasured` was returned as ok:true and
// the CLI exited `result.ok ? 0 : 1`, it read as a PASS. Observed live in S320 in
// both directions within one session: debt reported before a `git pull`, then a
// silent green after 31 CI-chore commits landed. A cut-off detector that goes
// permanently green as automation churn grows is worse than no detector.
//
// So the window is now derived from the anchor itself rather than guessed: locate
// the newest commit touching the anchor path, then read exactly far enough to
// include it (bounded by MAX_WINDOW). "Cannot measure" is reserved for a repo that
// genuinely has no anchor commit, and it is NEVER reported as a pass.
//
// Exit: 0 = current (or in-flight) · 1 = write-back debt · 3 = UNMEASURED (degraded,
// not a pass — the probe could not establish an anchor).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const JSON_OUT = process.argv.includes('--json');
const EXPLAIN = process.argv.includes('--explain') || process.argv.includes('--repair-plan');

/** The append-only closeout fingerprint. One commit per closeout, never generated. */
export const WRITE_BACK_ANCHOR = 'context/SELF_IMPROVEMENT_LOOP.md';

/**
 * Commits whose SUBJECT marks them as an out-of-session automation lane or a
 * pure receipt/regeneration commit. These land on main without a human session
 * and must never be mistaken for un-written-back work.
 */
// `chore(closeout)` is included deliberately: those commits ARE the closeout
// (receipt capture, rebased-surface regeneration) and legitimately land after
// the SIL anchor. Counting them as debt would make every clean closeout dirty.
// `closeout(S<n>)` is included for the same reason as `chore(closeout)`: such a
// commit IS a closeout, so it can never be evidence that one was skipped.
export const AUTOMATION_SUBJECT_RE =
  /^(?:chore\((?:routine-[\w-]+|closeout|uptime|ledgers?|proof|deps|release-please)\)|closeout\(|Merge (?:branch|pull request|remote-tracking)|Revert ")/i;

/**
 * STRUCTURAL automation marker (S320). The scope list above is a hardcoded
 * enumeration, and it did not match this repo's real cron subjects — `chore:
 * refresh live data feeds [skip ci]`, `chore: update CI status beacon [skip ci]`,
 * `chore(uptime): publish availability [skip ci]`. With the S320 window fix in
 * place the probe could finally SEE those commits, and promptly counted 68 of
 * them as un-written-back session work.
 *
 * That over-report is the same failure as the false green, wearing the opposite
 * mask: a probe that cries debt on every cron publish gets muted, and a muted
 * probe detects nothing. Rather than growing the enumeration one cron at a time,
 * key on the marker every automation publisher already carries by construction.
 * A human session commit must never carry `[skip ci]` (it would strand its own
 * CI), so this cannot swallow real session work.
 */
export const SKIP_CI_RE = /\[skip ci\]|\[ci skip\]/i;

/**
 * Paths that are generated, appended by tooling, or pure receipts. A commit that
 * touches ONLY these is churn, not session work — regardless of its subject.
 */
export const GENERATED_PATH_RES = [
  // S320: this repo's receipt roots. Every artifact under api/ is emitted by a
  // generator or a release/uptime lane — `chore: bind staging release receipts`,
  // `chore: pin build-sha for the staging candidate` and `chore: resync derived
  // graph for closeout` touch nothing else. Classifying by PATH is the structural
  // route the subject enumeration keeps failing to cover, and it cannot mask real
  // work: a commit carrying any non-generated file stays substantive via the
  // `files.some(...)` test below.
  /^api\/.*\.json$/i,
  /^context\/contracts\//i,
  /^data\/.*\.ndjson$/i,
  /^portfolio\/.*\.ndjson$/i,
  /^portfolio\/ark\/log\//i,
  /^reports?\//i,
  /^docs\/AUDIT_\d{4}-\d{2}-\d{2}-routine\./i,
  /^docs\/STARTUP_BRIEF/i,
  /^docs\/FRONTIER_CAPABILITY_RADAR\.md$/i,
  /^docs\/CLOSEOUT_CHECKLIST\.md$/i,
  /\.lock$/i,
];

export function isGeneratedPath(file = '') {
  const p = String(file).replace(/\\/g, '/');
  return GENERATED_PATH_RES.some((re) => re.test(p));
}

/**
 * A commit counts as SUBSTANTIVE session work when it is not an automation-lane
 * subject AND it touches at least one non-generated file.
 */
export function isSubstantiveCommit(commit = {}) {
  const subject = String(commit.subject || '');
  if (SKIP_CI_RE.test(subject)) return false;
  if (AUTOMATION_SUBJECT_RE.test(subject)) return false;
  const files = Array.isArray(commit.files) ? commit.files : [];
  if (!files.length) return false; // empty/merge commit — nothing to write back
  return files.some((f) => !isGeneratedPath(f));
}

/**
 * Pure core. `commits` is newest-first, each { sha, subject, isoDate, files[] }.
 *
 * @param {number} staleHours grace window: a session that just committed and is
 *   still running has legitimate un-written-back work. Only once the newest
 *   substantive commit is older than this do we call it an abandoned closeout.
 *   Bounded AGE, never calendar-day identity (S266 freshness rule).
 */
export function evaluateWriteBackCurrency({ commits = [], nowMs = null, staleHours = 12 } = {}) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const anchorIdx = commits.findIndex((c) =>
    (c.files || []).some((f) => String(f).replace(/\\/g, '/') === WRITE_BACK_ANCHOR));

  if (anchorIdx === -1) {
    return {
      // NOT ok. An unmeasurable window is a degraded reading, never a pass —
      // a consumer that reads `.ok` must not be handed a false green (S320).
      ok: false,
      inFlight: false,
      debtCount: 0,
      anchor: null,
      reason: `no ${WRITE_BACK_ANCHOR} commit found — cannot measure write-back currency (UNMEASURED, not a pass)`,
      unmeasured: true,
      debt: [],
    };
  }

  const anchor = commits[anchorIdx];
  const debt = commits.slice(0, anchorIdx).filter(isSubstantiveCommit);

  if (!debt.length) {
    return {
      ok: true,
      inFlight: false,
      debtCount: 0,
      anchor: { sha: anchor.sha, subject: anchor.subject, isoDate: anchor.isoDate },
      reason: `write-back current — no substantive commits since ${anchor.sha} (${anchor.isoDate})`,
      unmeasured: false,
      debt: [],
    };
  }

  // AGE IS MEASURED FROM THE **OLDEST** UN-WRITTEN-BACK COMMIT, not the newest.
  // Anchoring on the newest lets a single fresh commit mask days-old debt behind
  // it — the exact way the live incident stayed invisible: work from 2026-08-06
  // sat un-written-back while 2026-08-07 commits kept the "newest" age at ~1h.
  // A genuinely in-flight session has ALL its commits inside the grace window,
  // so oldest-anchoring stays correct for the in-flight case and strictly
  // stronger for the abandoned-closeout case.
  const newest = debt[0];
  const oldest = debt[debt.length - 1];
  const oldestMs = Date.parse(oldest.isoDate);
  const ageHours = Number.isFinite(oldestMs) ? (now - oldestMs) / 3_600_000 : Infinity;
  const inFlight = ageHours < staleHours;

  return {
    ok: inFlight,
    inFlight,
    unmeasured: false,
    debtCount: debt.length,
    ageHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(1)) : null,
    staleHours,
    anchor: { sha: anchor.sha, subject: anchor.subject, isoDate: anchor.isoDate },
    newest: { sha: newest.sha, subject: newest.subject, isoDate: newest.isoDate },
    oldest: { sha: oldest.sha, subject: oldest.subject, isoDate: oldest.isoDate },
    debt: debt.map((c) => ({ sha: c.sha, subject: c.subject, isoDate: c.isoDate })),
    reason: inFlight
      ? `${debt.length} substantive commit(s) since last closeout write-back (${anchor.sha}), oldest ${ageHours.toFixed(1)}h old — session likely in flight`
      : `WRITE-BACK DEBT — ${debt.length} substantive commit(s) landed after the last closeout write-back (${anchor.sha}, ${anchor.isoDate}); oldest is ${ageHours.toFixed(1)}h old (≥${staleHours}h). A session ended without running closeout.`,
  };
}

/** Actionable repair steps — the surfaces a skipped closeout left behind. */
export function repairPlanForWriteBackCurrency(result = {}) {
  if (result.ok || !result.debtCount) return [];
  const range = result.anchor ? `${result.anchor.sha}..HEAD` : 'HEAD~20..HEAD';
  return [
    { step: 'reconstruct', action: `Read the un-written-back work: git log --stat ${range}` },
    { step: 'CURRENT_STATE', action: 'context/CURRENT_STATE.md — describe the shipped behaviour those commits changed.' },
    { step: 'LATEST_HANDOFF', action: 'context/LATEST_HANDOFF.md — prepend the authoritative handoff for the recovered session.' },
    { step: 'WORK_LOG', action: 'logs/WORK_LOG.md — append the session entry.' },
    { step: 'DECISIONS', action: 'context/DECISIONS.md — append any decisions those commits encode (append-only).' },
    { step: 'SELF_IMPROVEMENT_LOOP', action: 'context/SELF_IMPROVEMENT_LOOP.md — append the SIL entry; this is the anchor that clears this probe.' },
    { step: 'PROJECT_STATUS', action: 'context/PROJECT_STATUS.json — refresh currentFocus/lastUpdated (CANON-031 invariant holds).' },
  ];
}

/**
 * How many commits separate HEAD from the newest commit touching the anchor path.
 * Returns null when git cannot answer or the anchor has never been committed.
 */
export function anchorDistance(root = ROOT, anchorPath = WRITE_BACK_ANCHOR) {
  const head = spawnSync('git', ['log', '-1', '--format=%H', '--', anchorPath],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  const anchorSha = String(head.stdout || '').trim();
  if (head.status !== 0 || !anchorSha) return null;
  const count = spawnSync('git', ['rev-list', '--count', `${anchorSha}..HEAD`],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  if (count.status !== 0) return null;
  const n = Number.parseInt(String(count.stdout || '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Window size that is GUARANTEED to contain the anchor, rather than a guess.
 * `+1` includes the anchor commit itself; MIN keeps small repos on the old
 * behaviour; MAX bounds the git call on a repo whose anchor is ancient.
 */
export function resolveWindow(distance, { min = 60, max = 5000 } = {}) {
  if (distance === null || !Number.isFinite(distance)) return min;
  return Math.min(max, Math.max(min, distance + 1));
}

/** Read commits from git. Newest-first, with the file list per commit. */
export function readCommits(root = ROOT, limit = 60) {
  const res = spawnSync('git', ['log', `-${limit}`, '--name-only', '--date=iso-strict',
    '--format=%x00%H%x1f%ad%x1f%s'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (res.status !== 0) return [];
  const commits = [];
  for (const block of String(res.stdout || '').split('\0')) {
    if (!block.trim()) continue;
    const [header, ...rest] = block.split('\n');
    const [sha, isoDate, subject] = header.split('\x1f');
    if (!sha) continue;
    commits.push({
      sha: sha.slice(0, 8),
      isoDate: (isoDate || '').trim(),
      subject: (subject || '').trim(),
      files: rest.map((l) => l.trim()).filter(Boolean),
    });
  }
  return commits;
}

export function run(root = ROOT, opts = {}) {
  if (!fs.existsSync(path.join(root, '.git'))) {
    return { ok: false, unmeasured: true, debtCount: 0, debt: [], reason: 'not a git repository — write-back currency UNMEASURED (not a pass)' };
  }
  // Derive the window from the anchor instead of guessing a fixed depth, so
  // accumulating [skip ci] chore commits can never push the anchor out of view.
  const limit = opts.limit || resolveWindow(anchorDistance(root));
  return evaluateWriteBackCurrency({ commits: readCommits(root, limit), ...opts, limit: undefined });
}

/**
 * Self-test. Calls the REAL exported functions — never a re-implementation — and
 * mutation-tests the assertion in both directions, because the S320 defect was
 * precisely a check that stayed green when it should have gone non-green.
 */
export function selfTest() {
  const anchorCommit = (sha) => ({ sha, isoDate: '2026-08-18T00:00:00Z', subject: `closeout(${sha})`, files: [WRITE_BACK_ANCHOR] });
  const chore = (sha, iso = '2026-08-18T00:00:00Z') => ({ sha, isoDate: iso, subject: 'chore: update CI status beacon [skip ci]', files: ['api/uptime.json'] });
  const work = (sha, iso) => ({ sha, isoDate: iso, subject: 'feat: real session work', files: ['assets/app.js'] });
  const old = '2026-08-01T00:00:00Z';
  const nowMs = Date.parse('2026-08-18T00:00:00Z');

  const cases = [
    ['anchor present + no work after → current, exit 0',
      () => { const r = evaluateWriteBackCurrency({ commits: [anchorCommit('a1')], nowMs }); return r.ok === true && !r.unmeasured; }],
    ['substantive work after anchor, aged past grace → DEBT (not ok)',
      () => { const r = evaluateWriteBackCurrency({ commits: [work('w1', old), anchorCommit('a1')], nowMs }); return r.ok === false && !r.unmeasured && r.debtCount === 1; }],
    // NOTE: these churn commits are dated `old`, so the 12h grace window CANNOT
    // carry them. An earlier revision of this test dated them "now" and passed
    // because of in-flight grace rather than churn classification — it would have
    // stayed green with the classifier fully broken.
    ['chore-only churn after anchor → still current (churn is not session work)',
      () => { const r = evaluateWriteBackCurrency({ commits: [chore('c1', old), chore('c2', old), anchorCommit('a1')], nowMs }); return r.ok === true && r.debtCount === 0; }],
    // The real cron subjects this repo publishes. Before S320 none of these were
    // classified as automation, so every one counted as un-written-back work.
    ['real cron subjects are churn, not debt',
      () => {
        const crons = [
          'chore: refresh live data feeds [skip ci]',
          'chore: update CI status beacon [skip ci]',
          'chore(uptime): publish availability + geo-vitals + staging parity [skip ci]',
          'chore: update lighthouse trend ledger [skip ci]',
          'closeout(S319): production outage repaired',
        ];
        return crons.every((subject, i) =>
          isSubstantiveCommit({ sha: `x${i}`, isoDate: old, subject, files: ['api/uptime.json'] }) === false);
      }],
    ['a genuine session commit is still counted as substantive',
      () => isSubstantiveCommit({ sha: 'w9', isoDate: old, subject: 'fix(worker): repair the beacon', files: ['cloudflare/worker.js'] }) === true],
    ['receipt-only commits are churn by PATH, whatever the subject says',
      () => isSubstantiveCommit({ sha: 'r1', isoDate: old, subject: 'chore: bind staging release receipts',
        files: ['api/release-dependencies.json', 'api/status-proof.json'] }) === false],
    // The guard on the path rule: one real source file makes the whole commit
    // substantive again, so receipts can never launder session work into churn.
    ['a receipt commit that ALSO touches source stays substantive',
      () => isSubstantiveCommit({ sha: 'r2', isoDate: old, subject: 'chore: bind staging release receipts',
        files: ['api/status-proof.json', 'assets/app.js'] }) === true],
    ['hand-written write-back surfaces under context/ are NOT treated as generated',
      () => isGeneratedPath('context/CURRENT_STATE.md') === false && isGeneratedPath('context/contracts/hub.json') === true],
    // The regression this fix exists for. Before S320 this returned ok:true.
    ['NO anchor in window → UNMEASURED and NOT ok (never a pass)',
      () => { const r = evaluateWriteBackCurrency({ commits: [chore('c1'), work('w1', old)], nowMs }); return r.unmeasured === true && r.ok === false; }],
    ['resolveWindow widens past the fixed floor to include a distant anchor',
      () => resolveWindow(400) === 401 && resolveWindow(5) === 60 && resolveWindow(null) === 60],
    ['resolveWindow stays bounded on an ancient anchor',
      () => resolveWindow(99999) === 5000],
  ];

  let failed = 0;
  for (const [name, fn] of cases) {
    let pass = false;
    try { pass = fn() === true; } catch { pass = false; }
    if (!pass) failed++;
    console.log(`  ${pass ? '✓' : '✗'} ${name}`);
  }
  console.log(failed ? `✗ writeback-currency self-test: ${failed}/${cases.length} FAILED` : `✓ writeback-currency self-test: ${cases.length}/${cases.length} passed`);
  return failed === 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const result = run();
  const payload = EXPLAIN ? { ...result, repairPlan: repairPlanForWriteBackCurrency(result) } : result;
  if (JSON_OUT) console.log(JSON.stringify(payload));
  else {
    const mark = result.ok ? '✓' : (result.unmeasured ? '⚠' : '⛔');
    console.log(`${mark} writeback-currency: ${result.reason}`);
    if (!result.ok) for (const c of result.debt) console.log(`   · ${c.sha} ${c.isoDate.slice(0, 10)} ${c.subject}`);
    if (EXPLAIN) for (const s of repairPlanForWriteBackCurrency(result)) console.log(`- ${s.step}: ${s.action}`);
  }
  // 0 current · 1 write-back debt · 3 UNMEASURED. Three states, three codes: an
  // unmeasurable window must be distinguishable from both a pass and real debt.
  process.exit(result.ok ? 0 : (result.unmeasured ? 3 : 1));
}
