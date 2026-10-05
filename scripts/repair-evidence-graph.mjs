#!/usr/bin/env node
/**
 * repair-evidence-graph.mjs — make a push pass the pre-push final-state
 * coherence gate on the first try.
 *
 * WHY (S368). pre-push-scan runs the --check of every evidence-graph node the
 * pushed files affect, and fails on the first stale one. While scheduled
 * publishers committed every few minutes, each push surfaced one more stale
 * derived output (stats-surface, launch-age, pathways-pages, intelligence-
 * budget, ...) and the fix was to hand-add that generator to a push script.
 * The graph already names each node's builder and outputs, so this runs the
 * exact gate set and rebuilds + stages whatever fails, in graph order, until
 * the set is coherent.
 *
 *   node scripts/repair-evidence-graph.mjs            # repair + stage (no commit)
 *   node scripts/repair-evidence-graph.mjs --check    # report only, exit 1 if stale
 *   node scripts/repair-evidence-graph.mjs --base <ref>   # default origin/main
 *   node scripts/repair-evidence-graph.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Files the next push would carry: committed-ahead, staged and unstaged. */
export function pushFiles(base, git) {
  return [...new Set([
    ...git(['diff', '--name-only', `${base}...HEAD`]),
    // S368: pre-push diffs the pushed range against the remote tip, which also
    // carries sources a merged publisher commit changed. Two-dot covers that.
    ...git(['diff', '--name-only', base, 'HEAD']),
    ...git(['diff', '--name-only', '--cached']),
    ...git(['diff', '--name-only']),
  ])];
}

/** Paths to stage after rebuilding a node. */
export const stagePaths = (node) => [node?.output, ...(node?.alsoStage || [])].flat().filter(Boolean);

export async function repair({ base = 'origin/main', checkOnly = false, passes = 3, run = spawnSync, git = defaultGit, log = console.log } = {}) {
  const { coherenceChecksForFiles } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'pre-push-scan.mjs')).href);
  const graph = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'evidence-graph.json'), 'utf8'));
  const nodes = new Map((graph.nodes || graph).map((n) => [n.id, n]));
  for (let pass = 1; pass <= passes; pass += 1) {
    const stale = [];
    for (const check of coherenceChecksForFiles(pushFiles(base, git), ROOT)) {
      if (run(check.command[0], check.command.slice(1), { cwd: ROOT, encoding: 'utf8', windowsHide: true }).status === 0) continue;
      stale.push(check.id);
      if (checkOnly) continue;
      const node = nodes.get(check.id);
      if (!node?.builder) { log(`✗ ${check.id}: stale and the graph names no builder`); continue; }
      run(process.execPath, [node.builder], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
      // Some builders only report unless told to write (generate-pathways needs
      // --apply). If the plain run left the check failing, run it again with --apply.
      if (run(check.command[0], check.command.slice(1), { cwd: ROOT, encoding: 'utf8', windowsHide: true }).status !== 0) {
        run(process.execPath, [node.builder, '--apply'], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
      }
      const paths = stagePaths(node);
      if (paths.length) run('git', ['add', '--', ...paths], { cwd: ROOT, stdio: 'ignore' });
      log(`↻ pass ${pass}: rebuilt ${check.id}`);
    }
    if (!stale.length) { log(`repair-evidence-graph: coherent (pass ${pass})`); return 0; }
    if (checkOnly) { log(`repair-evidence-graph: stale — ${stale.join(', ')}`); return 1; }
  }
  log('repair-evidence-graph: still stale after the last pass');
  return 1;
}

function defaultGit(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 }).split('\n').filter(Boolean);
}

function selfTest() {
  const fakeGit = (args) => (args[2]?.includes('...') ? ['a.json', 'b.json']
    : args[3] === 'HEAD' ? ['b.json', 'm.json']
      : args.includes('--cached') ? ['b.json', 'c.json'] : ['d.json']);
  const files = pushFiles('origin/main', fakeGit);
  const cases = [
    ['push set unions ahead, remote-tip, staged and unstaged without duplicates', files.join(',') === 'a.json,b.json,m.json,c.json,d.json'],
    ['stage paths include output and alsoStage', stagePaths({ output: 'api/x.json', alsoStage: ['docs/X.md'] }).join(',') === 'api/x.json,docs/X.md'],
    ['a node without outputs stages nothing', stagePaths({}).length === 0],
  ];
  let failed = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`); if (!ok) failed += 1; }
  console.log(`repair-evidence-graph --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) selfTest();
  else {
    const i = argv.indexOf('--base');
    process.exit(await repair({ base: i >= 0 ? argv[i + 1] : 'origin/main', checkOnly: argv.includes('--check') }));
  }
}
