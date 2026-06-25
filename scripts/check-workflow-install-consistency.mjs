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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const warnOnly = args.includes('--warn-only');
const selfTest = args.includes('--self-test');

// ── Pure, testable core ─────────────────────────────────────────────────────────
/**
 * scanWorkflow(text) — find forbidden install directives in one workflow's YAML.
 * Lockfile is gitignored here, so `npm ci` and `cache: 'npm'` can only ever fail.
 * Comment-only mentions are ignored (documentation, not commands).
 * @param {string} text   full file contents
 * @returns {Array<{line:number, kind:string, snippet:string}>}
 */
export function scanWorkflow(text) {
  const findings = [];
  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    // A full-line YAML comment is documentation, never an executed command.
    if (/^\s*#/.test(raw)) return;
    // Strip an inline trailing comment so `run: foo # npm ci` doesn't false-fire.
    // (Approximate: cut at the first ' #'. URLs use '://' not ' #', so this is safe
    //  for the shell-command lines we care about.)
    const code = raw.split(' #')[0];

    // `npm ci` as a real command token (followed by whitespace, flag, end, or && |).
    if (/\bnpm ci\b/.test(code)) {
      findings.push({ line: i + 1, kind: 'npm-ci', snippet: raw.trim() });
    }
    // setup-node lockfile cache — needs a committed lockfile to hash.
    if (/\bcache:\s*['"]?npm['"]?\s*$/.test(code)) {
      findings.push({ line: i + 1, kind: 'cache-npm', snippet: raw.trim() });
    }
  });
  return findings;
}

const REASON = {
  'npm-ci': '`npm ci` requires a committed package-lock.json, but it is gitignored here → fails with EUSAGE. Use `npm install --no-audit --no-fund`.',
  'cache-npm': "actions/setup-node `cache: 'npm'` needs a committed lockfile to hash → fails \"Dependencies lock file is not found\". Remove the cache line.",
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
  ok(scanWorkflow('        # Lockfile gitignored so `npm ci` cannot run').length === 0, 'comment mention NOT flagged');
  ok(scanWorkflow('        run: npm install --no-audit --no-fund').length === 0, '`npm install` clean');
  ok(scanWorkflow('          cache-dependency-path: scripts/package.json').length === 0, 'cache-dependency-path alone clean');
  // a real run line with a trailing inline comment that mentions npm ci
  ok(scanWorkflow('        run: npm install # replaces npm ci').length === 0, 'trailing-comment mention NOT flagged');

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

const report = [];
for (const f of files) {
  let text = '';
  try { text = fs.readFileSync(path.join(wfDir, f), 'utf8'); } catch { continue; }
  for (const hit of scanWorkflow(text)) {
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
