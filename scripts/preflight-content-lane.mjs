#!/usr/bin/env node
/**
 * preflight-content-lane.mjs — S304 (plan item 6).
 *
 * THE GAP IT CLOSES: shipping /proof through the content lane took THREE
 * founder dispatches because each blocker (a plain executable asset, then a
 * withheld data file) surfaced only inside CI. Every check the workflow runs
 * exists locally — this composes them into one pre-dispatch answer:
 * "if the founder dispatched confirm_content right now, would it deploy,
 *  what exactly would promote, and what would refuse it?"
 *
 * Mirrors `pages-deploy.yml` step-for-step:
 *   1. baseline  = api/deploy-currency.json .deployedSha (or --baseline)
 *   2. partition = check-content-lane-purity --range <baseline>..HEAD
 *   3. gate      = check-content-hotfix-gate --paths <promotable> --baseline=<baseline>
 *
 * Modes:
 *   --self-test    argument/plumbing checks, exit 0/1
 *   --warn-only    always exit 0 (advisory build:check placement)
 *   (default)      exit 0 = a dispatch WOULD deploy · exit 1 = it would hold
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const WARN_ONLY = args.includes('--warn-only');
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

function run(script, scriptArgs) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...scriptArgs], {
    cwd: ROOT, encoding: 'utf8',
  });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

export function parsePromotable(purityStdout) {
  // check-content-lane-purity --emit-github-output prints `lane_paths=` lines to
  // GITHUB_OUTPUT; locally we parse its human summary + explicit path listing.
  const match = /--partition: (\d+) promotable · (\d+) withheld/.exec(purityStdout);
  return match ? { promotable: Number(match[1]), withheld: Number(match[2]) } : null;
}

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.error(`  ✗ ${l}`); } };
  ok(parsePromotable('content-lane-purity --partition: 193 promotable · 501 withheld at baseline')?.promotable === 193, 'partition summary parses');
  ok(parsePromotable('no such line') === null, 'absent summary is null, not a fake zero');
  ok(fs.existsSync(path.join(ROOT, 'scripts', 'check-content-lane-purity.mjs')), 'purity script reachable');
  ok(fs.existsSync(path.join(ROOT, 'scripts', 'check-content-hotfix-gate.mjs')), 'hotfix gate reachable');
  console.log(`preflight-content-lane --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function main() {
  const exit = (code, message) => {
    console.log(message);
    process.exit(WARN_ONLY ? 0 : code);
  };

  // 1 — baseline: what production actually serves.
  let baseline = flag('--baseline');
  if (!baseline) {
    try { baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'deploy-currency.json'), 'utf8')).deployedSha || null; }
    catch { baseline = null; }
  }
  if (!baseline) return exit(1, '⛔ preflight-content-lane: no deployed baseline SHA available (api/deploy-currency.json) — probe deploy currency first');

  // Baseline must exist locally or the range is unresolvable (shallow clone, GC).
  const haveBaseline = spawnSync('git', ['cat-file', '-e', `${baseline}^{commit}`], { cwd: ROOT, encoding: 'utf8' });
  if ((haveBaseline.status ?? 1) !== 0) return exit(1, `⚠ preflight-content-lane: baseline ${baseline.slice(0, 12)} not present locally — git fetch first (advisory)`);

  // 2 — partition (exactly the workflow's invocation, including the
  // --emit-github-output side channel it uses to hand LANE_PATHS onward).
  const outputFile = path.join(ROOT, '.cache', 'preflight-lane-output.txt');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, '');
  const purity = spawnSync(process.execPath,
    [path.join(ROOT, 'scripts', 'check-content-lane-purity.mjs'), '--range', `${baseline}..HEAD`, '--partition', '--emit-github-output'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: outputFile } });
  const purityOut = (purity.stdout || '') + (purity.stderr || '');
  const summary = parsePromotable(purityOut);
  if (!summary) return exit(1, `⛔ preflight-content-lane: partition did not produce a summary\n${purityOut.slice(-400)}`);
  if (summary.promotable === 0) return exit(1, `preflight-content-lane: nothing promotable (${summary.withheld} withheld) — a dispatch would deploy nothing`);

  // 3 — the PROMOTABLE set (never the raw diff) through the hotfix gate, with
  // reference resolution against the DEPLOYED tree — the exact check that
  // caught proof-verify.js only in CI last time.
  const emitted = fs.readFileSync(outputFile, 'utf8');
  const laneMatch = /^paths=(.*)$/m.exec(emitted);
  const lanePaths = laneMatch ? laneMatch[1].trim() : '';
  if (!lanePaths) return exit(1, '⛔ preflight-content-lane: partition emitted no paths= line — cannot mirror the workflow');
  const gate = run('check-content-hotfix-gate.mjs', ['--paths', lanePaths, `--baseline=${baseline}`]);
  const gateOut = gate.stdout + gate.stderr;
  const promotableLine = /check-content-hotfix-gate: (\d+) path\(s\) promotable/.exec(gateOut);

  if (gate.status === 0 && promotableLine) {
    console.log(`✓ preflight-content-lane: a confirm_content dispatch WOULD deploy — ${promotableLine[1]} path(s) promotable (baseline ${baseline.slice(0, 12)}, ${summary.withheld} withheld)`);
    process.exit(0);
  }
  return exit(1, `⛔ preflight-content-lane: a dispatch would HOLD. Gate output:\n${gateOut.slice(-800)}`);
}

if (SELF_TEST) selfTest(); else main();
