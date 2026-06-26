#!/usr/bin/env node
/**
 * pre-push-scan.mjs — S219 single-process pre-push content scanner.
 *
 * WHY: the v2 bash pre-push hook scanned each changed file with a `file` probe
 * plus ~11 `grep` invocations — ≈13 process spawns PER FILE. On Windows Git Bash
 * (where every spawn is throttled) a 160-file push meant ~2000 spawns and a
 * 7-10 minute push. This repo's substantive commits routinely touch 75-160 files
 * (it commits the regenerated intelligence layer + propagates nav to ~99 pages),
 * so it was hit far harder than any other project, whose commits touch a handful
 * of files. node + git spawns are fast here (~1s / ~0.3s); bash mass-spawn is not.
 *
 * This does Rules 1-4 (the per-file content scan) ENTIRELY IN-PROCESS: one node
 * spawn reads each changed file with fs and applies the same regexes. Spawn count
 * is now O(1) in the number of changed files. Behaviour/patterns/exemptions are
 * preserved 1:1 from the v2 hook. Rules 5-9 (node sub-checks) stay in the hook.
 *
 * Input: stdin lines "<local_ref> <local_sha> <remote_ref> <remote_sha>" (git's
 * pre-push contract). With no stdin / --range, falls back to origin/main..HEAD.
 * Exit 0 = clean · 1 = violations (printed) · also `--self-test`.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from './lib/safe-spawn.mjs';
import path from 'node:path';

const ZERO = '0000000000000000000000000000000000000000';

function repoRoot() {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(); }
  catch { return process.cwd(); }
}

function changedFiles(ROOT, ranges) {
  const set = new Set();
  for (const [localSha, remoteSha] of ranges) {
    if (localSha === ZERO) continue;
    let out = '';
    try {
      out = (remoteSha === ZERO || !remoteSha)
        ? execFileSync('git', ['diff-tree', '--no-commit-id', '-r', '--name-only', localSha], { cwd: ROOT, encoding: 'utf8' })
        : execFileSync('git', ['diff', '--name-only', `${remoteSha}..${localSha}`], { cwd: ROOT, encoding: 'utf8' });
    } catch { /* range unavailable — skip */ }
    out.split('\n').map(s => s.trim()).filter(Boolean).forEach(f => set.add(f));
  }
  return [...set];
}

// ── Rule definitions (1:1 with the v2 bash hook) ─────────────────────────────
const CRED = [
  { re: /sk_live_[A-Za-z0-9]{24,}/, label: 'Stripe live secret key' },
  { re: /rnd_[A-Za-z0-9]{20,}/, label: 'Render API key' },
  { re: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/, label: 'GitHub PAT' },
  { re: /AKIA[A-Z0-9]{16}/, label: 'AWS access key' },
  { re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}/, label: 'JWT (service role?)' },
];
const PG_RE = /postgresql:\/\/[^:]+:[^@]{8,}@/;
const PG_SAFE = /@(localhost|127\.0\.0\.1|db|postgres|postgres-test|shadow-db)(:[0-9]+)?(\/|$)/;
const ABS_RE = /(C:\\Users\\|\/Users\/[A-Za-z0-9_.-]+\/documents\/development\/)/i;
const ABS_EXEMPT = [
  /^\.claude\/settings\.local\.json$/,
  /^audits\/sanitization\/latest\/.*\.issue\.md$/,
  /^audits\/sanitization\/latest\/.*\.json$/,
];
const ANTHRO_RE = /api\.anthropic\.com|@anthropic-ai\/sdk|claude-(opus|sonnet|haiku)-[0-9]/;
const ANTHRO_EXEMPT = new Set([
  'scripts/lib/model-router.mjs',
  'scripts/git-hooks/pre-push',
  'scripts/pre-push-scan.mjs',            // this file holds the patterns — self-exempt
  'scripts/check-model-router-adherence.mjs',
  'scripts/test/tier1-model-router-chokepoint.mjs',
  'scripts/context-meter.mjs',
  'scripts/render-session-summary.mjs',
  'scripts/probe-capability.mjs',
  'scripts/test/tier2-token-ledger-hook.mjs',
]);
const ENV_SAFE = new Set(['.env.example', '.env.sample', '.env.template']);

function isBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true; // NUL byte → binary
  return false;
}

/** scanFile(rel, text) → array of violation strings (pure — unit-testable). */
export function scanFile(rel, text) {
  const out = [];
  const base = rel.split('/').pop();

  // Rule 1: committed .env files (filename)
  if (/^\.env(\.|$)/.test(base) && !ENV_SAFE.has(base)) out.push(`⛔ .env file committed: ${rel}`);

  // Rule 2a: credential patterns
  for (const { re, label } of CRED) if (re.test(text)) out.push(`⛔ ${label}: ${rel}`);

  // Rule 2b: Postgres URL w/ embedded password (skip redacted + CI/test hosts)
  for (const line of text.split('\n')) {
    if (PG_RE.test(line) && !/\[REDACTED\]/.test(line) && !PG_SAFE.test(line)) {
      out.push(`⚠ DB connection string with password: ${rel}`); break;
    }
  }

  // Rule 3: absolute local path leak (exempt per-user/audit files)
  if (!ABS_EXEMPT.some(re => re.test(rel)) && ABS_RE.test(text)) {
    out.push(`⚠ Absolute local path leak: ${rel}`);
  }

  // Rule 4: anthropic chokepoint — scripts/* only, minus exemptions, skip comments
  if (rel.startsWith('scripts/') && !ANTHRO_EXEMPT.has(rel)) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (/^\s*(\/\/|#|\*)/.test(ln)) continue;     // comment line
      if (ANTHRO_RE.test(ln)) { out.push(`⛔ Router adherence violation: ${rel}:${i + 1}`); break; }
    }
  }
  return out;
}

// ── Self-test ────────────────────────────────────────────────────────────────
if (process.argv.includes('--self-test')) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };
  // Trigger strings are assembled from fragments so THIS source file does not
  // itself contain a literal credential/path the scanner (or scan-secrets) flags.
  const skKey = 'sk_' + 'live_ABCDEFGHIJKLMNOPQRSTUVWX12';
  const awsKey = 'AKIA' + 'ABCDEFGHIJKLMNOP';
  const absP = 'C:' + '\\Users\\bob\\x';
  const anth = 'api.' + 'anthropic.com';
  const pgProd = 'postgre' + 'sql://u:supersecretpw@evil.example/db';
  const pgLocal = 'postgre' + 'sql://u:supersecretpw@localhost/db';
  ok(scanFile('a.txt', 'x ' + skKey + ' y').length === 1, 'detects Stripe key');
  ok(scanFile('a.txt', awsKey).length === 1, 'detects AWS key');
  ok(scanFile('a.txt', 'path ' + absP).length === 1, 'detects abs path');
  ok(scanFile('.claude/settings.local.json', absP).length === 0, 'exempts settings.local.json abs path');
  ok(scanFile('.env', 'API=1').length === 1, 'flags committed .env');
  ok(scanFile('.env.example', 'API=1').length === 0, 'allows .env.example');
  ok(scanFile('scripts/foo.mjs', 'fetch("https://' + anth + '")').length === 1, 'flags anthropic in scripts');
  ok(scanFile('scripts/lib/model-router.mjs', anth).length === 0, 'exempts model-router');
  ok(scanFile('scripts/foo.mjs', '// ' + anth + ' note').length === 0, 'skips comment line');
  ok(scanFile('data/x.json', pgProd).length === 1, 'flags prod pg url');
  ok(scanFile('data/x.json', pgLocal).length === 0, 'allows localhost pg url');
  ok(scanFile('a.txt', 'totally clean content').length === 0, 'clean file passes');
  console.log(`pre-push-scan --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Main (only when run directly — import-safe per feedback_import_safe_*) ────
const RUN_DIRECT = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('pre-push-scan.mjs');

if (RUN_DIRECT) {
  const ROOT = repoRoot();
  // Read git's ref stream from stdin — but only when stdin is a pipe (the hook).
  // A TTY (manual run) would block on readFileSync(0); fall back to the range.
  const stdin = (!process.stdin.isTTY)
    ? (() => { try { return readFileSync(0, 'utf8'); } catch { return ''; } })()
    : '';
  let ranges = stdin.split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => l.split(/\s+/)).filter(p => p.length >= 4).map(p => [p[1], p[3]]);
  if (!ranges.length) {
    // Fallback (manual run): scan origin/main..HEAD
    try {
      const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
      const base = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim();
      ranges = [[head, base]];
    } catch { ranges = []; }
  }

  const files = changedFiles(ROOT, ranges);
  const violations = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!existsSync(abs)) continue;
    try { if (statSync(abs).size > 5_000_000) continue; } catch { continue; } // skip huge files
    let buf;
    try { buf = readFileSync(abs); } catch { continue; }
    if (isBinary(buf)) continue;                       // skip binary (replaces `file` probe)
    violations.push(...scanFile(rel, buf.toString('utf8')));
  }

  if (violations.length) {
    console.error('\n⛔ Pre-push checks: ' + violations.length + ' issue(s) found\n');
    for (const v of violations) console.error('  ' + v);
    console.error('\n  Review the flagged files before pushing.');
    console.error('  To push anyway with justification: git push --no-verify\n');
    process.exit(1);
  }
  process.exit(0);
}
