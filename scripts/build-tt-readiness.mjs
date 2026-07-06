#!/usr/bin/env node
/**
 * Trusted Types readiness artifact.
 *
 * Separates local unresolved work from long-window live-report soak so AMBER
 * remains actionable without reopening already-fixed sinks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, '.cache', 'tt-active-local-sinks.json');
const OUT = path.join(ROOT, 'api', 'tt-readiness.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

export function buildTtReadiness(manifest) {
  const activeRows = Array.isArray(manifest?.activeLocalRows) ? manifest.activeLocalRows : [];
  const warmRows = Array.isArray(manifest?.warmLocalRows) ? manifest.warmLocalRows : [];
  const activeStillPresent = activeRows.filter((row) => row.stillPresentNearReportedLine === true);
  const newestLastSeen = [...activeRows, ...warmRows]
    .map((row) => row.lastSeen)
    .filter(Boolean)
    .sort()
    .pop() || null;
  const staleRows = Number(manifest?.summary?.staleLocal || 0);
  const status = activeStillPresent.length > 0
    ? 'fix-active-local'
    : (activeRows.length === 0 && warmRows.length === 0 ? 'enforce-candidate' : 'amber-soak');
  const nextAction = activeStillPresent.length > 0
    ? 'Fix still-present active local Trusted Types rows.'
    : status === 'enforce-candidate'
      ? 'Run a fresh live soak and founder-device verification before enforcement.'
      : 'Wait for warm rows to age out or refresh R2 reports before enforcement.';

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-tt-readiness.mjs',
    publicSafe: true,
    status,
    enforceEligible: status === 'enforce-candidate',
    newestLastSeen,
    counts: {
      totalReports: Number(manifest?.totalReports || 0),
      activeLocal: activeRows.length,
      activeStillPresent: activeStillPresent.length,
      warmLocal: warmRows.length,
      staleLocal: staleRows,
    },
    nextAction,
  };
}

function selfTest() {
  const greenish = buildTtReadiness({ totalReports: 0, activeLocalRows: [], warmLocalRows: [], summary: {} });
  const amber = buildTtReadiness({ totalReports: 10, activeLocalRows: [{ lastSeen: '2026-07-03', stillPresentNearReportedLine: false }], warmLocalRows: [{ lastSeen: '2026-07-02' }], summary: {} });
  const active = buildTtReadiness({ totalReports: 1, activeLocalRows: [{ lastSeen: '2026-07-03', stillPresentNearReportedLine: true }], warmLocalRows: [], summary: {} });
  const cases = [
    ['empty manifest is enforce candidate', greenish.enforceEligible],
    ['warm rows are amber soak', amber.status === 'amber-soak'],
    ['still-present active row requires fix', active.status === 'fix-active-local'],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (failed.length) process.exit(1);
  console.log('build-tt-readiness --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('build-tt-readiness --check: api/tt-readiness.json missing; run without --check');
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (parsed.publicSafe !== true || !parsed.counts || !parsed.status) {
    console.error('build-tt-readiness --check: artifact shape drift');
    process.exit(1);
  }
  if (parsed.counts.activeStillPresent > 0) {
    console.error('build-tt-readiness --check: active local TT sinks remain unresolved');
    process.exit(1);
  }
  console.log(`build-tt-readiness --check: ok (${parsed.status})`);
} else {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const payload = buildTtReadiness(manifest);
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`build-tt-readiness: ${payload.status} (active unresolved ${payload.counts.activeStillPresent})`);
}
