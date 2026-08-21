#!/usr/bin/env node
/**
 * gate-scope.mjs — diff-scoped gate runner (S234)
 *
 * build:check runs ~159 sequential node spawns every session; its interleaved
 * stdout is the single largest per-session token sink the agent re-reads at every
 * closeout, and the cold-starts dominate the inner dev loop. This runner maps the
 * session's changed files (git diff) to ONLY the gate classes that cover them and
 * runs just those — full build:check still runs in CI, so coverage is never lost.
 *
 * It is intentionally a SUPERSET-safe subset: when in doubt a class runs. The goal
 * is to skip provably-untouched gate classes, not to be clever about partial graphs.
 *
 * Usage:
 *   node scripts/gate-scope.mjs            # diff vs HEAD + working tree, run matching classes
 *   node scripts/gate-scope.mjs --base main# diff vs a base ref (e.g. for a branch)
 *   node scripts/gate-scope.mjs --list     # print the class manifest and exit
 *   node scripts/gate-scope.mjs --self-test# verify the glob matcher
 *
 * package.json: "check:scoped": "node scripts/gate-scope.mjs"
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Gate classes. Each: { name, inputs: [glob...], checks: [[script, args]...] }.
 * `always: true` classes run regardless of the diff. A missing script is skipped
 * gracefully so the manifest can reference gates that vary by repo state.
 */
const CLASSES = [
  {
    name: 'html-content',
    inputs: ['**/*.html'],
    checks: [
      ['check-content-coherence.mjs', []],
      ['check-content-freshness.mjs', []],
    ],
  },
  {
    name: 'api-feeds',
    inputs: ['api/**/*.json'],
    checks: [
      ['check-content-coherence.mjs', []],
      ['check-proof-feed-generators.mjs', []],
    ],
  },
  {
    name: 'games',
    inputs: ['games/**', 'api/public-intelligence.json'],
    checks: [['check-game-playability-coherence.mjs', []]],
  },
  {
    name: 'telemetry',
    inputs: ['assets/**telemetry**', 'assets/funnel**', 'cloudflare/**'],
    checks: [['check-rum-allowlist.mjs', []]],
  },
  {
    name: 'worker',
    inputs: ['cloudflare/**/*.js'],
    checks: [['__node-check__', ['cloudflare/security-headers-worker.js']]],
  },
  {
    name: 'og-images',
    inputs: ['**/*.html', 'assets/og/**', 'scripts/build-og-cards.mjs'],
    checks: [['check-og-images.mjs', []]],
  },
];

// ── glob matcher ────────────────────────────────────────────────────────────────
// **/ = zero-or-more path segments (so **/*.html matches root index.html);
// ** = any chars incl. '/'; * = a run of non-slash. Placeholders avoid
// double-substitution. Supports the `**substr**` (contains) form too.
function globToRe(glob) {
  let g = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  g = g.replace(/\*\*\//g, 'AASEGAA').replace(/\*\*/g, 'AAANYAA').replace(/\*/g, '[^/]*');
  g = g.replace(/AASEGAA/g, '(?:.*/)?').replace(/AAANYAA/g, '.*');
  return new RegExp('^' + g + '$');
}
function matches(file, glob) {
  return globToRe(glob).test(file);
}
function classMatches(cls, files) {
  return cls.always || files.some((f) => cls.inputs.some((g) => matches(f, g)));
}

// ── git diff ────────────────────────────────────────────────────────────────────
function changedFiles(base) {
  const args = base
    ? ['diff', '--name-only', `${base}...HEAD`]
    : ['diff', '--name-only', 'HEAD'];
  const tracked = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' });
  const set = new Set();
  for (const out of [tracked.stdout, untracked.stdout]) {
    if (!out) continue;
    for (const line of out.split('\n')) { const t = line.trim(); if (t) set.add(t); }
  }
  return [...set];
}

function runCheck(script, args) {
  if (script === '__node-check__') {
    const r = spawnSync(process.execPath, ['--check', ...args], { cwd: ROOT, stdio: 'inherit' });
    return r.status === 0;
  }
  const full = path.join(__dirname, script);
  if (!fs.existsSync(full)) { console.log(`  · skip ${script} (absent)`); return true; }
  const r = spawnSync(process.execPath, [full, ...args], { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

// ── modes ─────────────────────────────────────────────────────────────────────
if (process.argv.includes('--self-test')) {
  let pass = 0, fail = 0;
  const ok = (c, n) => { if (c) pass++; else { fail++; console.error('  ✗ ' + n); } };
  ok(matches('index.html', '**/*.html'), '**/*.html matches root html');
  ok(matches('games/forge/index.html', 'games/**'), 'games/** matches nested');
  ok(!matches('projects/x/index.html', 'games/**'), 'games/** rejects projects');
  ok(matches('api/public-status.json', 'api/**/*.json'), 'api glob matches');
  ok(matches('assets/inp-telemetry.js', 'assets/**telemetry**'), 'telemetry substring glob');
  ok(matches('cloudflare/security-headers-worker.js', 'cloudflare/**/*.js'), 'worker glob');
  ok(classMatches(CLASSES[0], ['index.html']), 'html-content class triggers on html');
  ok(!classMatches(CLASSES[2], ['privacy/index.html']), 'games class skips unrelated html');
  console.log(`gate-scope self-test: ${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}

if (process.argv.includes('--list')) {
  for (const c of CLASSES) console.log(`${c.name}: ${c.inputs.join(', ')}  ->  ${c.checks.map((k) => k[0]).join(', ')}`);
  process.exit(0);
}

const baseIdx = process.argv.indexOf('--base');
const base = baseIdx >= 0 ? process.argv[baseIdx + 1] : null;
const files = changedFiles(base);

if (!files.length) {
  console.log('gate-scope: no changed files — nothing to check (run npm run build:check for the full sweep).');
  process.exit(0);
}

const active = CLASSES.filter((c) => classMatches(c, files));
const skipped = CLASSES.filter((c) => !active.includes(c));
console.log(`gate-scope: ${files.length} changed file(s) -> ${active.length} gate class(es) active, ${skipped.length} skipped (${skipped.map((s) => s.name).join(', ') || 'none'})`);

// de-dupe checks across classes (content-coherence appears in several)
const seen = new Set();
let failed = 0;
for (const cls of active) {
  for (const [script, args] of cls.checks) {
    const key = script + ' ' + args.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`> ${cls.name}: ${script} ${args.join(' ')}`);
    if (!runCheck(script, args)) failed++;
  }
}

if (failed) {
  console.error(`gate-scope: ${failed} scoped gate(s) failed.`);
  process.exit(1);
}
console.log('gate-scope: all scoped gates passed (full coverage runs in CI via build:check)');
