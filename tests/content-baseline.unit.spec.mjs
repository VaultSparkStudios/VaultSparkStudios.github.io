import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { deriveQuorum } from '../scripts/build-deploy-currency.mjs';
import { partition } from '../scripts/check-content-lane-purity.mjs';
import { artifactBaseline, resolveContentBaseline, main, CONTENT_BASELINE_URL } from '../scripts/resolve-content-baseline.mjs';

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40);
const http = (sha = A, head = B, id = 'provider-origin') => ({ id, evidenceClass: 'provider-origin-http', _sha: sha, _contentLaneHead: head });
const sources = (sha = B) => [{ id: 'pages', evidenceClass: 'provider-metadata', _sha: sha }, { id: 'workflow', evidenceClass: 'workflow-attestation', _sha: sha }];
const stamp = (sha = A, head = B) => ({ schemaVersion: '1.1', sha, baselineSha: head ? sha : null, contentLaneHead: head });
const response = (body = stamp(), init = {}) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, ...init });

test('two source-head attestations cannot outvote the served executable baseline', () => {
  const q = deriveQuorum([http(), ...sources()]);
  assert.equal(q.state, 'overlay-agreed');
  assert.equal(q._sha, A);
  assert.equal(q._contentLaneHead, B);
  assert.equal(q.agreementCount, 3);
});

test('matching routed and provider artifacts retain baseline regardless of source vote count', () => {
  const q = deriveQuorum([http(), http(A, B, 'routed-apex'), ...sources()]);
  assert.equal(q._sha, A);
  assert.equal(q.state, 'overlay-agreed');
});

test('conflicting artifact baselines or overlay heads never certify an archive source', () => {
  for (const vantages of [[http(), http(C, B, 'routed-apex'), ...sources()], [http(), http(A, C, 'routed-apex'), ...sources()]]) {
    const q = deriveQuorum(vantages);
    assert.equal(q.state, 'disagreed');
    assert.equal(q._sha, null);
    assert.equal(q._contentLaneHead, null);
  }
});

test('source-only metadata and hotfix source disagreements cannot manufacture a baseline', () => {
  assert.equal(deriveQuorum(sources())._sha, null);
  assert.equal(deriveQuorum(sources()).state, 'insufficient');
  const hotfix = deriveQuorum([http(A, null), ...sources()]);
  assert.equal(hotfix.state, 'disagreed');
  assert.equal(hotfix._sha, null);
  const full = deriveQuorum([http(B, null), ...sources()]);
  assert.equal(full.state, 'agreed');
  assert.equal(full._sha, B);
});

test('an uncorroborated overlay head cannot advance the content clock', () => {
  const q = deriveQuorum([http(), { id: 'workflow', evidenceClass: 'workflow-attestation', _sha: A }]);
  assert.equal(q._sha, A);
  assert.equal(q.state, 'agreed');
  assert.equal(q._contentLaneHead, null);
});

test('live resolver observes only the fixed public artifact endpoint and ignores source metadata', async () => {
  let calls = 0;
  const baseline = await resolveContentBaseline({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, CONTENT_BASELINE_URL);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.ok(!Object.keys(options.headers).some((key) => /authorization|cookie/i.test(key)));
    return response();
  } });
  assert.equal(baseline, A);
  assert.equal(calls, 1);
  assert.equal(artifactBaseline({ ...stamp(A, null), baselineSha: A, deployedBy: 'pages-deploy-content-hotfix' }), A);
  assert.equal(artifactBaseline(stamp(A, null), A), A);
  assert.throws(() => artifactBaseline(stamp(), B), /differs from the live/);
});

test('malformed, conflicting, challenged or over-limit observations remain nonpassing', async () => {
  for (const bad of [null, {}, { ...stamp(), sha: 'abc' }, { ...stamp(), baselineSha: C }, { ...stamp(), baselineSha: null }, { ...stamp(), contentLaneHead: 'invalid' }, { ...stamp(), buildSha: B }]) {
    assert.throws(() => artifactBaseline(bad));
  }
  for (const fetchImpl of [
    async () => response(stamp(), { status: 403 }),
    async () => response(stamp(), { headers: { 'content-type': 'text/html' } }),
    async () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    async () => new Response(' '.repeat(16385), { headers: { 'content-type': 'application/json' } }),
    async () => response(stamp(), { headers: { 'content-type': 'application/json', 'content-length': '16385' } }),
    async () => { throw new Error('transport failed'); },
  ]) await assert.rejects(resolveContentBaseline({ fetchImpl }));
  await assert.rejects(resolveContentBaseline({ requested: B, fetchImpl: async () => response() }), /differs from the live/);
});

test('help and rejected CLI input do not fetch or write evidence; output is one exact SHA', async () => {
  let calls = 0;
  const output = [];
  const options = { requested: '', fetchImpl: async () => { calls++; return response(); }, write: (value) => output.push(value) };
  assert.equal(await main(['--help'], options), 0);
  assert.equal(calls, 0);
  assert.equal(await main(['--unknown'], options), 2);
  assert.equal(calls, 0);
  output.length = 0;
  assert.equal(await main(['--emit-github-output'], options), 0);
  assert.deepEqual(output, [`baseline=${A}`]);
  assert.equal(calls, 1);
});

test('every overlay workflow gate and archive consumes the same live baseline output', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/pages-deploy.yml', import.meta.url), 'utf8');
  assert.equal((workflow.match(/run: node scripts\/resolve-content-baseline\.mjs --emit-github-output/g) || []).length, 1);
  assert.equal((workflow.match(/BASELINE: \$\{\{ steps\.content-baseline\.outputs\.baseline \}\}/g) || []).length, 5);
  assert.ok(!workflow.includes("require('./api/deploy-currency.json').deployedSha"));
  assert.ok(!workflow.includes('BASELINE="$BASELINE_INPUT"'));
  for (const name of ['Evaluate content hotfix gate', 'Evaluate content lane (auto-scoped purity partition)', 'Resolve content-lane references against the deployed tree', 'Build hotfix dist (deployed tree + authorised content overlay)', 'Build content-lane dist (deployed tree + content-pure overlay)']) {
    const block = workflow.split(`- name: ${name}`)[1]?.split('\n      - name:')[0];
    assert.ok(block, `missing workflow block: ${name}`);
    assert.ok(block.includes('BASELINE: ${{ steps.content-baseline.outputs.baseline }}'), name);
  }
});

test('two actual git archive overlays keep withheld executable bytes at the artifact baseline', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-content-baseline-'));
  const source = path.join(root, 'source');
  fs.mkdirSync(source);
  const run = (command, args, cwd = source) => {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 15000 });
    assert.equal(result.status, 0, result.stderr || `${command} failed`);
    return result.stdout.trim();
  };
  const write = (rel, value) => { fs.mkdirSync(path.dirname(path.join(source, rel)), { recursive: true }); fs.writeFileSync(path.join(source, rel), value); };
  const commit = () => { run('git', ['add', '.']); run('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture']); return run('git', ['rev-parse', 'HEAD']); };
  try {
    run('git', ['init', '-q']);
    write('index.html', 'initial content');
    write('auth/index.html', 'approved auth');
    write('assets/member.js', 'approved executable');
    const baseline = commit();
    let served = stamp(baseline, null);
    for (let attempt = 1; attempt <= 2; attempt++) {
      write('index.html', `content release ${attempt}`);
      write('auth/index.html', `withheld auth ${attempt}`);
      write('assets/member.js', `withheld executable ${attempt}`);
      const head = commit();
      const selected = await resolveContentBaseline({ fetchImpl: async () => response(served) });
      assert.equal(selected, baseline);
      const changed = run('git', ['diff', '--name-only', `${selected}..${head}`]).split('\n');
      const lane = partition(changed);
      assert.deepEqual(lane.promotable, ['index.html']);
      const dist = path.join(root, `dist-${attempt}`);
      fs.mkdirSync(dist);
      const archive = path.join(root, `baseline-${attempt}.tar`);
      run('git', ['archive', '--format=tar', `--output=${archive}`, selected]);
      run('tar', ['-xf', archive, '-C', dist]);
      for (const rel of lane.promotable) fs.copyFileSync(path.join(source, rel), path.join(dist, rel));
      served = stamp(selected, head);
      assert.equal(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'), `content release ${attempt}`);
      assert.equal(fs.readFileSync(path.join(dist, 'auth/index.html'), 'utf8'), 'approved auth');
      assert.equal(fs.readFileSync(path.join(dist, 'assets/member.js'), 'utf8'), 'approved executable');
      assert.equal(deriveQuorum([http(selected, head), ...sources(head)])._sha, baseline);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
