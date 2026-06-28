#!/usr/bin/env node
/**
 * check-propagated-doc-currency.mjs — S232 second-order innovation.
 *
 * THE CLASS IT CLOSES: some docs in this repo are *propagated copies* of a canonical
 * source in `vaultspark-studio-ops` (they carry a `canonical-source:` header). When the
 * canonical source advances, the local copy silently lags — there is no version gate on
 * it. S232 found `docs/SESSION_PROTOCOL.md` stranded at v1.3 while canonical was v1.5
 * (and `prompts/initiate.md` missing entirely); the drift was only caught by a deep
 * CANON-044 *content* probe, long after it mattered. `prompts/start.md` / `closeout.md`
 * already have a dedicated "prompt version alignment" doctor probe — this extends that
 * same philosophy to the propagated PROTOCOL DOCS that had no currency check at all.
 *
 * Design (mirrors the studio "degrade, never hard-fail on an absent local-only input"
 * rule): the canonical lives in a SIBLING repo that is NOT checked out on CI. So this is
 * a LOCAL advisory — when the sibling is absent it SKIPS that entry (never fails CI),
 * and even on drift it exits 0 unless `--strict`. Truth source for each version is the
 * doc's own header marker (observability honesty: the doc self-reports its version).
 *
 * Usage:
 *   node scripts/check-propagated-doc-currency.mjs            # advisory report, exit 0
 *   node scripts/check-propagated-doc-currency.mjs --strict   # exit 1 if any local copy is behind a PRESENT canonical
 *   node scripts/check-propagated-doc-currency.mjs --json
 *   node scripts/check-propagated-doc-currency.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops');

// Propagated docs whose currency is NOT already guarded by another probe. Each entry:
//   local      — path in this repo
//   canonical  — path in the studio-ops sibling
//   marker     — regex with one capture group = the version string
// (prompts/start.md + closeout.md are intentionally excluded — covered by the existing
//  prompt-version-alignment doctor probe.)
const REGISTRY = [
  {
    local: 'docs/SESSION_PROTOCOL.md',
    canonical: 'docs/SESSION_PROTOCOL.md',
    marker: /session-protocol-version:\s*([\d.]+)/i,
  },
];

// ── Pure, testable core ──────────────────────────────────────────────────────────
/** Parse the version captured by `marker` from `text`, or null. */
export function parseVersion(text, marker) {
  if (typeof text !== 'string') return null;
  const m = text.match(marker);
  return m ? m[1] : null;
}

/** Semantic-ish compare of dotted numeric versions. -1 a<b · 0 equal · 1 a>b. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * evaluate(registry, read) — classify each propagated doc. `read(absPath)` returns the
 * file text or null if absent. Verdicts: 'current' · 'behind' · 'ahead' ·
 * 'sibling-absent' (skip — CI) · 'local-absent' · 'no-marker'.
 */
export function evaluate(registry, read) {
  return registry.map((e) => {
    const localTxt = read(path.join(ROOT, e.local));
    if (localTxt == null) return { ...e, status: 'local-absent' };
    const sibTxt = read(path.join(SIBLING, e.canonical));
    if (sibTxt == null) return { ...e, status: 'sibling-absent' };
    const lv = parseVersion(localTxt, e.marker);
    const cv = parseVersion(sibTxt, e.marker);
    if (lv == null || cv == null) return { ...e, status: 'no-marker', localVersion: lv, canonicalVersion: cv };
    const cmp = compareVersions(lv, cv);
    return { ...e, localVersion: lv, canonicalVersion: cv, status: cmp < 0 ? 'behind' : cmp > 0 ? 'ahead' : 'current' };
  });
}

// ── Self-test ──────────────────────────────────────────────────────────────────────
function selfTest() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error('  ✗ ' + l); } };
  const M = /v:\s*([\d.]+)/;

  ok(compareVersions('1.3', '1.5') === -1, '1.3 < 1.5');
  ok(compareVersions('1.5', '1.5') === 0, '1.5 == 1.5');
  ok(compareVersions('1.10', '1.9') === 1, '1.10 > 1.9 (numeric, not lexical)');
  ok(compareVersions('2.0', '1.9') === 1, '2.0 > 1.9');
  ok(parseVersion('foo v: 1.5 bar', M) === '1.5', 'parseVersion extracts');
  ok(parseVersion('no version here', M) === null, 'parseVersion null when absent');

  const reg = [{ local: 'a', canonical: 'a', marker: M }];
  const fixture = (local, sib) => (abs) => abs.includes('vaultspark-studio-ops') ? sib : local;
  ok(evaluate(reg, fixture('v: 1.3', 'v: 1.5'))[0].status === 'behind', 'behind detected');
  ok(evaluate(reg, fixture('v: 1.5', 'v: 1.5'))[0].status === 'current', 'current detected');
  ok(evaluate(reg, fixture('v: 1.6', 'v: 1.5'))[0].status === 'ahead', 'ahead detected');
  ok(evaluate(reg, (abs) => abs.includes('vaultspark-studio-ops') ? null : 'v: 1.5')[0].status === 'sibling-absent', 'sibling-absent skips (CI-safe)');
  ok(evaluate(reg, () => null)[0].status === 'local-absent', 'local-absent flagged');
  ok(evaluate(reg, fixture('no marker', 'v: 1.5'))[0].status === 'no-marker', 'no-marker handled');

  console.log(`check-propagated-doc-currency --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── CLI ──────────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-propagated-doc-currency.mjs');

if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) selfTest();
  const strict = argv.includes('--strict');
  const asJson = argv.includes('--json');

  const read = (abs) => { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } };
  const results = evaluate(REGISTRY, read);

  if (asJson) {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    console.log('check-propagated-doc-currency:');
    for (const r of results) {
      const icon = r.status === 'current' ? '✓' : r.status === 'behind' ? '⚠'
        : r.status === 'sibling-absent' ? '∅' : r.status === 'ahead' ? '↑' : '✗';
      const ver = r.localVersion ? ` (local ${r.localVersion}${r.canonicalVersion ? ` · canonical ${r.canonicalVersion}` : ''})` : '';
      const note = r.status === 'behind'
        ? ` — BEHIND canonical; re-sync: cp ../vaultspark-studio-ops/${r.canonical} ${r.local}`
        : r.status === 'sibling-absent' ? ' — canonical sibling not checked out (skipped)' : '';
      console.log(`  ${icon}  ${r.local}${ver}${note}`);
    }
  }

  const behind = results.filter((r) => r.status === 'behind');
  if (strict && behind.length) {
    console.error(`check-propagated-doc-currency: ${behind.length} propagated doc(s) behind canonical.`);
    process.exit(1);
  }
  process.exit(0);
}
