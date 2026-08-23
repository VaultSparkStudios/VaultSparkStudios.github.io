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
  if (findings.length === 0) {
    const n = listWorkflowFiles().length;
    console.log(`check-ci-publisher-resilience: ✓ ${n} workflows scanned — every unattended publisher network-caller degrades on transient upstream errors`);
    return;
  }
  console.error(`check-ci-publisher-resilience: ${findings.length} unguarded publisher network-caller(s):`);
  for (const f of findings) {
    console.error(f.reason
      ? `  ${f.workflow} → scripts/${f.script}: ${f.reason}`
      : `  ${f.workflow} → scripts/${f.script}: makes a network call + publishes data, invoked non-tolerantly, no transient-degrade marker`);
  }
  console.error('  Fix: on a TRANSIENT upstream error (5xx/429/network reset), warn + process.exit(0) (preserve last-known-good);');
  console.error('       keep hard-failing on REAL errors (auth/config). See scripts/build-ci-status-beacon.mjs isTransientGhError for the pattern.');
  if (CHECK) process.exit(1);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  if (SELF_TEST) { selfTest(); process.exit(0); }
  main();
}
