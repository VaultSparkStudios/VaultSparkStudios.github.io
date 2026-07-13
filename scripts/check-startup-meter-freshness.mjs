#!/usr/bin/env node
/**
 * Guard against a stale STARTUP_BRIEF context-meter box overruling live context.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateFixtures } from './lib/startup-signal-fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BRIEF = path.join(ROOT, 'docs', 'STARTUP_BRIEF.md');
const SELF_TEST = process.argv.includes('--self-test');

// Full context-meter recommendation vocabulary (see scripts/context-meter.mjs).
// WARN_COMPACT_SOON is a burn-rate warning (compaction predicted soon) — mild
// urgency between CONTINUE and CONSIDER_CLOSEOUT; the check previously treated it
// as a missing verdict, so a long closeout that re-rendered the brief went red.
const URGENCY = { CONTINUE: 0, WARN_COMPACT_SOON: 1, CONSIDER_CLOSEOUT: 2, CLOSEOUT: 3 };

export function parseBriefMeter(text) {
  const verdict = String(text).match(/Verdict:\s*(CONTINUE|WARN_COMPACT_SOON|CONSIDER_CLOSEOUT|CLOSEOUT)/)?.[1] || null;
  const confidence = String(text).match(/\b(live|heuristic-stale|[^·\n]*confidence[^·\n]*)\s*$/m)?.[1] || null;
  const tokenLine = String(text).match(/([0-9,]+)\s*\/\s*([0-9,]+)\s*tok/) || null;
  const percentLine = String(text).match(/(\d+)% used/) || null;
  return {
    verdict,
    confidence,
    usedTokens: tokenLine ? Number(tokenLine[1].replaceAll(',', '')) : null,
    limit: tokenLine ? Number(tokenLine[2].replaceAll(',', '')) : null,
    pctUsed: percentLine ? Number(percentLine[1]) : null,
  };
}

export function evaluateStartupMeter(briefText, liveMeter) {
  const brief = parseBriefMeter(briefText);
  const liveVerdict = liveMeter?.recommendation || null;
  const findings = [];
  if (!brief.verdict) findings.push('STARTUP_BRIEF context-meter verdict missing');
  if (!liveVerdict) findings.push('live context-meter recommendation missing');
  if (brief.verdict && liveVerdict && (URGENCY[brief.verdict] ?? 0) > (URGENCY[liveVerdict] ?? 0)) {
    findings.push(`STARTUP_BRIEF says ${brief.verdict} but live meter says ${liveVerdict}`);
  }
  if (brief.limit && liveMeter?.limit && brief.limit < liveMeter.limit * 0.5) {
    findings.push(`STARTUP_BRIEF token limit ${brief.limit} is far below live limit ${liveMeter.limit}`);
  }
  if (brief.pctUsed != null && brief.usedTokens != null && brief.limit) {
    const expectedPct = Math.round((brief.usedTokens / brief.limit) * 100);
    if (Math.abs(brief.pctUsed - expectedPct) > 1) {
      findings.push(`STARTUP_BRIEF context percent ${brief.pctUsed}% disagrees with tokens (${expectedPct}%)`);
    }
  }
  return {
    schemaVersion: '1.0',
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
  const cases = [
    ['stale urgent brief fails against live continue', !evaluateStartupMeter(stale, live).ok],
    ['fresh continue brief passes', evaluateStartupMeter(fresh, live).ok],
    ['bad percent fails against token ratio', !evaluateStartupMeter(badPercent, live).ok],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);

  // [S272][SIL][OBS/P2]: the pressure-only cases above don't prove age/mode/gate agree —
  // run the joint fixture inventory so a renderer change can't silently break one signal
  // while the others still look fine.
  const fixtures = validateFixtures();
  for (const r of fixtures.results) console.log(`  ${r.ok ? 'ok' : 'fail'} [fixture] ${r.name}`);

  if (failed.length || !fixtures.ok) process.exit(1);
  console.log('check-startup-meter-freshness --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  const ledger = evaluateStartupMeter(fs.readFileSync(BRIEF, 'utf8'), liveContextMeter());
  fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.cache', 'startup-meter-freshness.json'), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  if (!ledger.ok) {
    console.error('check-startup-meter-freshness: stale startup context-meter truth');
    ledger.findings.forEach((finding) => console.error(`  - ${finding}`));
    process.exit(1);
  }
  console.log(`check-startup-meter-freshness: ok (${ledger.brief.verdict})`);
}
