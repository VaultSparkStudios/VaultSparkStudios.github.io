#!/usr/bin/env node
/**
 * Fast generated-output drift preflight.
 *
 * This intentionally runs the checks that most often catch stale generated
 * public artifacts before the full build gate spends minutes on unrelated work.
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const SELF_TEST = args.includes('--self-test');

const CHECKS = [
  { id: 'public-intelligence', command: ['node', 'scripts/generate-public-intelligence.mjs', '--check'], fix: 'node scripts/generate-public-intelligence.mjs' },
  { id: 'heartbeat', command: ['node', 'scripts/generate-heartbeat.mjs', '--check'], fix: 'node scripts/generate-heartbeat.mjs' },
  // autofix: presence mirrors LIVE session-lock state — its "drift" is time
  // passing (live flips as locks age past MAX_AGE_MIN mid-gate), never an
  // authoring error. Self-heal instead of failing long sessions (S176).
  { id: 'founder-presence', command: ['node', 'scripts/generate-founder-presence.mjs', '--check'], fix: 'node scripts/generate-founder-presence.mjs', autofix: true },
  { id: 'rum-summary', command: ['node', 'scripts/pull-rum-summary.mjs', '--check'], fix: 'node scripts/pull-rum-summary.mjs' },
  { id: 'nav-sheet-stats', command: ['node', 'scripts/build-nav-sheet-stats.mjs', '--check'], fix: 'node scripts/build-nav-sheet-stats.mjs' },
  { id: 'llms-full-shards', command: ['node', 'scripts/build-llms-full-shards.mjs', '--check'], fix: 'node scripts/build-llms-full-shards.mjs' },
  // S218: page-specific ecosystem-bridge links derived from the catalog. Folded in
  // here (not a new build:check segment) since build:check is at the Windows cmd.exe
  // length ceiling — drift = a bridge out of sync with public-intelligence.json.
  { id: 'ecosystem-bridges', command: ['node', 'scripts/build-ecosystem-bridges.mjs', '--check'], fix: 'node scripts/build-ecosystem-bridges.mjs' },
];

function runCheck(check) {
  let result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  let healed = false;
  if (result.status !== 0 && check.autofix) {
    const fixParts = check.fix.split(' ');
    spawnSync(fixParts[0], fixParts.slice(1), { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    result = spawnSync(check.command[0], check.command.slice(1), {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
    });
    healed = result.status === 0;
  }
  return {
    id: check.id,
    ok: result.status === 0,
    status: result.status,
    fix: check.fix,
    healed,
    stdout: (result.stdout || '').trim().split('\n').slice(-3).join('\n'),
    stderr: (result.stderr || '').trim().split('\n').slice(-3).join('\n'),
  };
}

function summarize(results) {
  const stale = results.filter((r) => !r.ok);
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    ok: stale.length === 0,
    checks: results.map(({ id, ok, status, fix, healed }) => ({ id, ok, status, fix, healed: healed || false })),
    stale: stale.map((r) => ({ id: r.id, fix: r.fix, stderr: r.stderr || r.stdout })),
    recommendation: stale.length ? 'run npm run build, then rerun npm run build:check' : 'generated artifacts are current',
  };
}

if (SELF_TEST) {
  const fake = summarize([
    { id: 'a', ok: true, status: 0, fix: 'fix-a' },
    { id: 'b', ok: false, status: 1, fix: 'fix-b', stderr: 'drift' },
  ]);
  const cases = [
    ['detects stale checks', fake.ok === false && fake.stale.length === 1],
    ['keeps fix command', fake.stale[0].fix === 'fix-b'],
    ['has recommendation', /npm run build/.test(fake.recommendation)],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const results = CHECKS
  .filter((check) => fs.existsSync(path.join(ROOT, check.command[1])))
  .map(runCheck);
const report = summarize(results);

if (JSON_MODE) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('generated-drift-preflight');
  console.log('──────────────────────────────────────────────');
  for (const result of report.checks) {
    console.log(`  ${result.ok ? (result.healed ? 'healed' : 'ok') : 'drift'} ${result.id}`);
  }
  console.log(`\n${report.ok ? 'ok' : 'drift'}: ${report.recommendation}`);
  if (report.stale.length) {
    console.log('\nFix commands:');
    for (const stale of report.stale) console.log(`  - ${stale.fix}`);
  }
}

process.exit(report.ok ? 0 : 1);
