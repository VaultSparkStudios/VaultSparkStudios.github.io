#!/usr/bin/env node
/**
 * Verify that the latest recorded session has a complete closeout boundary.
 *
 * This catches the recovery class where handoff/log files were updated but the
 * closeout brief/cache artifact was never rendered before the session was cut off.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProjectEventLedger, validateProjectEventLedger } from './lib/closeout-event-ledger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const SKIP_DIRECTIVE_RE = /\[(?:skip ci|ci skip|skip-ci|ci-skip|no ci|skip actions|actions skip)\]/i;

export function deployTriggerMessageHealth(source) {
  const match = source.match(/const DEPLOY_TRIGGER_MESSAGE = '([^']+)'/);
  if (!match) return { ok: false, message: null, reason: 'DEPLOY_TRIGGER_MESSAGE constant missing' };
  if (SKIP_DIRECTIVE_RE.test(match[1])) {
    return { ok: false, message: match[1], reason: 'deploy-trigger message contains a CI skip directive' };
  }
  return { ok: true, message: match[1], reason: null };
}

export function measuredTestEvidenceHealth(source) {
  const suiteIndex = source.indexOf('runMeasuredBuildCheck()');
  const stampIndex = source.indexOf("[signalPath, '--from-diagnostics']");
  const reconcilesDerived = source.includes("runMeasuredBuildCheck('build:check (post-signal reconciliation)')");
  const legacyHandSignal = /update-test-signal[^\n]*(?:--green|--failed)/.test(source);
  if (suiteIndex < 0) return { ok: false, reason: 'closeout does not run a measured build-check gate' };
  if (stampIndex <= suiteIndex) return { ok: false, reason: 'closeout does not stamp diagnostics after the measured suite' };
  if (!reconcilesDerived) return { ok: false, reason: 'changed test evidence does not trigger derived-contract reconciliation' };
  if (legacyHandSignal) return { ok: false, reason: 'legacy hand-entered green/failed test signal remains reachable' };
  return { ok: true, reason: null };
}
export function taskBoardRotationHealth(source) {
  const invokesRotator = /rotate-taskboard\.mjs/.test(source);
  const normalizesHeadings = source.includes("for (const rotationArgs of [['--apply'], []])");
  const abortsOnFailure = /Task-board rotation exited[^]*closeout aborted/.test(source);
  if (!invokesRotator) return { ok: false, reason: 'closeout autopilot does not invoke rotate-taskboard.mjs' };
  if (!normalizesHeadings) return { ok: false, reason: 'task-board rotation does not run both heading normalization and archive rotation' };
  if (!abortsOnFailure) return { ok: false, reason: 'task-board rotation is not fail-closed' };
  return { ok: true, reason: null };
}

function readText(root, rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; }
}

function readJson(root, rel, fallback = null) {
  try { return JSON.parse(readText(root, rel)); } catch { return fallback; }
}

function latestCloseoutBrief(root, session) {
  const docs = path.join(root, 'docs');
  let names = [];
  try { names = fs.readdirSync(docs); } catch { return null; }
  const re = new RegExp(`^CLOSEOUT_BRIEF_S${session}_\\d{4}-\\d{2}-\\d{2}\\.md$`);
  const matches = names.filter((name) => re.test(name)).sort();
  return matches.length ? path.join('docs', matches[matches.length - 1]) : null;
}

export function evaluateCloseoutBoundary(root = ROOT, { ci = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' } = {}) {
  const status = readJson(root, 'context/PROJECT_STATUS.json', {});
  const session = Number(status?.currentSession || status?.silLastSession || 0);
  const findings = [];
  const ledger = {
    schemaVersion: '1.0',
    checkedAt: new Date().toISOString(),
    session,
    ok: false,
    artifacts: {},
    findings,
  };

  if (!Number.isFinite(session) || session <= 0) {
    findings.push('PROJECT_STATUS currentSession/silLastSession is missing or invalid');
    return ledger;
  }

  const handoff = readText(root, 'context/LATEST_HANDOFF.md');
  const workLog = readText(root, 'logs/WORK_LOG.md');
  const cacheRel = `.cache/closeout-brief-${session}.json`;
  const closeoutRel = latestCloseoutBrief(root, session);
  const cache = readJson(root, cacheRel, null);
  const autopilotSource = readText(root, 'scripts/closeout-autopilot.mjs');
  const triggerHealth = deployTriggerMessageHealth(autopilotSource);
  const rotationHealth = taskBoardRotationHealth(autopilotSource);
  const testEvidenceHealth = measuredTestEvidenceHealth(autopilotSource);

  ledger.artifacts = {
    handoffMentionsSession: new RegExp(`Session\\s+${session}\\b|S${session}\\b`, 'i').test(handoff),
    workLogMentionsSession: new RegExp(`Session\\s+${session}\\b|S${session}\\b`, 'i').test(workLog),
    closeoutBrief: closeoutRel,
    closeoutCache: cacheRel,
    closeoutCacheSession: cache?.session ?? null,
    closeoutCacheRequired: !ci,
    deployTriggerMessage: triggerHealth.message,
    deployTriggerCiVisible: triggerHealth.ok,
    taskBoardRotationAutomated: rotationHealth.ok,
    measuredTestEvidenceAutomated: testEvidenceHealth.ok,
  };

  if (!ledger.artifacts.handoffMentionsSession) findings.push(`LATEST_HANDOFF.md does not mention Session ${session}`);
  if (!ledger.artifacts.workLogMentionsSession) findings.push(`WORK_LOG.md does not mention Session ${session}`);
  if (!closeoutRel) findings.push(`missing docs/CLOSEOUT_BRIEF_S${session}_YYYY-MM-DD.md`);
  // The machine-local cache receipt is deliberately gitignored. Require it at
  // interactive closeout, where it proves the autopilot actually rendered its
  // boundary, but never make a clean CI checkout depend on an unpublishable
  // file. CI still verifies the tracked handoff, work log and closeout brief.
  if (!cache && !ci) findings.push(`missing or malformed ${cacheRel}`);
  else if (cache && String(cache.session).replace(/^S/i, '') !== String(session)) findings.push(`${cacheRel} session=${cache.session} does not match ${session}`);
  if (!triggerHealth.ok) findings.push(triggerHealth.reason);
  if (!rotationHealth.ok) findings.push(rotationHealth.reason);
  if (!testEvidenceHealth.ok) findings.push(testEvidenceHealth.reason);

  ledger.ok = findings.length === 0;
  return ledger;
}

function selfTest() {
  const tmp = path.join(ROOT, '.cache', '__closeout_boundary_test__');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmp, 'context'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'logs'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.cache'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'context', 'PROJECT_STATUS.json'), JSON.stringify({ currentSession: 9 }), 'utf8');
  fs.writeFileSync(path.join(tmp, 'context', 'LATEST_HANDOFF.md'), 'Session 9 handoff', 'utf8');
  fs.writeFileSync(path.join(tmp, 'logs', 'WORK_LOG.md'), '## Session 9', 'utf8');
  fs.writeFileSync(path.join(tmp, 'docs', 'CLOSEOUT_BRIEF_S9_2026-07-06.md'), '# ok', 'utf8');
  fs.writeFileSync(path.join(tmp, '.cache', 'closeout-brief-9.json'), JSON.stringify({ session: 9 }), 'utf8');
  fs.writeFileSync(path.join(tmp, 'scripts', 'closeout-autopilot.mjs'), [
    "const DEPLOY_TRIGGER_MESSAGE = 'chore(deploy): trigger build';",
    "for (const rotationArgs of [['--apply'], []]) {",
    "  spawnSync(process.execPath, ['rotate-taskboard.mjs', ...rotationArgs]);",
    "  if (r.status !== 0) console.error('Task-board rotation exited; closeout aborted');",
    "}",
    "runMeasuredBuildCheck();",
    "spawnSync(process.execPath, [signalPath, '--from-diagnostics']);",
    "runMeasuredBuildCheck('build:check (post-signal reconciliation)');",
    '',
  ].join('\n'), 'utf8');

  const good = evaluateCloseoutBoundary(tmp);
  const rotationGood = taskBoardRotationHealth(readText(tmp, 'scripts/closeout-autopilot.mjs'));
  const testEvidenceGood = measuredTestEvidenceHealth(readText(tmp, 'scripts/closeout-autopilot.mjs'));
  fs.rmSync(path.join(tmp, 'docs', 'CLOSEOUT_BRIEF_S9_2026-07-06.md'));
  const bad = evaluateCloseoutBoundary(tmp);
  fs.writeFileSync(path.join(tmp, 'docs', 'CLOSEOUT_BRIEF_S9_2026-07-06.md'), '# ok', 'utf8');
  fs.rmSync(path.join(tmp, '.cache', 'closeout-brief-9.json'));
  const cleanCi = evaluateCloseoutBoundary(tmp, { ci: true });
  const missingLocalCache = evaluateCloseoutBoundary(tmp, { ci: false });
  fs.rmSync(tmp, { recursive: true, force: true });

  const cases = [
    ['complete boundary passes', good.ok],
    ['missing closeout brief fails', !bad.ok && bad.findings.some((f) => /missing docs\/CLOSEOUT_BRIEF/.test(f))],
    ['clean CI does not require a gitignored cache receipt', cleanCi.ok && cleanCi.artifacts.closeoutCacheRequired === false],
    ['interactive closeout still requires its cache receipt', !missingLocalCache.ok && missingLocalCache.findings.some((f) => /closeout-brief-9\.json/.test(f))],
    ['event ledger resolves inside project root', resolveProjectEventLedger(tmp).startsWith(path.resolve(tmp) + path.sep)],
    ['CI-visible deploy trigger passes', deployTriggerMessageHealth("const DEPLOY_TRIGGER_MESSAGE = 'chore(deploy): trigger build';").ok],
    ['self-defeating skip directive fails', !deployTriggerMessageHealth("const DEPLOY_TRIGGER_MESSAGE = 'chore: trigger (was [skip ci])';").ok],
    ['complete task-board rotation passes', rotationGood.ok],
    ['measured test evidence wiring passes', testEvidenceGood.ok],
    ['missing measured test evidence fails', !measuredTestEvidenceHealth("runMeasuredBuildCheck(); update-test-signal --green").ok],
    ['missing task-board rotation fails', !taskBoardRotationHealth("const DEPLOY_TRIGGER_MESSAGE = 'x';").ok],
    ['advisory-only rotation fails', !taskBoardRotationHealth("spawnSync('rotate-taskboard.mjs', ['--check-size']);").ok],
  ];
  fs.mkdirSync(path.join(tmp, 'portfolio'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'portfolio', 'events.ndjson'), '{"type":"ship"}\n{"type":"closeout"}\n', 'utf8');
  cases.push(['valid local event ledger counts rows', validateProjectEventLedger(tmp).count === 2]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (failed.length) process.exit(1);
  console.log('check-closeout-boundary --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  const ledger = evaluateCloseoutBoundary(ROOT);
  fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.cache', 'closeout-boundary-ledger.json'), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  if (!ledger.ok) {
    console.error('check-closeout-boundary: incomplete latest-session closeout boundary');
    ledger.findings.forEach((finding) => console.error(`  - ${finding}`));
    process.exit(1);
  }
  console.log(`check-closeout-boundary: ok (S${ledger.session})`);
}
