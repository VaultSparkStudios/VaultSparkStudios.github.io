#!/usr/bin/env node
/** Shared revenue-freshness CLI used by Doctor and startup brief contracts. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateRevenueFreshness,
  resolveRevenueFreshness,
  resolveRevenueFreshnessFromCandidates,
} from './lib/revenue-freshness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const selfTest = args.includes('--self-test');

if (selfTest) {
  const fresh = evaluateRevenueFreshness({ content: 'Generated: 2026-07-21', today: '2026-07-26' });
  const stale = evaluateRevenueFreshness({ content: 'Generated: 2026-07-19', today: '2026-07-26' });
  const critical = evaluateRevenueFreshness({ content: 'Generated: 2026-07-12', today: '2026-07-26' });
  const fallback = resolveRevenueFreshnessFromCandidates([
    { path: 'local', content: '' },
    { path: 'sibling', content: 'Generated: 2026-07-20' },
  ], { today: '2026-07-26' });
  const localWins = resolveRevenueFreshnessFromCandidates([
    { path: 'local', content: 'Generated: 2026-07-21' },
    { path: 'sibling', content: 'Generated: 2026-07-20' },
  ], { today: '2026-07-26' });
  const missing = evaluateRevenueFreshness({ content: '', today: '2026-07-26' });
  const cases = [
    ['fresh threshold is shared', fresh.status === 'fresh' && fresh.ageDays === 5],
    ['seven days is stale', stale.status === 'stale' && stale.ageDays === 7],
    ['fourteen days is critical', critical.status === 'critical' && critical.ageDays === 14],
    ['sibling fallback is selected', fallback.sourcePath === 'sibling' && fallback.ageDays === 6],
    ['local source keeps precedence', localWins.sourcePath === 'local' && localWins.ageDays === 5],
    ['missing evidence is critical, never fresh', !missing.available && missing.critical],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`check-revenue-freshness --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

const result = resolveRevenueFreshness(ROOT);
const publicResult = {
  ...result,
  sourcePath: result.sourcePath ? path.relative(ROOT, result.sourcePath) : null,
};

if (jsonMode) {
  console.log(JSON.stringify(publicResult));
  process.exit(result.stale ? 1 : 0);
}

console.log(`${result.signal}  Revenue signals: ${result.genDate ?? 'unknown'} (${result.ageDays ?? 'unknown'}d old) — ${result.status.toUpperCase()}`);
if (publicResult.sourcePath) console.log(`   Source: ${publicResult.sourcePath}`);
if (result.stale) console.log('   Refresh in studio-ops: node scripts/render-revenue-signals.mjs');
process.exit(result.stale ? 1 : 0);
