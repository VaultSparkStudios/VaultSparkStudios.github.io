#!/usr/bin/env node
/**
 * run-build-check.mjs
 *
 * Windows cannot reliably execute the full build:check command once the chain
 * grows past the shell command-line limit. Keep the ordered command list in
 * package.json as build:check:steps and execute each step directly.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIAG_JSON = resolve(ROOT, 'api', 'build-check-diagnostics.json');
const DIAG_MD = resolve(ROOT, 'docs', 'BUILD_CHECK_DIAGNOSTICS.md');

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

export function commandsFromPackage(pkg) {
  const steps = pkg.scripts?.['build:check:steps'];
  if (!steps) throw new Error('package.json missing scripts.build:check:steps');
  return splitCommands(steps);
}

export function summarizeDiagnostics(rows, startedAt, finishedAt) {
  const failed = rows.filter((row) => row.status !== 0);
  const slowest = [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10);
  return {
    schemaVersion: '1.0',
    generatedAt: finishedAt,
    publicSafe: true,
    source: 'scripts/run-build-check.mjs',
    commandCount: rows.length,
    passed: rows.length - failed.length,
    failed: failed.length,
    totalDurationMs: rows.reduce((sum, row) => sum + row.durationMs, 0),
    startedAt,
    finishedAt,
    slowest,
    failures: failed.map((row) => ({
      step: row.step,
      command: row.command,
      status: row.status,
      durationMs: row.durationMs,
      error: row.error || null,
    })),
    steps: rows,
    note: 'Public-safe build gate timing and exit-code summary. Commands contain repo-local script names only; command output is intentionally excluded.',
  };
}

function writeDiagnostics(summary) {
  mkdirSync(dirname(DIAG_JSON), { recursive: true });
  mkdirSync(dirname(DIAG_MD), { recursive: true });
  writeFileSync(DIAG_JSON, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  const lines = [
    '# Build Check Diagnostics',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Latest: **${summary.passed}/${summary.commandCount}** passed · failed ${summary.failed} · total ${(summary.totalDurationMs / 1000).toFixed(1)}s`,
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
  writeFileSync(DIAG_MD, lines.join('\n'), 'utf8');
}

function selfTest() {
  const rows = [
    { step: 1, command: 'node a.mjs', status: 0, durationMs: 20 },
    { step: 2, command: 'node b.mjs', status: 1, durationMs: 50, error: null },
    { step: 3, command: 'node c.mjs', status: 0, durationMs: 10 },
  ];
  const summary = summarizeDiagnostics(rows, '2026-07-04T00:00:00.000Z', '2026-07-04T00:00:01.000Z');
  const cases = [
    ['counts commands', summary.commandCount === 3],
    ['counts pass/fail', summary.passed === 2 && summary.failed === 1],
    ['sorts slowest', summary.slowest[0].step === 2],
    ['excludes stdout', !JSON.stringify(summary).includes('stdout')],
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
    const parsed = JSON.parse(readFileSync(DIAG_JSON, 'utf8'));
    if (parsed.publicSafe !== true || !Array.isArray(parsed.steps) || !Array.isArray(parsed.slowest) || !Array.isArray(parsed.failures)) {
      console.error('run-build-check --check-diagnostics: malformed diagnostics');
      process.exit(1);
    }
    console.log(`run-build-check --check-diagnostics: ok (${parsed.passed}/${parsed.commandCount} passed)`);
    return;
  }

  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const commands = commandsFromPackage(pkg);
  const fromArg = process.argv.find((arg) => arg.startsWith('--from='));
  const from = fromArg ? Math.max(1, Number(fromArg.split('=')[1]) || 1) : 1;
  const startedAt = new Date().toISOString();
  const rows = [];
  console.log(`run-build-check: ${commands.length} step(s)${from > 1 ? ` · starting at ${from}` : ''}`);
  for (let i = from - 1; i < commands.length; i += 1) {
    const command = commands[i];
    const [bin, ...args] = tokenize(command);
    if (!bin) continue;
    console.log(`\n[build:check ${i + 1}/${commands.length}] ${command}`);
    const stepStarted = Date.now();
    const result = spawnSync(bin, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    });
    const durationMs = Date.now() - stepStarted;
    rows.push({
      step: i + 1,
      command,
      status: result.error ? 1 : (result.status ?? 1),
      durationMs,
      error: result.error ? result.error.message : null,
    });
    if (result.error) {
      writeDiagnostics(summarizeDiagnostics(rows, startedAt, new Date().toISOString()));
      console.error(`run-build-check: failed to start "${command}": ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== 0) {
      writeDiagnostics(summarizeDiagnostics(rows, startedAt, new Date().toISOString()));
      console.error(`run-build-check: step ${i + 1} failed with exit ${result.status}`);
      process.exit(result.status || 1);
    }
  }
  writeDiagnostics(summarizeDiagnostics(rows, startedAt, new Date().toISOString()));
  console.log('\nrun-build-check: all steps passed');
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
