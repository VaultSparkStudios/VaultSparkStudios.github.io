#!/usr/bin/env node
/**
 * check-workflow-install-consistency.mjs — S221 second-order innovation
 * (born from the S221 root-fix of three CI workflows broken at install).
 *
 * THE GAP IT CLOSES: this repo's `package-lock.json` (and `scripts/package-lock.json`)
 * are GITIGNORED by convention (.gitignore lines 3-4). That makes `npm ci` — which
 * REQUIRES a committed lockfile — fail with `EUSAGE` on every CI run, and makes
 * actions/setup-node's `cache: 'npm'` fail with "Dependencies lock file is not found".
 *
 * Two workflows (accessibility.yml, cloudflare-worker-deploy.yml) already learned
 * this and use `npm install` with an explanatory comment. But three others
 * (refresh-live-data.yml, visual-regression.yml, og-images.yml) silently regressed
 * back to `npm ci` / `cache: 'npm'` and were failing at install EVERY run:
 *   - refresh-live-data → the S219 "live data must never go stale" 4h cron was dead
 *   - visual-regression → mobile VR gate failed on every PR
 *   - og-images        → OG-image regen broken since 2026-03
 *
 * S221 fixed all three. THIS gate makes the class impossible to reintroduce: the
 * lockfile is gitignored, therefore `npm ci` and `cache: 'npm'` are FORBIDDEN in
 * workflows — they can only ever fail. Mirrors the "build the gate for a class right
 * after you hand-fix it" discipline of check-orphan-libs.mjs (S219).
 *
 * IMPORTANT: only flags REAL invocations. A `npm ci` mentioned inside a YAML
 * comment (`# ... npm ci ...`) is documentation, not a command, and is NOT flagged.
 *
 * Modes:
 *   --check       exit 1 if any forbidden install directive exists (CI gate; default)
 *   --warn-only   never exit 1 (advisory; soft rollout)
 *   --json        machine-readable report
 *   --self-test   exercise the detection logic on fixtures, exit 0/1
 *
 * Exit 0 = clean (or warn-only/self-test pass). Exit 1 = finding (or self-test fail).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Manager → the lockfile(s) that `npm ci` / `cache: <mgr>` need committed to work.
// Covers JS package managers (setup-node `cache:` inputs) — extend as new ones appear.
const MANAGER_LOCKFILES = {
  npm:  ['package-lock.json', 'npm-shrinkwrap.json'],
  yarn: ['yarn.lock'],
  pnpm: ['pnpm-lock.yaml'],
  bun:  ['bun.lockb', 'bun.lock'],
};

/**
 * committedManagers(root) — which package managers have a COMMITTED lockfile (git-tracked).
 * Truth source is `git ls-files`, not an FS walk, so a gitignored-but-present lockfile is
 * correctly treated as absent (the exact divergence that broke S221's CI: the lockfile
 * exists locally but `npm ci`/`cache:` see nothing on the runner). Returns a Set of
 * manager names whose `cache:`/`npm ci` is therefore SAFE. Best-effort: if git is
 * unavailable the set is empty → the check stays conservative (flags everything, the
 * pre-S232 behavior).
 */
export function committedManagers(root = ROOT) {
  let tracked = new Set();
  try {
    const out = execFileSync('git', ['ls-files', '--', ...Object.values(MANAGER_LOCKFILES).flat()],
      { cwd: root, encoding: 'utf8' });
    tracked = new Set(out.split('\n').map(l => path.basename(l.trim())).filter(Boolean));
  } catch { /* git absent → empty set → conservative */ }
  const ok = new Set();
  for (const [mgr, locks] of Object.entries(MANAGER_LOCKFILES)) {
    if (locks.some(l => tracked.has(l))) ok.add(mgr);
  }
  return ok;
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const warnOnly = args.includes('--warn-only');
const selfTest = args.includes('--self-test');

// ── Pure, testable core ─────────────────────────────────────────────────────────
/**
 * scanWorkflow(text, committed) — find install directives that need a committed lockfile
 * the repo doesn't provide. The general rule (S232): `npm ci` and setup-node `cache: <mgr>`
 * BOTH require `<mgr>`'s lockfile to be git-committed; if it is not, they can only ever fail
 * ("EUSAGE" / "Dependencies lock file is not found"). So a directive is flagged unless its
 * manager's lockfile is in `committed`. In THIS repo every lockfile is gitignored, so
 * `committed` is empty and behavior matches S221–S225 (flag all); but the gate is now correct
 * for ANY repo and ANY manager (npm/yarn/pnpm/bun + future) — not a hardcoded "all gitignored".
 * Comment-only mentions are ignored (documentation, not commands).
 * @param {string} text         full file contents
 * @param {Set<string>} committed  managers whose lockfile IS committed (default: none)
 * @returns {Array<{line:number, kind:string, manager?:string, snippet:string}>}
 */
export function scanWorkflow(text, committed = new Set()) {
  const findings = [];
  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    // A full-line YAML comment is documentation, never an executed command.
    if (/^\s*#/.test(raw)) return;
    // Strip an inline trailing comment so `run: foo # npm ci` doesn't false-fire.
    // (Approximate: cut at the first ' #'. URLs use '://' not ' #', so this is safe
    //  for the shell-command lines we care about.)
    const code = raw.split(' #')[0];

    // `npm ci` needs a committed package-lock.json. Flag unless npm's lockfile is committed.
    if (/\bnpm ci\b/.test(code) && !committed.has('npm')) {
      findings.push({ line: i + 1, kind: 'npm-ci', manager: 'npm', snippet: raw.trim() });
    }
    // setup-node `cache: <mgr>` needs a committed lockfile to hash. Capture ANY manager
    // token (not a hardcoded enum) so a future manager is covered; `\bcache:` does not
    // match `cache-dependency-path:` (no colon directly after "cache"). Flag unless that
    // manager's lockfile is committed.
    const cacheMatch = code.match(/\bcache:\s*['"]?([a-z][a-z0-9-]*)['"]?\s*$/);
    if (cacheMatch && !committed.has(cacheMatch[1])) {
      findings.push({ line: i + 1, kind: 'cache-lock', manager: cacheMatch[1], snippet: raw.trim() });
    }
  });
  return findings;
}

const REASON = {
  'npm-ci': '`npm ci` requires a committed package-lock.json; none is git-tracked here → fails with EUSAGE. Use `npm install --no-audit --no-fund` (or commit the lockfile).',
  'cache-lock': "actions/setup-node `cache:` needs a committed lockfile to hash; this manager's lockfile is not git-tracked here → fails \"Dependencies lock file is not found\". Remove the cache line (or commit the lockfile).",
};

// ── Self-test ────────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  ok(scanWorkflow('      - run: npm ci').length === 1, 'bare `npm ci` flagged');
  ok(scanWorkflow('        run: npm ci --no-audit --no-fund').length === 1, '`npm ci` with flags flagged');
  ok(scanWorkflow('        run: cd scripts && npm ci').length === 1, '`npm ci` after && flagged');
  ok(scanWorkflow("          cache: 'npm'").length === 1, "`cache: 'npm'` flagged");
  ok(scanWorkflow('          cache: npm').length === 1, 'unquoted `cache: npm` flagged');
  ok(scanWorkflow("          cache: 'yarn'").length === 1, "`cache: 'yarn'` flagged (generalized)");
  ok(scanWorkflow('          cache: pnpm').length === 1, '`cache: pnpm` flagged (generalized)');
  ok(scanWorkflow('          cache: bun').length === 1, '`cache: bun` flagged (generalized, S225)');
  ok(scanWorkflow('          cache: deno').length === 1, '`cache: deno` flagged (open manager token, S232)');
  ok(scanWorkflow('        # Lockfile gitignored so `npm ci` cannot run').length === 0, 'comment mention NOT flagged');
  ok(scanWorkflow('        run: npm install --no-audit --no-fund').length === 0, '`npm install` clean');
  ok(scanWorkflow('          cache-dependency-path: scripts/package.json').length === 0, 'cache-dependency-path alone clean');
  // a real run line with a trailing inline comment that mentions npm ci
  ok(scanWorkflow('        run: npm install # replaces npm ci').length === 0, 'trailing-comment mention NOT flagged');
  // S232 lockfile-presence-aware path: a committed lockfile makes the directive SAFE.
  ok(scanWorkflow("          cache: 'npm'", new Set(['npm'])).length === 0, "`cache: 'npm'` NOT flagged when npm lockfile committed");
  ok(scanWorkflow('        run: npm ci', new Set(['npm'])).length === 0, '`npm ci` NOT flagged when npm lockfile committed');
  ok(scanWorkflow("          cache: 'yarn'", new Set(['npm'])).length === 1, '`cache: yarn` still flagged when only npm lockfile committed');

  console.log(`check-workflow-install-consistency --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Live scan ────────────────────────────────────────────────────────────────────
const wfDir = path.join(ROOT, '.github', 'workflows');
let files = [];
try {
  files = fs.readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f));
} catch {
  console.error('check-workflow-install-consistency: .github/workflows not found');
  process.exit(0);
}

const committed = committedManagers(ROOT);
const report = [];
for (const f of files) {
  let text = '';
  try { text = fs.readFileSync(path.join(wfDir, f), 'utf8'); } catch { continue; }
  for (const hit of scanWorkflow(text, committed)) {
    report.push({ file: `.github/workflows/${f}`, ...hit });
  }
}

if (asJson) {
  console.log(JSON.stringify({ scanned: files.length, findings: report }, null, 2));
  process.exit(report.length && !warnOnly ? 1 : 0);
}

console.log(`check-workflow-install-consistency: scanned ${files.length} workflow(s)`);
if (!report.length) {
  console.log('  ✓ no forbidden install directives (lockfile is gitignored → npm install only)');
  process.exit(0);
}
console.error(`  ✗ ${report.length} forbidden install directive(s) — lockfile is gitignored, these can only fail:`);
for (const r of report) {
  console.error(`      ${r.file}:${r.line}  [${r.kind}]  ${r.snippet}`);
  console.error(`        → ${REASON[r.kind]}`);
}
process.exit(warnOnly ? 0 : 1);
