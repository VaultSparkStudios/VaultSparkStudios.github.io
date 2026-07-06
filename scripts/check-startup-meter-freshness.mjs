#!/usr/bin/env node
/**
 * Guard against a stale STARTUP_BRIEF context-meter box overruling live context.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BRIEF = path.join(ROOT, 'docs', 'STARTUP_BRIEF.md');
const SELF_TEST = process.argv.includes('--self-test');

const URGENCY = { CONTINUE: 0, CONSIDER_CLOSEOUT: 1, CLOSEOUT: 2 };

export function parseBriefMeter(text) {
  const verdict = String(text).match(/Verdict:\s*(CONTINUE|CONSIDER_CLOSEOUT|CLOSEOUT)/)?.[1] || null;
  const confidence = String(text).match(/\b(live|heuristic-stale|[^·\n]*confidence[^·\n]*)\s*$/m)?.[1] || null;
  const tokenLine = String(text).match(/([0-9,]+)\s*\/\s*([0-9,]+)\s*tok/) || null;
  return {
    verdict,
    confidence,
    usedTokens: tokenLine ? Number(tokenLine[1].replaceAll(',', '')) : null,
    limit: tokenLine ? Number(tokenLine[2].replaceAll(',', '')) : null,
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
    '║     3,000 / 1,000,000 tok  ·  codex/codex-1m  ·  live',
    '║     Verdict: CONTINUE',
  ].join('\n');
  const live = { recommendation: 'CONTINUE', usedTokens: 3000, limit: 1000000, pctUsed: 0.3 };
  const cases = [
    ['stale urgent brief fails against live continue', !evaluateStartupMeter(stale, live).ok],
    ['fresh continue brief passes', evaluateStartupMeter(fresh, live).ok],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (failed.length) process.exit(1);
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
