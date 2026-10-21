import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const command = path.resolve('scripts/check-deploy-parity.mjs');
const shell = '<script src="/assets/nav-sheet.shell-aaaaaaaaaa.js"></script>';
function run(argv, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [command, ...argv], { cwd, windowsHide: true, timeout: 10000 });
    let out = '', err = '';
    child.stdout.on('data', data => { out += data; });
    child.stderr.on('data', data => { err += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, out, err }));
  });
}

test('real parity command requires successful route responses and actual expected shell', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-parity-'));
  const hits = [];
  let status = 200, body = shell;
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.writeHead(status, { 'content-type': 'text/html' });
    res.end(body);
  });
  try {
    fs.mkdirSync(path.join(cwd, 'assets'));
    fs.writeFileSync(path.join(cwd, 'assets/shell-manifest.json'), '{"version":"fixture"}');
    fs.writeFileSync(path.join(cwd, 'index.html'), shell);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const code of [200, 201, 404, 429, 500, 503]) {
      status = code;
      const result = await run(['--base', base], cwd);
      const report = JSON.parse(result.out);
      assert.equal(result.code, code < 300 ? 0 : 1, result.err);
      assert.equal(report.ok, code < 300);
      assert.equal(report.status, code);
      assert.deepEqual(report.missing, []);
      assert.deepEqual(report.unexpected, []);
    }
    status = 200;
    body = shell.replace('aaaaaaaaaa', 'bbbbbbbbbb');
    const mismatch = JSON.parse((await run([`--base=${base}`], cwd)).out);
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.responseOk, true);
    assert.equal(mismatch.missing.length, 1);
    assert.equal(mismatch.unexpected.length, 1);
    const local = await run(['--local'], cwd);
    assert.equal(local.code, 0, local.err);
    fs.writeFileSync(path.join(cwd, 'index.html'), '<html>No fingerprinted shell</html>');
    const empty = await run([], cwd);
    assert.equal(empty.code, 1);
    assert.equal(JSON.parse(empty.out).expectedShellPresent, false);
    assert.equal(hits.length, 7);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('malformed destinations and argv reject before filesystem or network IO; help and previews are inert', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-parity-admission-'));
  try {
    for (const argv of [
      ['--wat'], ['--base'], ['--route'], ['--local=true'], ['--local', '--local'],
      ['--base=http://127.0.0.1', '--base=http://127.0.0.1'],
      ['--local', '--base=http://127.0.0.1'], ['--self-test', '--route=/'],
      ['--base=file:///etc/passwd'], ['--base=https://example.com/sub/'],
      ['--base=https://name:password@example.com/'], ['--route=//example.com/'],
      ['--route=/../private'], ['--route=/%2e%2e/private'], ['--route=/a\\b'],
      ['--route=/a?x=1'], ['--route=/a#x'], ['unexpected'], ['--help', '--wat'],
    ]) {
      const result = await run(argv, cwd);
      assert.equal(result.code, 2, JSON.stringify({ argv, result }));
      assert.doesNotMatch(result.err, /ENOENT|fetch failed/);
    }
    for (const argv of [['--help'], ['-h'], ['--dry-run'], ['--check']]) {
      const result = await run(argv, cwd);
      assert.equal(result.code, 0, result.err);
      assert.match(result.out, /Usage:/);
      assert.equal(result.err, '');
    }
    assert.deepEqual(fs.readdirSync(cwd), []);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});
