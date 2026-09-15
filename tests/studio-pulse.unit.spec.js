// Studio Pulse live-look unit suite (S356). Runs the two fixture self-tests as
// subprocesses so `npm run test:unit` fails when either does. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runScript(args) {
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 60_000 });
}

test('studio pulse activity + presence + timeline view self-test passes', () => {
  const r = runScript(['scripts/test-studio-pulse-activity.mjs']);
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /test-studio-pulse-activity: (\d+)\/\1 passed/);
});

test('studio timeline generator self-test passes (fixtures only)', () => {
  const r = runScript(['scripts/build-studio-timeline.mjs', '--self-test']);
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /build-studio-timeline --self-test: (\d+)\/\1 passed/);
});
