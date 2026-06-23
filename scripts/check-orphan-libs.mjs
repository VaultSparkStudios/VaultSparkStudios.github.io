#!/usr/bin/env node
/**
 * check-orphan-libs.mjs — S219 second-order innovation (born from this session).
 *
 * THE GAP IT CLOSES: this repo already guards orphaned *assets*, *pages*, and
 * *shell* artifacts — but nothing guarded orphaned `scripts/lib/*.mjs` modules.
 * As a result `context-wipe-guard.mjs` (S179) and `obelisk-broker.mjs` (S183)
 * sat imported-by-nothing AND untracked for ~40 sessions before S219 found them
 * by hand. This gate makes that class impossible to strand silently again.
 *
 * Two independent signals, each a distinct kind of stranded work:
 *   1. ORPHAN   — a lib module imported by ZERO code consumers (dead code).
 *                 Search is restricted to CODE files (.mjs/.js/.cjs); a module
 *                 referenced only in markdown/docs is still dead code.
 *   2. UNTRACKED — a substantive source module not in git (never committed),
 *                 so a fresh clone / CI would not have it. This is how real work
 *                 silently never reaches the deploy.
 *
 * An ORPHAN that is also UNTRACKED is the worst case (the exact S179/S183 class).
 *
 * Intentional standalone modules (CLI-only tools, deliberate handoffs awaiting
 * founder disposition) live in ALLOWLIST with a rationale — same discipline as
 * check-protocol-scripts.mjs, so we see ONE structured delta line, not noise.
 *
 * Modes:
 *   --check       exit 1 if any non-allowlisted orphan exists (CI gate)
 *   --warn-only   never exit 1 (advisory; for soft rollout)
 *   --json        machine-readable report
 *   --self-test   exercise the detection logic on fixtures, exit 0/1
 *
 * Exit 0 = clean (or warn-only). Exit 1 = orphan/untracked finding (or self-test fail).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const warnOnly = args.includes('--warn-only');
const selfTest = args.includes('--self-test');

// ── Allowlist: modules legitimately imported-by-nothing, with rationale ───────
// Keep this SMALL and JUSTIFIED. A growing allowlist is itself a smell.
const ALLOWLIST = {
  'obelisk-broker.mjs':
    'S183 Secret Broker (CANON-021 Phase 4). Belongs to the Obelisk trust plane, not website code. ' +
    'Handed off to obelisk via Ark S219 (agent-handoff 01JRQS5NLIE75EA3008FBE421E); left untracked pending founder disposition. ' +
    'No website runtime consumer exists (static site; secrets are build-time via the gateway).',
  'write-project-status.mjs':
    'S154 SIL-invariant write-path for PROJECT_STATUS.json. Standalone CLI (--check/--fix) + importable lib, ' +
    'intentionally invoked on demand and propagated to siblings via the protocol-scripts lane. ' +
    'build:check enforces the same SIL invariants via check-sil-integrity.mjs, so it is not wired into the chain.',
  'env-local.mjs':
    'Side-effect .env.local loader (no dotenv dep). Import-on-demand by local-only/dev scripts that need ' +
    'IGNIS_MCP_URL etc. at module-load; intentionally not imported by committed build code.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** All .mjs/.js/.cjs code files under the repo, excluding node_modules and lib self-dir scan duplication. */
function listCodeFiles() {
  const out = [];
  const skipDirs = new Set(['node_modules', '.git', '.cache', 'docs', 'context', 'logs', 'journal', 'feed', 'api', 'data', '.well-known']);
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (skipDirs.has(e.name)) continue;
        walk(full);
      } else if (/\.(mjs|js|cjs)$/.test(e.name)) {
        out.push(full);
      }
    }
  })(ROOT);
  return out;
}

/** git-tracked file set (relative, forward-slash). Empty set if git unavailable. */
function trackedSet() {
  const r = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) return null; // git unavailable — caller treats untracked detection as skipped
  return new Set(r.stdout.split('\n').map(s => s.trim()).filter(Boolean));
}

/**
 * scanOrphans(libNames, codeFileContents) — pure, testable core.
 * @param {string[]} libNames        basenames like 'foo.mjs'
 * @param {Map<string,string>} bodies  consumerPath -> file text (consumer files, EXCLUDING the lib self-file)
 * @returns {Map<string,number>}      libName -> consumer count
 */
function scanOrphans(libNames, bodies) {
  const counts = new Map(libNames.map(n => [n, 0]));
  for (const [, text] of bodies) {
    for (const name of libNames) {
      // Match the basename as a path token in an import/require/dynamic-import or
      // a path-string manifest entry. Bounded by a non-word char on the left so
      // 'foo.mjs' does not match 'superfoo.mjs'.
      const re = new RegExp(`[\\/'"\`]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (re.test(text)) counts.set(name, counts.get(name) + 1);
    }
  }
  return counts;
}

// ── Self-test ──────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  const libs = ['used.mjs', 'orphan.mjs', 'prefixfoo.mjs', 'foo.mjs'];
  const bodies = new Map([
    ['scripts/a.mjs', `import { x } from './lib/used.mjs';`],
    ['scripts/b.mjs', `const p = 'scripts/lib/used.mjs'; await import(p);`],
    ['scripts/c.mjs', `import { y } from '../lib/foo.mjs';`],
    // note: 'prefixfoo.mjs' must NOT be credited by a match on 'foo.mjs'
  ]);
  const counts = scanOrphans(libs, bodies);
  ok(counts.get('used.mjs') === 2, 'used.mjs counted by both static + dynamic consumers');
  ok(counts.get('orphan.mjs') === 0, 'orphan.mjs has zero consumers');
  ok(counts.get('foo.mjs') === 1, 'foo.mjs counted once');
  ok(counts.get('prefixfoo.mjs') === 0, 'prefixfoo.mjs NOT matched by foo.mjs (boundary)');

  console.log(`check-orphan-libs --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Live scan ──────────────────────────────────────────────────────────────────
const libDir = path.join(ROOT, 'scripts', 'lib');
let libFiles = [];
try {
  libFiles = fs.readdirSync(libDir).filter(f => /\.mjs$/.test(f));
} catch {
  console.error('check-orphan-libs: scripts/lib not found');
  process.exit(0);
}

const libAbs = new Set(libFiles.map(f => path.join(libDir, f)));
const codeFiles = listCodeFiles().filter(f => !libAbs.has(f)); // exclude lib self-files as consumers
const bodies = new Map();
for (const f of codeFiles) {
  try { bodies.set(path.relative(ROOT, f).replace(/\\/g, '/'), fs.readFileSync(f, 'utf8')); } catch { /* skip */ }
}
// A lib MAY import another lib — include lib files as consumers of OTHER libs,
// but not of themselves (handled by matching name !== self below).
for (const f of libAbs) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  try {
    const text = fs.readFileSync(f, 'utf8');
    const selfName = path.basename(f);
    // strip references to itself so a module's own header comment can't self-credit
    bodies.set(rel, text.split('\n').filter(l => !l.includes(selfName)).join('\n'));
  } catch { /* skip */ }
}

const counts = scanOrphans(libFiles, bodies);
const tracked = trackedSet();

const orphans = [];
const untracked = [];
for (const name of libFiles) {
  const rel = `scripts/lib/${name}`;
  const consumers = counts.get(name) || 0;
  const isTracked = tracked ? tracked.has(rel) : true;
  if (!isTracked) untracked.push(rel);
  if (consumers === 0 && !ALLOWLIST[name]) {
    orphans.push({ file: rel, untracked: !isTracked });
  }
}

if (asJson) {
  console.log(JSON.stringify({
    scanned: libFiles.length,
    orphans,
    untracked,
    allowlisted: Object.keys(ALLOWLIST),
    gitAvailable: tracked !== null,
  }, null, 2));
  process.exit(orphans.length && !warnOnly ? 1 : 0);
}

console.log(`check-orphan-libs: scanned ${libFiles.length} lib module(s)`);
if (Object.keys(ALLOWLIST).length) {
  console.log(`  allowlisted (intentional, with rationale): ${Object.keys(ALLOWLIST).join(', ')}`);
}
if (untracked.length) {
  console.log(`  ⚠ untracked source module(s) (never committed — absent on fresh clone/CI):`);
  for (const u of untracked) console.log(`      ${u}`);
}
if (!orphans.length) {
  console.log('  ✓ no orphaned lib modules (every lib has at least one code consumer)');
  process.exit(0);
}
console.error(`  ✗ ${orphans.length} orphaned lib module(s) — imported by ZERO code consumers:`);
for (const o of orphans) {
  console.error(`      ${o.file}${o.untracked ? '  (also UNTRACKED — worst case)' : ''}`);
}
console.error('  → wire it into a real consumer, add it to ALLOWLIST with a rationale, or remove it.');
process.exit(warnOnly ? 0 : 1);
