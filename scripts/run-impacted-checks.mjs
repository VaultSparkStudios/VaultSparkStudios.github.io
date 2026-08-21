#!/usr/bin/env node
/** Execute the impacted plan and emit a receipt that is structurally PARTIAL. */
import { spawnSync } from './lib/safe-spawn.mjs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planForChanges } from './plan-build-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'impacted-checks.json');

function tokenize(command) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(command))) tokens.push(match[1] ?? match[2] ?? match[3]);
  return tokens;
}

export function receiptFor(plan, rows, startedAt, finishedAt) {
  const failed = rows.filter((row) => row.status !== 0);
  return {
    schemaVersion: 1,
    generatedAt: finishedAt,
    generatedBy: 'scripts/run-impacted-checks.mjs',
    publicSafe: true,
    state: failed.length ? 'failed' : 'passed-partial',
    authority: 'partial',
    canSatisfyCloseout: false,
    coverageComplete: false,
    changedPathCount: plan.changedPaths.length,
    unclaimedPaths: plan.unclaimedPaths,
    selectedCommandCount: plan.selectedCommandCount,
    fullCommandCount: plan.fullCommandCount,
    fullPlanFingerprint: plan.fullPlanFingerprint,
    selectedPlanFingerprint: plan.selectedPlanFingerprint,
    sourceFingerprint: plan.sourceFingerprint,
    startedAt,
    finishedAt,
    totalDurationMs: rows.reduce((sum, row) => sum + row.durationMs, 0),
    passed: rows.length - failed.length,
    failed: failed.length,
    steps: rows,
    note: 'Non-authoritative inner-loop evidence. This receipt is rejected by every closeout/full-build validator.',
  };
}

function selfTest() {
  const plan = { changedPaths: ['a.js'], unclaimedPaths: [], selectedCommandCount: 1, fullCommandCount: 275, fullPlanFingerprint: 'a', selectedPlanFingerprint: 'b', sourceFingerprint: 'c' };
  const green = receiptFor(plan, [{ step: 1, command: 'node a.mjs', status: 0, durationMs: 5 }], 'a', 'b');
  const red = receiptFor(plan, [{ step: 1, command: 'node a.mjs', status: 1, durationMs: 5 }], 'a', 'b');
  const cases = [
    ['green remains explicitly partial', green.state === 'passed-partial' && !green.canSatisfyCloseout && !green.coverageComplete],
    ['failure stays red', red.state === 'failed' && red.failed === 1],
    ['stdout is excluded', !JSON.stringify(green).includes('stdout')],
    ['full plan identity retained', green.fullCommandCount === 275 && green.fullPlanFingerprint === 'a'],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`run-impacted-checks --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

const isMain = process.argv[1] && join(process.argv[1]).toLowerCase() === join(fileURLToPath(import.meta.url)).toLowerCase();
if (isMain) {
  if (process.argv.includes('--self-test')) selfTest();
  const explicit = process.argv.find((arg) => arg.startsWith('--changed='));
  const changed = explicit ? explicit.slice('--changed='.length).split(',').filter(Boolean) : [];
  const plan = explicit ? planForChanges(changed) : (() => {
    const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'plan-build-check.mjs')], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error('impact planner failed');
    return JSON.parse(result.stdout);
  })();
  const startedAt = new Date().toISOString();
  const rows = [];
  for (const selected of plan.selected) {
    const [bin, ...args] = tokenize(selected.command);
    const started = Date.now();
    const result = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit', shell: false, windowsHide: true });
    rows.push({ step: selected.step, command: selected.command, reasons: selected.reasons, status: result.error ? 1 : (result.status ?? 1), durationMs: Date.now() - started, error: result.error?.message || null });
    if (rows.at(-1).status !== 0) break;
  }
  const receipt = receiptFor(plan, rows, startedAt, new Date().toISOString());
  writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`impacted checks: ${receipt.state} · ${receipt.passed}/${receipt.selectedCommandCount} selected · authority=partial`);
  if (receipt.state === 'failed') process.exit(1);
}
