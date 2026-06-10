#!/usr/bin/env node
/**
 * check-deploy-tip.mjs — Deploy-strand guard (S184)
 *
 * Cloudflare Pages builds ONLY the pushed tip commit. When the tip carries
 * `[skip ci]` / `[ci skip]`, Pages skips the build and prod stays frozen at the
 * previous deploy — silently STRANDING every substantive commit beneath the tip.
 *
 * Observed S184: the S183 closeout pushed dc9238f4 (confirmed field-win.json +
 * ~20 api/*.json) and then e1843b3c `[skip ci]` as the tip. Pages skipped the
 * tip → the whole closeout (including the now-confirmed "Biggest measured win"
 * tile data) never deployed. The /status/ tile stayed dark for a deploy-order
 * reason, not a data or render reason.
 *
 * This guard fails when the tip of a push range is `[skip ci]` while the range
 * also contains a NON-skip-ci (substantive) commit — i.e. a strand risk. An
 * all-skip-ci range is fine (intentional no-deploy housekeeping). A substantive
 * tip is fine.
 *
 * Usage:
 *   node scripts/check-deploy-tip.mjs                 # range origin/main..HEAD
 *   node scripts/check-deploy-tip.mjs --range A..B
 *   node scripts/check-deploy-tip.mjs --self-test
 *
 * Exit 0 = safe (or warn-only with --warn). Exit 1 = strand risk.
 */
import { execSync } from 'node:child_process';

const SKIP_RE = /\[(?:skip ci|ci skip|skip-ci|ci-skip)\]/i;

export function classify(commits) {
  // commits: array of subjects, index 0 = tip (newest)
  if (!commits.length) return { verdict: 'empty', stranded: [] };
  const tipSkips = SKIP_RE.test(commits[0]);
  const substantive = commits.filter((c) => !SKIP_RE.test(c));
  if (!tipSkips) return { verdict: 'safe', stranded: [] };
  // tip is skip-ci
  if (substantive.length === 0) return { verdict: 'all-skip', stranded: [] };
  return { verdict: 'strand-risk', stranded: substantive };
}

function selfTest() {
  const cases = [
    { in: [], want: 'empty' },
    { in: ['feat: x'], want: 'safe' },
    { in: ['chore: y [skip ci]'], want: 'all-skip' },
    { in: ['chore: tip [skip ci]', 'feat: real work'], want: 'strand-risk' },
    { in: ['feat: tip real', 'chore: y [skip ci]'], want: 'safe' },
    { in: ['chore: a [ci skip]', 'chore: b [skip ci]'], want: 'all-skip' },
    { in: ['docs: tip [skip-ci]', 'fix: stranded'], want: 'strand-risk' },
  ];
  let pass = 0;
  for (const c of cases) {
    const got = classify(c.in).verdict;
    const ok = got === c.want;
    if (ok) pass++;
    else console.log(`  ✗ [${c.in.join(' | ')}] → ${got} (want ${c.want})`);
  }
  console.log(`check-deploy-tip self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();
  const warnOnly = args.includes('--warn');
  const ri = args.indexOf('--range');
  const range = ri >= 0 ? args[ri + 1] : 'origin/main..HEAD';

  let raw = '';
  try {
    raw = execSync(`git log ${range} --format=%s`, { encoding: 'utf8' }).trim();
  } catch {
    // origin/main may be unknown in a fresh clone — degrade to safe.
    console.log(`check-deploy-tip: range ${range} unresolvable (no upstream?) — skipping.`);
    process.exit(0);
  }
  const commits = raw ? raw.split('\n') : [];
  const { verdict, stranded } = classify(commits);

  if (verdict === 'empty') {
    console.log('check-deploy-tip: nothing to push — safe.');
    process.exit(0);
  }
  if (verdict === 'safe') {
    console.log(`check-deploy-tip ✓ tip is substantive — CF Pages will build (${range}).`);
    process.exit(0);
  }
  if (verdict === 'all-skip') {
    console.log(`check-deploy-tip ✓ all ${commits.length} commit(s) are [skip ci] — intentional no-deploy.`);
    process.exit(0);
  }
  // strand-risk
  console.log('');
  console.log('  ⛔ DEPLOY-STRAND RISK — CF Pages will SKIP this push.');
  console.log(`     Tip commit is [skip ci]: "${commits[0]}"`);
  console.log(`     ${stranded.length} substantive commit(s) below it will NOT deploy:`);
  stranded.slice(0, 5).forEach((s) => console.log(`       · ${s}`));
  console.log('');
  console.log('     Fix: make the LAST commit non-skip-ci, e.g.');
  console.log('       git commit --allow-empty -m "chore: trigger deploy"');
  console.log('     (or reorder so a substantive commit is the tip).');
  console.log('');
  process.exit(warnOnly ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-deploy-tip.mjs')) {
  main();
}
