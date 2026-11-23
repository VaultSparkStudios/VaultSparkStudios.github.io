// Studio Pulse live-look unit suite (S356). Runs the two fixture self-tests as
// subprocesses so `npm run test:unit` fails when either does. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('consolidated Studio loads the pulse runtime once from its nav-owned ambient block', () => {
  const html = fs.readFileSync(path.join(ROOT, 'studio/index.html'), 'utf8');
  const scripts = html.match(/<script\b[^>]*\bsrc=["']\/assets\/studio-pulse-live(?:\.shell-[a-f0-9]+)?\.js["'][^>]*><\/script>/g) || [];
  assert.equal(scripts.length, 1, 'duplicate pulse execution appends the same asynchronous field verdict twice');
  const ambient = html.match(/<!-- vs-ambient:start -->([\s\S]*?)<!-- vs-ambient:end -->/);
  assert.ok(ambient && ambient[1].includes(scripts[0]), 'the nav generator must own the single pulse runtime');
});

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
