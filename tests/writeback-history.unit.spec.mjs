import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { readCommits, run, WRITE_BACK_ANCHOR } from '../scripts/check-writeback-currency.mjs';

test('real merge closeout remains observable and subsequent abandoned work remains debt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-writeback-history-'));
  function git(...args) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  const write = (name, value) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), value); };
  const commit = subject => { git('add', '.'); git('commit', '-m', subject); return git('rev-parse', '--short=8', 'HEAD'); };
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    git('config', 'commit.gpgsign', 'false');
    write(WRITE_BACK_ANCHOR, '## Session 1\nTotal: 900/1000\n');
    const ordinary = commit('chore(S1): closeout');
    assert.equal(run(root, { syncState: { state: 'synced' } }).anchor.sha, ordinary);
    git('checkout', '-b', 'observer');
    write('api/observer.json', '{}\n');
    commit('chore(proof): observer');
    git('checkout', 'main');
    write('feature.txt', 'implemented\n');
    commit('feat(S2): implementation');
    git('merge', '--no-ff', '--no-commit', 'observer');
    write(WRITE_BACK_ANCHOR, '## Session 1\nTotal: 900/1000\n\n## Session 2\nTotal: 901/1000\n');
    const merge = commit('chore(S2): close verified release');
    const history = readCommits(root);
    assert.equal(history.filter(c => c.sha === merge).length, 1, 'one merge record, no duplicated per-parent commits');
    assert.ok(history.find(c => c.sha === merge).files.includes(WRITE_BACK_ANCHOR));
    const clean = run(root, { syncState: { state: 'synced' } });
    assert.equal(clean.ok, true, clean.reason);
    assert.equal(clean.unmeasured, false);
    assert.equal(clean.anchor.sha, merge);
    write('feature.txt', 'later unrecorded work\n');
    const debt = commit('feat(S3): unrecorded work');
    const later = run(root, { nowMs: Date.now() + 48 * 3600_000, syncState: { state: 'synced' } });
    assert.equal(later.ok, false, later.reason);
    assert.equal(later.debtCount, 1);
    assert.equal(later.debt[0].sha, debt);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
