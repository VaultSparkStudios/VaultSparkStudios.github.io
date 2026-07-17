#!/usr/bin/env node
/**
 * Guard against a stale STARTUP_BRIEF context-meter box overruling live context.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateFixtures } from './lib/startup-signal-fixtures.mjs';
import { selfTestStartupProjection } from './lib/startup-meter-projection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BRIEF = path.join(ROOT, 'docs', 'STARTUP_BRIEF.md');
const SELF_TEST = process.argv.includes('--self-test');

// Full context-meter recommendation vocabulary (see scripts/context-meter.mjs).
// WARN_COMPACT_SOON is a burn-rate warning (compaction predicted soon) — mild
// urgency between CONTINUE and CONSIDER_CLOSEOUT; the check previously treated it
// as a missing verdict, so a long closeout that re-rendered the brief went red.
const URGENCY = { CONTINUE: 0, WARN_COMPACT_SOON: 1, CONSIDER_CLOSEOUT: 2, CLOSEOUT: 3 };

// The brief renders `<used> / <limit> tok · <agent>/<model> · <confidence>`.
// The agent matters: the token LIMIT is a property of who is reading, not of the
// brief, so a limit is only comparable against a live reading from the same agent.
export function parseBriefMeter(text) {
  const verdict = String(text).match(/Verdict:\s*(CONTINUE|WARN_COMPACT_SOON|CONSIDER_CLOSEOUT|CLOSEOUT)/)?.[1] || null;
  const confidence = String(text).match(/\b(live|heuristic-stale|[^·\n]*confidence[^·\n]*)\s*$/m)?.[1] || null;
  const tokenLine = String(text).match(/([0-9,]+)\s*\/\s*([0-9,]+)\s*tok/) || null;
  const percentLine = String(text).match(/(\d+)% used/) || null;
  const agentLine = String(text).match(/tok\s*·\s*([^·\n║]+?)\s*·/) || null;
  const agentToken = agentLine ? agentLine[1].trim() : null;
  return {
    verdict,
    confidence,
    agent: agentToken ? (agentToken.split('/')[0].trim() || null) : null,
    usedTokens: tokenLine ? Number(tokenLine[1].replaceAll(',', '')) : null,
    limit: tokenLine ? Number(tokenLine[2].replaceAll(',', '')) : null,
    pctUsed: percentLine ? Number(percentLine[1]) : null,
  };
}

// An agent is "identified" only when we actually know who it is. `unknown` is the
// absence of a reading, not a reading — context-meter falls back to a 200K default
// whenever it cannot name the agent.
function agentIdentified(agent) {
  return typeof agent === 'string' && agent.length > 0 && agent !== 'unknown';
}

export function evaluateStartupMeter(briefText, liveMeter) {
  const brief = parseBriefMeter(briefText);
  const liveVerdict = liveMeter?.recommendation || null;
  const findings = [];
  const notes = [];
  if (!brief.verdict) findings.push('STARTUP_BRIEF context-meter verdict missing');
  if (!liveVerdict) findings.push('live context-meter recommendation missing');
  if (brief.verdict && liveVerdict && (URGENCY[brief.verdict] ?? 0) > (URGENCY[liveVerdict] ?? 0)) {
    findings.push(`STARTUP_BRIEF says ${brief.verdict} but live meter says ${liveVerdict}`);
  }
  // ── Limit comparison: only valid between the SAME identified agent. ──────────
  // The token limit is derived from the agent (context-meter.mjs
  // contextWindowForAgent), and the agent is read from context/.session-lock.
  // CI has no session lock, so a CI process reports agent=unknown / limit=200000
  // — a placeholder, not a measurement. Comparing a brief rendered by claude-code
  // (1M) against that placeholder is not a staleness signal, it is two different
  // questions; asserting on it produced a local-red/CI-green split in exactly the
  // direction opposite to what the D-S281.8 carry assumed. Same root lesson as
  // D-S281.5: enforce what is reproducible always, compare values only when the
  // inputs are genuinely comparable — and say plainly when they are not.
  const comparableAgents =
    agentIdentified(brief.agent) &&
    agentIdentified(liveMeter?.agent) &&
    brief.agent === liveMeter.agent;
  if (brief.limit && liveMeter?.limit) {
    if (comparableAgents) {
      if (brief.limit < liveMeter.limit * 0.5) {
        findings.push(`STARTUP_BRIEF token limit ${brief.limit} is far below live limit ${liveMeter.limit} (both agent=${brief.agent})`);
      }
    } else {
      notes.push(
        `token-limit comparison skipped — not like-for-like (brief agent=${brief.agent ?? 'none'}, ` +
        `live agent=${liveMeter?.agent ?? 'none'}); limit is an agent property, and an unidentified agent reports a default, not a reading`
      );
    }
  }
  if (brief.pctUsed != null && brief.usedTokens != null && brief.limit) {
    const expectedPct = Math.round((brief.usedTokens / brief.limit) * 100);
    if (Math.abs(brief.pctUsed - expectedPct) > 1) {
      findings.push(`STARTUP_BRIEF context percent ${brief.pctUsed}% disagrees with tokens (${expectedPct}%)`);
    }
  }
  return {
    schemaVersion: '1.1',
    checkedAt: new Date().toISOString(),
    ok: findings.length === 0,
    brief,
    live: {
      recommendation: liveVerdict,
      usedTokens: liveMeter?.usedTokens ?? null,
      limit: liveMeter?.limit ?? null,
      pctUsed: liveMeter?.pctUsed ?? null,
      agent: liveMeter?.agent ?? null,
      model: liveMeter?.model ?? null,
    },
    limitComparable: comparableAgents,
    notes,
    findings,
  };
}

function liveContextMeter() {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'context-meter.mjs'), '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`context-meter failed with exit ${result.status}`);
  return JSON.parse(result.stdout);
}

function selfTest() {
  const stale = [
    '╔══ CONTEXT METER ═╗',
    '║     439,070 / 200,000 tok  ·  unknown  ·  heuristic-stale',
    '║     Verdict: CONSIDER_CLOSEOUT  ← act now',
  ].join('\n');
  const fresh = [
    '╔══ CONTEXT METER ═╗',
    '║  ✓  ░░░░░░░░░░░░░░░░░░░░░░░░    0% used',
    '║     3,000 / 1,000,000 tok  ·  codex/codex-1m  ·  live',
    '║     Verdict: CONTINUE',
  ].join('\n');
  const badPercent = [
    '╔══ CONTEXT METER ═╗',
    '║  ✓  ████████████░░░░░░░░░░░░   50% used',
    '║     3,000 / 1,000,000 tok  ·  codex/codex-1m  ·  live',
    '║     Verdict: CONTINUE',
  ].join('\n');
  const live = { recommendation: 'CONTINUE', usedTokens: 3000, limit: 1000000, pctUsed: 0.3 };
  // The real S282 shape: a brief rendered when the lock was already gone
  // (agent unknown → default 200K) read by a live agent that DOES know itself.
  const unknownAgentBrief = [
    '╔══ CONTEXT METER ═╗',
    '║  ✓  ██████░░░░░░░░░░░░░░░░░░   24% used',
    '║     47,082 / 200,000 tok  ·  unknown/default  ·  heuristic',
    '║     Verdict: CONTINUE',
  ].join('\n');
  const liveClaude = { recommendation: 'CONTINUE', usedTokens: 51494, limit: 1000000, pctUsed: 5, agent: 'claude-code' };
  const liveCI = { recommendation: 'CONTINUE', usedTokens: 2782, limit: 200000, pctUsed: 1, agent: 'unknown' };
  const claudeBrief = [
    '╔══ CONTEXT METER ═╗',
    '║  ✓  ░░░░░░░░░░░░░░░░░░░░░░░░    0% used',
    '║     3,000 / 1,000,000 tok  ·  claude-code/opus-4-8-1m  ·  live',
    '║     Verdict: CONTINUE',
  ].join('\n');
  const smallLimitSameAgent = [
    '╔══ CONTEXT METER ═╗',
    '║  ✓  ██░░░░░░░░░░░░░░░░░░░░░░    2% used',
    '║     4,000 / 200,000 tok  ·  claude-code/sonnet  ·  live',
    '║     Verdict: CONTINUE',
  ].join('\n');

  const cases = [
    ['stale urgent brief fails against live continue', !evaluateStartupMeter(stale, live).ok],
    ['fresh continue brief passes', evaluateStartupMeter(fresh, live).ok],
    ['bad percent fails against token ratio', !evaluateStartupMeter(badPercent, live).ok],
    // ── S282: the limit is an agent property, so compare like-for-like only ──
    ['real S282 shape: unknown-agent brief vs claude-code live → limit not comparable, passes',
      evaluateStartupMeter(unknownAgentBrief, liveClaude).ok &&
      evaluateStartupMeter(unknownAgentBrief, liveClaude).limitComparable === false],
    ['skip is surfaced, never silent', evaluateStartupMeter(unknownAgentBrief, liveClaude).notes.some((n) => n.includes('not like-for-like'))],
    ['CI shape: unknown-agent brief vs unknown-agent live (no lock) → passes',
      evaluateStartupMeter(unknownAgentBrief, liveCI).ok],
    ['claude brief vs CI unknown live → limit not comparable, passes',
      evaluateStartupMeter(claudeBrief, liveCI).ok &&
      evaluateStartupMeter(claudeBrief, liveCI).limitComparable === false],
    // ...and the gate must NOT become a rubber stamp: same agent, real shortfall → fail.
    ['same agent + brief limit far below live → still hard-fails',
      !evaluateStartupMeter(smallLimitSameAgent, liveClaude).ok &&
      evaluateStartupMeter(smallLimitSameAgent, liveClaude).findings.some((f) => f.includes('far below live limit'))],
    ['urgency check still applies regardless of agent comparability',
      !evaluateStartupMeter(stale, liveClaude).ok],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);

  // [S272][SIL][OBS/P2]: the pressure-only cases above don't prove age/mode/gate agree —
  // run the joint fixture inventory so a renderer change can't silently break one signal
  // while the others still look fine.
  const fixtures = validateFixtures();
  for (const r of fixtures.results) console.log(`  ${r.ok ? 'ok' : 'fail'} [fixture] ${r.name}`);
  const projectionCases = selfTestStartupProjection();
  for (const [name, ok] of projectionCases) console.log(`  ${ok ? 'ok' : 'fail'} [projection] ${name}`);
  failed.push(...projectionCases.filter(([, ok]) => !ok));

  if (failed.length || !fixtures.ok) process.exit(1);
  console.log('check-startup-meter-freshness --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  const ledger = evaluateStartupMeter(fs.readFileSync(BRIEF, 'utf8'), liveContextMeter());
  fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.cache', 'startup-meter-freshness.json'), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  // A skipped comparison must be visible — an unchecked invariant that looks
  // checked is the failure mode this gate exists to prevent.
  (ledger.notes || []).forEach((note) => console.log(`  ⚠ ${note}`));
  if (!ledger.ok) {
    console.error('check-startup-meter-freshness: stale startup context-meter truth');
    ledger.findings.forEach((finding) => console.error(`  - ${finding}`));
    process.exit(1);
  }
  console.log(`check-startup-meter-freshness: ok (${ledger.brief.verdict}${ledger.limitComparable ? '' : ' · limit not compared'})`);
}
