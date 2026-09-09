#!/usr/bin/env node
// Dependency waves preserve concurrency without racing a feed's consumers
// against its producer. Importing this module never starts a build.
import { spawn } from './lib/safe-spawn.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GENERATORS = [
  { script: 'build-og-cards.mjs' },
  { script: 'build-changelog-narrative.mjs', after: ['build-commit-map.mjs'] },
  { script: 'build-entity-graph.mjs' },
  // Both rewrite human-page heads. Avoid an OG read/render/write overwriting
  // the canonical cross-link added while image rendering was awaiting.
  { script: 'build-ai-canonical-pages.mjs', after: ['build-og-cards.mjs'] },
  { script: 'build-ignis-roi.mjs' },
  { script: 'build-commit-map.mjs' },
  { script: 'build-forge-feed.mjs', after: ['build-commit-map.mjs'] },
  { script: 'build-feedback-provenance.mjs', after: ['build-commit-map.mjs'] },
  { script: 'build-ship-receipts.mjs', after: ['build-commit-map.mjs', 'build-feedback-provenance.mjs'] },
  { script: 'build-field-win-proof.mjs' },
  { script: 'build-oracle-query-insights.mjs' },
  { script: 'build-constellation-activity.mjs' },
  { script: 'build-ark-signature-dossier.mjs' },
];

export function dependencyWaves(generators) {
  const known = new Set(generators.map(item => item.script));
  if (known.size !== generators.length) throw new Error('duplicate generator');
  for (const item of generators) for (const source of item.after || []) {
    if (!known.has(source)) throw new Error(item.script + ': unknown prerequisite ' + source);
  }
  const remaining = [...generators], completed = new Set(), waves = [];
  while (remaining.length) {
    const ready = remaining.filter(item => (item.after || []).every(source => completed.has(source)));
    if (!ready.length) throw new Error('generator dependency cycle: ' + remaining.map(item => item.script).join(', '));
    waves.push(ready);
    for (const item of ready) { completed.add(item.script); remaining.splice(remaining.indexOf(item), 1); }
  }
  return waves;
}

export async function runPlan(generators, execute) {
  const outcomes = new Map();
  for (const wave of dependencyWaves(generators)) {
    const runnable = wave.filter(item => {
      const blockedBy = (item.after || []).filter(source => outcomes.get(source)?.status !== 'fulfilled');
      if (!blockedBy.length) return true;
      outcomes.set(item.script, { script: item.script, status: 'blocked', reason: 'prerequisite failed: ' + blockedBy.join(', ') });
      return false;
    });
    const results = await Promise.allSettled(runnable.map(item => Promise.resolve().then(() => execute(item.script))));
    for (const [index, result] of results.entries()) outcomes.set(runnable[index].script, { script: runnable[index].script, ...result });
  }
  return [...outcomes.values()];
}

function runGenerator(script) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const proc = spawn(process.execPath, [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'pipe' });
    let out = '', err = '';
    proc.stdout.on('data', chunk => { out += chunk; });
    proc.stderr.on('data', chunk => { err += chunk; });
    proc.on('close', code => {
      if (out.trim()) process.stdout.write(out);
      if (err.trim()) process.stderr.write(err);
      if (code !== 0) reject(new Error(script + ' exited ' + code));
      else resolve({ elapsed: Date.now() - start });
    });
    proc.on('error', reject);
  });
}

async function selfTest() {
  const assert = (await import('node:assert/strict')).default;
  const waves = dependencyWaves(GENERATORS).map(wave => wave.map(item => item.script));
  assert.equal(waves.length, 3);
  assert(waves[0].includes('build-commit-map.mjs'));
  assert(waves[1].includes('build-feedback-provenance.mjs'));
  assert(waves[1].includes('build-ai-canonical-pages.mjs'));
  assert(waves[0].includes('build-og-cards.mjs'));
  assert(waves[2].includes('build-ship-receipts.mjs'));
  const fixture = [{ script: 'source' }, { script: 'unrelated' }, { script: 'consumer', after: ['source'] }, { script: 'final', after: ['consumer'] }];
  let releaseSource;
  const sourcePending = new Promise(resolve => { releaseSource = resolve; });
  const started = [], done = new Set();
  const running = runPlan(fixture, async script => {
    started.push(script);
    if (script === 'source') await sourcePending;
    if (script === 'consumer') assert(done.has('source'));
    if (script === 'final') assert(done.has('consumer'));
    done.add(script);
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(started, ['source', 'unrelated']);
  releaseSource();
  const success = await running;
  assert(success.every(result => result.status === 'fulfilled'));
  const attempted = [];
  const failed = await runPlan(fixture, async script => { attempted.push(script); if (script === 'source') throw new Error('fixture failure'); });
  assert.deepEqual(attempted, ['source', 'unrelated']);
  assert.equal(failed.filter(result => result.status === 'blocked').length, 2);
  assert.throws(() => dependencyWaves([{ script: 'a', after: ['missing'] }]), /unknown/);
  assert.throws(() => dependencyWaves([{ script: 'a', after: ['b'] }, { script: 'b', after: ['a'] }]), /cycle/);
  assert.throws(() => dependencyWaves([{ script: 'a' }, { script: 'a' }]), /duplicate/);
  console.log('build-parallel-phase self-test: dependency waves, delayed producer, independent concurrency, failure propagation, unknown/cycle/duplicate checks passed');
}

async function main() {
  const start = Date.now();
  const results = await runPlan(GENERATORS, runGenerator);
  const failed = results.filter(result => result.status !== 'fulfilled');
  for (const result of failed) console.error('✗ ' + result.script + ': ' + (result.reason?.message || result.reason));
  const elapsed = Date.now() - start;
  const serial = results.reduce((sum, result) => sum + (result.value?.elapsed || 0), 0);
  console.log('build-parallel-phase: ' + GENERATORS.length + ' generators · ' + dependencyWaves(GENERATORS).length + ' dependency waves · ' + (elapsed / 1000).toFixed(1) + 's wall-clock' + (serial > elapsed ? ' (measured child-time sum ' + (serial / 1000).toFixed(1) + 's)' : ''));
  if (failed.length) process.exitCode = 1;
}
const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  if (process.argv.includes('--self-test')) await selfTest();
  else await main();
}
