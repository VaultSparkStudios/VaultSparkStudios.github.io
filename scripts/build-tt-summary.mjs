#!/usr/bin/env node
/**
 * S158 — Trusted Types summary generator.
 *
 * Writes `api/tt-summary.json` with aggregate report-only violation counts.
 *
 * Sources, in priority order:
 *   1. Optional admin-export JSON at `data/tt-export.json` (if a future
 *      Worker /v/tt-export route writes one).
 *   2. Empty-but-valid "warming" shape so the public page renders cleanly
 *      before the KV ring has samples.
 *
 * Idempotent. Designed to run from `npm run build` and `--check` mode for CI.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const OUT = path.join(ROOT, 'api', 'tt-summary.json');
const EXPORT_PATH = path.join(ROOT, 'data', 'tt-export.json');

function emptyShape() {
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    windowDays: 1,
    sampleRate: 0.005,
    status: 'warming',
    totals: { reports: 0, uniquePaths: 0, uniqueDirectives: 0 },
    topPaths: [],
    topDirectives: [],
    note: 'Trusted Types reporting is in 0.5% sample-rate report-only mode via the Worker /v/tt-report endpoint (S157). Aggregates appear here once the KV ring accumulates samples.',
  };
}

function aggregate(rawSamples) {
  const pathCounts = new Map();
  const directiveCounts = new Map();
  for (const s of rawSamples) {
    if (s.path) pathCounts.set(s.path, (pathCounts.get(s.path) || 0) + 1);
    if (s.directive) directiveCounts.set(s.directive, (directiveCounts.get(s.directive) || 0) + 1);
  }
  const sortDesc = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    windowDays: 1,
    sampleRate: 0.005,
    status: rawSamples.length ? 'active' : 'warming',
    totals: {
      reports: rawSamples.length,
      uniquePaths: pathCounts.size,
      uniqueDirectives: directiveCounts.size,
    },
    topPaths: sortDesc(pathCounts).map(([p, c]) => ({ path: p, count: c })),
    topDirectives: sortDesc(directiveCounts).map(([d, c]) => ({ directive: d, count: c })),
  };
}

let payload;
if (fs.existsSync(EXPORT_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
    const samples = Array.isArray(raw) ? raw : raw.samples || [];
    payload = aggregate(samples);
  } catch {
    payload = emptyShape();
  }
} else {
  payload = emptyShape();
}

const next = JSON.stringify(payload, null, 2) + '\n';
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

// S324: --check derived `next` above and then never looked at it — it only
// asserted that the COMMITTED file parses as JSON. A summary that had drifted
// from its source export was a pass, so the gate could not catch the one thing
// its name promises. Byte-compare is not available here (generatedAt is
// wall-clock), so compare the STRUCTURE the way build-security-posture does:
// everything the feed reports, minus the timestamp an honest refresh bumps.
export function ttStructure(summary) {
  return JSON.stringify({
    schemaVersion: summary?.schemaVersion,
    windowDays: summary?.windowDays,
    sampleRate: summary?.sampleRate,
    status: summary?.status,
    totals: summary?.totals,
    topPaths: summary?.topPaths,
    topDirectives: summary?.topDirectives,
  });
}

if (CHECK) {
  if (!prev) {
    console.error('build-tt-summary --check: api/tt-summary.json missing');
    process.exit(1);
  }
  let committed;
  try {
    committed = JSON.parse(prev);
  } catch {
    console.error('build-tt-summary --check: api/tt-summary.json malformed');
    process.exit(1);
  }
  if (ttStructure(committed) !== ttStructure(payload)) {
    console.error('build-tt-summary --check: api/tt-summary.json drifts from data/tt-export.json — run: node scripts/build-tt-summary.mjs');
    process.exit(1);
  }
  console.log(`build-tt-summary --check: in sync (${payload.status} · ${payload.totals.reports} report(s))`);
  process.exit(0);
}

if (prev !== next) {
  if (!fs.existsSync(path.dirname(OUT))) fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, next);
  console.log(`build-tt-summary: wrote ${path.relative(ROOT, OUT)} (status: ${payload.status}, reports: ${payload.totals.reports})`);
} else {
  console.log('build-tt-summary: api/tt-summary.json unchanged');
}
