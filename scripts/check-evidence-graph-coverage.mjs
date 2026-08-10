#!/usr/bin/env node
/**
 * check-evidence-graph-coverage.mjs  (S309)
 *
 * Ratchets the evidence graph toward covering every byte-checked generator.
 *
 * WHY THIS EXISTS. `resync-derived.mjs` repairs derived artifacts after a rebase
 * by walking the evidence graph. `check-publish-cascade-coverage.mjs` catches
 * [skip ci] crons that strand a derived artifact — also by walking the graph.
 * Both are therefore blind to any artifact the graph does not model, and blind
 * in the worst possible way: they report success over the subset they know.
 * "resync-derived: 9 artifacts rebuilt + staged" reads like completeness.
 *
 * Measured at introduction: 51 generators run with `--check` in build:check,
 * meaning 51 artifacts are byte-compared against their inputs on every run. The
 * graph modeled 12. `proof-aware-projects` and `cta-readiness` both drifted in
 * S309 in exactly the way resync-derived exists to fix, and it was silent on
 * both, because neither was modeled.
 *
 * WHY THIS IS A RATCHET AND NOT A FULL CLOSURE. Modeling a node requires its
 * real `sources`. Guessing them is strictly worse than omitting the node:
 * resync-derived would rebuild in a wrong topological order, and
 * check-publish-cascade-coverage would start demanding the wrong things of every
 * cron — a confidently wrong graph, which is the failure mode this whole family
 * of tools exists to prevent. So the debt is made VISIBLE and MONOTONIC: the
 * baseline can only ever be lowered, never raised. A new generator with a
 * `--check` step must be modeled at the moment it is added, when whoever wrote
 * it still knows its inputs — which is the only cheap moment.
 *
 * Usage:
 *   node scripts/check-evidence-graph-coverage.mjs            # enforce the ratchet
 *   node scripts/check-evidence-graph-coverage.mjs --list     # print unmodeled generators
 *   node scripts/check-evidence-graph-coverage.mjs --update   # lower the baseline after modeling one
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidenceGraph } from './lib/evidence-graph.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASELINE = join(ROOT, 'config', 'evidence-graph-coverage.json');

/**
 * A generator invoked with `--check` byte-compares its output against its
 * inputs, which is exactly the property that makes staleness matter after a
 * rebase. `check-*` scripts are excluded: they validate someone else's output
 * rather than owning one, so they are not graph nodes.
 */
export function checkedGenerators(stepsString) {
  const found = new Set();
  for (const m of String(stepsString).matchAll(/node (scripts\/(?:build|generate)-[a-z0-9-]+\.mjs)\s+--check/g)) {
    found.add(m[1]);
  }
  return [...found].sort();
}

export function coverage(stepsString, graph) {
  const generators = checkedGenerators(stepsString);
  const builders = new Set(graph.nodes.map((n) => n.builder));
  const unmodeled = generators.filter((g) => !builders.has(g));
  return { generators, unmodeled, modeled: generators.length - unmodeled.length };
}

function loadBaseline() {
  if (!existsSync(BASELINE)) return { unmodeled: Number.POSITIVE_INFINITY, note: 'no baseline yet' };
  return JSON.parse(readFileSync(BASELINE, 'utf8'));
}

function run() {
  const steps = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts['build:check:steps'];
  const graph = loadEvidenceGraph(ROOT);
  const { generators, unmodeled, modeled } = coverage(steps, graph);
  const baseline = loadBaseline();

  if (process.argv.includes('--list')) {
    console.log(`evidence-graph coverage: ${modeled}/${generators.length} byte-checked generator(s) modeled`);
    for (const g of unmodeled) console.log(`  ⊘ ${g}`);
    process.exit(0);
  }

  if (process.argv.includes('--update')) {
    writeFileSync(BASELINE, `${JSON.stringify({
      schemaVersion: '1.0',
      note: 'Ratchet baseline for evidence-graph coverage. This number may only DECREASE. Raising it means a byte-checked generator was added without modeling it, which makes resync-derived and check-publish-cascade-coverage silently blind to it.',
      unmodeled: unmodeled.length,
      total: generators.length,
      unmodeledGenerators: unmodeled,
    }, null, 2)}\n`);
    console.log(`evidence-graph coverage baseline set: ${unmodeled.length} unmodeled of ${generators.length}`);
    process.exit(0);
  }

  if (unmodeled.length > baseline.unmodeled) {
    const added = unmodeled.filter((g) => !(baseline.unmodeledGenerators || []).includes(g));
    console.error(`✗ check-evidence-graph-coverage: unmodeled generators rose ${baseline.unmodeled} → ${unmodeled.length}`);
    for (const g of added) console.error(`  ✗ ${g} runs with --check but is not in config/evidence-graph.json`);
    console.error('  A byte-checked artifact outside the graph is invisible to resync-derived AND to');
    console.error('  check-publish-cascade-coverage — both will report success over the subset they know.');
    console.error('  fix: add a node with its REAL sources (read the generator; do not guess), then');
    console.error('       node scripts/check-evidence-graph-coverage.mjs --update');
    process.exit(1);
  }

  if (unmodeled.length < baseline.unmodeled) {
    console.log(`✓ evidence-graph coverage IMPROVED: ${baseline.unmodeled} → ${unmodeled.length} unmodeled (${modeled}/${generators.length} modeled)`);
    console.log('  run --update to lower the baseline so the gain is locked in');
    process.exit(0);
  }

  console.log(`evidence-graph coverage: ${modeled}/${generators.length} modeled · ${unmodeled.length} unmodeled (at baseline, tracked debt)`);
  process.exit(0);
}

function selfTest() {
  const cases = [];
  const graph = { nodes: [{ builder: 'scripts/build-alpha.mjs' }] };

  const steps = 'node scripts/build-alpha.mjs --check && node scripts/build-beta.mjs --check && node scripts/check-gamma.mjs --check && node scripts/build-delta.mjs --self-test';
  const c = coverage(steps, graph);

  cases.push(['finds generators run with --check', c.generators.length === 2]);
  cases.push(['modeled generator is not counted as debt', !c.unmodeled.includes('scripts/build-alpha.mjs')]);
  cases.push(['unmodeled generator IS counted', c.unmodeled.includes('scripts/build-beta.mjs')]);
  // A check-* script validates someone else's artifact; it owns no output, so it
  // is not a graph node and must not inflate the debt into permanent noise.
  cases.push(['check-* scripts are not graph nodes', !c.generators.some((g) => g.includes('check-gamma'))]);
  // --self-test is not a byte comparison, so it implies nothing about staleness.
  cases.push(['--self-test alone does not make a generator byte-checked', !c.generators.some((g) => g.includes('build-delta'))]);

  // The live repo must actually satisfy its own ratchet.
  const liveSteps = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts['build:check:steps'];
  const live = coverage(liveSteps, loadEvidenceGraph(ROOT));
  const baseline = loadBaseline();
  cases.push([`live coverage is at or below baseline (${live.unmodeled.length} vs ${baseline.unmodeled})`,
    live.unmodeled.length <= baseline.unmodeled]);
  // The drifter that motivated this gate must be modeled, or the fix rotted.
  cases.push(['proof-aware-projects is modeled (the S309 drifter)',
    !live.unmodeled.includes('scripts/build-proof-aware-projects.mjs')]);

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  console.log(`check-evidence-graph-coverage --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else run();
