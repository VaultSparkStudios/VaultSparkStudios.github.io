#!/usr/bin/env node
// @verification-scope release — portfolio launch-readiness reporter.
// check-launch-ready.mjs — Portfolio-wide launch readiness reporter.
// Checks vaultStatus, branding, staging, launchStatus, liveUrl, and Stripe readiness.
//
// Usage:
//   node scripts/check-launch-ready.mjs              # all projects
//   node scripts/check-launch-ready.mjs --sparked    # SPARKED only
//   node scripts/check-launch-ready.mjs --project <slug>
//   node scripts/check-launch-ready.mjs --json       # machine-readable output

import fs from 'fs';
import path from 'path';
import { validateSlug } from './lib/validate.mjs';

// ── CANON-007 staging verdict (pure — shared by the reporter and --self-test) ──
// S323: the original inline check had a gate-honesty gap. A SPARKED public project
// with NO stagingType at all (the worst-configured case) fell into the
// "not applicable" branch — `checks.staging` was set false but NO blocker was
// pushed. Since the SPARKED GO/NO-GO is driven by blockers containing 'SPARKED',
// that project still reported "✓ GO": the least-ready project was treated the most
// leniently. Now the not-applicable/pass path is taken ONLY when staging genuinely
// isn't needed; when a project DOES need staging, a missing or 'none' stagingType,
// or a missing stagingUrl, all push the same 'SPARKED'-tagged CANON-007 blocker.
// S323: the registry stores vaultStatus lowercase ("sparked"), but every gate
// here compared against uppercase 'SPARKED' — so NONE of the SPARKED-specific
// enforcement (staging, liveUrl, GO/NO-GO) ever triggered for a real project.
// A launch gate that silently exempts every launched project from its launch
// rules is the exact name-vs-body defect this sweep exists to close. Compare
// case-insensitively through this one helper.
export const isSparked = (p) => String(p?.vaultStatus || '').trim().toUpperCase() === 'SPARKED';

export function evaluateStagingVerdict(project) {
  const needsStaging = isSparked(project) && project.audience !== 'internal';
  if (!needsStaging) {
    // FORGE/VAULTED or internal — staging not required; pass with no blocker.
    return { needsStaging, staging: true, blocker: null };
  }
  const hasType = !!project.stagingType && project.stagingType !== 'none';
  const staging = hasType && !!project.stagingUrl;
  return {
    needsStaging,
    staging,
    blocker: staging ? null : 'CANON-007 staging missing (SPARKED — required)',
  };
}

function selfTest() {
  const staged = { vaultStatus: 'SPARKED', audience: 'public-web', stagingType: 'hetzner', stagingUrl: 'https://website.staging.vaultsparkstudios.com' };
  const noType = { vaultStatus: 'SPARKED', audience: 'public-web' }; // worst-configured: no stagingType at all
  const typeNone = { vaultStatus: 'SPARKED', audience: 'public-web', stagingType: 'none' };
  const noUrl = { vaultStatus: 'SPARKED', audience: 'public-web', stagingType: 'hetzner' };
  const forge = { vaultStatus: 'FORGE', audience: 'public-web' };

  const isSparkedBlocker = (v) => !!v.blocker && v.blocker.includes('SPARKED');

  const cases = [
    // The direction the old gate could never fail on — the live S323 defect.
    ['a SPARKED public project with NO stagingType now records a blocker',
      isSparkedBlocker(evaluateStagingVerdict(noType)) && evaluateStagingVerdict(noType).staging === false],
    ["...and stagingType 'none' is treated the same, not silently passed",
      isSparkedBlocker(evaluateStagingVerdict(typeNone))],
    ['a SPARKED project with a type but no stagingUrl also blocks',
      isSparkedBlocker(evaluateStagingVerdict(noUrl))],
    // The opposite direction — a properly-staged SPARKED project must still GO.
    ['a properly-staged SPARKED project passes with no blocker',
      evaluateStagingVerdict(staged).staging === true && evaluateStagingVerdict(staged).blocker === null],
    // Genuinely-not-applicable projects keep their old pass-through behavior.
    ['a FORGE project does not need staging and records no blocker',
      evaluateStagingVerdict(forge).needsStaging === false
        && evaluateStagingVerdict(forge).staging === true
        && evaluateStagingVerdict(forge).blocker === null],
    // S323 case-normalization: the registry's lowercase "sparked" must be
    // enforced identically — this is the direction that silently disabled the
    // whole gate for every real project.
    ['lowercase "sparked" is treated as SPARKED (registry casing)',
      isSparked({ vaultStatus: 'sparked' }) === true
        && evaluateStagingVerdict({ vaultStatus: 'sparked', audience: 'public-web' }).needsStaging === true
        && isSparkedBlocker(evaluateStagingVerdict({ vaultStatus: 'sparked', audience: 'public-web' }))],
  ];

  let failed = 0;
  for (const [name, passed] of cases) {
    console.log(`${passed ? '  ✓' : '  ✗'} ${name}`);
    if (!passed) failed += 1;
  }
  console.log(failed === 0
    ? `check-launch-ready self-test ✓  ${cases.length}/${cases.length}`
    : `check-launch-ready self-test ✗  ${failed}/${cases.length} failing`);
  return failed === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const LOCAL_REGISTRY = path.join(root, 'portfolio', 'PROJECT_REGISTRY.json');
const OPS_REGISTRY   = path.join(root, '..', 'vaultspark-studio-ops', 'portfolio', 'PROJECT_REGISTRY.json');
const registryPath = fs.existsSync(LOCAL_REGISTRY) ? LOCAL_REGISTRY : OPS_REGISTRY;
if (!fs.existsSync(registryPath)) {
  const out = { projects: [], note: 'PROJECT_REGISTRY.json not found in local portfolio/ or sibling vaultspark-studio-ops/portfolio/' };
  if (process.argv.includes('--json')) { console.log(JSON.stringify(out)); process.exit(0); }
  console.log(out.note);
  process.exit(0);
}
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const SPARKED_ONLY = process.argv.includes('--sparked');
const JSON_OUT     = process.argv.includes('--json');
const TARGET       = validateSlug('project', (() => { const i = process.argv.indexOf('--project'); return i >= 0 ? process.argv[i + 1] : null; })());

const CHECKS = {
  vaultStatus:      { label: 'Vault status set',        weight: 1 },
  liveUrl:          { label: 'liveUrl present',          weight: 2 },
  brandingCompliant:{ label: 'CANON-006 branding',      weight: 3 },
  staging:          { label: 'Staging env (CANON-007)',  weight: 2 },
  launchStatus:     { label: 'launchStatus set',         weight: 1 },
  stripeReady:      { label: 'Stripe ready',             weight: 2 },
};

const results = [];

for (const project of registry.projects) {
  if (project.status === 'archived') continue;
  if (TARGET && project.slug !== TARGET) continue;
  if (SPARKED_ONLY && !isSparked(project)) continue;
  if (project.audience === 'internal') continue;

  const checks = {};
  const blockers = [];

  // Vault status
  checks.vaultStatus = !!project.vaultStatus;
  if (!checks.vaultStatus) blockers.push('vaultStatus missing');

  // Live URL (required for SPARKED). S323: the registry's canonical live-URL
  // field is `runtimeUrl` (every sparked entry carries it); `liveUrl` is sparse.
  // Reading only `project.liveUrl` meant this check was blind to the real field —
  // masked until the case-fix above let the SPARKED-gated check actually run.
  const liveUrl = project.runtimeUrl || project.liveUrl || project.url;
  checks.liveUrl = !!liveUrl;
  if (!checks.liveUrl && isSparked(project)) blockers.push('liveUrl missing (SPARKED — required)');

  // CANON-006 branding
  if (project.brandingRequired === false || project.audience === 'internal') {
    checks.brandingCompliant = true; // exempt
  } else {
    checks.brandingCompliant = project.brandingCompliant === true;
    if (!checks.brandingCompliant) blockers.push('CANON-006 branding not compliant');
  }

  // CANON-007 staging (required for SPARKED public) — see evaluateStagingVerdict (S323).
  const stagingVerdict = evaluateStagingVerdict(project);
  checks.staging = stagingVerdict.staging;
  if (stagingVerdict.blocker) blockers.push(stagingVerdict.blocker);

  // launchStatus
  checks.launchStatus = !!project.launchStatus;
  if (!checks.launchStatus) blockers.push('launchStatus field missing');

  // Stripe readiness (only relevant if revenueModel is not 'none')
  if (!project.revenueModel || project.revenueModel === 'none') {
    checks.stripeReady = true; // not applicable
  } else {
    checks.stripeReady = project.stripeReady === true;
    if (!checks.stripeReady) blockers.push('Stripe not ready (revenue model set)');
  }

  // Score
  const passed = Object.entries(checks).filter(([, v]) => v).length;
  const total  = Object.keys(checks).length;
  const score  = Math.round((passed / total) * 100);

  // Go/No-Go
  const criticalBlockers = blockers.filter(b => b.includes('SPARKED'));
  const goNoGo = isSparked(project)
    ? (criticalBlockers.length === 0 ? '✓ GO' : '⛔ NO-GO')
    : (score >= 80 ? '✓ READY' : score >= 50 ? '⚠ PARTIAL' : '○ NOT READY');

  results.push({ slug: project.slug, name: project.name, vaultStatus: project.vaultStatus, score, checks, blockers, goNoGo });
}

// Sort: SPARKED first, then by score desc
results.sort((a, b) => {
  if (isSparked(a) && !isSparked(b)) return -1;
  if (isSparked(b) && !isSparked(a)) return 1;
  return b.score - a.score;
});

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

// ── Human-readable report ─────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  LAUNCH READINESS REPORT                             ║');
console.log(`╚══════════════════════════════════════════════════════╝  ${today}\n`);

// Summary line
const goCount    = results.filter(r => r.goNoGo.startsWith('✓')).length;
const noGoCount  = results.filter(r => r.goNoGo.startsWith('⛔')).length;
const warnCount  = results.filter(r => r.goNoGo.startsWith('⚠')).length;
console.log(`  ✓ Ready/GO: ${goCount}  ⚠ Partial: ${warnCount}  ⛔ Blocked: ${noGoCount}  (${results.length} public projects)\n`);

const STATUS_ICON = { SPARKED: '⚡', FORGE: '🔨', VAULTED: '📦' };

for (const r of results) {
  const icon = STATUS_ICON[r.vaultStatus] || '○';
  const bar  = '█'.repeat(Math.round(r.score / 10)) + '░'.repeat(10 - Math.round(r.score / 10));
  console.log(`  ${icon} ${r.name.padEnd(28)} ${bar} ${String(r.score).padStart(3)}%  ${r.goNoGo}`);
  if (r.blockers.length) {
    for (const b of r.blockers) console.log(`       ↳ ${b}`);
  }
}

// Highlight SPARKED projects needing immediate action
const sparkedBlocked = results.filter(r => isSparked(r) && r.goNoGo.startsWith('⛔'));
if (sparkedBlocked.length) {
  console.log('\n  ⛔ SPARKED PROJECTS WITH BLOCKERS — action required:');
  for (const r of sparkedBlocked) {
    console.log(`     ${r.name}: ${r.blockers.join(' · ')}`);
  }
}

// Identify FORGE projects closest to launch readiness
const nearReady = results.filter(r => r.vaultStatus === 'FORGE' && r.score >= 70).sort((a, b) => b.score - a.score);
if (nearReady.length) {
  console.log(`\n  🔨 FORGE projects near launch-ready (≥70%): ${nearReady.map(r => r.name).join(', ')}`);
}

console.log('');
