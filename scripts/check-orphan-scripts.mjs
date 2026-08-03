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

import childProcess from 'node:child_process';
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
  'capture-theme-matrix.mjs':
    'Manual CANON-047 harness: captures the 7-theme × key-route screenshot matrix for AI image review. ' +
    'Invoked by an agent (or human) before release; verdicts recorded in docs/THEME_READABILITY_MATRIX.md.',
  'pre-push-scan.mjs':
    'Invoked by the local .git/hooks/pre-push (hook v3), which is untracked and absent on CI. ' +
    'The hook dependency is real but unscannable; documented here per gate contract.',
  'generate-membership-access.mjs':
    'Manual generator: its output assets/membership-access.js IS consumed (vault-member/, vaultsparked/). ' +
    'Run on entitlement changes. Drift risk vs config/membership-entitlements.json noted in audit S275.',

  // ── Manual diagnostic probes / audit renderers (run on demand, need a browser
  //    or local preview server; never part of the unattended build). ────────────
  'probe-cls-bisect.mjs':
    'Manual CLS attribution harness — needs local-preview-server on :4173 + Playwright. Run on demand: ROUTE=/x/ node scripts/probe-cls-bisect.mjs.',
  'probe-press-email.mjs':
    'Manual press-email deliverability probe (Brevo). Run on demand when verifying the press inbox route.',
  'render-mobile-audit.mjs':
    'Manual mobile-audit renderer — captures per-page mobile screenshots to docs/. Run on demand during UX passes.',
  'vision-truth-audit.mjs':
    'Manual max-plan vision audit — screenshots + canonical-truth manifests per page. Run on demand; heavy, never in build.',
  'build-tt-summary.mjs':
    'Manual Trusted-Types summary generator (S158). Run on demand when reviewing TT-enforce readiness.',
  'export-perf-history.mjs':
    'Manual perf-history CSV exporter (S158). Run on demand to hand analysts a spreadsheet of the trend ledger.',

  // ── Operator actions / kill-switches / intake (privileged, human-initiated). ──
  'paste-credential.mjs':
    'Manual .txt→.env credential intake wrapper (secrets gateway). Human-initiated; never automated.',
  'ignis-pause.mjs':
    'Manual IGNIS global kill-switch (IGNIS_GLOBAL_PAUSE). Operator-only; invoked in an incident, never by CI.',
  'push-dispatch.mjs':
    'Manual VAPID test-push sender (S205). Run on demand to verify the web-push stack end-to-end.',
  'check-deploy-tip.mjs':
    'Deploy-strand guard (S184) invoked by the local pre-push hook (untracked, absent on CI). Also run manually before a push.',
  'inject-game-push-cta.mjs':
    'Manual injector (S216) — adds the push-CTA block to a new game page. Run once per new game, never in build.',

  // ── Periodic / event-driven ops (scheduled or triggered outside the build). ───
  'check-ignis-spend.mjs':
    'Reads today\'s IGNIS spend from Supabase (ignis_spend_today view). Periodic ops probe; needs live Supabase creds, not a build gate.',
  'prod-verify-wave.mjs':
    'Post-deploy production verification wave (S207). Run after a prod deploy; hits live URLs, not part of the offline build.',
  'sync-staging-headers.mjs':
    'Staging header-parity sync (S174) — run when _headers changes to mirror onto the Hetzner staging box.',
  'check-nav-sheet-canary.mjs':
    'Nav-sheet canary readout (S174). Run on demand when auditing the mobile nav-sheet flag cohort.',
  'check-obelisk-posture.mjs':
    'CANON-021 Obelisk posture inventory. Periodic posture snapshot; strategic review cadence, not a per-build gate.',
  'watch-registry-changes.mjs':
    'CANON-022 passive registry-change watcher (per-repo shim). Event-driven; fires from the registry watcher, not the build.',
  'check-compliance-velocity.mjs':
    'Back-compat shim for the compliance-velocity check, invoked by ops tooling under its legacy name. Kept for callers that still use the old path.',

  'extract-visitor-signals.mjs':
    'S134 visitor-signal extractor — pulls per-project visitor-facing signals for the intelligence layer. Periodic data tool.',
  'synthesize-ignis-voices.mjs':
    'S134 IGNIS voice synthesizer — turns raw IGNIS output into public-safe voice lines. Periodic data tool, run on demand.',
  'update-footer.mjs':
    'Manual footer updater (CANON-042 auto-year footer). Run on demand when the footer template or year rolls; not a build gate.',
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
// Enumerate git-TRACKED scripts, never a filesystem walk. CI only ever checks
// out tracked files, so an FS walk judges files CI cannot see — the gate then
// hard-fails locally while passing in CI, for a file that is not in the repo.
// (S281: a resurrected untracked `fetch-studio-feed.mjs` — deleted as dead in
// S275, re-killed in S279 — failed build:check on every local run while every
// CI run stayed green.) Tracked-only keeps local and CI verdicts identical and
// leaves work-in-progress scratch files alone until they are actually staged.
const scriptsDir = path.join(ROOT, 'scripts');
function listTrackedScripts() {
  try {
    const out = childProcess.execFileSync('git', ['ls-files', '--', 'scripts/*.mjs'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    // git pathspec globs cross directory boundaries, so `scripts/*.mjs` also
    // matches `scripts/lib/*.mjs`. This gate owns TOP-LEVEL scripts only —
    // nested libs belong to check-orphan-libs. Keep the subject set identical
    // to the previous readdir behaviour (352), minus untracked files.
    const tracked = out.split('\n')
      .filter(Boolean)
      .filter((p) => path.posix.dirname(p) === 'scripts')
      .map((p) => path.basename(p));
    if (tracked.length) return tracked;
  } catch { /* no git (tarball/sandbox) → fall back below */ }
  // Degrade rather than crash where git is unavailable.
  return fs.readdirSync(scriptsDir).filter((f) => /\.mjs$/.test(f));
}
const scriptFiles = listTrackedScripts();

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
