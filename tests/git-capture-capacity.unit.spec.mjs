import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync as nativeExecFileSync, spawnSync as nativeSpawnSync } from 'node:child_process';
import { execFileSync, execSync, spawnSync } from '../scripts/lib/safe-spawn.mjs';

test('complete real Git inventory equals the explicitly bounded native control for both capture APIs', () => {
  const expected = nativeExecFileSync('git', ['ls-files', '-z'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  let actual;
  try { actual = execFileSync('git', ['ls-files', '-z']); }
  catch (error) { assert.fail(`Complete Git capture failed before returning the inventory: ${error.code}`); }
  assert.ok(actual.equals(expected), 'No paths are truncated, filtered or reordered');
  const spawned = spawnSync('git', ['ls-files', '-z']);
  assert.equal(spawned.error, undefined);
  assert.equal(spawned.status, 0);
  assert.ok(spawned.stdout.equals(expected));
  assert.ok(execSync('git ls-files -z').equals(expected), 'Shell Git capture has the same capacity policy');
});

test('explicit Git limits remain fail-closed and non-Git defaults remain native', () => {
  const small = spawnSync('git', ['ls-files', '-z'], { maxBuffer: 64 });
  assert.equal(small.error?.code, 'ENOBUFS');
  const args = ['-e', "process.stdout.write('x'.repeat(1100000))"];
  const native = nativeSpawnSync(process.execPath, args, { windowsHide: true });
  const wrapped = spawnSync(process.execPath, args);
  assert.equal(native.error?.code, 'ENOBUFS');
  assert.equal(wrapped.error?.code, 'ENOBUFS');
  // Overflow may race a successful child exit; ENOBUFS is the capture failure
  // contract in both controls, independent of their termination status.
});
