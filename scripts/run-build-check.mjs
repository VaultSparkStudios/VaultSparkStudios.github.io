#!/usr/bin/env node
/**
 * run-build-check.mjs
 *
 * Windows cannot reliably execute the full build:check command once the chain
 * grows past the shell command-line limit. Keep the ordered command list in
 * package.json as build:check:steps and execute each step directly.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprintCommands, receiptIdFor, runBuildCheckEvidenceSelfTest, validateBuildCheckEvidence, verificationSurfaceFingerprint } from './lib/build-check-evidence.mjs';
import { writeJsonAtomic, writeTextAtomic } from './lib/evidence-io.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Verification lock (S308).
 *
 * `build:check` binds a source fingerprint into its receipt, so any edit to the
 * tree WHILE it runs invalidates the run — correctly, since a receipt cannot
 * certify a tree that changed underneath it. Three runs were wasted this
 * session doing exactly that: the wait looks like idle time, so it invites
 * "just one small edit", and several gates read the context files that felt
 * safest to touch.
 *
 * Intention does not fix this; a visible lock does. The file is advisory by
 * design — it costs nothing, survives a crash (stale locks are reported with
 * their age rather than trusted), and gives an agent, a hook, or a second
 * terminal one cheap thing to check before writing: `.cache/verification.lock`
 * exists → the tree is frozen, do read-only work instead.
 */
function verificationLockPath(root) {
  return resolve(root, '.cache', 'verification.lock');
}

function acquireVerificationLock(root) {
  const lock = verificationLockPath(root);
  try {
    mkdirSync(dirname(lock), { recursive: true });
    if (existsSync(lock)) {
      const prior = JSON.parse(readFileSync(lock, 'utf8'));
      const ageMin = Math.round((Date.now() - Date.parse(prior.startedAt)) / 60000);
      console.warn(`⚠ a verification lock is already present (started ${ageMin} min ago, pid ${prior.pid}).`);
      console.warn('  Either another run is in flight, or a previous run died. Overwriting.');
    }
    writeFileSync(lock, `${JSON.stringify({ startedAt: new Date().toISOString(), pid: process.pid }, null, 2)}\n`, 'utf8');
    console.log('🔒 tree frozen for verification — do not edit tracked files until this run reports.');
  } catch { /* advisory only: never fail a build over the lock */ }
  return lock;
}

function releaseVerificationLock(lock) {
  try {
    if (!lock || !existsSync(lock)) return;
    // Only clear our OWN lock. A stale process exiting must not unlock a run
    // that is still going — that turns the guard off at the worst moment.
    const held = JSON.parse(readFileSync(lock, 'utf8'));
    if (held?.pid && held.pid !== process.pid) return;
    rmSync(lock);
  } catch { /* advisory */ }
}
const ROOT = resolve(__dirname, '..');
const DIAG_JSON = resolve(ROOT, 'api', 'build-check-diagnostics.json');
const DIAG_MD = resolve(ROOT, 'docs', 'BUILD_CHECK_DIAGNOSTICS.md');
const MAX_STEP_SHARE = 0.30;
const MIN_ACTIONABLE_STEP_MS = 45_000;

function splitCommands(script) {
  return String(script || '')
    .split(/\s+&&\s+/)
    .map((cmd) => cmd.trim())
    .filter(Boolean);
}

function tokenize(command) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(command))) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

export function buildEntrypointHealth(pkg) {
  const entrypoint = String(pkg.scripts?.['build:check'] || '').trim();
  return entrypoint === 'node scripts/run-build-check.mjs'
    ? { ok: true, reason: null }
    : { ok: false, reason: 'scripts.build:check must delegate only to run-build-check.mjs so every gate is measured' };
}
export function commandsFromPackage(pkg) {
  const steps = pkg.scripts?.['build:check:steps'];
  if (!steps) throw new Error('package.json missing scripts.build:check:steps');
  const commands = splitCommands(steps);
  // S275: duplicate identical steps are pure wasted wall-clock and always a
  // merge/paste mistake — fail loud so the chain can't silently re-accumulate.
  const seen = new Set();
  const dups = commands.filter((c) => (seen.has(c) ? true : (seen.add(c), false)));
  if (dups.length) throw new Error(`build:check:steps has duplicate step(s): ${dups.join(' · ')}`);
  return commands;
}

export function summarizeDiagnostics(rows, startedAt, finishedAt, { plannedCommands = null, firstStep = null, sourceFingerprint = null } = {}) {
  const failed = rows.filter((row) => row.status !== 0);
  const slowest = [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10);
  const totalDurationMs = rows.reduce((sum, row) => sum + row.durationMs, 0);
  const dominant = slowest[0] || null;
  const dominantShare = dominant && totalDurationMs > 0 ? dominant.durationMs / totalDurationMs : 0;
  const plan = plannedCommands || rows.map((row) => row.command);
  const first = firstStep ?? rows[0]?.step ?? 1;
  const summary = {
    schemaVersion: '2.0',
    generatedAt: finishedAt,
    publicSafe: true,
    source: 'scripts/run-build-check.mjs',
    commandCount: rows.length,
    plannedCommandCount: plan.length,
    firstStep: first,
    coverageComplete: first === 1 && rows.length === plan.length,
    planFingerprint: fingerprintCommands(plan),
    sourceFingerprint: sourceFingerprint || fingerprintCommands(rows.map((row) => row.command)),
    passed: rows.length - failed.length,
    failed: failed.length,
    totalDurationMs,
    startedAt,
    finishedAt,
    slowest,
    concentration: {
      maxStepShare: MAX_STEP_SHARE,
      minActionableStepMs: MIN_ACTIONABLE_STEP_MS,
      dominantStep: dominant?.step ?? null,
      dominantCommand: dominant?.command ?? null,
      dominantDurationMs: dominant?.durationMs ?? 0,
      dominantShare: Number(dominantShare.toFixed(4)),
      breached: Boolean(dominant && dominant.durationMs >= MIN_ACTIONABLE_STEP_MS && dominantShare > MAX_STEP_SHARE),
    },
    failures: failed.map((row) => ({
      step: row.step,
      command: row.command,
      status: row.status,
      durationMs: row.durationMs,
      error: row.error || null,
    })),
    steps: rows,
    note: 'Public-safe build gate timing, plan identity, coverage, and direct exit-code summary. Command output is intentionally excluded.',
  };
  summary.receiptId = receiptIdFor(summary);
  return summary;
}
function writeDiagnostics(summary) {
  writeJsonAtomic(DIAG_JSON, summary);
  const lines = [
    '# Build Check Diagnostics',
    '',
    `Generated: ${summary.generatedAt}`,
    `Receipt: \`${summary.receiptId}\` · coverage ${summary.commandCount}/${summary.plannedCommandCount} from step ${summary.firstStep}`,
    '',
    `Latest: **${summary.passed}/${summary.commandCount}** passed · failed ${summary.failed} · total ${(summary.totalDurationMs / 1000).toFixed(1)}s`,
    `Concentration: **${(summary.concentration.dominantShare * 100).toFixed(1)}%** in step ${summary.concentration.dominantStep ?? '—'} · ratchet ${summary.concentration.breached ? 'BREACHED' : 'clear'} (>${Math.round(summary.concentration.maxStepShare * 100)}% and ≥${Math.round(summary.concentration.minActionableStepMs / 1000)}s)`,
    '',
    '## Slowest Steps',
    '',
    '| Step | Duration | Status | Command |',
    '|---:|---:|---:|---|',
    ...summary.slowest.map((row) => `| ${row.step} | ${(row.durationMs / 1000).toFixed(1)}s | ${row.status} | \`${row.command.replaceAll('|', '\\|')}\` |`),
    '',
    '## Failures',
    '',
    ...(summary.failures.length
      ? summary.failures.map((row) => `- Step ${row.step}: \`${row.command}\` exited ${row.status}${row.error ? ` (${row.error})` : ''}`)
      : ['- None.']),
    '',
  ];
  writeTextAtomic(DIAG_MD, lines.join('\n'));
  const persisted = validateBuildCheckEvidence(JSON.parse(readFileSync(DIAG_JSON, 'utf8')), {
    requireComplete: summary.coverageComplete,
    expectedPlanFingerprint: summary.planFingerprint,
    expectedSourceFingerprint: verificationSurfaceFingerprint(ROOT),
  });
  const persistedMarkdown = readFileSync(DIAG_MD, 'utf8');
  if (!persistedMarkdown.includes(`Receipt: \`${persisted.receiptId}\``)) {
    throw new Error('persisted build diagnostic Markdown does not match JSON receiptId');
  }
}

function selfTest() {
  const rows = [
    { step: 1, command: 'node a.mjs', status: 0, durationMs: 20 },
    { step: 2, command: 'node b.mjs', status: 1, durationMs: 50, error: null },
    { step: 3, command: 'node c.mjs', status: 0, durationMs: 10 },
  ];
  const summary = summarizeDiagnostics(rows, '2026-07-04T00:00:00.000Z', '2026-07-04T00:00:01.000Z');
  const concentrated = summarizeDiagnostics([
    { step: 1, command: 'node slow.mjs', status: 0, durationMs: 60_000 },
    { step: 2, command: 'node rest.mjs', status: 0, durationMs: 40_000 },
  ], '2026-07-04T00:00:00.000Z', '2026-07-04T00:01:40.000Z');
  let dupThrew = false;
  try {
    commandsFromPackage({ scripts: { 'build:check:steps': 'node a.mjs && node b.mjs && node a.mjs' } });
  } catch { dupThrew = true; }
  const cases = [
    ['counts commands', summary.commandCount === 3],
    ['counts pass/fail', summary.passed === 2 && summary.failed === 1],
    ['sorts slowest', summary.slowest[0].step === 2],
    ['short fixture does not trip duration-qualified ratchet', summary.concentration.breached === false],
    ['long dominant step trips concentration ratchet', concentrated.concentration.breached === true && concentrated.concentration.dominantShare === 0.6],
    ['excludes stdout', !JSON.stringify(summary).includes('stdout')],
    ['duplicate steps throw', dupThrew],
    ['unique steps pass', commandsFromPackage({ scripts: { 'build:check:steps': 'node a.mjs && node b.mjs' } }).length === 2],
    ['single measured entrypoint passes', buildEntrypointHealth({ scripts: { 'build:check': 'node scripts/run-build-check.mjs' } }).ok],
    ['unmeasured outer gate fails', !buildEntrypointHealth({ scripts: { 'build:check': 'node outer.mjs && node scripts/run-build-check.mjs' } }).ok],
    ['impact planner fixtures pass', spawnSync(process.execPath, [resolve(ROOT, 'scripts', 'plan-build-check.mjs'), '--self-test'], { cwd: ROOT, stdio: 'ignore', windowsHide: true }).status === 0],
    ['impact map covers the authoritative plan', spawnSync(process.execPath, [resolve(ROOT, 'scripts', 'plan-build-check.mjs'), '--check-coverage'], { cwd: ROOT, stdio: 'ignore', windowsHide: true }).status === 0],
    ['partial runner fixtures pass', spawnSync(process.execPath, [resolve(ROOT, 'scripts', 'run-impacted-checks.mjs'), '--self-test'], { cwd: ROOT, stdio: 'ignore', windowsHide: true }).status === 0],
    ...runBuildCheckEvidenceSelfTest().map(([name, ok]) => ['evidence kernel · ' + name, ok]),
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`run-build-check --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log('run-build-check --self-test: all passed');
}

function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }
  if (process.argv.includes('--check-diagnostics')) {
    if (!existsSync(DIAG_JSON) || !existsSync(DIAG_MD)) {
      console.error('run-build-check --check-diagnostics: missing diagnostics; run npm run build:check');
      process.exit(1);
    }
    try {
      const currentPackage = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
      const entrypointHealth = buildEntrypointHealth(currentPackage);
      if (!entrypointHealth.ok) throw new Error(entrypointHealth.reason);
      const expectedPlanFingerprint = fingerprintCommands(commandsFromPackage(currentPackage));
      const parsed = validateBuildCheckEvidence(JSON.parse(readFileSync(DIAG_JSON, 'utf8')), { requireComplete: true, expectedPlanFingerprint, expectedSourceFingerprint: verificationSurfaceFingerprint(ROOT) });
      if (parsed.publicSafe !== true || !Array.isArray(parsed.slowest) || !Array.isArray(parsed.failures)) throw new Error('public-safe diagnostic arrays missing');
      const markdown = readFileSync(DIAG_MD, 'utf8');
      if (!markdown.includes(`Receipt: \`${parsed.receiptId}\``)) throw new Error('Markdown receipt does not match JSON receiptId');
      console.log(`run-build-check --check-diagnostics: ok (${parsed.passed}/${parsed.commandCount} passed · receipt ${parsed.receiptId})`);
    } catch (error) {
      console.error(`run-build-check --check-diagnostics: malformed diagnostics — ${error.message}`);
      process.exit(1);
    }
    return;
  }

  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const entrypointHealth = buildEntrypointHealth(pkg);
  if (!entrypointHealth.ok) throw new Error(entrypointHealth.reason);
  const commands = commandsFromPackage(pkg);
  const QUIET = process.argv.includes('--quiet');
  const fromArg = process.argv.find((arg) => arg.startsWith('--from='));
  const from = fromArg ? Math.max(1, Number(fromArg.split('=')[1]) || 1) : 1;
  const startedAt = new Date().toISOString();
  const rows = [];
  const attestation = { plannedCommands: commands, firstStep: from, sourceFingerprint: verificationSurfaceFingerprint(ROOT) };
  console.log(`run-build-check: ${commands.length} step(s)${from > 1 ? ` · starting at ${from}` : ''}`);
  for (let i = from - 1; i < commands.length; i += 1) {
    const command = commands[i];
    const [bin, ...args] = tokenize(command);
    if (!bin) continue;
    if (!QUIET) console.log(`\n[build:check ${i + 1}/${commands.length}] ${command}`);
    const stepStarted = Date.now();
    const result = spawnSync(bin, args, {
      cwd: ROOT,
      // S335 --quiet: capture step output and replay it only on failure. The
      // full run is ~380 steps of stdio; an agent or CI log reader only needs
      // the failures and the per-step timing line.
      stdio: QUIET ? 'pipe' : 'inherit',
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
    });
    const durationMs = Date.now() - stepStarted;
    if (QUIET) {
      const ok = !result.error && result.status === 0;
      console.log(`${ok ? '✓' : '✗'} [${i + 1}/${commands.length}] ${(durationMs / 1000).toFixed(1)}s ${command}`);
      if (!ok) {
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
      }
    }
    rows.push({
      step: i + 1,
      command,
      status: result.error ? 1 : (result.status ?? 1),
      durationMs,
      error: result.error ? result.error.message : null,
    });
    if (result.error) {
      writeDiagnostics(summarizeDiagnostics(rows, startedAt, new Date().toISOString(), attestation));
      console.error(`run-build-check: failed to start "${command}": ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== 0) {
      writeDiagnostics(summarizeDiagnostics(rows, startedAt, new Date().toISOString(), attestation));
      console.error(`run-build-check: step ${i + 1} failed with exit ${result.status}`);
      process.exit(result.status || 1);
    }
  }
  const summary = summarizeDiagnostics(rows, startedAt, new Date().toISOString(), attestation);
  writeDiagnostics(summary);
  if (summary.concentration.breached) {
    console.error(`run-build-check: concentration ratchet breached — step ${summary.concentration.dominantStep} consumed ${(summary.concentration.dominantShare * 100).toFixed(1)}% (${(summary.concentration.dominantDurationMs / 1000).toFixed(1)}s)`);
    process.exit(1);
  }
  console.log('\nrun-build-check: all steps passed');
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  // Hold the lock for the whole run, including the failure paths — main()
  // exits via process.exit() on a failed step, so release must also run on
  // 'exit' or a red run would leave the tree looking permanently frozen.
  const lock = acquireVerificationLock(ROOT);
  process.on('exit', () => releaseVerificationLock(lock));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
  main();
}
