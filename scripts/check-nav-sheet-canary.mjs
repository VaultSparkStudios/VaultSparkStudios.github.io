#!/usr/bin/env node
// @verification-scope publisher — derives a canary verdict from gitignored field exports.
/**
 * check-nav-sheet-canary.mjs (S174 audit #5 · nav-sheet-canary-readout)
 *
 * The S167 5% mobile nav-sheet canary has run unobserved — a canary nobody
 * reads is just risk with extra steps. This script turns the collected
 * telemetry into an explicit verdict:
 *
 *   graduate-ready    — ≥minOpens opens AND healthy close-rate mix
 *   hold              — some signal, below decision floor
 *   telemetry-silent  — zero ux events across the raw RUM window; silence is
 *                       its own finding (verified S174: beacon intake works,
 *                       allowlist matches, raw exports simply contain 0 events)
 *
 * Output: data/nav-sheet-verdict.json (+ stdout summary).
 * Usage:  node scripts/check-nav-sheet-canary.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'nav-sheet-verdict.json');
const RAW_DIR = path.join(ROOT, '.cache', 'rum-raw');
const STATS = path.join(ROOT, 'api', 'nav-sheet-stats.json');

export function judge({ opens, rawFiles, minOpens, backdropCloseRate }) {
  if (rawFiles > 0 && opens === 0) {
    return {
      verdict: 'telemetry-silent',
      reason: `0 ux events across ${rawFiles} raw RUM export file(s) — canary percent may be too low for current mobile traffic`,
      recommendation: 'Raise canary to 25% (still flag-gated) OR accept the sheet stays parked; founder device verify remains the graduation gate either way.',
    };
  }
  if (opens >= minOpens) {
    const healthy = backdropCloseRate < 0.6;
    return {
      verdict: healthy ? 'graduate-ready' : 'hold',
      reason: healthy
        ? `${opens} opens with acceptable backdrop-close rate (${Math.round(backdropCloseRate * 100)}%)`
        : `${opens} opens but ${Math.round(backdropCloseRate * 100)}% backdrop-closes — users may be opening it by accident`,
      recommendation: healthy
        ? 'Founder real-device verify, then default-swap per the flag-gate pattern.'
        : 'Inspect open-trigger placement before any default swap.',
    };
  }
  return {
    verdict: 'hold',
    reason: `${opens}/${minOpens} opens — below decision floor`,
    recommendation: 'Keep accruing; rum-autopull-ci refreshes this nightly.',
  };
}

if (process.argv.includes('--self-test')) {
  const checks = [
    ['silent when 0 events', judge({ opens: 0, rawFiles: 100, minOpens: 50, backdropCloseRate: 0 }).verdict === 'telemetry-silent'],
    ['graduate at floor + healthy', judge({ opens: 50, rawFiles: 100, minOpens: 50, backdropCloseRate: 0.2 }).verdict === 'graduate-ready'],
    ['hold on accident pattern', judge({ opens: 80, rawFiles: 100, minOpens: 50, backdropCloseRate: 0.8 }).verdict === 'hold'],
    ['hold below floor', judge({ opens: 10, rawFiles: 100, minOpens: 50, backdropCloseRate: 0 }).verdict === 'hold'],
  ];
  let pass = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`check-nav-sheet-canary --self-test: ${pass}/${checks.length}`);
  process.exit(pass === checks.length ? 0 : 1);
}

// Count ux events straight from the raw export (build-nav-sheet-stats reads a
// different export path; the raw dir is what rum:pull actually populates).
let rawFiles = 0;
let opens = 0, closes = 0, backdrop = 0, drag = 0;
if (fs.existsSync(RAW_DIR)) {
  for (const day of fs.readdirSync(RAW_DIR)) {
    const dir = path.join(RAW_DIR, day);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      rawFiles++;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const r of Array.isArray(j) ? j : [j]) {
          if (r.ux === 'nav-sheet:open') opens++;
          else if (r.ux === 'nav-sheet:close') closes++;
          else if (r.ux === 'nav-sheet:backdrop-close') backdrop++;
          else if (r.ux === 'nav-sheet:drag-close') drag++;
        }
      } catch { /* skip malformed */ }
    }
  }
}

let minOpens = 50;
try { minOpens = JSON.parse(fs.readFileSync(STATS, 'utf8')).readiness?.minOpens ?? 50; } catch {}
const totalCloses = closes + backdrop + drag;
const backdropCloseRate = totalCloses ? backdrop / totalCloses : 0;

const result = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/check-nav-sheet-canary.mjs',
  window: { rawFiles },
  counts: { opens, closes, backdropCloses: backdrop, dragCloses: drag },
  ...judge({ opens, rawFiles, minOpens, backdropCloseRate }),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
console.log(`check-nav-sheet-canary: ${result.verdict.toUpperCase()} — ${result.reason}`);
console.log(`  → ${path.relative(ROOT, OUT)}`);
