import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from '../scripts/lib/safe-spawn.mjs';
import { summarize, laneFor } from '../scripts/check-served-parity.mjs';

const script = path.resolve('scripts/check-served-parity.mjs');
function run(args, root) {
  return new Promise((resolve, reject) => {
    // Invoke the actual CLI entry with only its repository dependency injected.
    const entry = `import {main} from ${JSON.stringify(pathToFileURL(script).href)}; main(process.argv.slice(1), {root:${JSON.stringify(root)}}).then(code=>{process.exitCode=code}).catch(e=>{console.error(e.message);process.exitCode=1});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', entry, '--', ...args], { windowsHide: true, timeout: 60000 });
    let out = '', err = '';
    child.stdout.on('data', data => { out += data; });
    child.stderr.on('data', data => { err += data; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, out, err }));
  });
}

test('served parity refuses incomplete, duplicate, unknown and empty coverage', () => {
  const row = (file, state) => ({ file, state, lane: laneFor(file) });
  for (const [rows, expected] of [
    [[], []],
    [[row('index.html', 'identical')], ['index.html', 'sw.js']],
    [[row('index.html', 'identical'), row('index.html', 'identical')], ['index.html', 'sw.js']],
    [[row('other.html', 'identical')], ['index.html']],
    [[row('index.html', 'unknown')], ['index.html']],
    [[row('index.html', 'redirected')], ['index.html']],
    [[row('index.html', 'not-served')], ['index.html']],
  ]) assert.equal(summarize(rows, expected).verdict, 'unverified');
  assert.equal(summarize([row('index.html', 'identical')]).verdict, 'tree-current');
  assert.equal(summarize([row('index.html', 'differ')]).verdict, 'content-lag');
  assert.equal(summarize([row('sw.js', 'differ')]).verdict, 'content-current');
});

test('CLI admission rejects malformed options without repository, network or output IO', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-served-admit-'));
  const hits = [];
  const server = http.createServer((req, res) => { hits.push(req.url); res.end('unexpected'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const report = path.join(root, 'report.json');
  try {
    for (const args of [
      ['--wat'], ['--origin'], ['--against='], ['--concurrency=0'], ['--concurrency=-1'], ['--concurrency=NaN'], ['--concurrency=1.5'], ['--concurrency=65'], ['--concurrency=9007199254740992'],
      ['--require=bogus'], ['--origin=file:///tmp/a'], ['--origin=https://user:pass@example.com/'], ['--origin=https://example.com/path'], ['--origin=https://example.com/path/..'], ['--origin=https://example.com/?a=1'], ['--origin=https://example.com/#x'],
      ['--against=--help'], ['--against=HEAD..main'], ['--help', '--wat'], ['--self-test', '--against=HEAD'], ['--origin=' + origin, '--origin=' + origin], ['positional'],
    ]) {
      const result = await run([...args, `--json-out=${report}`], root);
      assert.equal(result.code, 2, JSON.stringify({ args, result }));
      assert.doesNotMatch(result.err, /not a git repository|fetch failed|ENOENT/);
    }
    for (const arg of ['--help', '-h', '--dry-run', '--check']) {
      const result = await run([arg], root);
      assert.equal(result.code, 0, result.err);
      assert.match(result.out, /Usage:/);
    }
    assert.deepEqual(hits, []);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('real CLI measures bytes, missing files and committed redirect contracts', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-served-http-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const hits = [];
  let body = 'home', status = 200, location = '/#canonical', redirectStatus = 301;
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    if (req.url === '/old/') {
      res.writeHead(redirectStatus, location === null ? {} : { location });
      res.end('retired');
    } else { res.writeHead(status); res.end(body); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const reportFile = path.join(root, 'report.json');
  const invoke = async (extra = []) => {
    hits.length = 0;
    const result = await run([`--origin=${origin}`, '--against=HEAD', '--require=tree-current', `--json-out=${reportFile}`, ...extra], root);
    assert.ok(fs.existsSync(reportFile), result.err);
    return { ...result, report: JSON.parse(fs.readFileSync(reportFile, 'utf8')) };
  };
  try {
    git('init', '--quiet');
    git('config', 'user.name', 'Parity fixture');
    git('config', 'user.email', 'parity@example.test');
    fs.writeFileSync(path.join(root, 'index.html'), 'home');
    fs.mkdirSync(path.join(root, 'old'));
    fs.writeFileSync(path.join(root, 'old/index.html'), 'retired');
    fs.writeFileSync(path.join(root, '_redirects'), '/old/ /#canonical 301\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'fixture');
    // Dirty config must not change the compared commit's redirect contract.
    fs.writeFileSync(path.join(root, '_redirects'), '/old/ https://evil.example/ 302\n');
    for (const target of ['/#canonical', `${origin}/#canonical`]) {
      location = target;
      const result = await invoke(['--concurrency=2']);
      assert.equal(result.code, 0, result.err);
      assert.equal(result.report.verdict, 'tree-current');
      assert.equal(result.report.redirected, 1);
      assert.equal(result.report.coverageComplete, true);
      assert.equal(result.report.expected, 2);
      assert.deepEqual(hits.slice().sort(), ['/', '/old/']);
    }
    for (const target of [null, '/other', '/#wrong', '/?x=1#canonical', 'https://evil.example/#canonical']) {
      location = target;
      const result = await invoke();
      assert.equal(result.code, 1, JSON.stringify({ target, result }));
      assert.equal(result.report.verdict, 'unverified');
    }
    location = '/#canonical';
    for (const code of [200, 302, 404, 500]) {
      redirectStatus = code;
      const result = await invoke();
      assert.equal(result.code, 1, result.err);
      assert.equal(result.report.verdict, 'unverified');
    }
    redirectStatus = 301;
    for (const code of [301, 302, 303, 307, 308, 404, 429, 500]) {
      status = code;
      const result = await invoke();
      assert.equal(result.code, 1, result.err);
      assert.equal(result.report.verdict, 'unverified');
    }
    status = 200;
    body = 'stale home';
    const stale = await invoke();
    assert.equal(stale.code, 1);
    assert.equal(stale.report.verdict, 'content-lag');
    body = 'home';
    status = 404;
    const reportOnly = await run([`--origin=${origin}`, '--against=HEAD'], root);
    assert.equal(reportOnly.code, 0, reportOnly.err);
    assert.match(reportOnly.out, /unverified/);
    // A compared tree without any public files cannot certify deployment.
    git('rm', 'index.html', 'old/index.html');
    git('commit', '--quiet', '-m', 'empty served tree');
    const empty = await invoke();
    assert.equal(empty.code, 1);
    assert.equal(empty.report.verdict, 'unverified');
    assert.equal(empty.report.coverageComplete, false);
    assert.deepEqual(hits, []);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
