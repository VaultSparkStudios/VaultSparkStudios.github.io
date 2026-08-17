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

export function evaluateCiStatus(value, now = Date.now(), maxAgeHours = MAX_AGE_HOURS) {
  const findings = [];
  if (!value || typeof value !== 'object') findings.push('artifact is not a JSON object');
  const generatedAt = value?.generatedAt;
  const ts = Date.parse(generatedAt || '');
  if (!Number.isFinite(ts)) findings.push('generatedAt is missing or invalid');
  const ageHours = Number.isFinite(ts) ? (now - ts) / 3600000 : null;
  if (ageHours !== null && ageHours > maxAgeHours) findings.push(`generatedAt is stale (${ageHours.toFixed(1)}h > ${maxAgeHours}h)`);
  if (typeof value?.allGreen !== 'boolean') findings.push('allGreen must be boolean');
  if (typeof value?.hasDeadCron !== 'boolean') findings.push('hasDeadCron must be boolean');
  if (typeof value?.hasScheduledUnknown !== 'boolean') findings.push('hasScheduledUnknown must be boolean');
  if (typeof value?.hasScheduledStale !== 'boolean') findings.push('hasScheduledStale must be boolean');
  if (!value?.summary || !['string', 'object'].includes(typeof value.summary)) findings.push('summary must be a string or object');
  if (!Array.isArray(value?.workflows)) findings.push('workflows must be an array');
  if (!Array.isArray(value?.scheduledWorkflows)) {
    findings.push('scheduledWorkflows must be an array');
  } else {
    for (const [idx, workflow] of value.scheduledWorkflows.entries()) {
      if (!workflow || typeof workflow !== 'object') {
        findings.push(`scheduledWorkflows[${idx}] must be an object`);
        continue;
      }
      if (!workflow.name || typeof workflow.name !== 'string') findings.push(`scheduledWorkflows[${idx}].name must be a string`);
      if (typeof workflow.dead !== 'boolean') findings.push(`scheduledWorkflows[${idx}].dead must be boolean`);
      if (!['healthy', 'unknown', 'stale', 'dead'].includes(workflow.state)) findings.push(`scheduledWorkflows[${idx}].state must be healthy|unknown|stale|dead`);
      if (workflow.state === 'unknown' && workflow.lastUpdatedAt !== null) findings.push(`scheduledWorkflows[${idx}] unknown must not claim lastUpdatedAt`);
    }
  }
  const unknownCount = Array.isArray(value?.scheduledWorkflows) ? value.scheduledWorkflows.filter((w) => w?.state === 'unknown').length : null;
  const staleCount = Array.isArray(value?.scheduledWorkflows) ? value.scheduledWorkflows.filter((w) => ['stale', 'dead'].includes(w?.state)).length : null;
  if (unknownCount !== null && value?.hasScheduledUnknown !== (unknownCount > 0)) findings.push('hasScheduledUnknown contradicts scheduledWorkflows');
  if (staleCount !== null && value?.hasScheduledStale !== value.scheduledWorkflows.some((w) => w?.state === 'stale')) findings.push('hasScheduledStale contradicts scheduledWorkflows');
  if ((unknownCount > 0 || staleCount > 0) && (value?.allGreen === true || value?.terminalState === 'green')) findings.push('unknown/stale scheduled evidence cannot render green');
  const deadCronCount = Array.isArray(value?.scheduledWorkflows)
    ? value.scheduledWorkflows.filter((w) => w?.dead).length
    : null;
  return {
    ok: findings.length === 0,
    generatedAt: generatedAt || null,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
    maxAgeHours,
    deadCronCount,
    findings,
  };
}

if (SELF_TEST) {
  const now = Date.parse('2026-05-27T12:00:00Z');
  const good = evaluateCiStatus({
    generatedAt: '2026-05-27T10:00:00Z',
    allGreen: true,
    hasDeadCron: false,
    hasScheduledUnknown: false,
    hasScheduledStale: false,
    terminalState: 'green',
    summary: 'Green',
    workflows: [],
    scheduledWorkflows: [{ name: 'daily', dead: false, state: 'healthy', lastUpdatedAt: '2026-05-27T10:00:00Z' }],
  }, now, 24);
  const stale = evaluateCiStatus({
    generatedAt: '2026-05-20T10:00:00Z',
    allGreen: true,
    hasDeadCron: false,
    hasScheduledUnknown: false,
    hasScheduledStale: false,
    terminalState: 'green',
    summary: {},
    workflows: [],
    scheduledWorkflows: [],
  }, now, 24);
  const badShape = evaluateCiStatus({ generatedAt: 'bad', allGreen: 'yes' }, now, 24);
  const badScheduled = evaluateCiStatus({
    generatedAt: '2026-05-27T10:00:00Z',
    allGreen: true,
    hasDeadCron: false,
    hasScheduledUnknown: false,
    hasScheduledStale: false,
    terminalState: 'green',
    summary: 'Green',
    workflows: [],
    scheduledWorkflows: [{ name: 7, dead: 'no', state: 'wat' }],
  }, now, 24);
  const launderingUnknown = evaluateCiStatus({
    generatedAt: '2026-05-27T10:00:00Z', allGreen: true, hasDeadCron: false,
    hasScheduledUnknown: true, hasScheduledStale: false, terminalState: 'green', summary: 'Green', workflows: [],
    scheduledWorkflows: [{ name: 'daily', dead: false, state: 'unknown', lastUpdatedAt: null }],
  }, now, 24);
  const cases = [
    ['fresh artifact passes', good.ok],
    ['stale artifact fails', !stale.ok && stale.findings.some((f) => f.includes('stale'))],
    ['bad shape fails', !badShape.ok && badShape.findings.length >= 5],
    ['bad scheduled workflow shape fails', !badScheduled.ok && badScheduled.findings.some((f) => f.includes('scheduledWorkflows[0].dead'))],
    ['unknown scheduled evidence cannot be laundered green', !launderingUnknown.ok && launderingUnknown.findings.some((f) => f.includes('cannot render green'))],
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
  console.log('------------------------------');
  console.log(`  Generated: ${result.generatedAt || 'missing'}`);
  console.log(`  Age:       ${result.ageHours === null ? 'unknown' : `${result.ageHours}h`} / ${result.maxAgeHours}h`);
  console.log(`  Dead cron: ${result.deadCronCount === null ? 'unknown' : result.deadCronCount}`);
  if (result.ok) {
    console.log('\nok: public CI status artifact is fresh and shaped correctly');
  } else {
    for (const finding of result.findings) console.log(`  fail: ${finding}`);
  }
}

process.exit(result.ok ? 0 : 1);
