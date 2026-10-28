import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';

const root = path.resolve(import.meta.dirname, '..');

function fixture(script, run) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-diagnostic-help-'));
  try {
    fs.mkdirSync(path.join(temp, 'scripts/lib'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'context'));
    fs.copyFileSync(path.join(root, `scripts/${script}.mjs`), path.join(temp, `scripts/${script}.mjs`));
    for (const lib of ['scheduled-probe-result', 'cli-contract']) {
      fs.copyFileSync(path.join(root, `scripts/lib/${lib}.mjs`), path.join(temp, `scripts/lib/${lib}.mjs`));
    }
    fs.writeFileSync(path.join(temp, 'scripts/lib/safe-spawn.mjs'), 'export function spawnSync(){throw new Error("HELP_SPAWN_TRIPWIRE");}\n');
    fs.writeFileSync(path.join(temp, 'context/PROJECT_STATUS.json'), '{"sentinel":true}\n');
    run(temp, args => spawnSync(process.execPath, [path.join(temp, `scripts/${script}.mjs`), ...args], {
      cwd: temp, encoding: 'utf8', timeout: 30_000, windowsHide: true,
    }));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function snapshot(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map(entry => [
    entry.name, entry.isDirectory() ? snapshot(path.join(dir, entry.name)) : fs.readFileSync(path.join(dir, entry.name)).toString('base64'),
  ]);
}

for (const script of ['run-doctor', 'verify-clean-checkout']) {
  const mutationArgs = script === 'run-doctor'
    ? ['--fix', '--loop', '--update-json', '--json', '--self-test']
    : ['--keep', '--ref=not-a-commit', '--from=999', '--self-test'];

  for (const [name, extra] of [['alone', []], ['before operational flags', mutationArgs]]) {
    test(`${script}: both help aliases ${name} print usage without probes or writes`, () => {
      fixture(script, (temp, run) => {
        const before = snapshot(temp);
        for (const alias of ['--help', '-h']) {
          const result = run([alias, ...extra]);
          assert.equal(result.error, undefined);
          assert.equal(result.status, 0, result.stderr);
          assert.match(result.stdout, /Usage:/);
          assert.match(result.stdout, new RegExp(script));
          assert.doesNotMatch(result.stdout, /HEALTH CHECK|build:check at|self-test.*passed/);
          assert.equal(result.stderr, '');
          assert.deepEqual(snapshot(temp), before);
        }
        // Position does not change help's precedence over an operational flag.
        if (extra.length) {
          const result = run([...extra, '--help']);
          assert.equal(result.status, 0, result.stderr);
          assert.match(result.stdout, /Usage:/);
          assert.deepEqual(snapshot(temp), before);
        }
      });
    });
  }

  test(`${script}: normal invocation still enters the existing operational lane`, () => {
    fixture(script, (_temp, run) => {
      const result = run([]);
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /HELP_SPAWN_TRIPWIRE/);
      assert.doesNotMatch(result.stdout, /Usage:/);
    });
  });

  test(`${script}: existing self-test still runs`, () => {
    fixture(script, (_temp, run) => {
      const result = run(['--self-test']);
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /self-test/);
      assert.doesNotMatch(result.stdout, /Usage:/);
    });
  });
}
