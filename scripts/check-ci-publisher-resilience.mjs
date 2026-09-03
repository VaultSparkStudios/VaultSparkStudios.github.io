#!/usr/bin/env node
/**
 * check-ci-publisher-resilience.mjs — S285 second-order innovation
 * (born from the S285 root-fix of build-ci-status-beacon.mjs hard-exiting on a
 * transient GitHub `HTTP 503`, painting the CI Status Beacon red — an
 * observability publisher reporting the repo unhealthy on GitHub's own weather.
 * The same class lived in fetch-rum-from-r2.mjs: exit(1) on a transient R2 5xx.)
 *
 * THE GAP IT CLOSES — the sibling gate check-build-step-resilience.mjs guards the
 * `npm run build` chain against hard-exits on GITIGNORED FILES. It does NOT cover
 * the OTHER unattended surface: scripts invoked directly by schedule:/workflow_run:
 * workflows that PUBLISH observability data (api/, data/, feed/, journal/) by making
 * an EXTERNAL NETWORK CALL (gh / fetch / R2). When one of those hard-fails on a
 * TRANSIENT upstream error, it paints an unattended cron red with no human in the
 * loop — a false "our repo is broken" when it is really the provider's weather.
 *
 * THE CONTRACT — an unattended-triggered PUBLISHER that makes a network call, and
 * whose invoking step does NOT already tolerate failure (`|| true` / continue-on-error),
 * MUST carry a transient-degrade marker (a transient-error classifier, a top-level
 * try/catch that can exit 0, or a `*Safe` wrapper). Verifiers (smoke tests, --check
 * gates that assert a condition) are intentionally excluded — they SHOULD hard-fail.
 * Real errors (auth / config) SHOULD still surface; only TRANSIENT ones degrade.
 *
 * Modes:
 *   (no flag)   write a text report, exit 0/1
 *   --check     exit 1 if any unguarded publisher network-caller found (CI gate)
 *   --self-test run internal assertions, exit 0/1
 *
 * Wired into: smoke-startup-scripts.mjs (no new build:check segment — the chain is
 * already near the Windows cmd.exe length limit).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

const WF_DIR = join(ROOT, '.github', 'workflows');

// A script is an unattended trigger's concern only if its workflow runs itself.
const UNATTENDED_TRIGGER = /^\s*(schedule|workflow_run)\s*:/m;

// Publisher = commits generated observability/data artifacts back to the repo.
const PUBLISHER_WRITE = /writeFileSync|appendFileSync|createWriteStream/;
const PUBLISHER_PATHS = /['"`](\.\.\/)*(api|data|feed|journal|\.well-known)\//;

// Network caller = reaches an external service that can transiently fail.
const NETWORK_CALL = [
  /execFileSync\(\s*['"]gh['"]/, /spawnSync\(\s*['"]gh['"]/, /\bgh\s*\(/,
  /\bfetch\s*\(/, /https?\.(get|request)\s*\(/, /r2\.cloudflarestorage\.com/i,
];

// A source generator can contain browser-side fetch() text without making a
// network call itself. This reviewed marker prevents that emitted client code
// from being misclassified as a Node publisher dependency.
const NETWORK_FREE_MARKER = /@ci-publisher-network-free\b/;

// ── S341: the publisher's OTHER half ────────────────────────────────────────
// Everything above measures the GENERATE half of a publisher: whether the node
// script survives a transient upstream 5xx. A publisher is two transactions,
// though, and the second one — LANDING the commit on main — had no contract at
// all. This gate carried the name "publisher resilience" and stayed green while
// the uptime cron failed every run for hours (2026-09-03) on the landing half.
// A gate whose name promises a property must measure that property, or its green
// is worse than no gate: it is an assurance nobody re-checks.
//
// THE LANDING CONTRACT — a publisher that rebases to land MUST be able to recover
// from a conflict. A conflicted rebase leaves the runner on a detached HEAD, so
// every subsequent `git pull --rebase` fails instantly on "unmerged files" and
// every subsequent push fails on "not currently on a branch": a retry loop
// without `git rebase --abort` cannot succeed after its first attempt, however
// many attempts it advertises.
//
// Satisfied either by delegating to the shared helper, or by aborting in place.
// The helper is resolved and CHECKED rather than trusted by name — a detector
// blind to helper indirection would pass twelve callers on the strength of a
// filename, and would keep passing if the recovery were deleted from it.
const PUBLISH_HELPER = 'scripts/ci/publish-push.sh';

// Transient-degrade marker = the script can survive an upstream blip.
const DEGRADE_MARKER = [
  /isTransient\w*Error/, /\w+Safe\s*\(/, /function\s+\w*[Ss]afe\b/,
  /catch\s*\([^)]*\)\s*\{[^}]*exit\(0\)/s, /process\.exit\(0\)[^]*catch/,
];

function listWorkflowFiles() {
  if (!existsSync(WF_DIR)) return [];
  return readdirSync(WF_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
}

// Parse a workflow: for each `node scripts/X.mjs` invocation, capture the script
// and whether that invocation tolerates failure (`|| true`/`|| echo` on the line,
// or a `continue-on-error: true` on the owning step).
function parseWorkflowInvocations(src) {
  const lines = src.split('\n');
  const invocations = [];
  // Track the nearest preceding continue-on-error within the current step block.
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/node\s+scripts\/([\w-]+\.mjs)([^\n]*)/);
    if (!m) continue;
    const script = m[1];
    const tail = m[2] || '';
    const inlineTolerant = /\|\|\s*(true|echo|:)/.test(tail) || /\|\|\s*(true|echo)/.test(lines[i + 1] || '');
    // Look back up to 8 lines for a continue-on-error in the same step.
    let stepTolerant = false;
    for (let j = i; j >= Math.max(0, i - 8); j--) {
      if (/continue-on-error\s*:\s*true/.test(lines[j])) { stepTolerant = true; break; }
      if (/^\s*-\s+(name|uses|run)\s*:/.test(lines[j]) && j < i) break; // step boundary
    }
    // A pure self-test/check-only invocation is not the live data path. Scripts
    // named check-* are verifiers too: some accept an origin/json-out instead of
    // a redundant --check flag and must hard-fail if the served contract is red.
    const verifier = script.startsWith('check-') || /--self-test|--check\b|--info\b/.test(tail);
    const liveInvocation = !verifier || /--refresh|--edge-only|--write\b/.test(tail);
    invocations.push({ script, tolerant: inlineTolerant || stepTolerant, liveInvocation });
  }
  return invocations;
}

function scriptFlags(scriptName) {
  const p = join(ROOT, 'scripts', scriptName);
  if (!existsSync(p)) return { exists: false };
  const code = readFileSync(p, 'utf8');
  const isNetwork = !NETWORK_FREE_MARKER.test(code) && NETWORK_CALL.some((re) => re.test(code));
  const isPublisher = PUBLISHER_WRITE.test(code) && PUBLISHER_PATHS.test(code);
  const hasDegrade = DEGRADE_MARKER.some((re) => re.test(code));
  return { exists: true, isNetwork, isPublisher, hasDegrade };
}

function deskArtworkGuardFinding(src) {
  const rebuild = src.indexOf('node scripts/build-news-desk.mjs --rebuild');
  const guard = src.indexOf('git diff --name-only --diff-filter=MD -- assets/og/news/');
  const publish = src.indexOf('git add index.html data/news-desk/ assets/og/news/');
  if (rebuild < 0) return 'Desk publisher must run the normal --rebuild path';
  const rebuildLine = src.slice(rebuild, src.indexOf('\n', rebuild));
  if (rebuildLine.includes('--refresh-art')) return 'unattended Desk publisher must never pass --refresh-art';
  if (guard < rebuild || publish < guard) {
    return 'tracked Desk artwork mutation guard must run after rebuild and before git add';
  }
  return null;
}

// Split a workflow into step blocks so a `git push` is judged together with the
// rebase and retry logic that surrounds it, not against the whole file.
function stepBlocks(src) {
  const lines = src.split('\n');
  const starts = [];
  lines.forEach((l, i) => { if (/^\s*-\s+(name|uses|run|id)\s*:/.test(l)) starts.push(i); });
  return starts.map((s, k) => lines.slice(s, starts[k + 1] ?? lines.length).join('\n'));
}

// The helper is only a valid answer while it still DOES the thing. Read it — and
// read the code, not the prose. The first draft of this function matched the
// whole file and was satisfied by the helper's own header comment explaining why
// `git rebase --abort` matters; deleting the actual line left the gate green.
// Evidence for a code property has to come from code.
function stripShellComments(src) {
  return src.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '$1')).join('\n');
}
function helperRecovers() {
  const p = join(ROOT, 'scripts', 'ci', 'publish-push.sh');
  if (!existsSync(p)) return false;
  return /git\s+rebase\s+--abort/.test(stripShellComments(readFileSync(p, 'utf8')));
}

const LANDING_FIX =
  'rebases to land but cannot recover from a conflict — a conflicted rebase leaves a detached HEAD, ' +
  'so every later `git pull --rebase` fails on "unmerged files" and the push can never succeed. ' +
  `Delegate the landing to ${PUBLISH_HELPER}, or \`git rebase --abort\` before retrying.`;

// NOTE the subject: EVERY workflow that lands a commit, not only the unattended
// ones. The transient-network contract above is rightly scoped to schedule:/
// workflow_run: — a human is watching a push-triggered run's network call. A
// wedged rebase is different: it does not care what triggered the run, and the
// first negative control for this gate proved the point by passing. sitemap.yml
// carried the worst variant in the repo (push first, rebase after, never abort)
// and was invisible here purely because its trigger is `push:`.
function landingAudit(workflowFiles = listWorkflowFiles()) {
  const findings = [];
  const helperOk = helperRecovers();
  for (const wf of workflowFiles) {
    const src = readFileSync(join(WF_DIR, wf), 'utf8');
    for (const block of stepBlocks(src)) {
      const delegates = block.includes(PUBLISH_HELPER);
      if (delegates) {
        if (!helperOk) {
          findings.push({ workflow: wf, reason: `delegates landing to ${PUBLISH_HELPER}, which no longer aborts an in-progress rebase` });
        }
        continue;
      }
      if (!/\bgit\s+push\b/.test(block)) continue;          // not a landing step
      if (!/git\s+pull\s+--rebase/.test(block)) continue;    // not the rebase-to-land shape
      if (/git\s+rebase\s+--abort/.test(block)) continue;    // recovers in place
      findings.push({ workflow: wf, reason: LANDING_FIX });
    }
  }
  return findings;
}

// Core: find unattended publisher network-callers, invoked non-tolerantly, lacking a degrade marker.
function audit(workflowFiles = listWorkflowFiles()) {
  const findings = [];
  for (const wf of workflowFiles) {
    const src = readFileSync(join(WF_DIR, wf), 'utf8');
    if (!UNATTENDED_TRIGGER.test(src)) continue;
    for (const inv of parseWorkflowInvocations(src)) {
      if (!inv.liveInvocation || inv.tolerant) continue;
      const f = scriptFlags(inv.script);
      if (!f.exists || !f.isNetwork || !f.isPublisher) continue;
      if (f.hasDegrade) continue;
      findings.push({ workflow: wf, script: inv.script });
    }
  }
  if (workflowFiles.includes('news-publish.yml')) {
    const reason = deskArtworkGuardFinding(readFileSync(join(WF_DIR, 'news-publish.yml'), 'utf8'));
    if (reason) findings.push({ workflow: 'news-publish.yml', script: 'build-news-desk.mjs', reason });
  }
  return findings;
}

function selfTest() {
  let pass = 0, fail = 0;
  const assert = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

  // Synthetic workflow-invocation parser cases.
  const wfTolerant = `on:\n  schedule:\n    - cron: '0 9 * * *'\njobs:\n  x:\n    steps:\n      - run: node scripts/foo.mjs --json > out.json || true\n`;
  const wfHard = `on:\n  workflow_run:\n    workflows: ["E2E"]\njobs:\n  x:\n    steps:\n      - run: node scripts/foo.mjs\n`;
  const wfContinue = `on:\n  schedule:\n    - cron: '0 9 * * *'\njobs:\n  x:\n    steps:\n      - name: probe\n        continue-on-error: true\n        run: node scripts/foo.mjs\n`;
  const invT = parseWorkflowInvocations(wfTolerant)[0];
  const invH = parseWorkflowInvocations(wfHard)[0];
  const invC = parseWorkflowInvocations(wfContinue)[0];
  assert(invT && invT.tolerant === true, '`|| true` marks the invocation tolerant');
  assert(invH && invH.tolerant === false, 'bare invocation is non-tolerant');
  assert(invC && invC.tolerant === true, 'continue-on-error marks the step tolerant');
  const checkInv = parseWorkflowInvocations(wfHard.replace('foo.mjs', 'check-served-contract.mjs'))[0];
  assert(checkInv && checkInv.liveInvocation === false, 'check-* verifier is not misclassified as a publisher');
  assert(UNATTENDED_TRIGGER.test(wfHard) && UNATTENDED_TRIGGER.test(wfContinue), 'schedule/workflow_run detected as unattended');
  assert(!UNATTENDED_TRIGGER.test('on:\n  push:\n    branches: [main]\n'), 'push-only workflow is NOT unattended');
  const guardedDesk = 'node scripts/build-news-desk.mjs --rebuild\nchanged_art="$(git diff --name-only --diff-filter=MD -- assets/og/news/)"\ngit add index.html data/news-desk/ assets/og/news/';
  assert(deskArtworkGuardFinding(guardedDesk) === null, 'Desk artwork mutation guard is ordered between rebuild and publish');
  assert(/never pass --refresh-art/.test(deskArtworkGuardFinding(guardedDesk.replace('--rebuild', '--rebuild --refresh-art')) || ''), 'unattended Desk refresh-art is rejected');
  assert(/must run after rebuild/.test(deskArtworkGuardFinding(guardedDesk.replace('git diff --name-only --diff-filter=MD -- assets/og/news/', 'echo unguarded')) || ''), 'missing Desk artwork mutation guard is rejected');

  // Classifier regex cases.
  assert(NETWORK_CALL.some((r) => r.test(`execFileSync('gh', ['api'])`)), 'gh execFileSync is a network call');
  assert(NETWORK_CALL.some((r) => r.test('await fetch(signed.url)')), 'fetch is a network call');
  assert(NETWORK_FREE_MARKER.test('// @ci-publisher-network-free: emitted client fetch only'), 'reviewed generator marker is recognized');
  assert(PUBLISHER_WRITE.test('fs.writeFileSync(OUT, x)') && PUBLISHER_PATHS.test(`const OUT = 'api/ci-status.json'`), 'api/ writer is a publisher');
  assert(DEGRADE_MARKER.some((r) => r.test('export function isTransientGhError(err){}')), 'isTransientGhError is a degrade marker');
  assert(DEGRADE_MARKER.some((r) => r.test('const r = ghSafe(...)')), '*Safe wrapper is a degrade marker');

  // Live surface MUST be clean — the two S285 fixes carry their markers, the
  // tolerant/verifier scripts are correctly excluded.
  const live = audit();
  assert(live.length === 0, `live CI publisher surface must be clean (found: ${live.map((f) => f.script).join(', ') || 'none'})`);

  // ── S341 landing contract ────────────────────────────────────────────────
  // Reproduce the exact shape that failed live: a retry loop that rebases and
  // swallows the failure, with no way out of a conflicted rebase.
  const wfWedged = `on:\n  schedule:\n    - cron: '*/30 * * * *'\njobs:\n  x:\n    steps:\n      - name: publish\n        run: |\n          for attempt in 1 2 3 4; do\n            git pull --rebase --autostash origin main || true\n            if git push; then break; fi\n          done\n`;
  const wfInPlace = wfWedged.replace('if git push; then break; fi', 'if git push; then break; fi\n            git rebase --abort || true');
  const wfDelegates = `on:\n  schedule:\n    - cron: '*/30 * * * *'\njobs:\n  x:\n    steps:\n      - name: publish\n        run: |\n          bash ${PUBLISH_HELPER} "x"\n`;
  const wfPushOnly = `on:\n  schedule:\n    - cron: '0 9 * * *'\njobs:\n  x:\n    steps:\n      - name: tag\n        run: git push origin --tags\n`;

  // audit() reads real files, so exercise the landing classifier through the
  // same block/regex path using synthetic sources.
  const landingOf = (src) => {
    const helperOk = helperRecovers();
    const out = [];
    for (const block of stepBlocks(src)) {
      if (block.includes(PUBLISH_HELPER)) { if (!helperOk) out.push('helper-broken'); continue; }
      if (!/\bgit\s+push\b/.test(block)) continue;
      if (!/git\s+pull\s+--rebase/.test(block)) continue;
      if (/git\s+rebase\s+--abort/.test(block)) continue;
      out.push('wedged');
    }
    return out;
  };
  assert(landingOf(wfWedged).length === 1, 'a rebase-to-land loop with no abort is rejected');
  assert(landingOf(wfInPlace).length === 0, 'an in-place `git rebase --abort` satisfies the landing contract');
  assert(landingOf(wfDelegates).length === 0, 'delegating to the shared helper satisfies the landing contract');
  assert(landingOf(wfPushOnly).length === 0, 'a push that never rebases is not a landing finding');
  assert(helperRecovers(), `${PUBLISH_HELPER} exists and aborts an in-progress rebase`);
  // A push-triggered publisher is in scope: the wedge does not care who fired
  // the run. This case is here because its absence let the first negative
  // control pass — sitemap.yml is `on: push` and carried the worst variant.
  const wfPushTriggered = `on:\n  push:\n    branches: [main]\njobs:\n  x:\n    steps:\n      - name: publish\n        run: |\n          git pull --rebase origin main || true\n          git push\n`;
  assert(landingOf(wfPushTriggered).length === 1, 'a push-triggered publisher is still held to the landing contract');
  // Evidence must come from code, not from prose about the code: the helper's
  // header explains why the abort matters, and matching the raw file made the
  // gate green with the real line deleted.
  assert(stripShellComments('  : # git rebase --abort explained here').trim() === ':', 'shell comments are stripped before matching');
  assert(!/git\s+rebase\s+--abort/.test(stripShellComments('# `git rebase --abort` is what makes a retry a retry')), 'a comment mentioning the abort is not evidence of the abort');
  assert(/git\s+rebase\s+--abort/.test(stripShellComments('  git rebase --abort >/dev/null 2>&1 || true')), 'the real abort line survives comment-stripping');
  const liveLanding = landingAudit();
  assert(liveLanding.length === 0, `live landing surface must be clean (found: ${liveLanding.map((f) => f.workflow).join(', ') || 'none'})`);

  // Regression guard: the two archetype fixes must register as network publishers
  // WITH a degrade marker (i.e. would be flagged if the marker were removed).
  const beacon = scriptFlags('build-ci-status-beacon.mjs');
  const rum = scriptFlags('fetch-rum-from-r2.mjs');
  if (beacon.exists) assert(beacon.isNetwork && beacon.hasDegrade, 'beacon: network publisher WITH degrade marker');
  if (rum.exists) assert(rum.isNetwork && rum.hasDegrade, 'fetch-rum-from-r2: network caller WITH degrade marker');

  console.log(`check-ci-publisher-resilience --self-test: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

function main() {
  const findings = audit();
  const landing = landingAudit();

  if (findings.length === 0 && landing.length === 0) {
    const n = listWorkflowFiles().length;
    console.log(`check-ci-publisher-resilience: ✓ ${n} workflows scanned — every unattended publisher degrades on transient upstream errors AND can recover a conflicted landing`);
    return;
  }

  if (findings.length) {
    console.error(`check-ci-publisher-resilience: ${findings.length} unguarded publisher network-caller(s):`);
    for (const f of findings) {
      console.error(f.reason
        ? `  ${f.workflow} → scripts/${f.script}: ${f.reason}`
        : `  ${f.workflow} → scripts/${f.script}: makes a network call + publishes data, invoked non-tolerantly, no transient-degrade marker`);
    }
    console.error('  Fix: on a TRANSIENT upstream error (5xx/429/network reset), warn + process.exit(0) (preserve last-known-good);');
    console.error('       keep hard-failing on REAL errors (auth/config). See scripts/build-ci-status-beacon.mjs isTransientGhError for the pattern.');
  }

  if (landing.length) {
    console.error(`check-ci-publisher-resilience: ${landing.length} publisher(s) cannot recover a conflicted landing:`);
    for (const f of landing) console.error(`  ${f.workflow}: ${f.reason}`);
  }

  if (CHECK) process.exit(1);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  if (SELF_TEST) { selfTest(); process.exit(0); }
  main();
}
