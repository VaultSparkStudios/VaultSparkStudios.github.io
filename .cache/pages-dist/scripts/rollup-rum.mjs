#!/usr/bin/env node
/**
 * Roll exported real-user vitals samples into data/rum-history.ndjson.
 *
 * Input is newline-delimited JSON or one JSON object per file from an R2 export.
 * Default input: .cache/rum-raw
 *
 * Usage:
 *   node scripts/rollup-rum.mjs --input .cache/rum-raw
 *   node scripts/rollup-rum.mjs --check
 *   node scripts/rollup-rum.mjs --self-test
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const check = args.includes('--check');
const selfTest = args.includes('--self-test');
const inputArg = args.find((a) => a === '--input');
const inputDir = inputArg ? args[args.indexOf(inputArg) + 1] : '.cache/rum-raw';
const OUT = path.join(ROOT, 'data', 'rum-history.ndjson');

if (selfTest) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-rum-'));
  fs.writeFileSync(path.join(dir, 'a.ndjson'), [
    JSON.stringify(sample('/', '2026-05-22T01:00:00.000Z', { lcp: 2000, fcp: 900, cls: 0.02, inp: 70, ttfb: 120 })),
    JSON.stringify(sample('/', '2026-05-22T02:00:00.000Z', { lcp: 2500, fcp: 1000, cls: 0.03, inp: 90, ttfb: 130 })),
    JSON.stringify(sample('/membership/', '2026-05-22T03:00:00.000Z', { lcp: 3200, fcp: 1200, cls: 0.12, inp: 180, ttfb: 180 })),
  ].join('\n'));
  const rows = rollup(loadSamples(dir));
  assert(rows.length === 2, 'expected two route rollups');
  assert(rows.find((r) => r.route === '/')?.lcpP75 === 2500, 'expected / p75 LCP');
  assert(rows.find((r) => r.route === '/membership/')?.clsP75 === 0.12, 'expected membership CLS');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('rollup-rum --self-test: OK');
  process.exit(0);
}

const source = path.resolve(ROOT, inputDir);
const samples = fs.existsSync(source) ? loadSamples(source) : [];
const rows = rollup(samples);

if (!check && rows.length) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

console.log(`rollup-rum: ${samples.length} sample(s) → ${rows.length} route-day row(s)${check ? ' (check)' : ''}`);

function sample(route, ts, vitals) {
  return { schemaVersion: '1.0', route, ts, vitals, context: { connection: '4g', saveData: false, viewport: '390x844', theme: 'default' } };
}

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function loadSamples(dir) {
  const files = fs.readdirSync(dir, { recursive: true })
    .map((name) => path.join(dir, name))
    .filter((file) => fs.statSync(file).isFile() && /\.(json|ndjson)$/i.test(file));
  const samples = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const chunk of text.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(chunk);
        if (parsed && parsed.route && parsed.vitals) samples.push(parsed);
      } catch {}
    }
  }
  return samples;
}

function percentile(values, p) {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  return nums[Math.min(nums.length - 1, Math.ceil((p / 100) * nums.length) - 1)];
}

function rollup(samples) {
  const buckets = new Map();
  for (const s of samples) {
    const ts = new Date(s.ts);
    if (Number.isNaN(ts.getTime())) continue;
    const day = ts.toISOString().slice(0, 10);
    const route = String(s.route || '/').split('?')[0].slice(0, 120);
    const key = `${day}|${route}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => {
    const [day, route] = key.split('|');
    const metric = (name) => list.map((s) => s.vitals?.[name]);
    return {
      schemaVersion: '1.0',
      day,
      route,
      samples: list.length,
      lcpP75: percentile(metric('lcp'), 75),
      fcpP75: percentile(metric('fcp'), 75),
      clsP75: percentile(metric('cls'), 75),
      inpP75: percentile(metric('inp'), 75),
      ttfbP75: percentile(metric('ttfb'), 75),
      saveDataPct: +(list.filter((s) => s.context?.saveData).length / list.length).toFixed(3),
    };
  });
}
