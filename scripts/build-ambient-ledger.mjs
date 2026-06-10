#!/usr/bin/env node
/**
 * build-ambient-ledger.mjs — Ambient placement provenance ledger (S184)
 *
 * Ambient-split decisions previously lived only in a volatile
 * .cache/ambient-split-candidates.json (regenerated each run, never committed)
 * plus tribal knowledge in build-ambient-bundle.mjs comments. Every split wave
 * (S147/S178/S179/S180) re-litigated which engine belongs in the cold path.
 *
 * This promotes that to a committed, reason-coded ledger derived from real data:
 *   - the live CORE/FEATURE bundle arrays (source of truth for placement), and
 *   - the report-ambient-coverage candidate cache (split signals + risk).
 *
 * Reason codes (placement rationale):
 *   sitewide-core    — shell primitive that must parse on every page (auth,
 *                      scroll, TT bridge). Intentionally in the cold path.
 *   feature-bundle   — engagement/intelligence surface in the rotating feature
 *                      bundle; parses sitewide but is split-reviewable.
 *   split-candidate  — flagged by coverage as gated (query/viewport/session/
 *                      capability) → a candidate to move to predicate loading.
 *
 * Usage: node scripts/build-ambient-ledger.mjs [--check]
 *   --check : structural drift gate (sources + bundle membership), not byte-equality.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BUNDLE_SRC = path.join(ROOT, 'scripts', 'build-ambient-bundle.mjs');
const CAND_CACHE = path.join(ROOT, '.cache', 'ambient-split-candidates.json');
const OUT_JSON = path.join(ROOT, 'context', 'ambient-ledger.json');
const OUT_MD = path.join(ROOT, 'docs', 'AMBIENT_LEDGER.md');

function parseArray(text, name) {
  const m = text.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+\.js)['"]/g)].map((x) => x[1]);
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

export function buildLedger() {
  const src = fs.readFileSync(BUNDLE_SRC, 'utf8');
  const core = parseArray(src, 'AMBIENT_CORE_SOURCES');
  const feature = parseArray(src, 'AMBIENT_FEATURE_SOURCES');
  const cand = readJson(CAND_CACHE);
  const candBySource = new Map((cand?.candidates || []).map((c) => [c.source, c]));

  const rows = [];
  for (const [list, bundle] of [[core, 'core'], [feature, 'feature']]) {
    for (const source of list) {
      const c = candBySource.get(source);
      let reasonCode = bundle === 'core' ? 'sitewide-core' : 'feature-bundle';
      if (c && Array.isArray(c.reasons) && c.reasons.length) reasonCode = 'split-candidate';
      rows.push({
        source,
        bundle,
        reasonCode,
        sizeKb: c?.sizeKb ?? null,
        gates: c?.reasons ?? [],
        risk: c?.risk ?? null,
      });
    }
  }
  const candidates = rows.filter((r) => r.reasonCode === 'split-candidate').length;
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-ambient-ledger.mjs',
    generatedAt: new Date().toISOString(),
    summary: { total: rows.length, core: core.length, feature: feature.length, splitCandidates: candidates },
    entries: rows,
  };
}

function renderMd(l) {
  const lines = [];
  lines.push('<!-- generated-by: scripts/build-ambient-ledger.mjs -->');
  lines.push('# Ambient Bundle Ledger');
  lines.push('');
  lines.push('> Reason-coded provenance for every ambient JS source. Derived from the live');
  lines.push('> CORE/FEATURE bundle arrays + coverage candidate cache — NOT hand-maintained.');
  lines.push('> Regenerate: `node scripts/build-ambient-ledger.mjs`.');
  lines.push('');
  const s = l.summary;
  lines.push(`**${s.total} sources** · ${s.core} core · ${s.feature} feature · **${s.splitCandidates} split-candidate(s)**`);
  lines.push('');
  lines.push('| Source | Bundle | Reason code | Size | Gates | Risk |');
  lines.push('|---|---|---|--:|---|---|');
  for (const e of l.entries) {
    lines.push(`| \`${e.source}\` | ${e.bundle} | ${e.reasonCode} | ${e.sizeKb != null ? e.sizeKb + 'kb' : '—'} | ${e.gates.join(', ') || '—'} | ${e.risk || '—'} |`);
  }
  lines.push('');
  lines.push('**Reason codes** — `sitewide-core`: shell primitive, must parse every page · ' +
    '`feature-bundle`: rotating engagement/intelligence surface · ' +
    '`split-candidate`: coverage flagged it gated → move to predicate loading next wave.');
  lines.push('');
  return lines.join('\n');
}

function structure(l) {
  return JSON.stringify(l.entries.map((e) => ({ source: e.source, bundle: e.bundle })).sort((a, b) => a.source.localeCompare(b.source)));
}

function main() {
  const check = process.argv.includes('--check');
  const fresh = buildLedger();
  if (check) {
    const existing = readJson(OUT_JSON);
    if (!existing) { console.error('ambient-ledger: missing — run without --check'); process.exit(1); }
    if (structure(existing) !== structure(fresh)) {
      console.error('ambient-ledger: STRUCTURAL DRIFT — ambient source set / bundle membership changed. Re-render: node scripts/build-ambient-ledger.mjs');
      process.exit(1);
    }
    console.log(`ambient-ledger ✓ structure stable (${fresh.summary.total} sources, ${fresh.summary.splitCandidates} candidate(s))`);
    return;
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(fresh, null, 2) + '\n');
  fs.writeFileSync(OUT_MD, renderMd(fresh));
  console.log(`✓ ambient ledger — ${fresh.summary.total} sources (${fresh.summary.core} core / ${fresh.summary.feature} feature) · ${fresh.summary.splitCandidates} split-candidate(s)`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-ambient-ledger.mjs')) {
  main();
}
