#!/usr/bin/env node
/**
 * check-csp-violations.mjs — S228 second-order innovation
 *
 * Advisory CSP violation probe. Calls GET /v/csp-violations-summary (the
 * Worker endpoint added in S228) and reports violation counts + top directives.
 * Always exits 0 — this is observational, never a build blocker.
 *
 * Context: CSP violations land in the RATE_LIMIT KV namespace via POST
 * /v/csp-report (S199). The summary endpoint aggregates the last 3 days.
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

// ── Self-test ────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  // Test response parsing with mock data
  const mock = {
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
  const zero = { total3d: 0, byDay: [], topDirectives: [], ts: '2026-06-26T00:00:00.000Z' };
  ok(zero.total3d === 0, 'zero-violation: total3d = 0');
  ok(zero.byDay.length === 0, 'zero-violation: byDay empty');

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
  const total = data.total3d ?? 0;

  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  if (total === 0) {
    console.log('check-csp-violations: ✓ 0 violations in last 3 days');
  } else {
    const topDir = data.topDirectives?.[0]?.directive ?? 'unknown';
    const topN = data.topDirectives?.[0]?.count ?? 0;
    console.log(`check-csp-violations: ⚠ ${total} violation(s) in 3d · top: ${topDir} (${topN})`);
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
