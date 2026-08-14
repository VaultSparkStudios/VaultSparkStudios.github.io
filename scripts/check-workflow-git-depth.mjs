#!/usr/bin/env node
/**
 * check-workflow-git-depth.mjs — shallow-clone data-corruption gate (S281)
 *
 * `actions/checkout` defaults to `fetch-depth: 1` — a shallow clone containing
 * exactly ONE commit. Any generator that derives data from `git log` therefore
 * sees a single commit and publishes a near-empty feed. It does not crash and it
 * does not fail CI: it silently writes WRONG DATA, and the cron commits it.
 *
 * Observed S281 (user-reported "the Oracle chart is broken and the data isn't
 * live"): refresh-live-data.yml ran `npm run build` on a shallow clone every 4h
 * and committed api/ecosystem-velocity.json with totalCommits: 1 — against 1832
 * from a full clone. The public /oracle/ velocity chart drew a flat line at the
 * baseline (every day zero). The cron commits with [skip ci], so no CI run ever
 * validated the feed. The chart self-healed whenever a human session pushed a
 * full-clone build and re-broke within 4h, which made it read as flaky.
 *
 * The rule this enforces: if a workflow runs a git-history-dependent generator —
 * directly OR via `npm run build` — its checkout MUST set `fetch-depth: 0`.
 *
 * DERIVED, not hand-listed: the generator set is computed by scanning
 * scripts/build-*.mjs for `git log` / `rev-list` usage, so a NEW history-reading
 * generator is covered automatically. `git ls-files` does NOT count — it works
 * fine in a shallow clone (tracked files are all present), and treating it as
 * history-dependent produced false positives on uptime-probe.yml +
 * ci-status-beacon.yml during development.
 *
 * Usage:
 *   node scripts/check-workflow-git-depth.mjs             # report
 *   node scripts/check-workflow-git-depth.mjs --check     # exit 1 on violation
 *   node scripts/check-workflow-git-depth.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));

// Subcommands that cannot be answered by a depth-1 clone. `git ls-files`,
// `git config` and `git rev-parse HEAD` all work fine when shallow and are
// deliberately excluded — treating them as history-dependent produced false
// positives on uptime-probe.yml and ci-status-beacon.yml during development.
//
// S316 — `cat-file`, `merge-base` and `describe` were missing from this list.
// build-deploy-currency.mjs asks `git cat-file -e <deployedSha>`, which fails
// for EVERY non-tip commit in a shallow clone; the probe read that failure as
// "this sha is not in our history" and published `diverged` to a public trust
// surface against an ordinary ancestor of main.
const HISTORY_SUBCOMMANDS = 'log|rev-list|cat-file|merge-base|describe';

// Three call shapes, because the gate previously recognised only the first two
// and so was GREEN while the corruption above was live:
//   1. shell form            git log --format=%H
//   2. direct execFileSync   execFileSync('git', ['rev-list', ...])
//   3. helper-bound (S316)   const git = (args) => execFileSync('git', args)
//                            git(['cat-file', '-e', sha])
// Shape 3 has no whitespace after `git` and no quoted 'git', literal, so it
// slipped past both original alternatives. Indirection must not buy exemption.
const HISTORY_RE = new RegExp(
  [
    `git\\s+(?:${HISTORY_SUBCOMMANDS})\\b`,
    `'git',\\s*\\[\\s*'(?:${HISTORY_SUBCOMMANDS})'`,
    `\\bgit\\(\\s*\\[\\s*['"\`](?:${HISTORY_SUBCOMMANDS})['"\`]`,
  ].join('|'),
);

export function findHistoryGenerators(readDir, readFile) {
  return readDir()
    .filter((f) => /^build-.*\.mjs$/.test(f))
    .filter((f) => {
      try { return HISTORY_RE.test(readFile(f)); } catch { return false; }
    })
    .sort();
}

/**
 * A workflow needs full history iff it runs a history generator directly, or
 * runs `npm run build` (whose chain contains them).
 */
// Strip YAML comments before matching directives. Without this, prose in a
// comment ("checkout defaults to fetch-depth: 1") is read as the real setting —
// which is exactly what this gate did on its first run against the very fix it
// was written to verify.
function stripComments(yaml) {
  return yaml
    .split('\n')
    .map((line) => line.replace(/(^|\s)#.*$/, '$1'))
    .join('\n');
}

export function auditWorkflow(name, rawYaml, historyGens, buildChainHasHistory) {
  const yaml = stripComments(rawYaml);
  const touchesGit = /actions\/checkout/.test(yaml);
  if (!touchesGit) return null;

  const direct = historyGens.filter((g) => yaml.includes(g));
  // `npm run build` ONLY — not `npm run build:check` / `build:foo`. A bare \b
  // matches the boundary before ':', so build:check (which validates, never
  // re-derives) was falsely flagged.
  const viaBuild = buildChainHasHistory && /npm run build(?![:\w-])/.test(yaml);
  const needsHistory = direct.length > 0 || viaBuild;
  if (!needsHistory) return null;

  const m = yaml.match(/fetch-depth:\s*(\S+)/);
  const depth = m ? m[1] : null;
  const ok = depth === '0';
  return {
    name, ok, depth,
    reason: viaBuild ? 'runs `npm run build` (chain reads git log)' : `runs ${direct.join(', ')}`,
    generators: direct,
  };
}

function selfTest() {
  const fakeScripts = {
    'build-velocity.mjs': "const out = execFileSync('git', ['log', '--format=%H']);",
    'build-tracked.mjs': "const out = execFileSync('git', ['ls-files', '--', 'assets']);", // shallow-safe
    'build-conf.mjs': "execFileSync('git', ['config', 'user.name']);",                     // shallow-safe
    'check-thing.mjs': "git log should not match — not a build- script",
    // S316 — VERBATIM call shape from build-deploy-currency.mjs, the generator
    // this gate was green against while it published wrong data. If a future
    // refactor of HISTORY_RE stops matching this, the test below goes red.
    'build-currency.mjs': [
      "const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();",
      "const repoTipSha = git(['rev-parse', 'HEAD']);",
      "git(['cat-file', '-e', deployedSha]);",
      "const commitsBehind = Number.parseInt(git(['rev-list', '--count', `${deployedSha}..HEAD`]), 10);",
    ].join('\n'),
    // rev-parse HEAD alone is answerable in a depth-1 clone — it must stay out.
    'build-tip.mjs': "const git = (args) => execFileSync('git', args);\nconst tip = git(['rev-parse', 'HEAD']);",
  };
  const gens = findHistoryGenerators(
    () => Object.keys(fakeScripts),
    (f) => fakeScripts[f],
  );
  const cases = [];
  cases.push(['history-dependent build scripts are detected through any call shape',
    gens.length === 2 && gens.includes('build-velocity.mjs') && gens.includes('build-currency.mjs')]);
  // S316 regression pins — the exact blind spot that let a live defect pass.
  cases.push(['THE LIVE BLIND SPOT: helper-bound git([\'cat-file\'...]) is history-dependent',
    gens.includes('build-currency.mjs')]);
  cases.push(['a shallow-safe rev-parse HEAD through the same helper is NOT flagged',
    !gens.includes('build-tip.mjs')]);
  cases.push(['git ls-files / git config generators stay shallow-safe',
    !gens.includes('build-tracked.mjs') && !gens.includes('build-conf.mjs')]);
  for (const sub of ['cat-file', 'merge-base', 'describe', 'log', 'rev-list']) {
    cases.push([`\`git ${sub}\` counts as history-dependent`,
      HISTORY_RE.test(`execFileSync('git', ['${sub}', 'x']);`)]);
  }
  cases.push(['`git rev-parse` is not treated as history-dependent',
    !HISTORY_RE.test("execFileSync('git', ['rev-parse', 'HEAD']);")]);
  // A shallow-flagged workflow must actually be reported, not merely detected.
  const live = auditWorkflow('cron.yml',
    'uses: actions/checkout@v4\nrun: node scripts/build-currency.mjs', gens, false);
  cases.push(['the real defect shape is reported as a violation',
    live && live.ok === false && live.depth === null]);

  // shallow + direct history generator → violation
  const a = auditWorkflow('cron.yml', 'uses: actions/checkout@v4\nrun: node scripts/build-velocity.mjs', gens, true);
  cases.push(['shallow + direct history generator flagged', a && a.ok === false && a.depth === null]);

  // shallow + npm run build → violation (the real S281 shape)
  const b = auditWorkflow('refresh.yml', 'uses: actions/checkout@v4\nrun: |\n  npm run build\n', gens, true);
  cases.push(['shallow + `npm run build` flagged', b && b.ok === false]);

  // fetch-depth: 0 → ok
  const c = auditWorkflow('good.yml', 'uses: actions/checkout@v4\n  with:\n    fetch-depth: 0\nrun: npm run build', gens, true);
  cases.push(['fetch-depth: 0 passes', c && c.ok === true]);

  // fetch-depth: 1 explicitly → still a violation
  const d = auditWorkflow('bad.yml', 'uses: actions/checkout@v4\n  with:\n    fetch-depth: 1\nrun: npm run build', gens, true);
  cases.push(['explicit fetch-depth: 1 flagged', d && d.ok === false && d.depth === '1']);

  // shallow-safe generators only → NOT flagged (the uptime-probe/ci-beacon false positives)
  const e = auditWorkflow('probe.yml', 'uses: actions/checkout@v4\nrun: node scripts/build-tracked.mjs', gens, true);
  cases.push(['git ls-files generator not flagged (shallow-safe)', e === null]);
  const f = auditWorkflow('beacon.yml', 'uses: actions/checkout@v4\nrun: node scripts/build-conf.mjs', gens, true);
  cases.push(['git config generator not flagged (shallow-safe)', f === null]);

  // no checkout at all → not applicable
  const g = auditWorkflow('none.yml', 'run: npm run build', gens, true);
  cases.push(['workflow without checkout ignored', g === null]);

  // build chain WITHOUT history generators → npm run build alone is fine
  const h = auditWorkflow('x.yml', 'uses: actions/checkout@v4\nrun: npm run build', gens, false);
  cases.push(['npm run build with a history-free chain not flagged', h === null]);

  // ── Regressions for this gate's OWN first-run false positives (S281) ──
  // 1. Prose in a comment must not be read as the real setting.
  const i = auditWorkflow('commented.yml',
    'uses: actions/checkout@v4\n  with:\n    # checkout defaults to fetch-depth: 1 which is shallow\n    fetch-depth: 0\nrun: npm run build', gens, true);
  cases.push(['fetch-depth in a COMMENT does not shadow the real value', i && i.ok === true && i.depth === '0']);

  // 2. `npm run build:check` only validates — it must not count as a re-derive.
  const j = auditWorkflow('e2e.yml', 'uses: actions/checkout@v4\nrun: npm run build:check', gens, true);
  cases.push(['`npm run build:check` not treated as `npm run build`', j === null]);
  const k = auditWorkflow('e2e2.yml', 'uses: actions/checkout@v4\nrun: npm run build:steps', gens, true);
  cases.push(['other `build:*` scripts not treated as `npm run build`', k === null]);

  let pass = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`check-workflow-git-depth --self-test: ${pass}/${cases.length}`);
  return pass === cases.length;
}

// Import-safe: only run the live check when invoked directly. Importing this
// module (tests, other gates) must never fire the scan or call process.exit.
const RUN_DIRECT = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

function main() {

if (args.has('--self-test')) process.exit(selfTest() ? 0 : 1);

const scriptsDir = path.join(ROOT, 'scripts');
const historyGens = findHistoryGenerators(
  () => fs.readdirSync(scriptsDir),
  (f) => fs.readFileSync(path.join(scriptsDir, f), 'utf8'),
);

// Does `npm run build` actually pull in a history generator?
let buildChainHasHistory = false;
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const chain = String(pkg.scripts?.build || '');
  buildChainHasHistory = historyGens.some((g) => chain.includes(g));
} catch { /* degrade */ }

const wfDir = path.join(ROOT, '.github', 'workflows');
if (!fs.existsSync(wfDir)) {
  console.log('check-workflow-git-depth: no workflows dir — skipping');
  process.exit(0);
}

const violations = [];
let audited = 0;
for (const f of fs.readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f))) {
  const res = auditWorkflow(f, fs.readFileSync(path.join(wfDir, f), 'utf8'), historyGens, buildChainHasHistory);
  if (!res) continue;
  audited++;
  if (!res.ok) violations.push(res);
}

if (!violations.length) {
  console.log(`check-workflow-git-depth: ok (${audited} history-dependent workflow(s) set fetch-depth: 0 · ${historyGens.length} git-log generator(s))`);
  process.exit(0);
}

console.error('check-workflow-git-depth: shallow clone would publish WRONG DATA —');
for (const v of violations) {
  console.error(`  ✗ .github/workflows/${v.name} — fetch-depth: ${v.depth ?? '(unset → defaults to 1, SHALLOW)'}`);
  console.error(`      ${v.reason}`);
  console.error('      → add to the checkout step:  with:\n            fetch-depth: 0');
}
console.error('');
console.error('A shallow clone does not crash these generators — they silently emit near-empty');
console.error('feeds (S281: api/ecosystem-velocity.json totalCommits 1 vs 1832), and the cron');
console.error('commits them with [skip ci] so no CI run ever catches it.');
process.exit(args.has('--check') ? 1 : 0);

}

if (RUN_DIRECT) main();
