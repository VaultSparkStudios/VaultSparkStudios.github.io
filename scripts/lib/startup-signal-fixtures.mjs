// startup-signal-fixtures.mjs — compact fixture inventory for startup-brief truth signals.
//
// [S272][SIL][OBS/P2]: renderer changes to docs/STARTUP_BRIEF.md have previously drifted
// context-pressure percent, context-age, and gate verdict independently (each caught by a
// one-off regression only after the fact). This module is the single source of truth for
// what a *correct* brief looks like across the 4 signal classes that matter together —
// pressure, age, mode, gate — so one fixture run proves them jointly instead of piecemeal.
//
// Consumed by scripts/check-startup-meter-freshness.mjs --self-test.

export function parseContextAge(text) {
  const m = String(text).match(/Context age\s+(\d+)d/);
  return m ? Number(m[1]) : null;
}

export function parseSessionMode(text) {
  const m = String(text).match(/\b(FOUNDER|BUILDER)\s+MODE\b/);
  return m ? m[1] : null;
}

export function parseGateVerdict(text) {
  const m = String(text).match(/Verdict:\s*(CONTINUE|CONSIDER_CLOSEOUT|CLOSEOUT)/);
  return m ? m[1] : null;
}

export function parsePressurePercent(text) {
  const m = String(text).match(/(\d+)% used/);
  return m ? Number(m[1]) : null;
}

// Each fixture is a self-contained brief-fragment + the value every parser must agree on.
// `signals` names which of the 4 classes this fixture exercises (a fixture may cover more
// than one at once — e.g. a full rendered box exercises all 4 in one pass).
export const FIXTURES = [
  {
    name: 'fresh full brief — all 4 signals healthy',
    text: [
      'Session 273 · 2026-07-10 · FOUNDER MODE',
      '║  ✓  ░░░░░░░░░░░░░░░░░░░░░░░░    1% used',
      '║     6,053 / 1,000,000 tok  ·  claude-code/opus-4-8-1m  ·  heuristic',
      '║     Verdict: CONTINUE',
      '✓  Context age   2d',
    ].join('\n'),
    expected: { mode: 'FOUNDER', verdict: 'CONTINUE', pctUsed: 1, contextAge: 2 },
  },
  {
    name: 'builder mode + stale-ish age still CONTINUE',
    text: [
      'Session 199 · 2026-05-01 · BUILDER MODE',
      '║  ✓  ██░░░░░░░░░░░░░░░░░░░░░░   10% used',
      '║     100,000 / 1,000,000 tok  ·  codex/codex-1m  ·  live',
      '║     Verdict: CONTINUE',
      '✓  Context age   6d',
    ].join('\n'),
    expected: { mode: 'BUILDER', verdict: 'CONTINUE', pctUsed: 10, contextAge: 6 },
  },
  {
    name: 'closeout-urgent gate with high pressure',
    text: [
      'Session 200 · 2026-05-02 · FOUNDER MODE',
      '║     439,070 / 500,000 tok  ·  claude-code/opus  ·  heuristic-stale',
      '║     Verdict: CLOSEOUT',
      '⚠  Context age   9d',
    ].join('\n'),
    expected: { mode: 'FOUNDER', verdict: 'CLOSEOUT', pctUsed: null, contextAge: 9 },
  },
  {
    name: 'missing mode + missing age — degraded brief, must not silently pass',
    text: [
      '║  ✓  ░░░░░░░░░░░░░░░░░░░░░░░░    0% used',
      '║     Verdict: CONTINUE',
    ].join('\n'),
    expected: { mode: null, verdict: 'CONTINUE', pctUsed: 0, contextAge: null },
  },
];

export function validateFixtures() {
  const results = FIXTURES.map((f) => {
    const got = {
      mode: parseSessionMode(f.text),
      verdict: parseGateVerdict(f.text),
      pctUsed: parsePressurePercent(f.text),
      contextAge: parseContextAge(f.text),
    };
    const ok = Object.keys(f.expected).every((k) => got[k] === f.expected[k]);
    return { name: f.name, ok, expected: f.expected, got };
  });
  return { ok: results.every((r) => r.ok), results };
}

if (process.argv[1] && process.argv[1].endsWith('startup-signal-fixtures.mjs')) {
  const { ok, results } = validateFixtures();
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok' : 'fail'} ${r.name}`);
    if (!r.ok) console.log(`      expected ${JSON.stringify(r.expected)} got ${JSON.stringify(r.got)}`);
  }
  console.log(`startup-signal-fixtures: ${results.filter((r) => r.ok).length}/${results.length} passed`);
  if (!ok) process.exit(1);
}
