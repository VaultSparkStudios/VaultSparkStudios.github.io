#!/usr/bin/env node
// @verification-scope doctor — portfolio-wide Canon reporter with sibling-registry input.
// check-canon-compliance.mjs
// Verifies rollout-required canon decisions across studioOsApplied repos.
//
// Usage:
//   node scripts/check-canon-compliance.mjs
//   node scripts/check-canon-compliance.mjs --project <slug>
//   node scripts/check-canon-compliance.mjs --json
//   node scripts/check-canon-compliance.mjs --strict

import fs from 'fs';
import path from 'path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const { loadRegistry } = await import('./lib/load-registry.mjs');
const { registry, path: registryPath } = loadRegistry(root);
if (!registryPath) {
  console.log('PROJECT_REGISTRY.json not found in local portfolio/ or sibling vaultspark-studio-ops/portfolio/ — skipping canon compliance.');
  process.exit(0);
}

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const strictMode = args.includes('--strict');
const targetSlug = readArgValue('--project');

if (args.includes('--self-test')) {
  const cases = [
    // The direction the old gate could never fail on: a repo whose AGENTS.md
    // carries the canon index (mentioning "CANON-008") but declares no license.
    ['a canon-id mention alone is NOT a license declaration',
      declaresLicense('- **CANON-008** · All VaultSpark IP is proprietary by default') === false],
    ['an empty rights artifact fails', declaresLicense('') === false],
    ['a null rights artifact fails', declaresLicense(null) === false],
    ['the proprietary default PASSES',
      declaresLicense('Default license: **Proprietary — All Rights Reserved, VaultSpark Studios LLC**') === true],
    ['a declared copyleft exception PASSES',
      declaresLicense('License: AGPL-3.0 (forked from an AGPL upstream)') === true],
    ['a permissive declaration PASSES', declaresLicense('License: MIT') === true],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`${ok ? '  ✓' : '  ✗'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(failed === 0
    ? `check-canon-compliance self-test ✓  ${cases.length}/${cases.length}`
    : `check-canon-compliance self-test ✗  ${failed}/${cases.length} failing`);
  process.exit(failed === 0 ? 0 : 1);
}

const PUBLIC_AUDIENCES = new Set(['public-live', 'public-unlaunched', 'public-traction']);

function readArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return null;
  const value = args[index + 1];
  return value.startsWith('--') ? null : value;
}

function fetchFile(project, relPath) {
  if (project.localPath && fs.existsSync(project.localPath)) {
    const absPath = path.join(project.localPath, relPath);
    if (fs.existsSync(absPath)) {
      return fs.readFileSync(absPath, 'utf8');
    }
    return null;
  }

  try {
    const raw = execFileSync('gh', ['api', `repos/${project.repo}/contents/${relPath}`, '--jq', '.content'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      cwd: root,
    }).trim();
    return Buffer.from(raw, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * CANON-008 is satisfied by an ACTUAL license declaration in the rights artifact
 * — not by a mention of the canon id.
 *
 * S323 (name-vs-body honesty sweep): the old check passed if AGENTS.md merely
 * *contained the string* `"CANON-008"`. But every studioOsApplied repo carries
 * the propagated Studio-Canon index, which literally lists the line
 * `CANON-008 · All VaultSpark IP is proprietary…`. So that branch was
 * unconditionally true and the CANON-008 leg could never fail — including for a
 * repo that forked a copyleft upstream and never declared its license in
 * `docs/RIGHTS_PROVENANCE.md`, the exact obligation CANON-008 mandates. A
 * "compliance" check that can never fail reads exactly like a passing one.
 *
 * The honest property: docs/RIGHTS_PROVENANCE.md declares a real license — the
 * proprietary default or an explicit copyleft/permissive exception.
 */
export function declaresLicense(rightsText) {
  if (typeof rightsText !== 'string' || !rightsText.trim()) return false;
  // "All Rights Reserved" is an unambiguous proprietary declaration.
  if (/All Rights Reserved/i.test(rightsText)) return true;
  // Otherwise require an explicit license LABEL bound to a recognized license
  // token, so the bare adjective "proprietary" in prose (as the propagated canon
  // index carries it) is never mistaken for an actual declaration.
  return /\blicen[sc]e\b[^\n]{0,40}?\b(Proprietary|AGPL-3\.0|LGPL-3\.0|GPL-3\.0|MPL-2\.0|Apache-2\.0|BSD-3-Clause|MIT)\b/i.test(rightsText);
}

function hasCanon008(project) {
  const rights = fetchFile(project, 'docs/RIGHTS_PROVENANCE.md') || '';
  return declaresLicense(rights);
}

function evaluateProject(project) {
  const checks = [];

  const brandingApplicable = PUBLIC_AUDIENCES.has(project.audience) && project.brandingRequired === true;
  checks.push({
    canon: 'CANON-006',
    applicable: brandingApplicable,
    pass: !brandingApplicable || project.brandingCompliant === true,
    detail: brandingApplicable
      ? `brandingRequired=${project.brandingRequired} brandingCompliant=${project.brandingCompliant}`
      : 'not applicable',
  });

  const stagingApplicable = (project.vaultStatus || '').toLowerCase() === 'sparked' && project.audience !== 'internal';
  checks.push({
    canon: 'CANON-007',
    applicable: stagingApplicable,
    pass: !stagingApplicable || (project.stagingType && project.stagingType !== 'none'),
    detail: stagingApplicable
      ? `vaultStatus=${project.vaultStatus} audience=${project.audience} stagingType=${project.stagingType || 'none'}`
      : 'not applicable',
  });

  checks.push({
    canon: 'CANON-008',
    applicable: true,
    pass: hasCanon008(project),
    detail: 'Expected an explicit license declaration in docs/RIGHTS_PROVENANCE.md (a canon-id mention is not a license)',
  });

  const missing = checks.filter(check => check.applicable && !check.pass).map(check => check.canon);
  return {
    slug: project.slug,
    name: project.name,
    repo: project.repo,
    missing,
    checks,
  };
}

const projects = registry.projects
  .filter(project => project.status !== 'archived')
  .filter(project => project.studioOsApplied === true)
  .filter(project => !targetSlug || project.slug === targetSlug);

const results = projects.map(evaluateProject);
const failing = results.filter(result => result.missing.length > 0);

if (jsonOut) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(strictMode && failing.length > 0 ? 1 : 0);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Canon Compliance Check');
console.log(`  rollout-required canons across ${results.length} repo(s)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

for (const result of results) {
  if (!result.missing.length) {
    console.log(`✓ ${result.name} [${result.slug}]`);
    continue;
  }

  console.log(`⛔ ${result.name} [${result.slug}] — missing ${result.missing.join(', ')}`);
  for (const check of result.checks.filter(item => item.applicable && !item.pass)) {
    console.log(`   - ${check.canon}: ${check.detail}`);
  }
}

console.log('');
console.log(`Missing canon rollout on ${failing.length} repo(s).`);
console.log('');

process.exit(strictMode && failing.length > 0 ? 1 : 0);
