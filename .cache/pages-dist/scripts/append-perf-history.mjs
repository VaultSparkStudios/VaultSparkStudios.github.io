#!/usr/bin/env node
/**
 * S153 — Production Perf History Tracker.
 *
 * Ingests every docs/PERF_TRACE_PROD_*.json into append-only
 * data/perf-history.ndjson keyed by {ts, session, sha, route, profile,
 * lcp, fcp, cls}. Idempotent: same trace re-ingested → no duplicate rows
 * (dedupe key = ts + route + profile).
 *
 * Modes:
 *   (default)            — ingest any new traces, print summary
 *   --backfill           — ingest ALL traces (same dedupe still applies)
 *   --detect-regressions — compare latest sample per (route,profile)
 *                          against the prior-3 median; flag LCP >+15% or
 *                          CLS crossing 0.1. Exit nonzero on regression.
 *   --json               — emit structured payload instead of human text
 *   --dry-run            — read but do not write
 *
 * Self-test contract: --self-test verifies the regression detector against
 * a synthetic three-sample baseline.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const dryRun = args.includes('--dry-run');
const detect = args.includes('--detect-regressions');
const selfTest = args.includes('--self-test');
const HISTORY_PATH = path.join(ROOT, 'data', 'perf-history.ndjson');

if (selfTest) {
  runSelfTest();
  process.exit(0);
}

function runSelfTest() {
  const baseline = [
    { lcp: 2000, cls: 0.02 },
    { lcp: 2100, cls: 0.03 },
    { lcp: 1900, cls: 0.02 },
  ];
  const regressionLcp = detectRegression(baseline, { lcp: 2500, cls: 0.03 });
  if (!regressionLcp.lcpRegression) throw new Error('self-test: LCP regression should fire at +25%');
  const regressionCls = detectRegression(baseline, { lcp: 2050, cls: 0.12 });
  if (!regressionCls.clsRegression) throw new Error('self-test: CLS regression should fire crossing 0.1');
  const stable = detectRegression(baseline, { lcp: 2150, cls: 0.025 });
  if (stable.lcpRegression || stable.clsRegression) throw new Error('self-test: stable sample must not regress');
  console.log('append-perf-history --self-test: OK');
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function detectRegression(priorSamples, latest) {
  const lcps = priorSamples.map((s) => s.lcp).filter((n) => typeof n === 'number');
  const clss = priorSamples.map((s) => s.cls).filter((n) => typeof n === 'number');
  const medLcp = lcps.length ? median(lcps) : null;
  const medCls = clss.length ? median(clss) : null;
  const lcpRegression = medLcp != null && typeof latest.lcp === 'number' && latest.lcp > medLcp * 1.15;
  const clsRegression = medCls != null && typeof latest.cls === 'number' && medCls < 0.1 && latest.cls >= 0.1;
  return { medLcp, medCls, lcpRegression, clsRegression };
}

function loadExistingKeys() {
  if (!fs.existsSync(HISTORY_PATH)) return new Set();
  const text = fs.readFileSync(HISTORY_PATH, 'utf8');
  const keys = new Set();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      keys.add(`${row.ts}|${row.route}|${row.profile}`);
    } catch {}
  }
  return keys;
}

function gitSha() {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 12); } catch { return ''; }
}

function ingestTrace(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!raw || !Array.isArray(raw.routes)) return [];
  const ts = raw.generatedAt || new Date().toISOString();
  const session = (path.basename(file).match(/S(\d+)/) || [, ''])[1];
  const rows = [];
  for (const r of raw.routes) {
    if (typeof r.lcp !== 'number') continue;
    rows.push({
      ts,
      session: session ? `S${session}` : null,
      sourceFile: path.relative(ROOT, file).replace(/\\/g, '/'),
      route: r.route || '/',
      profile: r.profile || 'desktop',
      lcp: r.lcp,
      fcp: typeof r.fcp === 'number' ? r.fcp : null,
      cls: typeof r.cls === 'number' ? r.cls : null,
      status: r.status || null,
    });
  }
  return rows;
}

const traceFiles = fs.readdirSync(path.join(ROOT, 'docs'))
  .filter((n) => /^PERF_TRACE_PROD_.*\.json$/.test(n))
  .map((n) => path.join(ROOT, 'docs', n))
  .sort();

const existing = loadExistingKeys();
const newRows = [];
for (const f of traceFiles) {
  for (const row of ingestTrace(f)) {
    const key = `${row.ts}|${row.route}|${row.profile}`;
    if (existing.has(key)) continue;
    existing.add(key);
    newRows.push(row);
  }
}

if (!dryRun && newRows.length) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  const append = newRows.map((r) => JSON.stringify({ ...r, sha: gitSha() })).join('\n') + '\n';
  fs.appendFileSync(HISTORY_PATH, append);
}

let regressionReport = null;
if (detect && fs.existsSync(HISTORY_PATH)) {
  const allRows = fs.readFileSync(HISTORY_PATH, 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const byKey = new Map();
  for (const row of allRows) {
    const k = `${row.route}::${row.profile}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(row);
  }
  const regressions = [];
  for (const [k, rows] of byKey) {
    if (rows.length < 4) continue;
    rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
    const latest = rows[rows.length - 1];
    const prior = rows.slice(-4, -1);
    const det = detectRegression(prior, latest);
    if (det.lcpRegression || det.clsRegression) {
      regressions.push({ key: k, latest, prior: prior.map((p) => ({ ts: p.ts, lcp: p.lcp, cls: p.cls })), detection: det });
    }
  }
  regressionReport = { samples: byKey.size, regressions };
}

const payload = {
  schemaVersion: '1.0',
  historyPath: path.relative(ROOT, HISTORY_PATH).replace(/\\/g, '/'),
  tracesScanned: traceFiles.length,
  rowsAdded: newRows.length,
  dryRun,
  regressionReport,
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`append-perf-history: scanned ${traceFiles.length} traces · added ${newRows.length} row(s)${dryRun ? ' (dry-run)' : ''}`);
  if (regressionReport) {
    console.log(`Regression check: ${regressionReport.samples} (route×profile) series · ${regressionReport.regressions.length} regression(s)`);
    for (const r of regressionReport.regressions) {
      console.log(`  ⚠ ${r.key} — latest LCP ${r.latest.lcp}ms / CLS ${r.latest.cls} vs median LCP ${r.detection.medLcp} / CLS ${r.detection.medCls}`);
    }
  }
}

process.exit(regressionReport && regressionReport.regressions.length ? 1 : 0);
