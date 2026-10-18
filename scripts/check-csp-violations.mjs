#!/usr/bin/env node
// @verification-scope live-monitor — reads the production CSP report summary.
/**
 * check-csp-violations.mjs — S228 second-order innovation
 *
 * Advisory CSP violation probe. Calls GET /v/csp-violations-summary (the
 * Worker endpoint added in S228) and reports violation counts + top directives.
 * Always exits 0 — this is observational, never a build blocker.
 *
 * Context: CSP reports use bounded private diagnostic storage. The summary
 * includes legacy KV evidence over three UTC dates. Counts are retained reports,
 * not a census of all violations; unavailable evidence must never read as zero.
 * This script surfaces that data so the doctor / operator can act on spikes.
 *
 * Modes:
 *   (default)    print summary to stdout, exit 0
 *   --json       machine-readable JSON
 *   --self-test  exercise aggregation logic, exit 0/1
 *
 * Exit 0 always (advisory probe).
 */
import { fileURLToPath } from 'node:url';

const PROD_URL = 'https://vaultsparkstudios.com/v/csp-violations-summary';
const args = process.argv.slice(2);
const selfTest = args.includes('--self-test');
const asJson = args.includes('--json');

export function retainedReportCount(data) {
  if (!data || data.state !== 'complete' || data.error || data.complete === false ||
      !Number.isSafeInteger(data.total3d) || data.total3d < 0 ||
      !Array.isArray(data.byDay) || !Array.isArray(data.topDirectives)) return null;
  if (data.byDay.some(day => !day || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      !Number.isSafeInteger(day.count) || day.count < 0)) return null;
  if (data.byDay.reduce((n, day) => n + day.count, 0) !== data.total3d) return null;
  return data.total3d;
}

// ── Self-test ────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  // Test response parsing with mock data
  const mock = {
    state: 'complete',
    total3d: 15,
    byDay: [{ date: '2026-06-26', count: 10 }, { date: '2026-06-25', count: 5 }],
    topDirectives: [{ directive: 'script-src', count: 8 }, { directive: 'img-src', count: 7 }],
    ts: '2026-06-26T00:00:00.000Z',
  };

  ok(typeof mock.total3d === 'number', 'total3d is a number');
  ok(Array.isArray(mock.byDay), 'byDay is an array');
  ok(Array.isArray(mock.topDirectives), 'topDirectives is an array');
  ok(mock.byDay[0].date.length === 10, 'date is YYYY-MM-DD');
  ok(mock.topDirectives[0].directive.length > 0, 'directive is non-empty');
  ok(mock.byDay.reduce((s, d) => s + d.count, 0) === mock.total3d, 'byDay counts sum to total3d');

  // Test zero-violation case
  const zero = { state: 'complete', total3d: 0, byDay: [], topDirectives: [], ts: '2026-06-26T00:00:00.000Z' };
  ok(zero.total3d === 0, 'zero-violation: total3d = 0');
  ok(zero.byDay.length === 0, 'zero-violation: byDay empty');
  ok(retainedReportCount(mock) === 15, 'valid retained counts are readable');
  ok(retainedReportCount(zero) === 0, 'complete stored zero is readable');
  ok(retainedReportCount({ ...zero, total3d: null }) === null, 'unknown is never zero');
  ok(retainedReportCount({ ...zero, complete: false }) === null, 'incomplete is never zero');
  ok(retainedReportCount({ ...zero, error: 'storage-unavailable' }) === null, 'storage failure is never zero');
  ok(retainedReportCount({ ...mock, total3d: 0 }) === null, 'contradictory day totals are unknown');
  ok(retainedReportCount({}) === null, 'missing evidence is unknown');
  ok(retainedReportCount({ ...zero, state: 'unavailable' }) === null, 'unavailable state is unknown despite numeric zero');
  ok(retainedReportCount({ ...zero, state: undefined }) === null, 'legacy counter without completeness is unknown');

  console.log(`check-csp-violations --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Live probe ───────────────────────────────────────────────────────────────
try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(PROD_URL, {
    signal: controller.signal,
    headers: { Accept: 'application/json', 'User-Agent': 'vs-csp-probe/1.0' },
  });
  clearTimeout(timeout);

  if (!res.ok) {
    console.log(`check-csp-violations: endpoint returned ${res.status} — advisory skip`);
    process.exit(0);
  }

  const data = await res.json();
  const total = retainedReportCount(data);

  if (asJson) {
    console.log(JSON.stringify(total === null ? { ...data, evidenceState: 'unavailable' } : data, null, 2));
    process.exit(0);
  }

  if (total === null) {
    console.log('check-csp-violations: diagnostic evidence unavailable — no clean result claimed');
    process.exit(0);
  }

  if (total === 0) {
    console.log('check-csp-violations: 0 retained reports across three UTC dates; bounded collection does not prove absence of violations');
  } else {
    const topDir = data.topDirectives?.[0]?.directive ?? 'unknown';
    const topN = data.topDirectives?.[0]?.count ?? 0;
    console.log(`check-csp-violations: ⚠ ${total} retained report(s) across three UTC dates · top: ${topDir} (${topN}); bounded collection`);
    for (const day of data.byDay ?? []) {
      console.log(`  ${day.date}: ${day.count} violation(s)`);
    }
    if (data.topDirectives?.length > 1) {
      for (const d of data.topDirectives.slice(1)) {
        console.log(`    directive ${d.directive}: ${d.count}`);
      }
    }
  }
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('check-csp-violations: timeout reaching endpoint — advisory skip');
  } else {
    console.log(`check-csp-violations: unreachable (${err.message}) — advisory skip`);
  }
}

process.exit(0);
