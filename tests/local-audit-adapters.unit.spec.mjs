import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
const run = (script, args) => spawnSync(process.execPath, ['scripts/' + script + '.mjs', ...args], { encoding: 'utf8', windowsHide: true });
test('audit adapter rejects duplicate and foreign project/evidence selectors', () => {
  for (const args of [
    ['--audit', 'docs/AUDIT_2026-10-13.json', '--audit', '../vaultspark-studio-ops/docs/AUDIT_2026-10-11.json'],
    ['--audit=../foreign.json'], ['--project', '..'], ['--evidence', '../foreign.json'], ['--audit'],
  ]) assert.equal(run('check-audit-premises', args).status, 2, JSON.stringify(args));
});
test('local task adapter rejects custom boards and both adapters expose help without lookup', () => {
  assert.equal(run('task-slice', ['--path', '../foreign.md']).status, 2);
  for (const script of ['task-slice', 'check-audit-premises']) assert.equal(run(script, ['--help']).status, 0);
});
