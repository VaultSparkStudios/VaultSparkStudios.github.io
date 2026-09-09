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
  const graph = { nodes: [{ id: 'directory', sources: ['data/days'] }, { id: 'glob', sources: ['data/*.json'] }, { id: 'lock', sources: ['context/.session-lock'] }] };
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
