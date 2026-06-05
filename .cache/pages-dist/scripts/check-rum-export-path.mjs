#!/usr/bin/env node
/**
 * Diagnose the RUM field-data path without pretending empty data is green.
 *
 * The perf gate may fall back to synthetic when `data/rum-summary.json` has no
 * samples. This script emits a small machine-readable diagnosis so sessions can
 * tell whether the issue is "no export file", "bad summary", or "field data is
 * flowing but still below the strict threshold".
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');
const OUT = path.join(ROOT, '.cache', 'rum-export-diagnostics.json');

const SOURCES = [
  'data/rum-history.ndjson',
  'data/rum-raw.ndjson',
  'data/rum-raw.json',
  '.cache/rum-raw'
];

export function evaluate(summary, sourceExists) {
  const findings = [];
  const totalSamples = Number(summary?.totalSamples || 0);
  const sufficientRoutes = Number(summary?.sufficientRoutes || 0);
  const detectedSources = SOURCES.filter((source) => sourceExists(source));
  let status = 'empty';
  if (!summary || typeof summary !== 'object') {
    status = 'missing-summary';
    findings.push('data/rum-summary.json is missing or invalid');
  } else if (totalSamples > 0 && sufficientRoutes > 0) {
    status = 'field-ready';
  } else if (totalSamples > 0) {
    status = 'warming';
    findings.push(`RUM has ${totalSamples} sample(s), below sufficient route threshold`);
  } else {
    findings.push('RUM summary has 0 samples');
  }
  if (!detectedSources.length) findings.push('No local RUM export source found');
  return {
    ok: status === 'field-ready',
    status,
    totalSamples,
    sufficientRoutes,
    detectedSources,
    findings,
    nextAction: status === 'field-ready'
      ? 'Use data/rum-summary.json as the authoritative perf signal.'
      : 'Export recent Worker RUM rows into data/rum-raw.ndjson or data/rum-history.ndjson, then run `npm run rum:summary`.'
  };
}

if (SELF_TEST) {
  const ready = evaluate({ totalSamples: 80, sufficientRoutes: 1 }, () => true);
  const empty = evaluate({ totalSamples: 0, sufficientRoutes: 0 }, () => false);
  const ok = ready.ok && ready.status === 'field-ready' && !empty.ok && empty.findings.length >= 2;
  console.log(`rum-export-path self-test: ${ok ? 'OK' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
}

let summary = null;
try {
  summary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'rum-summary.json'), 'utf8'));
} catch {}

const report = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/check-rum-export-path.mjs',
  ...evaluate(summary, (rel) => fs.existsSync(path.join(ROOT, rel)))
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

const label = report.ok ? 'ready' : report.status;
console.log(`rum-export-path: ${label} · samples=${report.totalSamples} · sources=${report.detectedSources.length}`);
if (report.findings.length) report.findings.forEach((finding) => console.log(`  - ${finding}`));
if (CHECK && report.status === 'missing-summary') process.exit(1);
