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
import { execFileSync } from './lib/safe-spawn.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN_MARKER = '@check-mode dry-run';
const SCOPE_RE = /@verification-scope\s+([a-z][a-z0-9-]*)/;
const TRACKED_FAMILIES = ['build', 'check', 'generate', 'derive', 'enrich'];

/** Gates enumerate git-tracked files, never a filesystem walk — an untracked
 *  scratch copy is not a gate and must not be reported as one. */
function trackedVerificationScripts() {
  const out = execFileSync('git', ['ls-files', ...TRACKED_FAMILIES.map((family) => `scripts/${family}-*.mjs`)], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true,
  });
  return out.trim().split('\n').filter(Boolean).map((p) => basename(p));
}

const read = (name) => {
  try { return readFileSync(join(ROOT, 'scripts', name), 'utf8'); } catch { return ''; }
};

/** Actual script-to-script invocations plus ESM imports. Comments and prose do
 *  not buy reachability: an edge must look like a node command, runner tuple,
 *  run helper, or import. */
export function edgesFrom(src) {
  const next = new Set();
  for (const m of src.matchAll(/\bnode\s+(?:--[^\s]+\s+)*scripts\/([a-z0-9][a-z0-9.-]*\.mjs)/g)) next.add(m[1]);
  for (const m of src.matchAll(/['"]([a-z0-9][a-z0-9.-]*\.mjs)['"]\s*,\s*\[/g)) next.add(m[1]);
  for (const m of src.matchAll(/\b(?:run|runNode|runScript|step)\(\s*['"]([a-z0-9][a-z0-9.-]*\.mjs)['"]/g)) next.add(m[1]);
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
    const scope = src.match(SCOPE_RE)?.[1] || null;
    if (scope && scope !== 'build') { rows.push({ name, verdict: `scoped-${scope}` }); continue; }
    const isDefaultCheck = name.startsWith('check-');
    if (!isDefaultCheck && !src.includes('--check')) continue;
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

  r = reachableFrom(['node scripts/runner.mjs'], src({
    'runner.mjs': "const STEPS=[['default-check.mjs', []]];",
    'default-check.mjs': 'process.exit(findings.length ? 1 : 0)',
  }));
  cases.push(['default-check runner tuple is reachable without a flag', r.has('default-check.mjs')]);

  // ESM-import indirection: the child inherits argv, so it is measured.
  r = reachableFrom(['node scripts/parent.mjs --check'], src({
    'parent.mjs': "import './imported.mjs';", 'imported.mjs': '--check',
  }));
  cases.push(['gate reached by argv-inheriting import is reachable', r.has('imported.mjs')]);

  r = reachableFrom(['node scripts/runner.mjs'], src({
    'runner.mjs': '// docs mention ghost.mjs but never invoke it',
  }));
  cases.push(['documentation-only script names do NOT buy reachability', !r.has('ghost.mjs')]);

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

  rows = classify({
    scripts: ['check-release-only.mjs'],
    readSource: src({ 'check-release-only.mjs': '/* @verification-scope release */ process.exit(1)' }),
    reachable: new Set(),
  });
  cases.push(['source-declared lifecycle gate is outside build scope', rows[0].verdict === 'scoped-release']);

  rows = classify({
    scripts: ['check-default.mjs'],
    readSource: src({ 'check-default.mjs': 'process.exit(findings.length ? 1 : 0)' }),
    reachable: new Set(),
  });
  cases.push(['unreachable default check gate is caught', rows[0].verdict === 'unreachable']);

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
const steps = [
  pkg.scripts?.['build:check'] || '',
  ...(pkg.scripts?.['build:check:steps'] || '').split('&&').map((s) => s.trim()),
];
const reachable = reachableFrom(steps, read);
const rows = classify({ scripts: trackedVerificationScripts(), readSource: read, reachable });
const orphans = rows.filter((r) => r.verdict === 'unreachable');
const dry = rows.filter((r) => r.verdict === 'declared-dry-run');
const scoped = rows.filter((r) => r.verdict.startsWith('scoped-'));

if (orphans.length) {
  console.error('✗ check-build-gate-reachability: verification gate(s) no build:check path invokes —');
  console.error('  a gate nothing asks reads exactly like a gate that passed.');
  for (const o of orphans) console.error(`    · scripts/${o.name}`);
  console.error('  fix: wire it into package.json build:check:steps (or a runner already in it),');
  console.error(`  or, if it is a report-only dry-run, declare "${DRY_RUN_MARKER}" in its source.`);
  process.exit(1);
}
console.log(`✓ check-build-gate-reachability: ${rows.length - dry.length - scoped.length}/${rows.length - dry.length - scoped.length} build-scope gates reachable · ${dry.length} declared dry-run(s) · ${scoped.length} lifecycle-scoped`);
