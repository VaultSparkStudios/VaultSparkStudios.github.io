#!/usr/bin/env node
/**
 * check-feed-publisher-manifest.mjs — S238.
 *
 * Proof-feed publisher parity. check-trust-feed-freshness.mjs gates that the 11 public
 * trust feeds are FRESH; this gate ensures every one of them also declares HOW it is
 * regenerated and that the declared recovery path is real — so a stale feed is never a
 * dead end. The failure it closes: a feed's scheduled generator dies (the S221/S222
 * dead-cron class), the freshness gate blocks, and the operator/agent is left guessing
 * which script or workflow to run. With this manifest, the BLOCKED message names the exact
 * `recover` command, and this gate proves that command can't rot:
 *
 *   • PARITY      — every SURFACE declares gen + recover + wf (no feed missing provenance).
 *   • LIVE GEN    — every named generator script exists on disk (no dead recovery command).
 *   • LIVE WF     — every named scheduled workflow file exists (no phantom cron reference).
 *   • COHERENCE   — each recover command invokes its own declared generator script.
 *
 * SURFACES is imported from check-trust-feed-freshness.mjs (single source of truth — the
 * freshness ceilings and the publisher provenance live in one table, so they can't diverge).
 *
 * It also emits api/feed-publishers.json — a public, machine-readable inventory mapping each
 * trust feed to its generator, recovery command, scheduled workflow, and freshness ceilings.
 * This makes the studio's proof-feed provenance observable (an agent or operator can read one
 * file to learn what produces every trust signal) rather than buried in a script constant.
 *
 * Wired into build:check via check-proof-surface.mjs (NOT a new && segment — the Windows
 * cmd.exe 8191-char build:check chain is at its limit).
 *
 * Usage:
 *   node scripts/check-feed-publisher-manifest.mjs                 # gate parity + write inventory
 *   node scripts/check-feed-publisher-manifest.mjs --check         # gate parity, verify inventory in sync (no write)
 *   node scripts/check-feed-publisher-manifest.mjs --recover-stale # run the recover command for every stale/blocked feed
 *   node scripts/check-feed-publisher-manifest.mjs --recover <name> [--dry-run]  # recover one named feed
 *   node scripts/check-feed-publisher-manifest.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { SURFACES, classify } from './check-trust-feed-freshness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = 'api/feed-publishers.json';

// Pure validator — returns the list of issues for a given surface table + existence probe.
// `exists(rel)` answers whether a repo-relative path is present (injected for testability).
export function validate(surfaces, exists) {
  const issues = [];
  for (const s of surfaces) {
    const where = s.name || s.file || '(unnamed)';
    if (!s.gen)     issues.push(`${where}: no generator declared (gen)`);
    if (!s.recover) issues.push(`${where}: no recovery command declared (recover)`);
    if (!s.wf)      issues.push(`${where}: no scheduled workflow declared (wf)`);
    if (s.gen && !exists(s.gen))   issues.push(`${where}: generator ${s.gen} does not exist — dead recovery path`);
    if (s.wf && !exists(s.wf))     issues.push(`${where}: workflow ${s.wf} does not exist — phantom cron reference`);
    // The recover command must actually invoke the declared generator (no drift between the
    // human-facing command and the script the manifest claims produces the feed).
    if (s.gen && s.recover && !s.recover.includes(s.gen)) {
      issues.push(`${where}: recover command "${s.recover}" does not invoke its declared generator ${s.gen}`);
    }
  }
  return issues;
}

// Deterministic public inventory derived from the same SURFACES table. generatedAt is
// supplied by the caller (preserved across runs when the feed content is unchanged, so the
// file doesn't churn on every build — the LQIP-coverage-preserving-write pattern).
export function buildInventory(surfaces, generatedAt) {
  return {
    schemaVersion: 1,
    generatedAt,
    generatedBy: 'scripts/check-feed-publisher-manifest.mjs',
    description: 'Provenance for every public trust feed: what regenerates it, how to recover it, and its freshness ceilings.',
    feeds: surfaces.map((s) => ({
      name: s.name,
      file: s.file,
      generator: s.gen,
      recover: s.recover,
      workflow: s.wf,
      maxDays: s.maxDays,
      blockDays: s.blockDays ?? null,
    })),
  };
}

// Compare two inventories ignoring generatedAt (the only volatile field) — the substantive
// content is the feeds table, which is fully derived from SURFACES.
function feedsBytes(inv) {
  if (!inv) return null;
  const { generatedAt, ...rest } = inv;
  return JSON.stringify(rest);
}

function exists(rel) { return existsSync(join(ROOT, rel)); }

// Read a feed's self-reported generatedAt and classify its freshness against its ceilings.
// Returns { surface, status, ageDays, blocked, missing } — the selection input for recovery.
export function feedFreshness(surface, nowMs) {
  const abs = join(ROOT, surface.file);
  if (!existsSync(abs)) return { surface, status: 'missing', ageDays: null, blocked: false, missing: true };
  let generatedAt = null;
  try { generatedAt = JSON.parse(readFileSync(abs, 'utf8'))[surface.tsField] ?? null; } catch {}
  const c = classify(generatedAt, nowMs, surface.maxDays, surface.blockDays);
  return { surface, ...c, missing: false };
}

// Parse a declared recover command ("node scripts/x.mjs --flag") into [bin, ...args].
// Only `node <script> [args]` shape is supported — the parity gate guarantees it.
export function parseRecover(cmd) {
  const parts = String(cmd).trim().split(/\s+/);
  if (parts[0] !== 'node') return null;
  return parts.slice(1);
}

function selfTest() {
  let pass = 0, fail = 0;
  const check = (label, cond) => { if (cond) pass++; else { fail++; console.error('  ✗ ' + label); } };
  const allExist = () => true;
  const noneExist = () => false;

  check('clean table → no issues', validate(
    [{ name: 'a', file: 'api/a.json', gen: 'scripts/g.mjs', recover: 'node scripts/g.mjs', wf: '.github/workflows/w.yml' }],
    allExist,
  ).length === 0);

  check('missing gen flagged', validate(
    [{ name: 'a', file: 'api/a.json', recover: 'node scripts/g.mjs', wf: '.github/workflows/w.yml' }],
    allExist,
  ).some((i) => /no generator declared/.test(i)));

  check('dead generator path flagged', validate(
    [{ name: 'a', file: 'api/a.json', gen: 'scripts/missing.mjs', recover: 'node scripts/missing.mjs', wf: '.github/workflows/w.yml' }],
    noneExist,
  ).some((i) => /dead recovery path/.test(i)));

  check('phantom workflow flagged', validate(
    [{ name: 'a', file: 'api/a.json', gen: 'scripts/g.mjs', recover: 'node scripts/g.mjs', wf: '.github/workflows/missing.yml' }],
    (rel) => rel.startsWith('scripts/'),
  ).some((i) => /phantom cron reference/.test(i)));

  check('recover/gen mismatch flagged', validate(
    [{ name: 'a', file: 'api/a.json', gen: 'scripts/g.mjs', recover: 'node scripts/other.mjs', wf: '.github/workflows/w.yml' }],
    allExist,
  ).some((i) => /does not invoke its declared generator/.test(i)));

  check('inventory derives one feed per surface', buildInventory(
    [{ name: 'a', file: 'api/a.json', gen: 'scripts/g.mjs', recover: 'node scripts/g.mjs', wf: '.github/workflows/w.yml', maxDays: 2, blockDays: 4 }],
  ).feeds.length === 1);

  // The LIVE table must itself be parity-clean (control proof against the real SURFACES).
  check('live SURFACES table is parity-clean', validate(SURFACES, exists).length === 0);

  // recover-command parsing
  check('parseRecover extracts node args', JSON.stringify(parseRecover('node scripts/g.mjs --refresh')) === JSON.stringify(['scripts/g.mjs', '--refresh']));
  check('parseRecover rejects non-node command', parseRecover('bash danger.sh') === null);

  // freshness selection: a feed aged past blockDays is selected; a fresh one is not.
  // (Uses the real SURFACES so the wiring to classify() is proven, with a synthetic now.)
  const s0 = SURFACES[0];
  const future = Date.parse(readFileSync(join(ROOT, s0.file), 'utf8').match(/"generatedAt"\s*:\s*"([^"]+)"/)?.[1] || '2026-01-01') + (s0.blockDays + 5) * 86_400_000;
  check('feedFreshness flags a feed past its blockDays as blocked', feedFreshness(s0, future).blocked === true);
  check('feedFreshness reports a missing feed', feedFreshness({ ...s0, file: 'api/__nope__.json' }, future).missing === true);

  console.log(`check-feed-publisher-manifest self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const isMain = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-feed-publisher-manifest.mjs');

if (isMain) {
  if (process.argv.includes('--self-test')) selfTest();

  // --recover-stale [name] / --recover <name>: run the declared recover command for stale
  // (or named) trust feed(s). Closes the dead-cron loop — when check-trust-feed-freshness
  // BLOCKS, one command regenerates exactly the dead feeds. --dry-run lists without running.
  const recoverIdx = process.argv.findIndex((a) => a === '--recover-stale' || a === '--recover');
  if (recoverIdx !== -1) {
    const dryRun = process.argv.includes('--dry-run');
    const named = process.argv[recoverIdx + 1] && !process.argv[recoverIdx + 1].startsWith('--')
      ? process.argv[recoverIdx + 1] : null;
    const now = Date.now();
    let targets;
    if (named) {
      const s = SURFACES.find((x) => x.name === named);
      if (!s) { console.error(`✗ unknown feed "${named}". Known: ${SURFACES.map((x) => x.name).join(', ')}`); process.exit(1); }
      targets = [s];
    } else {
      targets = SURFACES.filter((s) => { const f = feedFreshness(s, now); return f.status === 'stale' || f.blocked || f.missing; });
    }
    if (!targets.length) { console.log('check-feed-publisher-manifest: no stale trust feeds — nothing to recover.'); process.exit(0); }
    let failed = 0;
    for (const s of targets) {
      const args = parseRecover(s.recover);
      if (!args) { console.error(`✗ ${s.name}: unsupported recover command "${s.recover}"`); failed++; continue; }
      console.log(`${dryRun ? '· would recover' : '→ recovering'} ${s.name}: ${s.recover}`);
      if (dryRun) continue;
      const r = spawnSync(process.execPath, args.map((a) => (a.startsWith('scripts/') ? join(ROOT, a) : a)), { stdio: 'inherit', cwd: ROOT });
      if (r.status !== 0) { console.error(`✗ ${s.name}: recover command exited ${r.status}`); failed++; }
    }
    console.log(`check-feed-publisher-manifest: ${dryRun ? 'dry-run over' : 'recovered'} ${targets.length} feed(s)${failed ? ` · ${failed} failed` : ''}`);
    process.exit(failed ? 1 : 0);
  }

  const checkOnly = process.argv.includes('--check');
  const issues = validate(SURFACES, exists);
  if (issues.length) {
    for (const i of issues) console.error(`✗ ${i}`);
    console.error(`check-feed-publisher-manifest: ${issues.length} publisher-parity issue(s) — every trust feed must name a real generator + recovery command.`);
    process.exit(1);
  }

  const abs = join(ROOT, INVENTORY);
  let currentJson = null;
  try { currentJson = existsSync(abs) ? JSON.parse(readFileSync(abs, 'utf8')) : null; } catch { currentJson = null; }
  // Reuse the committed timestamp when the feeds content is unchanged (no build churn);
  // stamp a fresh date only when the provenance table actually changes.
  const unchanged = currentJson && feedsBytes(currentJson) === feedsBytes(buildInventory(SURFACES, null));
  const stamp = unchanged && currentJson.generatedAt
    ? currentJson.generatedAt
    : new Date().toISOString().slice(0, 10);
  const inventory = buildInventory(SURFACES, stamp);
  const next = JSON.stringify(inventory, null, 2) + '\n';
  const currentText = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (checkOnly) {
    // Compare feeds content (ignore generatedAt) so a date-only timestamp never fails the gate.
    if (feedsBytes(currentJson) !== feedsBytes(inventory)) {
      console.error(`✗ ${INVENTORY} is out of sync with the publisher table — run: node scripts/check-feed-publisher-manifest.mjs`);
      process.exit(1);
    }
  } else if (currentText !== next) {
    writeFileSync(abs, next);
  }
  console.log(`check-feed-publisher-manifest ✓ ${SURFACES.length} trust feed(s) declare a real generator + recovery path${checkOnly ? '' : ` → ${INVENTORY}`}`);
}
