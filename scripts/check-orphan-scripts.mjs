#!/usr/bin/env node
/**
 * check-orphan-scripts.mjs — S275 (audit #7).
 *
 * THE GAP IT CLOSES: check-orphan-libs (S219) guards scripts/lib/*.mjs, and the
 * asset/page/nav/shell orphan gates cover the site surface — but nothing guarded
 * TOP-LEVEL scripts/*.mjs. Result at S275: 7 scripts sat referenced-by-nothing,
 * two of them dormant QUALITY GATES the founder believed were live
 * (check-canon-044-waves — founder directive; validate-task-ids — board
 * integrity). This gate makes silently-stranded top-level scripts impossible.
 *
 * A script is a consumer-referenced citizen when its basename appears as a path
 * token in: package.json scripts, .github/workflows/*.yml, any code file
 * (.mjs/.js/.cjs — cross-script spawn/import), or prompts/docs protocol surfaces
 * (prompts/*.md, AGENTS.md, CLAUDE.md, docs/SESSION_PROTOCOL.md) — a script whose
 * only invoker is the session protocol is wired, not dead.
 *
 * .git/hooks is deliberately NOT scanned (absent on fresh clone/CI — a script
 * invoked only by a local hook must be ALLOWLISTed with that rationale so the
 * dependency is documented).
 *
 * Modes:
 *   --check       exit 1 on any non-allowlisted orphan (CI gate)
 *   --warn-only   advisory
 *   --json        machine-readable
 *   --self-test   pure-core fixtures, exit 0/1
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

// ── Allowlist: scripts legitimately referenced-by-nothing-scannable ───────────
const ALLOWLIST = {
  'pre-push-scan.mjs':
    'Invoked by the local .git/hooks/pre-push (hook v3), which is untracked and absent on CI. ' +
    'The hook dependency is real but unscannable; documented here per gate contract.',
  'generate-membership-access.mjs':
    'Manual generator: its output assets/membership-access.js IS consumed (vault-member/, vaultsparked/). ' +
    'Run on entitlement changes. Drift risk vs config/membership-entitlements.json noted in audit S275.',
};

// ── Pure core (shared shape with check-orphan-libs) ────────────────────────────
export function scanOrphans(names, bodies) {
  const counts = new Map(names.map((n) => [n, 0]));
  for (const [, text] of bodies) {
    for (const name of names) {
      const re = new RegExp(`[\\/'"\` ]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (re.test(text)) counts.set(name, counts.get(name) + 1);
    }
  }
  return counts;
}

export function auditAllowlist(allowlistNames, onDiskNames, counts) {
  const onDisk = new Set(onDiskNames);
  const redundant = [];
  const stale = [];
  for (const name of allowlistNames) {
    if (!onDisk.has(name)) { stale.push(name); continue; }
    if ((counts.get(name) || 0) > 0) redundant.push(name);
  }
  return { redundant, stale };
}

// ── Self-test ──────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  const names = ['wired.mjs', 'dead.mjs', 'suffix-wired.mjs'];
  const bodies = new Map([
    ['package.json', `"check": "node scripts/wired.mjs --check"`],
    ['.github/workflows/x.yml', `run: node scripts/suffix-wired.mjs`],
    // note: 'wired.mjs' token must not credit 'suffix-wired.mjs'
  ]);
  const counts = scanOrphans(names, bodies);
  ok(counts.get('wired.mjs') === 1, 'package.json script credits a consumer');
  ok(counts.get('suffix-wired.mjs') === 1, 'workflow run line credits a consumer');
  ok(counts.get('dead.mjs') === 0, 'unreferenced script counts zero');

  const rot = auditAllowlist(['wired.mjs', 'dead.mjs', 'ghost.mjs'], names, counts);
  ok(rot.redundant.length === 1 && rot.redundant[0] === 'wired.mjs', 'redundant allowlist entry flagged');
  ok(rot.stale.length === 1 && rot.stale[0] === 'ghost.mjs', 'stale allowlist entry flagged');

  console.log(`check-orphan-scripts --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Live scan ──────────────────────────────────────────────────────────────────
const scriptsDir = path.join(ROOT, 'scripts');
const scriptFiles = fs.readdirSync(scriptsDir).filter((f) => /\.mjs$/.test(f));

// Reference corpus: package.json + workflows + all code files + protocol surfaces.
const SELF = fileURLToPath(import.meta.url);
const bodies = new Map();
function addFile(rel) {
  const full = path.join(ROOT, rel);
  try { bodies.set(rel, fs.readFileSync(full, 'utf8')); } catch { /* skip */ }
}
addFile('package.json');
addFile('AGENTS.md');
addFile('CLAUDE.md');
addFile('docs/SESSION_PROTOCOL.md');
for (const dir of ['.github/workflows', 'prompts']) {
  try {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      if (/\.(yml|yaml|md)$/.test(f)) addFile(`${dir}/${f}`);
    }
  } catch { /* skip */ }
}
// All code files (cross-script references), excluding node_modules etc.
const skipDirs = new Set(['node_modules', '.git', '.cache', 'docs', 'context', 'logs', 'journal', 'feed', 'api', 'data', '.well-known']);
(function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && !['.github'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skipDirs.has(e.name)) walk(full); continue; }
    if (!/\.(mjs|js|cjs)$/.test(e.name)) continue;
    if (path.resolve(full) === path.resolve(SELF)) continue;
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    try {
      let text = fs.readFileSync(full, 'utf8');
      // A script's own header/usage comment must not self-credit.
      if (rel.startsWith('scripts/') && scriptFiles.includes(e.name)) {
        text = text.split('\n').filter((l) => !l.includes(e.name)).join('\n');
      }
      bodies.set(rel, text);
    } catch { /* skip */ }
  }
})(ROOT);

const counts = scanOrphans(scriptFiles, bodies);
const rot = auditAllowlist(Object.keys(ALLOWLIST), scriptFiles, counts);
const orphans = scriptFiles.filter((n) => (counts.get(n) || 0) === 0 && !ALLOWLIST[n]).map((n) => `scripts/${n}`);
const rotCount = rot.redundant.length + rot.stale.length;

if (asJson) {
  console.log(JSON.stringify({ scanned: scriptFiles.length, orphans, allowlisted: Object.keys(ALLOWLIST), allowlistRot: rot }, null, 2));
  process.exit((orphans.length || rotCount) && !warnOnly ? 1 : 0);
}

console.log(`check-orphan-scripts: scanned ${scriptFiles.length} top-level script(s)`);
if (rotCount) {
  console.error(`  ✗ allowlist rot: redundant=${rot.redundant.join(',') || '-'} stale=${rot.stale.join(',') || '-'}`);
}
if (!orphans.length && !rotCount) {
  console.log('  ✓ every top-level script has a consumer (package.json, workflow, code, or protocol surface)');
  process.exit(0);
}
if (orphans.length) {
  console.error(`  ✗ ${orphans.length} orphaned script(s) — referenced by nothing scannable:`);
  for (const o of orphans) console.error(`      ${o}`);
  console.error('  → wire it into a gate/chain, add an ALLOWLIST rationale, or remove it.');
}
process.exit(warnOnly ? 0 : 1);
