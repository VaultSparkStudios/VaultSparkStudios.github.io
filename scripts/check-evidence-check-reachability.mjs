#!/usr/bin/env node
/**
 * Every verification the evidence graph DECLARES must actually run.
 *
 * S293 root cause: `config/evidence-graph.json` declared the status-proof node's
 * verification as `build-status-proof.mjs --check --check-content`, but the only
 * place that command is invoked (`check-proof-surface.mjs`) passed `--check`
 * alone. The `--check-content` half — the one that catches an embedded feed
 * drifting after the manifest — had never executed. A declared check that
 * nothing runs is indistinguishable from a passing one, so the graph was
 * advertising a guarantee it did not have.
 *
 * `check-evidence-graph.mjs` already proves the check EXECUTABLE exists. This
 * gate proves the check is REACHED, with the exact flags the graph declares,
 * from `npm run build:check` — either as a top-level step or as a single-line
 * invocation inside a script that is itself a top-level step.
 *
 * It also proves the graph's other on-disk promises: every node output exists,
 * and every `alsoStage` ledger exists and is git-tracked (an untracked ledger
 * can never be staged by the publisher that the cascade gate requires it from).
 *
 * Structural by construction — there is no allowlist to rot. Fix a finding by
 * wiring the check in, never by exempting the node.
 *
 * Usage:
 *   node scripts/check-evidence-check-reachability.mjs
 *   node scripts/check-evidence-check-reachability.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadEvidenceGraph } from './lib/evidence-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function splitSteps(script) {
  return String(script || '').split(/\s+&&\s+/).map((step) => step.trim()).filter(Boolean);
}

/** Top-level steps of `npm run build:check`, with the orchestrator expanded into its real list. */
export function topLevelSteps(pkg) {
  const steps = [];
  for (const step of splitSteps(pkg.scripts?.['build:check'])) {
    if (step.includes('run-build-check.mjs') && !step.includes('--self-test')) steps.push(...splitSteps(pkg.scripts?.['build:check:steps']));
    else steps.push(step);
  }
  return steps;
}

/** The scripts/*.mjs files invoked directly as a build:check step — the only valid wrappers. */
export function topLevelScripts(steps) {
  const scripts = new Set();
  for (const step of steps) {
    for (const match of step.matchAll(/scripts\/([\w.-]+\.mjs)/g)) scripts.add(match[1]);
  }
  return scripts;
}

export function parseCheck(check) {
  const tokens = Array.isArray(check) ? check : String(check).split(/\s+/);
  const scriptToken = tokens.find((token) => token.includes('.mjs')) || '';
  return { script: scriptToken.split('/').at(-1), flags: tokens.filter((token) => token.startsWith('--')) };
}

/**
 * Reachable if some top-level step invokes the script with every declared flag,
 * or a top-level wrapper script does so on a single line. Line-scoped on purpose:
 * a window-scoped match would let an unrelated `--check` two entries away vouch
 * for a call that never passes it — exactly the bug this gate exists to catch.
 */
export function isReachable({ script, flags }, steps, wrapperSources) {
  for (const step of steps) {
    if (step.includes(script) && flags.every((flag) => step.includes(flag))) return { reachable: true, via: 'top-level step' };
  }
  for (const [name, source] of Object.entries(wrapperSources)) {
    for (const line of source.split('\n')) {
      if (line.includes(script) && flags.every((flag) => line.includes(flag))) return { reachable: true, via: `nested in ${name}` };
    }
  }
  return { reachable: false, via: null };
}

function gitTracked(relPath) {
  try {
    return execFileSync('git', ['ls-files', '--error-unmatch', relPath], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0;
  } catch {
    return false;
  }
}

function selfTest() {
  const pkg = {
    scripts: {
      'build:check': 'node scripts/pre.mjs && node scripts/run-build-check.mjs',
      'build:check:steps': 'node scripts/build-a.mjs --check && node scripts/wrapper.mjs',
    },
  };
  const steps = topLevelSteps(pkg);
  const scripts = topLevelScripts(steps);
  const goodWrapper = { 'wrapper.mjs': "  ['build-b.mjs', ['--check', '--check-content']],\n  ['build-c.mjs', ['--self-test']],\n" };
  const partialWrapper = { 'wrapper.mjs': "  ['build-b.mjs', ['--check']],\n  ['other.mjs', ['--check-content']],\n" };
  const noFlagWrapper = { 'wrapper.mjs': "  spawnSync(node, [resolve(root, 'scripts/coherence.mjs')], {});\n" };

  const cases = [
    ['orchestrator expands into real steps', steps.length === 3 && steps.includes('node scripts/build-a.mjs --check')],
    ['pre-orchestrator steps are kept', steps.includes('node scripts/pre.mjs')],
    ['wrapper scripts are collected', scripts.has('wrapper.mjs') && scripts.has('build-a.mjs')],
    ['check string parses to script + flags', parseCheck(['node', 'scripts/x.mjs', '--check', '--check-content']).script === 'x.mjs' && parseCheck(['node', 'scripts/x.mjs', '--check', '--check-content']).flags.length === 2],
    ['top-level step with the flag is reachable', isReachable({ script: 'build-a.mjs', flags: ['--check'] }, steps, {}).reachable === true],
    ['top-level step missing the flag is NOT reachable', isReachable({ script: 'build-a.mjs', flags: ['--check', '--strict'] }, steps, {}).reachable === false],
    ['single-line nested call with all flags is reachable', isReachable({ script: 'build-b.mjs', flags: ['--check', '--check-content'] }, steps, goodWrapper).reachable === true],
    ['the real S293 bug shape is caught', isReachable({ script: 'build-b.mjs', flags: ['--check', '--check-content'] }, steps, partialWrapper).reachable === false],
    ['a flag on a different line does not vouch', isReachable({ script: 'build-b.mjs', flags: ['--check-content'] }, steps, partialWrapper).reachable === false],
    ['flag order does not matter', isReachable({ script: 'build-b.mjs', flags: ['--check-content', '--check'] }, steps, goodWrapper).reachable === true],
    ['a flagless nested check is reachable by name', isReachable({ script: 'coherence.mjs', flags: [] }, steps, noFlagWrapper).reachable === true],
    ['an uninvoked script is not reachable', isReachable({ script: 'ghost.mjs', flags: [] }, steps, goodWrapper).reachable === false],
    ['reachability names its route', isReachable({ script: 'build-b.mjs', flags: ['--check'] }, steps, goodWrapper).via.startsWith('nested in')],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-evidence-check-reachability --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-evidence-check-reachability --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const graph = loadEvidenceGraph(ROOT);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const steps = topLevelSteps(pkg);
  const wrapperSources = {};
  for (const name of topLevelScripts(steps)) {
    const file = path.join(ROOT, 'scripts', name);
    if (fs.existsSync(file)) wrapperSources[name] = fs.readFileSync(file, 'utf8');
  }

  const findings = [];
  for (const node of graph.nodes) {
    const parsed = parseCheck(node.check);
    const { reachable } = isReachable(parsed, steps, wrapperSources);
    if (!reachable) {
      findings.push(`${node.id}: declared check \`${node.check.join(' ')}\` is never executed by npm run build:check — wire it in as a step, or into a script that is one`);
    }
    if (!fs.existsSync(path.join(ROOT, node.output))) findings.push(`${node.id}: declared output ${node.output} does not exist`);
    for (const sibling of node.alsoStage || []) {
      if (!fs.existsSync(path.join(ROOT, sibling))) findings.push(`${node.id}: alsoStage path ${sibling} does not exist`);
      else if (!gitTracked(sibling)) findings.push(`${node.id}: alsoStage path ${sibling} is not git-tracked — a publisher can never stage it`);
    }
  }

  if (findings.length) {
    console.error('check-evidence-check-reachability: unenforced evidence-graph contract(s):');
    for (const finding of findings) console.error(`  ✗ ${finding}`);
    process.exit(1);
  }
  console.log(`check-evidence-check-reachability: ${graph.nodes.length} node(s) — every declared check runs, every output and ledger present`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
