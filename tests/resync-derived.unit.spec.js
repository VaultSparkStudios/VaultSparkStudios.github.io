import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from '../scripts/lib/safe-spawn.mjs';
import { repairInvocation } from '../scripts/lib/repair-invocation.mjs';
import { trackedInventory, untrackedSourceNodes } from '../scripts/lib/tracked-inventory.mjs';
import { sweepUnmodeled, topoOrder, stagePaths } from '../scripts/resync-derived.mjs';
import { validateEvidenceGraph, loadEvidenceGraph, affectedEvidenceNodes } from '../scripts/lib/evidence-graph.mjs';

function fixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'vss-repair-fixture-'));
  fs.mkdirSync(path.join(root, 'scripts'));
  t.after(() => {
    const resolved = fs.realpathSync(root);
    assert(resolved.startsWith(parent + path.sep) && path.basename(resolved).startsWith('vss-repair-fixture-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, 'scripts/build-required.mjs'), `
import fs from 'node:fs';
const args = new Set(process.argv.slice(2));
if (args.has('--rebuild')) fs.writeFileSync('output.json', '{"fresh":true}');
else if (args.has('--check')) { if (!fs.existsSync('output.json')) process.exitCode = 1; }
else { console.error('Usage: --rebuild | --check'); process.exitCode = 2; }
`);
  return root;
}

test('mode-required repair rejects bare/typo/check modes before invoking a builder', t => {
  const root = fixture(t), builder = 'scripts/build-required.mjs';
  assert.throws(() => repairInvocation({ builder }, { root, profiles: {} }), /no invocation mode/);
  assert.throws(() => repairInvocation({ builder, builderArgs: ['--rebuidl'] }, { root }), /recognises none/);
  assert.throws(() => repairInvocation({ builder, builderArgs: ['--check'] }, { root }), /non-repair/);
  assert(!fs.existsSync(path.join(root, 'output.json')));
});

test('modeled repair passes explicit args through to the real child', t => {
  const root = fixture(t), builder = 'scripts/build-required.mjs';
  const argv = repairInvocation({ builder, builderArgs: ['--rebuild'] }, { root });
  assert.deepEqual(argv, [path.join(root, builder), '--rebuild']);
  execFileSync(process.execPath, argv, { cwd: root, windowsHide: true, stdio: 'pipe' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'output.json'))), { fresh: true });
});

test('sweep repairs a required-mode producer using existing profile args', t => {
  const root = fixture(t);
  const failures = sweepUnmodeled(['scripts/build-required.mjs'], { root, graph: { nodes: [] }, repair: true,
    profiles: { fixture: [{ script: 'build-required.mjs', args: ['--rebuild'] }] } });
  assert.deepEqual(failures, []);
  assert(fs.existsSync(path.join(root, 'output.json')));
});

test('sweep failure names missing mode and cannot claim successful repair', t => {
  const root = fixture(t);
  const failures = sweepUnmodeled(['scripts/build-required.mjs'], { root, graph: { nodes: [] }, repair: true, profiles: {} });
  assert.equal(failures.length, 1);
  assert.match(failures[0].reason, /no invocation mode/);
  assert(!fs.existsSync(path.join(root, 'output.json')));
});

test('world-acting builders, explicit side effects, and ambiguous profiles are refused', t => {
  const root = fixture(t), builder = 'scripts/build-required.mjs';
  assert.throws(() => repairInvocation({ builder: 'scripts/deploy-example.mjs' }, { root }), /world-acting/);
  assert.throws(() => repairInvocation({ builder, builderArgs: ['--rebuild'], sideEffecting: true }, { root }), /world-acting/);
  assert.throws(() => repairInvocation({ builder, builderArgs: ['--rebuild', '--live'] }, { root }), /non-repair/);
  assert.throws(() => repairInvocation({ builder }, { root, profiles: { one: [{ script: 'build-required.mjs', args: ['--rebuild'] }], two: [{ script: 'build-required.mjs', args: ['--other'] }] } }), /ambiguous/);
});

test('one Git inventory preserves file and directory semantics across repeated lookups', () => {
  const commands = [];
  const inventory = trackedInventory(args => { commands.push(args); return 'a.txt\0data/days/one.json\0directory-sibling/file.json\0folder/file with spaces.json\0'; });
  for (let i = 0; i < 145; i++) {
    assert(inventory.has('a.txt'));
    assert(inventory.has('data/days'));
    assert(inventory.has('data/days/'));
    assert(inventory.has('.\\data\\days'));
    assert(inventory.has('folder/file with spaces.json'));
    assert(!inventory.has('directory'));
    assert(!inventory.has('missing.json'));
  }
  assert.deepEqual(commands, [['ls-files', '-z']]);
  assert.equal(inventory.commands, 1);
  assert.equal(inventory.trackedFiles, 4);
});

test('unreadable Git index fails instead of treating every source as untracked', () => {
  assert.throws(() => trackedInventory(() => { throw new Error('index unavailable'); }), /index unavailable/);
});

test('untracked source discovery preserves ignored globs and invisible session lock', () => {
  const inventory = trackedInventory(() => 'data/days/one.json\0');
  // S353: an external: source (founder masters, live probes) is outside the repo,
  // not untracked inside it, so it must not force a rebuild on every rebase.
  const graph = { nodes: [{ id: 'directory', sources: ['data/days'] }, { id: 'glob', sources: ['data/*.json'] }, { id: 'lock', sources: ['context/.session-lock'] }, { id: 'external', sources: ['external:founder-brand-masters'] }] };
  assert.deepEqual(untrackedSourceNodes(graph, inventory).map(node => node.id), ['lock']);
});

test('graph validates builderArgs and new dependencies order from actual sources', () => {
  const graph = loadEvidenceGraph(process.cwd());
  assert.deepEqual(validateEvidenceGraph(graph), []);
  const malformed = structuredClone(graph);
  malformed.nodes[0].builderArgs = '--rebuild';
  assert(validateEvidenceGraph(malformed).some(error => error.includes('builderArgs')));
  const order = topoOrder(affectedEvidenceNodes(graph, ['api/nav-sheet-stats.json']), graph).map(node => node.id);
  assert(order.indexOf('ux-decision-ledger') < order.indexOf('nervous-system'));
  assert(order.indexOf('nervous-system') < order.indexOf('intelligence-budget'));
  const budget = graph.nodes.find(node => node.id === 'intelligence-budget');
  assert(stagePaths(budget).includes('docs/INTELLIGENCE_BUDGET_LEDGER.md'));
  for (const id of ['ux-decision-ledger','nervous-system','intelligence-budget','analytics-summary','early-hints-headers']) {
    assert.notEqual(graph.nodes.find(node => node.id === id).publishCascade, true);
  }
});

test('all local non-side-effecting graph builders have valid repair invocations', () => {
  for (const node of loadEvidenceGraph(process.cwd()).nodes.filter(node => !node.sideEffecting)) {
    assert.doesNotThrow(() => repairInvocation(node, { root: process.cwd() }), node.id);
  }
});

// Exercise the real CLI and planning modules with an empty Git diff. All child
// builders and Git responses below are local fixture implementations.
function clockRepairFixture(t) {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'scripts/lib'));
  fs.mkdirSync(path.join(root, 'config'));
  for (const name of ['resync-derived.mjs', 'lib/evidence-graph.mjs', 'lib/repair-invocation.mjs', 'lib/invocation-modes.mjs', 'lib/tracked-inventory.mjs']) {
    fs.copyFileSync(path.join(process.cwd(), 'scripts', name), path.join(root, 'scripts', name));
  }
  fs.writeFileSync(path.join(root, 'scripts/lib/build-order.mjs'), 'export const DERIVED_BUILD_PROFILES = {};');
  fs.writeFileSync(path.join(root, 'scripts/lib/safe-spawn.mjs'), `
import fs from 'node:fs';
import { execFileSync as native } from 'node:child_process';
export function execFileSync(command, args, options) {
  if (command !== 'git') return native(command, args, options);
  if (args[0] === 'rev-parse') return 'fixture-commit';
  if (args[0] === 'diff') return '';
  if (args[0] === 'ls-files') return 'input.json\\0clock.json\\0dependent.json\\0external.json\\0deployed.json\\0';
  if (args[0] === 'add') { fs.appendFileSync('staged.txt', args.slice(2).join(',') + '\\n'); return ''; }
  throw new Error('unexpected fixture Git command');
}`);
  fs.writeFileSync(path.join(root, 'scripts/check-evidence-graph-coverage.mjs'), `
import fs from 'node:fs';
export function coverage() { fs.writeFileSync('sweep-observed', 'yes'); return {unmodeled: []}; }
export function evidenceLevels() { return {}; }
export function evidenceSummary() { return 'fixture check contracts'; }
`);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { 'build:check:steps': '' } }));
  const node = (id, sources, extra = {}) => ({ id, output: id + '.json', sources,
    builder: 'scripts/build-' + id + '.mjs', builderArgs: ['--rebuild'],
    check: ['node', 'scripts/build-' + id + '.mjs', '--check'], ...extra });
  const graph = { schemaVersion: '1.0', nodes: [
    node('dependent', ['clock.json']),
    node('clock', ['input.json'], { clockInput: 'utc-day' }),
    node('external', ['external:brand-masters']),
    node('deployed', ['clock.json'], { sideEffecting: true, sideEffectingReason: 'Fixture world action must never execute' }),
  ] };
  fs.writeFileSync(path.join(root, 'config/evidence-graph.json'), JSON.stringify(graph));
  fs.writeFileSync(path.join(root, 'input.json'), '{}');
  fs.writeFileSync(path.join(root, 'clock.json'), JSON.stringify({ day: '1900-01-01' }));
  fs.writeFileSync(path.join(root, 'external.json'), 'untouched external artifact');
  for (const id of ['clock', 'dependent']) fs.writeFileSync(path.join(root, 'scripts/build-' + id + '.mjs'), `
import fs from 'node:fs';
const id = ${JSON.stringify(id)};
const day = new Date().toISOString().slice(0, 10);
if (process.argv.includes('--rebuild')) {
  if (id === 'dependent' && JSON.parse(fs.readFileSync('clock.json')).day !== day) throw new Error('upstream stale');
  fs.writeFileSync(id + '.json', JSON.stringify({day}));
  fs.appendFileSync('build-order.txt', id + '\\n');
} else if (process.argv.includes('--check')) {
  if (JSON.parse(fs.readFileSync(id + '.json')).day !== day) process.exitCode = 1;
} else { console.error('Usage: --rebuild | --check'); process.exitCode = 2; }
`);
  for (const id of ['external', 'deployed']) fs.writeFileSync(path.join(root, 'scripts/build-' + id + '.mjs'), "throw new Error('forbidden fixture builder executed');");
  return { root, graph };
}

test('UTC clock input repairs unchanged Git inputs and dependents, preserves external-only and skips side effects', t => {
  const { root } = clockRepairFixture(t);
  const output = execFileSync(process.execPath, ['scripts/resync-derived.mjs', '--since', 'fixture', '--verify'],
    { cwd: root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' });
  const day = new Date().toISOString().slice(0, 10);
  assert.match(output, new RegExp('clock input utc-day=' + day + ' — clock'));
  assert.match(output, /0 changed file\(s\)/);
  assert.match(output, /2\/2 rebuilt artifact\(s\) pass/);
  assert.match(output, /1 skipped \(side-effecting\)/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'build-order.txt'), 'utf8').trim().split('\n'), ['clock', 'dependent']);
  for (const id of ['clock', 'dependent']) assert.equal(JSON.parse(fs.readFileSync(path.join(root, id + '.json'))).day, day);
  assert.equal(fs.readFileSync(path.join(root, 'external.json'), 'utf8'), 'untouched external artifact');
  assert(!fs.existsSync(path.join(root, 'deployed.json')));
  assert.equal(fs.readFileSync(path.join(root, 'staged.txt'), 'utf8'), 'clock.json\ndependent.json\n');
  assert(fs.existsSync(path.join(root, 'sweep-observed')));
});

test('unsupported clock declarations fail before any fixture repair', t => {
  const { root, graph } = clockRepairFixture(t);
  for (const clockInput of ['local-day', '', null, true, ['utc-day']]) {
    graph.nodes[1].clockInput = clockInput;
    fs.writeFileSync(path.join(root, 'config/evidence-graph.json'), JSON.stringify(graph));
    assert.throws(() => execFileSync(process.execPath, ['scripts/resync-derived.mjs', '--since', 'fixture'],
      { cwd: root, windowsHide: true, stdio: 'pipe' }), error => {
      assert.match(String(error.stderr), /clockInput must be utc-day/);
      return true;
    });
  }
  assert(!fs.existsSync(path.join(root, 'build-order.txt')));
  assert(!fs.existsSync(path.join(root, 'staged.txt')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'clock.json'))).day, '1900-01-01');
});

test('UTC rollover after successful fixture builders and checks refuses completion', t => {
  const { root } = clockRepairFixture(t);
  const spawnPath = path.join(root, 'scripts/lib/safe-spawn.mjs');
  const source = fs.readFileSync(spawnPath, 'utf8');
  const original = "  if (command !== 'git') return native(command, args, options);";
  assert.equal(source.split(original).length, 2);
  // This module exists only in the temporary CLI fixture. Advance its parent
  // process Date after the final real fake-builder check returns successfully;
  // subprocess builders, this test process and the system clock stay unchanged.
  fs.writeFileSync(spawnPath, source.replace(original, `
  if (command !== 'git') {
    const result = native(command, args, options);
    if (args[0] === 'scripts/build-dependent.mjs' && args.includes('--check')) {
      const NativeDate = globalThis.Date;
      const nextDay = NativeDate.now() + 24 * 60 * 60 * 1000;
      globalThis.Date = class extends NativeDate {
        constructor(...values) { super(...(values.length ? values : [nextDay])); }
      };
    }
    return result;
  }`));
  assert.throws(() => execFileSync(process.execPath,
    ['scripts/resync-derived.mjs', '--since', 'fixture', '--verify'],
    { cwd: root, windowsHide: true, stdio: 'pipe' }), error => {
    assert.equal(error.status, 1);
    assert.match(String(error.stderr), /UTC day changed during repair; rerun before claiming completion/);
    assert.match(String(error.stdout), /2\/2 rebuilt artifact\(s\) pass their own --check/);
    assert.doesNotMatch(String(error.stdout), /artifact\(s\) rebuilt \+ staged|sweep: .*declared checks passed/);
    return true;
  });
  assert.deepEqual(fs.readFileSync(path.join(root, 'build-order.txt'), 'utf8').trim().split('\n'), ['clock', 'dependent']);
  assert(fs.existsSync(path.join(root, 'sweep-observed')));
});

test('shared surface CLI rebuilds both writers before the consuming manifest', t => {
  const { root } = clockRepairFixture(t);
  const node = (id, output, sources, sharedOutput = false) => ({ id, output, sources, sharedOutput,
    builder: 'scripts/build-' + id + '.mjs', builderArgs: ['--rebuild'],
    check: ['node', 'scripts/build-' + id + '.mjs', '--check'] });
  // Consumer first and last writer second: a single output->writer Map builds
  // the manifest before the first writer and fails the final byte check.
  const graph = { schemaVersion: '1.0', nodes: [
    node('manifest', 'manifest.json', ['page.html']),
    node('first', 'page.html', ['input.json'], true),
    node('last', 'page.html', ['input.json'], true),
  ] };
  fs.writeFileSync(path.join(root, 'config/evidence-graph.json'), JSON.stringify(graph));
  fs.writeFileSync(path.join(root, 'page.html'), JSON.stringify({ first: 'old', last: 'old' }));
  for (const id of ['first', 'last']) fs.writeFileSync(path.join(root, 'scripts/build-' + id + '.mjs'), `
import fs from 'node:fs';
const id = ${JSON.stringify(id)};
const page = JSON.parse(fs.readFileSync('page.html'));
if (process.argv.includes('--rebuild')) {
  page[id] = 'fresh'; fs.writeFileSync('page.html', JSON.stringify(page));
  fs.appendFileSync('shared-order.txt', id + '\\n');
} else if (process.argv.includes('--check')) {
  if (page[id] !== 'fresh') throw new Error('writer stale');
} else { console.error('Usage: --rebuild | --check'); process.exitCode = 2; }
`);
  fs.writeFileSync(path.join(root, 'scripts/build-manifest.mjs'), `
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const digest = createHash('sha256').update(fs.readFileSync('page.html')).digest('hex');
if (process.argv.includes('--rebuild')) {
  fs.writeFileSync('manifest.json', JSON.stringify({digest}));
  fs.appendFileSync('shared-order.txt', 'manifest\\n');
} else if (process.argv.includes('--check')) {
  if (JSON.parse(fs.readFileSync('manifest.json')).digest !== digest) throw new Error('manifest drift');
} else { console.error('Usage: --rebuild | --check'); process.exitCode = 2; }
`);
  const output = execFileSync(process.execPath,
    ['scripts/resync-derived.mjs', '--changed', 'input.json', '--verify'],
    { cwd: root, windowsHide: true, encoding: 'utf8', stdio: 'pipe' });
  assert.deepEqual(fs.readFileSync(path.join(root, 'shared-order.txt'), 'utf8').trim().split('\n'), ['first', 'last', 'manifest']);
  assert.match(output, /3\/3 rebuilt artifact\(s\) pass their own --check/);
  assert(fs.existsSync(path.join(root, 'sweep-observed')));
});

test('shared writer ordering includes only selected writers and retains cycle defenses', () => {
  const first = { id: 'first', output: 'page.html', sources: ['input-a'], sharedOutput: true, check: ['node', 'check'] };
  const last = { id: 'last', output: 'page.html', sources: ['input-b'], sharedOutput: true, check: ['node', 'check'] };
  const manifest = { id: 'manifest', output: 'manifest.json', sources: ['page.html'], check: ['node', 'check'] };
  const graph = { schemaVersion: '1.0', nodes: [manifest, first, last] };
  assert.deepEqual(validateEvidenceGraph(graph), []);
  assert.deepEqual(topoOrder([manifest, first], graph).map(node => node.id), ['first', 'manifest']);
  assert.deepEqual(topoOrder([manifest, first, last], graph).map(node => node.id), ['first', 'last', 'manifest']);
  const self = { id: 'self', output: 'self.json', sources: ['self.json'], check: ['node', 'check'] };
  const cycle = { schemaVersion: '1.0', nodes: [self] };
  assert(validateEvidenceGraph(cycle).some(error => /cycle detected/.test(error)));
  assert.deepEqual(topoOrder([self], cycle).map(node => node.id), ['self']);
  const cyclic = { schemaVersion: '1.0', nodes: [manifest, { ...first, sources: ['manifest.json'] }, last] };
  assert(validateEvidenceGraph(cyclic).some(error => /cycle detected/.test(error)));
  assert.equal(new Set(topoOrder(cyclic.nodes, cyclic).map(node => node.id)).size, 3);
});

test('candidate evidence graph declares every core byte input hashed by its builder', async () => {
  const { CORE_PATHS } = await import('../scripts/build-candidate-artifact-manifest.mjs');
  const { globMatches } = await import('../scripts/lib/evidence-graph.mjs');
  const candidate = loadEvidenceGraph(process.cwd()).nodes.find(node => node.id === 'candidate-artifact-manifest');
  for (const input of CORE_PATHS) {
    assert(candidate.sources.some(source => globMatches(source, input)), 'candidate graph missing hashed core input: ' + input);
  }
});
