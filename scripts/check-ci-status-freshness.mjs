#!/usr/bin/env node
/**
 * Validate the public CI status contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const JSON_MODE = args.includes('--json');
const maxArg = args.find((a) => a.startsWith('--max-age-hours='));
const MAX_AGE_HOURS = Math.max(1, Number(maxArg ? maxArg.split('=')[1] : 72) || 72);
const TARGET = path.join(ROOT, 'api', 'ci-status.json');

function evaluateCiStatus(value, now = Date.now(), maxAgeHours = MAX_AGE_HOURS) {
  const findings = [];
  if (!value || typeof value !== 'object') findings.push('artifact is not a JSON object');
  const generatedAt = value?.generatedAt;
  const ts = Date.parse(generatedAt || '');
  if (!Number.isFinite(ts)) findings.push('generatedAt is missing or invalid');
  const ageHours = Number.isFinite(ts) ? (now - ts) / 3600000 : null;
  if (ageHours !== null && ageHours > maxAgeHours) findings.push(`generatedAt is stale (${ageHours.toFixed(1)}h > ${maxAgeHours}h)`);
  if (typeof value?.allGreen !== 'boolean') findings.push('allGreen must be boolean');
  if (!value?.summary || !['string', 'object'].includes(typeof value.summary)) findings.push('summary must be a string or object');
  if (!Array.isArray(value?.workflows)) findings.push('workflows must be an array');
  return {
    ok: findings.length === 0,
    generatedAt: generatedAt || null,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
    maxAgeHours,
    findings,
  };
}

if (SELF_TEST) {
  const now = Date.parse('2026-05-27T12:00:00Z');
  const good = evaluateCiStatus({ generatedAt: '2026-05-27T10:00:00Z', allGreen: true, summary: 'Green', workflows: [] }, now, 24);
  const stale = evaluateCiStatus({ generatedAt: '2026-05-20T10:00:00Z', allGreen: true, summary: {}, workflows: [] }, now, 24);
  const badShape = evaluateCiStatus({ generatedAt: 'bad', allGreen: 'yes' }, now, 24);
  const cases = [
    ['fresh artifact passes', good.ok],
    ['stale artifact fails', !stale.ok && stale.findings.some((f) => f.includes('stale'))],
    ['bad shape fails', !badShape.ok && badShape.findings.length >= 3],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

let parsed = null;
try {
  parsed = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
} catch {
  parsed = null;
}
const result = evaluateCiStatus(parsed);

if (JSON_MODE) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('ci-status-freshness');
  console.log('──────────────────────────────────────────────');
  console.log(`  Generated: ${result.generatedAt || 'missing'}`);
  console.log(`  Age:       ${result.ageHours === null ? 'unknown' : `${result.ageHours}h`} / ${result.maxAgeHours}h`);
  if (result.ok) {
    console.log('\nok: public CI status artifact is fresh and shaped correctly');
  } else {
    for (const finding of result.findings) console.log(`  fail: ${finding}`);
  }
}

process.exit(result.ok ? 0 : 1);
