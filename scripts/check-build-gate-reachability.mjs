#!/usr/bin/env node
/**
 * check-build-gate-reachability.mjs — S324
 *
 * A `--check` gate that no runner ever invokes has never run. It reads exactly
 * like a passing gate, because nothing ever asks it anything. S324 found twelve
 * such gates among the 82 `build-*.mjs --check` implementations; three of them
 * were RED at the time of discovery while `npm run build:check` reported
 * 319/319 green, and the public artifacts they guard were stale on the live
 * site.
 *
 * Fixing those twelve is a list, and the list rots: the next build script born
 * with a `--check` and no runner line is silently unmeasured from birth. This
 * gate is the structural replacement — it asks, of every `--check` gate in the
 * repo, "is there a path from `npm run build:check` to you?"
 *
 * Reachability is resolved as a graph, not a substring scan, because a naive
 * "is it named in build:check:steps?" test is wrong about 16 of the 28
 * non-wired gates — they are reached one hop in, through check-proof-surface's
 * STEPS/ADVISORY_STEPS tables or through an ESM import that inherits argv. A
 * detector blind to helper indirection produces false reds as readily as false
 * greens.
 *
 * Exemption is by DECLARATION, never by name. A `--check` that means "report
 * what would render" is a dry-run, not a gate, and says so in its own source
 * with the marker below. That way the exemption travels with the script instead
 * of living in an allowlist here that nobody updates.
 *
 *   @check-mode dry-run
 *
 * Usage:
 *   node scripts/check-build-gate-reachability.mjs              # gate
 *   node scripts/check-build-gate-reachability.mjs --self-test  # both-directions proof
 *
 * Exit: 0 = every --check gate is reachable or declared · 1 = an unreachable gate.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN_MARKER = '@check-mode dry-run';

/** Gates enumerate git-tracked files, never a filesystem walk — an untracked
 *  scratch copy is not a gate and must not be reported as one. */
function trackedBuildScripts() {
  const out = execFileSync('git', ['ls-files', 'scripts/build-*.mjs'], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true,
  });
  return out.trim().split('\n').filter(Boolean).map((p) => basename(p));
}

const read = (name) => {
  try { return readFileSync(join(ROOT, 'scripts', name), 'utf8'); } catch { return ''; }
};

/** Scripts named with `--check` anywhere in a runner's source, plus ESM imports
 *  (an imported module inherits process.argv, so `import './x.mjs'` from a
 *  script invoked with --check runs x's check branch too). */
export function edgesFrom(src) {
  const next = new Set();
  for (const m of src.matchAll(/([a-z0-9][a-z0-9.-]*\.mjs)['"`\s,\]]*[^\n]{0,80}--check/g)) next.add(m[1]);
  for (const m of src.matchAll(/^\s*import\s+['"]\.\/([a-z0-9][a-z0-9.-]*\.mjs)['"]/gm)) next.add(m[1]);
  return next;
}

/** Every script reachable from `npm run build:check`, to a fixpoint. */
export function reachableFrom(seedSteps, readSource) {
  const seen = new Set();
  const queue = [];
  for (const step of seedSteps) {
    for (const m of step.matchAll(/scripts\/([a-z0-9][a-z0-9.-]*\.mjs)/g)) {
      if (!seen.has(m[1])) { seen.add(m[1]); queue.push(m[1]); }
    }
  }
  while (queue.length) {
    const cur = queue.shift();
    for (const nxt of edgesFrom(readSource(cur))) {
      if (!seen.has(nxt)) { seen.add(nxt); queue.push(nxt); }
    }
  }
  return seen;
}

export function classify({ scripts, readSource, reachable }) {
  const rows = [];
  for (const name of scripts) {
    const src = readSource(name);
    if (!src.includes('--check')) continue;
    if (src.includes(DRY_RUN_MARKER)) { rows.push({ name, verdict: 'declared-dry-run' }); continue; }
    rows.push({ name, verdict: reachable.has(name) ? 'reachable' : 'unreachable' });
  }
  return rows;
}

function selfTest() {
  const cases = [];
  const src = (map) => (n) => map[n] || '';

  // Direct wiring.
  let r = reachableFrom(['node scripts/a.mjs --check'], src({ 'a.mjs': 'const C=--check' }));
  cases.push(['directly wired gate is reachable', r.has('a.mjs')]);

  // One hop through a STEPS table — the case a substring scan of
  // build:check:steps gets wrong 16 times over.
  r = reachableFrom(['node scripts/runner.mjs'], src({
    'runner.mjs': "const STEPS=[['child.mjs', ['--check']]];",
    'child.mjs': 'const C = process.argv.includes("--check")',
  }));
  cases.push(['gate reached via a runner STEPS table is reachable', r.has('child.mjs')]);

  // ESM-import indirection: the child inherits argv, so it is measured.
  r = reachableFrom(['node scripts/parent.mjs --check'], src({
    'parent.mjs': "import './imported.mjs';", 'imported.mjs': '--check',
  }));
  cases.push(['gate reached by argv-inheriting import is reachable', r.has('imported.mjs')]);

  // The defect this gate exists to catch.
  r = reachableFrom(['node scripts/a.mjs --check'], src({ 'a.mjs': '--check' }));
  cases.push(['orphan gate is NOT reachable', !r.has('orphan.mjs')]);

  const readOrphan = src({ 'orphan.mjs': 'const C = process.argv.includes("--check")' });
  let rows = classify({ scripts: ['orphan.mjs'], readSource: readOrphan, reachable: r });
  cases.push(['orphan gate classifies unreachable', rows[0].verdict === 'unreachable']);

  // Declared dry-runs are exempt by their own source, not by an allowlist here.
  rows = classify({
    scripts: ['dry.mjs'],
    readSource: src({ 'dry.mjs': `/* ${DRY_RUN_MARKER} */ --check` }),
    reachable: new Set(),
  });
  cases.push(['declared dry-run is exempt', rows[0].verdict === 'declared-dry-run']);

  // A build script with no --check at all is not a gate and is never reported.
  rows = classify({ scripts: ['plain.mjs'], readSource: src({ 'plain.mjs': 'writeFileSync()' }), reachable: new Set() });
  cases.push(['script without --check is not reported', rows.length === 0]);

  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-build-gate-reachability --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const steps = (pkg.scripts?.['build:check:steps'] || '').split('&&').map((s) => s.trim());
const reachable = reachableFrom(steps, read);
const rows = classify({ scripts: trackedBuildScripts(), readSource: read, reachable });
const orphans = rows.filter((r) => r.verdict === 'unreachable');
const dry = rows.filter((r) => r.verdict === 'declared-dry-run');

if (orphans.length) {
  console.error('✗ check-build-gate-reachability: --check gate(s) no runner ever invokes —');
  console.error('  a gate nothing asks reads exactly like a gate that passed.');
  for (const o of orphans) console.error(`    · scripts/${o.name} --check`);
  console.error('  fix: wire it into package.json build:check:steps (or a runner already in it),');
  console.error(`  or, if it is a report-only dry-run, declare "${DRY_RUN_MARKER}" in its source.`);
  process.exit(1);
}
console.log(`✓ check-build-gate-reachability: ${rows.length - dry.length}/${rows.length - dry.length} --check gates reachable from build:check · ${dry.length} declared dry-run(s)`);
