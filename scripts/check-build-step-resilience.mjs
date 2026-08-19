#!/usr/bin/env node
/**
 * check-build-step-resilience.mjs — S223 second-order innovation
 * (born from the S222/S223 root-fix of build-llms-full-shards + build-agents-json
 * hard-exiting on the gitignored ignis/output/ecosystem-state.json, killing the
 * every-4h Refresh Live Data cron for 7+ consecutive runs).
 *
 * THE GAP IT CLOSES: the build chain (`npm run build`) runs 51+ scripts with `&&`,
 * meaning a single script's `process.exit(1)` kills the entire run. If a script reads
 * a GITIGNORED file and hard-exits when that file is absent, it silently strands every
 * CI cron that calls `npm run build`. The staleness beacon (S222) is the safety net;
 * this gate is the prevention.
 *
 * WHAT IT SCANS: each script in the build chain for:
 *   1. A read of a path known to be gitignored (ignis/output/, data/rum-raw.*, etc.)
 *   2. A `process.exit(1)` call within ±15 lines of an `existsSync` check on that path
 *   3. (S323) An UNGUARDED read of a gitignored path — a `readFileSync`/`readdirSync`
 *      of such a path with no `existsSync` guard and no enclosing try/catch. This is
 *      the most common unresilient shape and the one the name promised but the body
 *      missed: a bare `JSON.parse(readFileSync('ignis/output/x.json'))` throws ENOENT
 *      on CI, which is neither a `process.exit` nor a `throw new Error` line and has
 *      no `existsSync` in context, so scans (1)/(2) never inspected it. The build
 *      died exactly the S222 way while a "resilience" gate exited 0.
 *
 * A script with a graceful `process.exit(0)` for the absent-file case passes.
 * A script with a hard `process.exit(1)` fails (= can strand the cron).
 * A script that reads a gitignored path with an existsSync guard OR a try/catch passes.
 *
 * Modes:
 *   (no flag)   write a text report and exit 0/1
 *   --check     exit 1 if any hard-exit(1) on gitignored input found (CI gate)
 *   --self-test run internal assertions then exit 0/1
 *
 * Wired into: smoke-startup-scripts.mjs (no new build:check segment needed)
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

// Paths that are gitignored or absent on CI runners (gitignored files OR sibling repos).
// Extend this list if new absent-on-CI inputs are added to the build chain.
const GITIGNORED_INPUTS = [
  'ignis/output/',
  'data/rum-raw.ndjson',
  'data/rum-raw.json',
  // data/studio-feed.json removed S275: its producer (fetch-studio-feed.mjs)
  // was an orphan deleted with zero consumers — the path no longer exists.
  '.cache/router-suggest.json',
  // Sibling repos are not checked out on CI — a hard exit(1) when they're absent strands the build.
  '../vaultspark-studio-ops/',
  'vaultspark-studio-ops/',
];

// Read the build chain scripts from package.json
function getBuildChainScripts() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const buildCmd = pkg.scripts && pkg.scripts.build;
  if (!buildCmd) return [];
  // Extract `node scripts/<name>.mjs` patterns
  return [...buildCmd.matchAll(/node scripts\/([\w-]+\.mjs)/g)].map(m => m[1]);
}

/**
 * Resolve the set of tokens that name a gitignored input in a given source:
 * the literal paths themselves, plus any `const NAME = …gitignored-path…`
 * identifier bound to one (so `readFileSync(ECOSYSTEM)` is recognized as a read
 * of `ignis/output/ecosystem-state.json`).
 */
function resolveGitignoredTokens(code) {
  const tokens = GITIGNORED_INPUTS.map((gi) => ({ token: gi, literal: true }));
  const constRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=([^;\n]*)/g;
  let m;
  while ((m = constRe.exec(code))) {
    const name = m[1];
    const rhs = m[2];
    if (GITIGNORED_INPUTS.some((gi) => rhs.includes(gi))) tokens.push({ token: name, literal: false });
  }
  return tokens;
}

function refersToken(text, tok) {
  if (tok.literal) return text.includes(tok.token);
  return new RegExp(`\\b${tok.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

/**
 * The single shared scanner — auditScript and the self-test both call this, so
 * they can never drift apart (S323: the self-test previously kept an inline
 * `auditCode` replica "kept in sync by hand", exactly the shape that rots).
 * Returns findings {line, code, gitignored, kind}.
 */
export function auditSource(code) {
  const lines = code.split('\n');
  const findings = [];
  const tokens = resolveGitignoredTokens(code);
  // A script that existsSync-guards ANY gitignored token is treating absent
  // inputs deliberately; don't second-guess its individual reads.
  const scriptHasExistsGuard = lines.some((l) => l.includes('existsSync') && tokens.some((t) => refersToken(l, t)));

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    // (1)/(2): a hard exit / throw near an existsSync check on a gitignored path.
    const isHardExit = ln.includes('process.exit(1)') || ln.includes('process.exit(2)');
    const isThrow = /\bthrow\s+new\s+\w+Error/.test(ln) || /\bthrow\s+new\s+Error/.test(ln);
    if (isHardExit || isThrow) {
      const start = Math.max(0, i - 15);
      const end = Math.min(lines.length, i + 5);
      const ctx = lines.slice(start, end).join('\n');
      for (const gi of GITIGNORED_INPUTS) {
        if (!ctx.includes(gi)) continue;
        if (!ctx.includes('existsSync')) continue;
        const ctxAbove = lines.slice(start, i).join('\n');
        const hasGracefulExit = ctxAbove.includes('process.exit(0)') &&
          ctxAbove.includes(gi) && ctxAbove.includes('existsSync');
        if (!hasGracefulExit) {
          findings.push({ line: i + 1, code: ln.trim().slice(0, 100), gitignored: gi, kind: 'hard-exit' });
        }
      }
      continue;
    }

    // (3, S323): an UNGUARDED read of a gitignored path — the most common
    // unresilient shape, invisible to (1)/(2) because a bare readFileSync throws
    // ENOENT with no exit/throw line and no existsSync in context.
    if (/^\s*\/\//.test(ln)) continue;
    if (!/\b(readFileSync|readdirSync)\s*\(/.test(ln)) continue;
    const readCtx = ln + ' ' + (lines[i + 1] || '');
    const refTok = tokens.find((t) => refersToken(readCtx, t));
    if (!refTok) continue;
    if (scriptHasExistsGuard) continue;
    // Or the read sits inside a try/catch that swallows the ENOENT.
    const above = lines.slice(Math.max(0, i - 12), i).join('\n');
    const below = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');
    const tryGuard = /\btry\s*\{/.test(above) && /\b(catch|finally)\b/.test(below);
    if (tryGuard) continue;
    findings.push({ line: i + 1, code: ln.trim().slice(0, 100), gitignored: refTok.token, kind: 'unguarded-read' });
  }
  return findings;
}

// Check a single script. Returns a list of findings {script, line, code, gitignored, kind}.
function auditScript(scriptName) {
  const path = join(ROOT, 'scripts', scriptName);
  if (!existsSync(path)) return [];
  const code = readFileSync(path, 'utf8');
  return auditSource(code).map((f) => ({ script: scriptName, ...f }));
}

function selfTest() {
  // Test 1: exit(1) on gitignored input → should be flagged
  const fakeBad = `
import { existsSync } from 'node:fs';
const ECOSYSTEM = 'ignis/output/ecosystem-state.json';
if (!existsSync(ECOSYSTEM)) {
  console.error('missing');
  process.exit(1);
}
`;
  // Test 2: graceful exit(0) → should NOT be flagged
  const fakeGood = `
import { existsSync } from 'node:fs';
const ECOSYSTEM = 'ignis/output/ecosystem-state.json';
if (!existsSync(ECOSYSTEM)) {
  console.warn('skipped');
  process.exit(0);
}
`;
  // Test 3: throw new Error on gitignored input → should be flagged (S224 hardening)
  const fakeThrow = `
import { existsSync } from 'node:fs';
const ECOSYSTEM = 'ignis/output/ecosystem-state.json';
if (!existsSync(ECOSYSTEM)) {
  throw new Error('ecosystem file missing');
}
`;
  // Test 6 (S323): a bare read of a gitignored path, no existsSync, no try —
  // the shape (1)/(2) were blind to. Must be flagged.
  const fakeUnguarded = `
import { readFileSync } from 'node:fs';
const ECOSYSTEM = join(ROOT, 'ignis/output/ecosystem-state.json');
const data = JSON.parse(readFileSync(ECOSYSTEM, 'utf8'));
`;
  // Test 7 (S323): the same read wrapped in try/catch is resilient → not flagged.
  const fakeUnguardedButTry = `
import { readFileSync } from 'node:fs';
const ECOSYSTEM = join(ROOT, 'ignis/output/ecosystem-state.json');
let data = null;
try {
  data = JSON.parse(readFileSync(ECOSYSTEM, 'utf8'));
} catch (_) { data = null; }
`;
  // Test 8 (S323): a bare read of a NON-gitignored path is fine → not flagged.
  const fakeCommittedRead = `
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
`;

  let pass = 0; let fail = 0;
  const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

  assert(auditSource(fakeBad).length > 0, 'bad code (exit 1 on gitignored) should be flagged');
  assert(auditSource(fakeGood).length === 0, 'good code (exit 0 on gitignored) should not be flagged');
  assert(auditSource(fakeThrow).length > 0, 'bad code (throw on gitignored) should be flagged (S224)');
  assert(auditSource(fakeUnguarded).some((f) => f.kind === 'unguarded-read'),
    'bare read of gitignored path (no existsSync, no try) should be flagged (S323)');
  assert(auditSource(fakeUnguardedButTry).length === 0,
    'gitignored read inside try/catch should NOT be flagged (S323)');
  assert(auditSource(fakeCommittedRead).length === 0,
    'bare read of a committed (non-gitignored) path should NOT be flagged (S323)');

  // Test 4: build-llms-full-shards (fixed in S222) must pass
  if (existsSync(join(ROOT, 'scripts/build-llms-full-shards.mjs'))) {
    const llmsFindings = auditScript('build-llms-full-shards.mjs');
    assert(llmsFindings.length === 0, 'build-llms-full-shards.mjs must pass (fixed S222)');
  }

  // Test 5: build-agents-json (fixed in S223) must pass
  if (existsSync(join(ROOT, 'scripts/build-agents-json.mjs'))) {
    const ajFindings = auditScript('build-agents-json.mjs');
    assert(ajFindings.length === 0, 'build-agents-json.mjs must pass (fixed S223)');
  }

  console.log(`check-build-step-resilience --self-test: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

function main() {
  const scripts = getBuildChainScripts();
  const allFindings = [];

  for (const s of scripts) {
    const findings = auditScript(s);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    console.log(`check-build-step-resilience: ✓ ${scripts.length} build-chain scripts — no hard-exit(1) on gitignored inputs`);
    return;
  }

  // Findings found
  console.error(`check-build-step-resilience: ${allFindings.length} hard-exit(1) on gitignored input(s) found:`);
  for (const f of allFindings) {
    console.error(`  ${f.script}:${f.line} (gitignored: ${f.gitignored}): ${f.code}`);
  }
  console.error('  Fix: change process.exit(1) → process.exit(0) + console.warn for the absent-file branch.');
  console.error('  See S222/S223 build-llms-full-shards.mjs + build-agents-json.mjs for the pattern.');

  if (CHECK) process.exit(1);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  if (SELF_TEST) {
    selfTest();
    process.exit(0);
  }
  main();
}
