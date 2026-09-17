#!/usr/bin/env node
/**
 * Fast generated-output drift preflight — a SAMPLE, and it now says so.
 *
 * This intentionally runs the checks that most often catch stale generated
 * public artifacts before the full build gate spends minutes on unrelated work.
 * Being a sample is the whole point: it sits at step 29 of 499 and finishes in
 * seconds, which is why an agent consults it to answer "do I need to run
 * `npm run build`?" without paying for the full gate.
 *
 * S357 — the defect was the SENTENCE, not the sample. On an all-green run this
 * printed `ok: generated artifacts are current`: no quantifier, no denominator,
 * no scope. That is a whole-tree claim, and it was emitted by six subjects out
 * of ninety-four `--check`-gated generators — about 6.5%. It was observed live
 * reporting "current" while `build-news-desk` and `generate-pathways` were both
 * stale; both are gated, both are modeled in the evidence graph, and both sit
 * far downstream in the same chain (steps 328 and 393), so a FULL build:check
 * would have caught them. The hole was in the reading, not the gate set.
 *
 * The repo already says this about itself, in check-evidence-graph-coverage's
 * own header: tools like this are "blind in the worst possible way: they report
 * success over the subset they know."
 *
 * The fix is not to widen the list — widening destroys the seconds-long runtime
 * that is this tool's only reason to exist, and duplicates build:check. It is to
 * make the tool COMPUTE its denominator from the registry that already owns the
 * universe, so the honest sentence cannot go stale when a generator is added.
 * A hardcoded fraction would rot exactly the way the old sentence did.
 *
 * It also reports the evidence STRENGTH of its own subjects. All six are
 * `unclassified` today: no reviewed evidence that any of their `--check` modes
 * is a byte-drift comparison rather than a shape/presence check. A green from
 * an unclassified check is weaker than it looks, and hiding that is the same
 * class of overclaim as hiding the denominator.
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  checkedGenerators,
  readProofSurfaceGenerators,
  evidenceLevels,
  evidenceSummary,
} from './check-evidence-graph-coverage.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const SELF_TEST = args.includes('--self-test');

const CHECKS = [
  { id: 'public-intelligence', command: ['node', 'scripts/generate-public-intelligence.mjs', '--check'], fix: 'node scripts/generate-public-intelligence.mjs' },
  { id: 'heartbeat', command: ['node', 'scripts/generate-heartbeat.mjs', '--check'], fix: 'node scripts/generate-heartbeat.mjs' },
  { id: 'rum-summary', command: ['node', 'scripts/pull-rum-summary.mjs', '--check'], fix: 'node scripts/pull-rum-summary.mjs' },
  { id: 'nav-sheet-stats', command: ['node', 'scripts/build-nav-sheet-stats.mjs', '--check'], fix: 'node scripts/build-nav-sheet-stats.mjs' },
  { id: 'llms-full-shards', command: ['node', 'scripts/build-llms-full-shards.mjs', '--check'], fix: 'node scripts/build-llms-full-shards.mjs' },
  // S218: page-specific ecosystem-bridge links derived from the catalog. Folded in
  // here (not a new build:check segment) since build:check is at the Windows cmd.exe
  // length ceiling — drift = a bridge out of sync with public-intelligence.json.
  { id: 'ecosystem-bridges', command: ['node', 'scripts/build-ecosystem-bridges.mjs', '--check'], fix: 'node scripts/build-ecosystem-bridges.mjs' },
];

/** The subjects this tool actually samples. */
export const SAMPLED_GENERATORS = CHECKS.map((c) => c.command[1]);

/**
 * The population being sampled, derived — never hardcoded.
 *
 * Two of this tool's own subjects are invisible to the registry's regexes:
 * `pull-rum-summary.mjs` (the family is `build-|generate-`) and
 * `build-ecosystem-bridges.mjs`, for which THIS FILE is the only runner in the
 * repo — it is deliberately not in build:check:steps, because that chain is at
 * the Windows cmd.exe length ceiling (D-S218.3). Folding SAMPLED_GENERATORS in
 * is what makes the denominator the true union rather than the registry's view
 * of it, and it is why this is a union and not a lookup.
 */
export function universeGenerators(root = ROOT) {
  let steps = '';
  try { steps = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts['build:check:steps'] || ''; }
  catch { /* a package.json we cannot read yields a smaller, still-honest denominator */ }
  return [...new Set([
    ...checkedGenerators(steps),
    ...readProofSurfaceGenerators(root),
    ...SAMPLED_GENERATORS,
  ])].sort();
}

function runCheck(check) {
  let result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  let healed = false;
  if (result.status !== 0 && check.autofix) {
    const fixParts = check.fix.split(' ');
    spawnSync(fixParts[0], fixParts.slice(1), { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    result = spawnSync(check.command[0], check.command.slice(1), {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
    });
    healed = result.status === 0;
  }
  return {
    id: check.id,
    ok: result.status === 0,
    status: result.status,
    fix: check.fix,
    healed,
    stdout: (result.stdout || '').trim().split('\n').slice(-3).join('\n'),
    stderr: (result.stderr || '').trim().split('\n').slice(-3).join('\n'),
  };
}

export function summarize(results, scope = {}) {
  const stale = results.filter((r) => !r.ok);
  const sampled = Number.isInteger(scope.sampled) ? scope.sampled : results.length;
  const universe = Number.isInteger(scope.universe) ? scope.universe : sampled;
  return {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    ok: stale.length === 0,
    sampled,
    universe,
    subjects: scope.subjects || SAMPLED_GENERATORS,
    evidence: scope.evidence || null,
    checks: results.map(({ id, ok, status, fix, healed }) => ({ id, ok, status, fix, healed: healed || false })),
    stale: stale.map((r) => ({ id: r.id, fix: r.fix, stderr: r.stderr || r.stdout })),
    // The green branch must never be a whole-tree claim. It names its own
    // fraction and points at the gate that does cover the rest.
    recommendation: stale.length
      ? 'run npm run build, then rerun npm run build:check'
      : `${sampled} of ${universe} --check-gated generated artifact(s) sampled — NOT whole-tree freshness; run npm run build:check for the full set`,
  };
}

if (SELF_TEST) {
  const fake = summarize([
    { id: 'a', ok: true, status: 0, fix: 'fix-a' },
    { id: 'b', ok: false, status: 1, fix: 'fix-b', stderr: 'drift' },
  ]);
  // The all-green branch — the one that was never tested, and the one that
  // carried the overclaim for the tool's whole life.
  const green = summarize([{ id: 'a', ok: true, status: 0, fix: 'fix-a' }], { sampled: 6, universe: 94 });
  const liveUniverse = universeGenerators();
  const cases = [
    ['detects stale checks', fake.ok === false && fake.stale.length === 1],
    ['keeps fix command', fake.stale[0].fix === 'fix-b'],
    ['has recommendation', /npm run build/.test(fake.recommendation)],
    // Control 1 — scope honesty. The exact sentence that was wrong must be
    // unreachable, and the replacement must carry its fraction.
    ['green verdict is never the bare whole-tree claim',
      !/^generated artifacts are current$/.test(green.recommendation)],
    ['green verdict names its own fraction',
      green.recommendation.includes('6 of 94') && /NOT whole-tree freshness/.test(green.recommendation)],
    ['green verdict points at the gate that covers the rest',
      /npm run build:check/.test(green.recommendation)],
    // Control 2 — denominator drift. The tool must MEASURE its population, not
    // assert one. Add a --check-gated generator anywhere and this moves on its
    // own; hardcode a number instead and this fails.
    ['universe is derived, not hardcoded',
      liveUniverse.length > SAMPLED_GENERATORS.length && liveUniverse.length >= 90],
    ['universe is a true superset of the sample',
      SAMPLED_GENERATORS.every((g) => liveUniverse.includes(g))],
    // ecosystem-bridges is gated ONLY by this file, so a denominator taken from
    // the registry alone would silently omit it.
    ['universe folds in subjects the registry cannot see',
      liveUniverse.includes('scripts/build-ecosystem-bridges.mjs') && liveUniverse.includes('scripts/pull-rum-summary.mjs')],
    // Control 3 — honest blindness. A known out-of-scope drifter must still
    // leave this tool green; the point is that it says so, not that it catches it.
    ['a known out-of-scope generator is genuinely outside the sample',
      liveUniverse.includes('scripts/build-news-desk.mjs')
      && liveUniverse.includes('scripts/generate-pathways.mjs')
      && !SAMPLED_GENERATORS.includes('scripts/build-news-desk.mjs')
      && !SAMPLED_GENERATORS.includes('scripts/generate-pathways.mjs')],
    ['evidence strength of the sample is reported, not hidden',
      /drift-comparing|shape-only|unclassified/.test(evidenceSummary(evidenceLevels(SAMPLED_GENERATORS)))],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const present = CHECKS.filter((check) => fs.existsSync(path.join(ROOT, check.command[1])));
const results = present.map(runCheck);
const universe = universeGenerators();
const evidence = evidenceSummary(evidenceLevels(present.map((c) => c.command[1])));
const report = summarize(results, {
  sampled: present.length,
  universe: universe.length,
  subjects: present.map((c) => c.command[1]),
  evidence,
});

// S357 — ship the S166 follow-up receipt so a closeout summary can cite the
// fraction instead of re-reading a terminal sentence. Re-reading the sentence is
// how the overclaim propagated in the first place.
try {
  fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.cache', 'generated-drift-preflight.json'), JSON.stringify(report, null, 2) + '\n');
} catch { /* the receipt is a convenience; never fail the gate over it */ }

if (JSON_MODE) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('generated-drift-preflight');
  console.log('──────────────────────────────────────────────');
  for (const result of report.checks) {
    console.log(`  ${result.ok ? (result.healed ? 'healed' : 'ok') : 'drift'} ${result.id}`);
  }
  console.log(`\n${report.ok ? 'ok (sample)' : 'drift'}: ${report.recommendation}`);
  console.log(`sample evidence: ${evidence}`);
  if (report.stale.length) {
    console.log('\nFix commands:');
    for (const stale of report.stale) console.log(`  - ${stale.fix}`);
  }
}

process.exit(report.ok ? 0 : 1);
