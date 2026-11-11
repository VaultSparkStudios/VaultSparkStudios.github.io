import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';

test('CLI lock carryover keeps identity, time and head on the same boundary', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-lock-rotation-'));
  const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
  const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  const git = (...args) => {
    const result = run('git', args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const lockPath = path.join(root, 'context/.session-lock');
  const read = () => Object.fromEntries(fs.readFileSync(lockPath, 'utf8').trim().split('\n').map(line => {
    const i = line.indexOf(':'); return [line.slice(0, i), line.slice(i + 1).trim()];
  }));
  const write = (...args) => run(process.execPath, ['scripts/write-session-lock.mjs', '--agent', 'codex', '--trigger', 'founder-mission', ...args]);
  const seed = (timestamp, head) => fs.writeFileSync(lockPath, `session_id: 410\nsession_start: ${timestamp}\nstart_head: ${head}\n`);
  try {
    fs.mkdirSync(path.join(root, 'scripts/lib'), { recursive: true });
    fs.mkdirSync(path.join(root, 'context'));
    for (const name of ['write-session-lock.mjs', 'lib/session-identity.mjs', 'lib/safe-spawn.mjs', 'lib/git-window-guard.mjs', 'lib/fast-node.mjs']) {
      fs.copyFileSync(path.join(sourceRoot, 'scripts', name), path.join(root, 'scripts', name));
    }
    fs.writeFileSync(path.join(root, 'context/PROJECT_STATUS.json'), JSON.stringify({currentSession: 408}));
    fs.writeFileSync(path.join(root, 'context/SELF_IMPROVEMENT_LOOP.md'), '## Session 408\n');
    git('init', '--quiet');
    git('add', '.');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'test(S410): spent session above lagging surfaces');
    const head = git('rev-parse', 'HEAD');
    const priorTime = new Date(Date.now() - 60000).toISOString();
    seed(priorTime, 'a'.repeat(40));
    assert.equal(write().status, 0);
    let actual = read();
    assert.equal(actual.session_id, '410');
    assert.equal(actual.session_start, priorTime);
    assert.equal(actual.start_head, 'a'.repeat(40));

    assert.equal(write('--force').status, 0);
    actual = read();
    assert.equal(actual.session_id, '411', 'forced rotation must not reuse S410');
    assert.notEqual(actual.session_start, priorTime);
    assert.equal(actual.start_head, head);

    for (const time of [new Date(Date.now() - 13 * 3600000).toISOString(), 'invalid-time']) {
      seed(time, 'b'.repeat(40));
      assert.equal(write().status, 0);
      actual = read();
      assert.equal(actual.session_id, '411', 'stale/invalid rotation must discard old ID');
      assert.notEqual(actual.session_start, time);
      assert.equal(actual.start_head, head);
    }
    assert.equal(write('--session', '412').status, 0);
    assert.equal(read().session_id, '412');
    const before = fs.readFileSync(lockPath);
    assert.equal(write('--session', '408').status, 2);
    assert.deepEqual(fs.readFileSync(lockPath), before, 'invalid declaration must not mutate the lock');
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('vs-lock-rotation-'));
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
