#!/usr/bin/env node
/** Combined verdict for every unattended hard-failure resilience class. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runResilienceChecks, selfTestResilienceGate } from './lib/resilience-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF_TEST = process.argv.includes('--self-test');

if (SELF_TEST) {
  const cases = selfTestResilienceGate();
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (!cases.every(([, ok]) => ok)) process.exit(1);
}

const result = runResilienceChecks(ROOT, SELF_TEST ? '--self-test' : '--check');
for (const item of result.results) {
  const detail = item.output.split('\n').slice(-1)[0] || item.promise;
  console.log(`  ${item.status === 0 ? 'ok' : 'fail'} ${item.id}: ${detail}`);
}
if (!result.ok) {
  console.error(`check-hardfail-resilience: BLOCKED (${result.failed.map((item) => item.id).join(', ')})`);
  process.exit(1);
}
console.log(`check-hardfail-resilience: ok (${result.count} failure classes)`);