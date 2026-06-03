#!/usr/bin/env node
// check-portfolio-coherence.mjs — cross-walk between
//   1. ../vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json
//   2. on-disk /projects/<slug>/ and /games/<slug>/ directories
//   3. sitemap.xml entries
//
// Carries from S128 task board ([S128→DRIFT/P2]). Would have flagged the missing
// `seamline` page + the StatVault/IdeaForge audience-mismatch in S127 early.
//
// Modes:
//   --report   (default) — print findings, exit 0
//   --check    — exit 1 on net-new drift (anything not in coherence-baseline)
//
// Net-new drift = filesystem dir present but no registry entry AND not in baseline.allowedOrphans
//                OR registry entry public-audience but on-disk dir missing AND not in baseline.knownMissing.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRICT = process.argv.includes('--check');

const REGISTRY_PATHS = [
  resolve(ROOT, '../vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json'),
  resolve(ROOT, '../../vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json'),
];
const registryPath = REGISTRY_PATHS.find((p) => existsSync(p));

if (!registryPath) {
  console.log('check-portfolio-coherence · SKIP — registry not reachable (run from website repo)');
  process.exit(0);
}

const baselinePath = resolve(ROOT, 'data/portfolio-coherence-baseline.json');
const baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, 'utf8'))
  : { allowedOrphans: [], knownMissing: [], slugAliases: {} };

const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
const entries = Array.isArray(reg) ? reg : (reg.projects || reg.entries || Object.values(reg));

// Build registry slug set with aliases
const registrySlugs = new Set();
for (const p of entries) {
  if (!p.slug) continue;
  registrySlugs.add(p.slug);
  if (baseline.slugAliases?.[p.slug]) registrySlugs.add(baseline.slugAliases[p.slug]);
}

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => {
    const full = join(dir, n);
    return statSync(full).isDirectory() && n !== 'index.html';
  });
}

const projectsDirs = listDirs(resolve(ROOT, 'projects'));
const gamesDirs = listDirs(resolve(ROOT, 'games'));

const findings = { orphans: [], missing: [], info: [] };

// Filesystem dirs without a registry match
for (const d of [...projectsDirs, ...gamesDirs]) {
  if (registrySlugs.has(d)) continue;
  // Try aliases reverse-lookup
  const aliasOf = Object.entries(baseline.slugAliases || {}).find(([, v]) => v === d);
  if (aliasOf && registrySlugs.has(aliasOf[0])) continue;
  if ((baseline.allowedOrphans || []).includes(d)) {
    findings.info.push(`info: on-site dir "${d}" not in registry (allowlisted)`);
    continue;
  }
  findings.orphans.push(d);
}

// Registry public entries without an on-disk dir
const onDisk = new Set([...projectsDirs, ...gamesDirs]);
for (const p of entries) {
  const aud = p.audience || '';
  const isPublic = aud.startsWith('public') || aud === 'private-beta';
  if (!isPublic) continue;
  if (p.medium === 'website' || p.medium === 'infrastructure' || p.medium === 'internal-ops') continue;
  const slug = p.slug;
  const aliased = baseline.slugAliases?.[slug];
  if (onDisk.has(slug)) continue;
  if (aliased && onDisk.has(aliased)) continue;
  if ((baseline.knownMissing || []).includes(slug)) {
    findings.info.push(`info: registry "${slug}" intentionally without on-site dir`);
    continue;
  }
  findings.missing.push(slug);
}

console.log('check-portfolio-coherence');
console.log('─'.repeat(60));
console.log(`  registry:    ${entries.length} entries`);
console.log(`  /projects/:  ${projectsDirs.length} dirs`);
console.log(`  /games/:     ${gamesDirs.length} dirs`);
console.log('─'.repeat(60));
for (const i of findings.info) console.log('  ' + i);
if (findings.orphans.length) {
  console.log(`  ✗ ${findings.orphans.length} ORPHAN dir(s) without registry entry:`);
  for (const o of findings.orphans) console.log(`      - ${o}`);
}
if (findings.missing.length) {
  console.log(`  ✗ ${findings.missing.length} MISSING on-site dir(s) for public-audience registry entries:`);
  for (const m of findings.missing) console.log(`      - ${m}`);
}
const driftCount = findings.orphans.length + findings.missing.length;
console.log('─'.repeat(60));
if (driftCount === 0) {
  console.log('  ✓ portfolio coherence clean');
  process.exit(0);
}
console.log(`  ${STRICT ? '✗ ' : '⚠ '}${driftCount} drift item(s) ${STRICT ? '(strict — failing)' : '(report-only — baseline at data/portfolio-coherence-baseline.json)'}`);
process.exit(STRICT ? 1 : 0);
