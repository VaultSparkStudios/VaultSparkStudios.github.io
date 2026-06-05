#!/usr/bin/env node
/**
 * S158 — Perf history CSV exporter.
 *
 * Reads `data/perf-history.ndjson` and writes a spreadsheet-friendly CSV with
 * columns: ts, route, profile, lcp, cls, fcp, ttfb, source.
 *
 * Idempotent. Deterministic ordering: timestamp ascending, then route, then profile.
 *
 * Usage:
 *   node scripts/export-perf-history.mjs                          # writes docs/PERF_HISTORY.csv
 *   node scripts/export-perf-history.mjs --out path/to/file.csv   # custom path
 *   node scripts/export-perf-history.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : path.join(ROOT, 'docs', 'PERF_HISTORY.csv');
const HISTORY = path.join(ROOT, 'data', 'perf-history.ndjson');

const COLUMNS = ['ts', 'route', 'profile', 'lcp', 'cls', 'fcp', 'ttfb', 'source'];

function escapeCsv(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(rows) {
  const header = COLUMNS.join(',');
  const sorted = [...rows].sort((a, b) => {
    const t = (a.ts || '').localeCompare(b.ts || '');
    if (t !== 0) return t;
    const r = (a.route || '').localeCompare(b.route || '');
    if (r !== 0) return r;
    return (a.profile || '').localeCompare(b.profile || '');
  });
  const lines = sorted.map((r) => COLUMNS.map((c) => escapeCsv(r[c])).join(','));
  return header + '\n' + lines.join('\n') + (lines.length ? '\n' : '');
}

if (SELF_TEST) {
  const rows = [
    { ts: '2026-05-22T02:00Z', route: '/', profile: 'desktop', lcp: 1800, cls: 0.04 },
    { ts: '2026-05-22T01:00Z', route: '/', profile: 'desktop', lcp: 1900, cls: 0.05 },
    { ts: '2026-05-22T01:00Z', route: '/membership/', profile: 'mobile', lcp: 2200, cls: 0.02 },
  ];
  const csv = rowsToCsv(rows);
  const lines = csv.trim().split('\n');
  const checks = [
    { name: 'header present', ok: lines[0] === COLUMNS.join(',') },
    { name: 'row count = 3', ok: lines.length === 4 },
    { name: 'ts ascending', ok: lines[1].startsWith('2026-05-22T01:00Z,/,') },
    { name: 'membership row sorted after / for same ts', ok: lines[2].includes('/membership/') },
  ];
  let pass = 0, fail = 0;
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);
    c.ok ? pass++ : fail++;
  }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (!fs.existsSync(HISTORY)) {
  console.log('export-perf-history: data/perf-history.ndjson missing — skip');
  process.exit(0);
}

const rows = fs.readFileSync(HISTORY, 'utf8')
  .split('\n').filter(Boolean)
  .map((line) => { try { return JSON.parse(line); } catch { return null; } })
  .filter(Boolean);

const csv = rowsToCsv(rows);
if (!fs.existsSync(path.dirname(OUT))) fs.mkdirSync(path.dirname(OUT), { recursive: true });
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
if (prev !== csv) {
  fs.writeFileSync(OUT, csv);
  console.log(`export-perf-history: wrote ${path.relative(ROOT, OUT)} (${rows.length} rows)`);
} else {
  console.log(`export-perf-history: ${path.relative(ROOT, OUT)} unchanged (${rows.length} rows)`);
}
