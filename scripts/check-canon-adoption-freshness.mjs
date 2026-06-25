#!/usr/bin/env node
/**
 * check-canon-adoption-freshness.mjs — S221 (closes the S219 carry).
 *
 * THE GAP IT CLOSES: `context/CANON_ADOPTION.md` is the project's CHECKED posture
 * against Studio Canon (founder directive S183). The authoritative refresh lives in
 * studio-ops (`check-canon-adoption.mjs --write`), but nothing LOCAL verified the
 * file stayed in sync — so when a new CANON-NNN ships studio-wide, this repo's
 * adoption file could silently fall behind (an un-walked canon = a coverage gap),
 * and no local gate would notice between studio-ops runs.
 *
 * This is the LOCAL MIRROR of that probe. It answers one question deterministically:
 * does CANON_ADOPTION.md have a row for every ACTIVE canon that currently exists?
 *
 * SOURCE OF TRUTH for the live ACTIVE set, in priority order:
 *   1. ../vaultspark-studio-ops/docs/STUDIO_CANON.md  — the canonical, always-current
 *      list (`## CANON-NNN` headings). Read-only; never written (cross-repo safety).
 *   2. AGENTS.md (this repo) — the propagated canon index (CANON-016). Used as the
 *      offline fallback so the gate still works in CI where the sibling is absent.
 *
 * SIGNALS:
 *   MISSING   — a live ACTIVE canon with no row in CANON_ADOPTION.md. This is real
 *               staleness (a new canon was never walked) → fails --check.
 *   EXTRA     — a canon row in the adoption file that is no longer in the live set
 *               (retired upstream) → advisory (warn).
 *   COUNT     — the header "Live ACTIVE canons: N" claim disagrees with the real
 *               live count → advisory (CANON-031 observability honesty).
 *   AGE       — days since "Walked in full at SNNN (date)" exceeds STALE_DAYS →
 *               advisory nudge to re-walk.
 *
 * Modes: --check (default; exit 1 on MISSING) · --warn-only · --json · --self-test
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

const STALE_DAYS = 45; // re-walk nudge horizon

// ── Pure, testable core ─────────────────────────────────────────────────────────
/** Distinct CANON-NNN ids in a blob, as a sorted array. */
export function canonIds(text) {
  const ids = new Set((text.match(/CANON-\d{3}/g) || []));
  return [...ids].sort();
}

/** Live ACTIVE ids from STUDIO_CANON.md (only `## CANON-NNN` headings count). */
export function liveActiveIds(studioCanonText) {
  const ids = new Set();
  for (const m of studioCanonText.matchAll(/^##\s+CANON-(\d{3})/gm)) ids.add(`CANON-${m[1]}`);
  return [...ids].sort();
}

/**
 * compareCoverage(liveIds, adoptionIds) — pure set diff.
 * @returns {{missing:string[], extra:string[]}}
 */
export function compareCoverage(liveIds, adoptionIds) {
  const live = new Set(liveIds), adopt = new Set(adoptionIds);
  return {
    missing: liveIds.filter(id => !adopt.has(id)),  // live but not walked
    extra: adoptionIds.filter(id => !live.has(id)), // walked but retired upstream
  };
}

/** Extract the "Live ACTIVE canons: N" header claim, or null. */
export function headerCount(adoptionText) {
  const m = adoptionText.match(/Live ACTIVE canons:\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** Extract the walked date (YYYY-MM-DD) from "Walked in full at SNNN (date)", or null. */
export function walkedDate(adoptionText) {
  const m = adoptionText.match(/Walked in full at\s+\*{0,2}S\d+\*{0,2}\s*\((\d{4}-\d{2}-\d{2})\)/i);
  return m ? m[1] : null;
}

// ── Self-test ────────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  const live = liveActiveIds('## CANON-001 x\nsome prose CANON-099 (inline, not a heading)\n## CANON-002 y\n## CANON-013 z');
  ok(JSON.stringify(live) === JSON.stringify(['CANON-001', 'CANON-002', 'CANON-013']), 'liveActiveIds counts only ## headings');

  const cov = compareCoverage(['CANON-001', 'CANON-002', 'CANON-052'], ['CANON-001', 'CANON-002', 'CANON-099']);
  ok(JSON.stringify(cov.missing) === JSON.stringify(['CANON-052']), 'missing = live-but-not-walked');
  ok(JSON.stringify(cov.extra) === JSON.stringify(['CANON-099']), 'extra = walked-but-retired');

  ok(headerCount('… Live ACTIVE canons: 51') === 51, 'headerCount parses claim');
  ok(headerCount('no claim here') === null, 'headerCount null when absent');
  ok(walkedDate('Walked in full at **S219** (2026-06-23) — note') === '2026-06-23', 'walkedDate parses');
  ok(canonIds('CANON-006 and CANON-006 and CANON-041').length === 2, 'canonIds dedupes');

  console.log(`check-canon-adoption-freshness --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Live scan ────────────────────────────────────────────────────────────────────
const adoptionPath = path.join(ROOT, 'context', 'CANON_ADOPTION.md');
let adoptionText = '';
try {
  adoptionText = fs.readFileSync(adoptionPath, 'utf8');
} catch {
  console.error('check-canon-adoption-freshness: context/CANON_ADOPTION.md not found — run the studio-ops walk.');
  process.exit(warnOnly ? 0 : 1);
}

// Resolve the live ACTIVE set: sibling STUDIO_CANON.md first, AGENTS.md fallback.
let liveIds = [];
let source = '';
const siblingCanon = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'docs', 'STUDIO_CANON.md');
try {
  liveIds = liveActiveIds(fs.readFileSync(siblingCanon, 'utf8'));
  source = 'studio-ops/docs/STUDIO_CANON.md (## headings)';
} catch { /* sibling absent (e.g. CI) — fall back to the propagated local index */ }
if (!liveIds.length) {
  try {
    liveIds = canonIds(fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8'));
    source = 'AGENTS.md (propagated canon index — offline fallback)';
  } catch { /* no source available */ }
}

if (!liveIds.length) {
  console.error('check-canon-adoption-freshness: no live canon source available (sibling absent + AGENTS.md unreadable) — skipping.');
  process.exit(0);
}

const adoptionIds = canonIds(adoptionText);
const { missing, extra } = compareCoverage(liveIds, adoptionIds);
const claimed = headerCount(adoptionText);
const countMismatch = claimed !== null && claimed !== liveIds.length;

let ageDays = null;
const wd = walkedDate(adoptionText);
if (wd) {
  const days = Math.floor((Date.now() - Date.parse(wd + 'T00:00:00Z')) / 86_400_000);
  if (Number.isFinite(days)) ageDays = days;
}

if (asJson) {
  console.log(JSON.stringify({
    source, liveCount: liveIds.length, adoptionCount: adoptionIds.length,
    missing, extra, claimed, countMismatch, walkedDate: wd, ageDays, staleDays: STALE_DAYS,
  }, null, 2));
  process.exit(missing.length && !warnOnly ? 1 : 0);
}

console.log(`check-canon-adoption-freshness: ${adoptionIds.length} walked vs ${liveIds.length} live ACTIVE`);
console.log(`  source: ${source}`);
let advisories = 0;
if (extra.length) { console.log(`  ⚠ ${extra.length} retired-upstream row(s) still listed: ${extra.join(', ')}`); advisories++; }
if (countMismatch) { console.log(`  ⚠ header claims "Live ACTIVE canons: ${claimed}" but live count is ${liveIds.length}`); advisories++; }
if (ageDays !== null && ageDays > STALE_DAYS) { console.log(`  ⚠ last full walk was ${ageDays}d ago (> ${STALE_DAYS}d) — consider re-walking`); advisories++; }

if (!missing.length) {
  console.log(`  ✓ every live ACTIVE canon has an adoption row${advisories ? ` (${advisories} advisory)` : ''}`);
  process.exit(0);
}
console.error(`  ✗ ${missing.length} live ACTIVE canon(s) NOT walked in CANON_ADOPTION.md: ${missing.join(', ')}`);
console.error('  → add a row (adopted/pending/review/exempt) for each, or re-run the studio-ops walk.');
process.exit(warnOnly ? 0 : 1);
