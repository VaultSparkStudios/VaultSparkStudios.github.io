#!/usr/bin/env node
/** Focused regressions for verification ownership and observation scope. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { acquireVerificationLock, releaseVerificationLock } from './run-build-check.mjs';
import { collectWorkflowObservations } from './check-scheduled-workflow-staleness.mjs';
import { parseScheduledProbe } from './lib/scheduled-probe-result.mjs';
import { parseCurrentTaskInventory, currentTaskInventoryLabel, parseUnifiedItems } from './lib/task-board.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`ok ${name}`); }
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-process-contract-'));
try {
  test('exclusive lock retains original owner and exact release', () => {
    const owner = acquireVerificationLock(temp);
    const bytes = fs.readFileSync(owner.path, 'utf8');
    assert.throws(() => acquireVerificationLock(temp), /already exists/);
    assert.equal(fs.readFileSync(owner.path, 'utf8'), bytes);
    releaseVerificationLock({ ...owner, token: 'foreign' });
    assert.equal(fs.readFileSync(owner.path, 'utf8'), bytes);
    releaseVerificationLock(owner);
    assert.equal(fs.existsSync(owner.path), false);
  });
  test('old owner cannot clear replacement or malformed lock', () => {
    const owner = acquireVerificationLock(temp);
    fs.writeFileSync(owner.path, JSON.stringify({ pid: process.pid, token: 'replacement' }));
    releaseVerificationLock(owner);
    assert.equal(JSON.parse(fs.readFileSync(owner.path)).token, 'replacement');
    fs.writeFileSync(owner.path, '{torn');
    assert.throws(() => acquireVerificationLock(temp), /already exists/);
    releaseVerificationLock(owner);
    assert.equal(fs.readFileSync(owner.path, 'utf8'), '{torn');
  });
  test('acquisition I/O error is visible', () => {
    const invalid = path.join(temp, 'not-a-directory');
    fs.writeFileSync(invalid, 'file');
    assert.throws(() => acquireVerificationLock(invalid));
    releaseVerificationLock(null);
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const good = { ok: true, broken: [], silent: [], noData: [], checked: 2, unreachable: 0 };
const parse = (value, code = 0, execution) => parseScheduledProbe(JSON.stringify(value, null, 2), code, execution);
const warning = result => { assert.equal(result.pass, false); assert.equal(result.warn, true); };
test('fully measured result passes even when JSON is pretty printed', () => assert.equal(parse(good).pass, true));
test('silent-only and broken failures both retain names', () => {
  const silent = parse({ ...good, ok: false, silent: [{ name: 'daily' }] }, 1);
  assert.equal(silent.pass, false); assert.match(silent.detail, /daily \(silent\)/);
  const broken = parse({ ...good, ok: false, broken: [{ name: 'monthly', streak: 3 }] }, 1);
  assert.match(broken.detail, /monthly \(3 failures\)/);
});
test('partial, unmeasured, empty and skipped are never green', () => {
  warning(parse({ ...good, unreachable: 1 }));
  warning(parse({ ...good, noData: ['unknown'] }));
  warning(parse({ ...good, checked: 0 }));
  warning(parse({ ok: true, skipped: true, reason: 'network unavailable' }));
});
test('malformed or contradictory evidence cannot pass on exit zero', () => {
  for (const out of ['', 'not-json', '{}', 'null', '[]']) warning(parseScheduledProbe(out, 0));
  warning(parse({ ...good, ok: false })); warning(parse(good, 1)); warning(parse(good, null));
  warning(parse({ ...good, noData: ['a', 'b', 'c'] }));
});
test('timeout and signal override even valid success output', () => {
  warning(parse(good, 0, { error: { code: 'ETIMEDOUT' } }));
  warning(parse(good, 0, { signal: 'SIGTERM' }));
});
test('global deadline stops fetching and retains measured partial results', () => {
  let time = 0; const calls = [];
  const result = collectWorkflowObservations([{ name: 'a' }, { name: 'b' }, { name: 'c' }], {
    now: () => time, budgetMs: 10,
    fetch: (wf, timeout) => { calls.push([wf.name, timeout]); time += 10; return { ok: true, runs: [] }; },
  });
  assert.deepEqual(calls, [['a', 10]]);
  assert.equal(result.observed.length, 1);
  assert.deepEqual(result.unreachableWorkflows, ['b', 'c']);
  assert.equal(result.timedOut, true);
});
test('failed request remains named while later observation succeeds', () => {
  const result = collectWorkflowObservations([{ name: 'a' }, { name: 'b' }], {
    now: () => 0, fetch: wf => wf.name === 'a' ? { ok: false, reason: 'denied' } : { ok: true, runs: [] },
  });
  assert.deepEqual(result.unreachableWorkflows, ['a']); assert.equal(result.observed[0].name, 'b');
  assert.equal(result.firstFailure, 'denied');
});
const board = '# Board\r\n## Now (next session ready)\r\n- [ ] <!-- evidence-open: source --> **[S347] Implement parser.**\r\n  Preserve continuation.\r\n- [x] **Already done**\r\n## Historical Now\r\n- [ ] Ignore history\r\n## Next\r\n- [ ] Ignore later\r\n## Human Action Required\r\n- [ ] **Ceremony**\r\n';
test('current bullets preserve scope, titles and continuations', () => {
  const parsed = parseCurrentTaskInventory(board);
  assert.equal(parsed.current.length, 1); assert.equal(parsed.human.length, 1);
  assert.equal(parsed.current[0].title, '[S347] Implement parser.');
  assert.match(parsed.current[0].rawItem, /Preserve continuation/);
  assert.equal(currentTaskInventoryLabel(board), 'Open current tasks 1 / Human-action entries 1');
});
test('multiline comments preserve original task source line', () => {
  const source = '# Board\r\n## Now\r\n<!-- note\r\ncontinued\r\n-->\r\n- [ ] **Task**\r\n';
  const task = parseCurrentTaskInventory(source).current[0];
  assert.equal(task.line, 6);
  assert.equal(source.split(/\r?\n/)[task.line - 1], '- [ ] **Task**');
});
test('empty current inventory is distinct from absent format', () => {
  assert.equal(currentTaskInventoryLabel('## Now\n- [x] Done'), 'Open current tasks 0 / Human-action entries 0');
  assert.equal(currentTaskInventoryLabel('## Historical Now\n- [ ] Old'), 'Current task inventory unavailable');
});
test('legacy table parser remains unchanged', () => {
  const rows = parseUnifiedItems('## Unified Genius List\n| 1 | L3 | BUILD | unblocked | 1h | **Ship** |\n');
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'unblocked'); assert.equal(rows[0].title, 'Ship');
});
test('live board checkbox inventory is visible to startup', () => {
  const live = fs.readFileSync(path.join(root, 'context/TASK_BOARD.md'), 'utf8');
  const parsed = parseCurrentTaskInventory(live);
  if (parsed.format === 'checkbox') assert.match(currentTaskInventoryLabel(live), /^Open current tasks \d+/);
  const renderer = fs.readFileSync(path.join(root, 'scripts/render-startup-brief.mjs'), 'utf8');
  assert.match(renderer, /currentTaskInventoryLabel\(taskBoard\)/);
  assert.match(renderer, /row\(inventoryLabel\)/);
});
// Keep the real CLI dispatcher and lock functions, but replace mode workloads
// with bounded markers. Ownership does not require repeating the impact-map suite.
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-cli-ownership-'));
try {
  fs.mkdirSync(path.join(fixtureRoot, 'scripts'));
  fs.mkdirSync(path.join(fixtureRoot, '.cache'));
  let runner = fs.readFileSync(path.join(root, 'scripts/run-build-check.mjs'), 'utf8');
  runner = runner.replace(/from '(\.\/[^']+)'/g, (_, spec) => `from '${pathToFileURL(path.resolve(root, 'scripts', spec)).href}'`);
  const selfStart = runner.indexOf('function selfTest() {');
  const mainStart = runner.indexOf('function main() {', selfStart);
  assert.ok(selfStart >= 0 && mainStart > selfStart);
  runner = runner.slice(0, selfStart) + `function selfTest() { console.log('fixture:self-test'); if (process.argv.includes('--fixture-fail')) process.exit(1); }\n\n` + runner.slice(mainStart);
  const diagnosticStart = runner.indexOf("  if (process.argv.includes('--check-diagnostics')) {");
  const lockStart = runner.indexOf('  const lock = acquireVerificationLock(ROOT);', diagnosticStart);
  assert.ok(diagnosticStart > 0 && lockStart > diagnosticStart);
  runner = runner.slice(0, diagnosticStart) + `  if (process.argv.includes('--check-diagnostics')) { console.log('fixture:diagnostics'); if (process.argv.includes('--fixture-fail')) process.exit(1); return; }\n` + runner.slice(lockStart);
  const runnerPath = path.join(fixtureRoot, 'scripts/run-build-check.mjs');
  fs.writeFileSync(runnerPath, runner);
  const lockPath = path.join(fixtureRoot, '.cache/verification.lock');
  const sentinel = JSON.stringify({ pid: process.pid, token: 'outer-suite-owner' });
  fs.writeFileSync(lockPath, sentinel);
  for (const mode of ['--self-test', '--check-diagnostics']) {
    for (const failing of [false, true]) {
      test(`${mode} ${failing ? 'failure' : 'success'} preserves outer ownership`, () => {
        const child = spawnSync(process.execPath, [runnerPath, mode, ...(failing ? ['--fixture-fail'] : [])], { cwd: fixtureRoot, encoding: 'utf8', timeout: 10000 });
        assert.equal(child.error, undefined, child.error?.message);
        assert.equal(child.status, failing ? 1 : 0, child.stdout + child.stderr);
        assert.match(child.stdout, /fixture:/);
        assert.equal(fs.readFileSync(lockPath, 'utf8'), sentinel);
      });
    }
  }
} finally {
  assert.equal(path.dirname(path.resolve(fixtureRoot)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(fixtureRoot).startsWith('vs-cli-ownership-'));
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
console.log(`recovery process contract: ${passed}/${passed} passed`);
