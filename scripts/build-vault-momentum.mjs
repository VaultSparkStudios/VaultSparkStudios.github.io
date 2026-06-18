#!/usr/bin/env node
/* build-vault-momentum.mjs — S205 #11
   Reads 3 public feeds, computes a rolling weighted score, writes
   api/vault-momentum.json for the homepage Studio Now chip.

   Components (0–100 total):
     velocity   0–50   recent commit pace vs studio baseline
     engagement 0–25   CTA funnel clicks last 7d (honest-dark when empty)
     community  0–25   rank climbers this period

   Labels: SPARKED (≥60) · FORGING (30–59) · AT REST (<30)
   honestDark: true when ALL components have no data.

   Usage:
     node scripts/build-vault-momentum.mjs          # write api/vault-momentum.json
     node scripts/build-vault-momentum.mjs --check  # verify file in sync
     node scripts/build-vault-momentum.mjs --self-test
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'vault-momentum.json');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('build-vault-momentum.mjs');

// ── Scoring helpers ────────────────────────────────────────────────────────

function scoreVelocity(weeks) {
  if (!Array.isArray(weeks) || weeks.length === 0) return { score: 0, dark: true, raw: 0 };
  const recent = weeks.slice(-4).reduce((s, w) => s + (w.commitCount || 0), 0);
  // Baseline: ~50 commits/week across 4 weeks = 200 is healthy, 400+ is high energy
  const score = recent >= 400 ? 50
    : recent >= 200 ? 40
    : recent >= 80  ? 30
    : recent >= 20  ? 15
    : recent >= 1   ? 5
    : 0;
  return { score, dark: recent === 0, raw: recent };
}

function scoreEngagement(funnelCtas) {
  if (!funnelCtas || typeof funnelCtas !== 'object') return { score: 0, dark: true, raw: 0 };
  const total = Object.values(funnelCtas).reduce((s, v) => {
    const n = typeof v === 'object' ? (v.clicks7d || v.count || 0) : (typeof v === 'number' ? v : 0);
    return s + n;
  }, 0);
  if (total === 0 && Object.keys(funnelCtas).length === 0) return { score: 0, dark: true, raw: 0 };
  const score = total >= 50 ? 25 : total >= 20 ? 18 : total >= 5 ? 10 : total >= 1 ? 5 : 0;
  return { score, dark: false, raw: total };
}

function scoreCommunity(climbers, total) {
  const n = typeof total === 'number' ? total : (Array.isArray(climbers) ? climbers.length : 0);
  if (n === 0) return { score: 0, dark: true, raw: 0 };
  const score = n >= 10 ? 25 : n >= 5 ? 20 : n >= 2 ? 12 : n >= 1 ? 6 : 0;
  return { score, dark: false, raw: n };
}

function classify(score) {
  return score >= 60 ? 'SPARKED' : score >= 30 ? 'FORGING' : 'AT REST';
}

// ── Self-test ──────────────────────────────────────────────────────────────

function selfTest() {
  const cases = [
    { name: 'high velocity', vel: [{commitCount:150},{commitCount:200},{commitCount:180},{commitCount:120}], exp: {label:'SPARKED',dark:false} },
    { name: 'low velocity',  vel: [{commitCount:5},{commitCount:3}], exp: {dark:false} },
    { name: 'zero velocity', vel: [{commitCount:0}],                 exp: {dark:true} },
    { name: 'no climbers',   climbers: [], total: 0,                 exp: {community:0} },
    { name: 'good climbers', climbers: Array(5), total: 5,           exp: {community:20} },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    try {
      if ('vel' in c) {
        const v = scoreVelocity(c.vel);
        if (c.exp.dark !== undefined && v.dark !== c.exp.dark) throw new Error('dark mismatch');
        if (c.exp.label) {
          const total = v.score + 25; // assume community 20, engagement 0
          if (classify(total) !== c.exp.label) throw new Error('label mismatch: got ' + classify(total));
        }
      }
      if ('climbers' in c) {
        const cm = scoreCommunity(c.climbers, c.total);
        if (c.exp.community !== undefined && cm.score !== c.exp.community) throw new Error('community score mismatch: got ' + cm.score);
      }
      pass++;
    } catch (e) {
      fail++;
      console.error('  FAIL ' + c.name + ': ' + e.message);
    }
  }
  console.log('build-vault-momentum self-test: ' + pass + '/' + cases.length + ' passed' + (fail ? ' — ' + fail + ' failed' : ''));
  process.exit(fail > 0 ? 1 : 0);
}

if (SELF_TEST) { selfTest(); }

// ── Main build ─────────────────────────────────────────────────────────────

function build() {
  function safeRead(path) {
    try { return JSON.parse(readFileSync(join(ROOT, path), 'utf8')); } catch { return null; }
  }

  const vs = safeRead('api/velocity-series.json') || {};
  const fc = safeRead('api/funnel-summary.json') || {};
  const rc = safeRead('api/rank-climbers.json') || {};

  const vel = scoreVelocity(vs.weeks);
  const eng = scoreEngagement(fc.funnelCtas);
  const com = scoreCommunity(rc.climbers, rc.totalClimbers);

  const total = vel.score + eng.score + com.score;
  const honestDark = vel.dark && eng.dark && com.dark;

  const result = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString().slice(0, 10),
    score: total,
    label: honestDark ? null : classify(total),
    components: { velocity: vel.score, engagement: eng.score, community: com.score },
    signals: { commitsLast4w: vel.raw, ctaClicks7d: eng.raw, rankClimbers: com.raw },
    honestDark,
  };

  return result;
}

if (!SELF_TEST && RUN_DIRECT) {
  const result = build();
  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error('build-vault-momentum --check: missing api/vault-momentum.json');
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(OUT, 'utf8'));
    if (current.score !== result.score || current.label !== result.label) {
      console.error('build-vault-momentum --check: artifact drift (score/label changed); run without --check');
      process.exit(1);
    }
    console.log('build-vault-momentum --check: ok (score=' + result.score + ' label=' + result.label + ')');
  } else {
    writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
    console.log('build-vault-momentum → api/vault-momentum.json (score=' + result.score + ' label=' + result.label + ' honestDark=' + result.honestDark + ')');
  }
}

export { build, scoreVelocity, scoreEngagement, scoreCommunity, classify };
