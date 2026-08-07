#!/usr/bin/env node
/** Plan a deterministic, explicitly partial build-check subset from changed paths. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandsFromPackage } from './run-build-check.mjs';
import { fingerprintCommands } from './lib/build-check-evidence.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const IGNORE_PREFIXES = ['.cache/', 'output/', 'test-results/', 'playwright-report/', 'node_modules/'];
const GLOBAL_SENTINELS = /(?:lint-repo|validate-module-imports|check-orphan-scripts|check-evidence-check-reachability|check-build-step-resilience)/;
const CONTENT_CHECKS = /(?:content|navigation|nav-|orphan-page|placeholder|touch-target|meta-description|vocabulary|sitemap|crawl-all-pages|base-href|page-script|mobile-contract|render-contract)/;
const STYLE_CHECKS = /(?:theme|mobile|ambient|render|perf|lighthouse|lqip|image|critical|favicon|shell|csp|sri|trusted|tt-)/;
const DATA_CHECKS = /(?:ndjson|feed|status|proof|evidence|analytics|rum|funnel|health|receipt|deploy|promotion|currency|citation|agents-json|discovery)/;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const slash = (value) => String(value).replace(/\\/g, '/').replace(/^\.\//, '');

function tokenize(command) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(command))) out.push(match[1] ?? match[2] ?? match[3]);
  return out;
}

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.mjs`, `${base}.js`, `${base}.cjs`, `${base}.json`, join(base, 'index.mjs'), join(base, 'index.js')];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) || null;
}

function transitiveInputs(entry, seen = new Set()) {
  const absolute = resolve(ROOT, entry);
  if (seen.has(absolute) || !existsSync(absolute)) return seen;
  seen.add(absolute);
  if (!/\.(?:mjs|cjs|js)$/.test(absolute)) return seen;
  let source = '';
  try { source = readFileSync(absolute, 'utf8'); } catch { return seen; }
  const specs = [];
  const patterns = [/(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) specs.push(match[1]);
  }
  for (const spec of specs) {
    const dependency = resolveLocalImport(absolute, spec);
    if (dependency) transitiveInputs(relative(ROOT, dependency), seen);
  }
  return seen;
}

function entryPaths(command) {
  return tokenize(command)
    .filter((token) => /^(?:scripts|tests)\/.+\.(?:mjs|cjs|js)$/.test(slash(token)))
    .map(slash);
}

export function buildImpactMap(commands = commandsFromPackage(PKG)) {
  return commands.map((command, index) => {
    const entries = entryPaths(command);
    const inputs = new Set(entries);
    for (const entry of entries) {
      for (const absolute of transitiveInputs(entry)) inputs.add(slash(relative(ROOT, absolute)));
    }
    return { step: index + 1, command, entries, inputs: [...inputs].sort() };
  });
}

export function validateCoverage(map, commands = commandsFromPackage(PKG)) {
  const errors = [];
  if (map.length !== commands.length) errors.push(`map covers ${map.length}/${commands.length} commands`);
  for (let index = 0; index < commands.length; index += 1) {
    const row = map[index];
    if (!row || row.command !== commands[index]) errors.push(`step ${index + 1}: command identity mismatch`);
    if (!row?.entries?.length) errors.push(`step ${index + 1}: no executable input classified`);
    for (const entry of row?.entries || []) if (!existsSync(join(ROOT, entry))) errors.push(`step ${index + 1}: missing entry ${entry}`);
  }
  return errors;
}

function gitChangedPaths() {
  const run = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true })
    .split(/\r?\n/).map(slash).filter(Boolean);
  return [...new Set([...run(['diff', '--name-only', 'HEAD']), ...run(['ls-files', '--others', '--exclude-standard'])])]
    .filter((path) => !IGNORE_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .sort();
}

function categories(path) {
  const result = [];
  if (/\.(?:html|md)$/.test(path) || /^(?:news|games|membership|status|login|vault-member)\//.test(path)) result.push('content');
  if (/\.(?:css|png|jpe?g|webp|avif|svg|ico)$/.test(path) || path.startsWith('assets/')) result.push('style');
  if (/\.(?:json|ndjson)$/.test(path) || /^(?:api|data|context)\//.test(path)) result.push('data');
  if (path.startsWith('.github/workflows/')) result.push('workflow');
  return result;
}

export function planForChanges(changedPaths, commands = commandsFromPackage(PKG)) {
  const changed = [...new Set(changedPaths.map(slash))].sort();
  const map = buildImpactMap(commands);
  const coverageErrors = validateCoverage(map, commands);
  if (coverageErrors.length) throw new Error(`impact map incomplete: ${coverageErrors.slice(0, 5).join('; ')}`);
  const selectAll = changed.includes('package.json') || changed.includes('scripts/run-build-check.mjs') || changed.includes('scripts/plan-build-check.mjs');
  const selected = [];
  for (const row of map) {
    const reasons = [];
    if (selectAll) reasons.push('verification-plan-changed');
    for (const path of changed) {
      if (row.inputs.includes(path)) reasons.push(`input:${path}`);
      const cats = categories(path);
      if (cats.includes('content') && CONTENT_CHECKS.test(row.command)) reasons.push(`content-class:${path}`);
      if (cats.includes('style') && STYLE_CHECKS.test(row.command)) reasons.push(`render-class:${path}`);
      if (cats.includes('data') && DATA_CHECKS.test(row.command)) reasons.push(`data-class:${path}`);
      if (cats.includes('workflow') && /(?:workflow|promotion|deploy|supply-chain|sri|security)/.test(row.command)) reasons.push(`workflow-class:${path}`);
    }
    if (changed.length && GLOBAL_SENTINELS.test(row.command)) reasons.push('global-sentinel');
    if (reasons.length) selected.push({ ...row, reasons: [...new Set(reasons)].sort() });
  }
  const selectedCommands = selected.map((row) => row.command);
  const claimed = new Set();
  for (const row of selected) for (const reason of row.reasons) if (reason.includes(':')) claimed.add(reason.slice(reason.indexOf(':') + 1));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    publicSafe: true,
    authority: 'partial',
    canSatisfyCloseout: false,
    changedPaths: changed,
    unclaimedPaths: changed.filter((path) => !claimed.has(path) && !selectAll),
    fullCommandCount: commands.length,
    selectedCommandCount: selected.length,
    fullPlanFingerprint: fingerprintCommands(commands),
    selectedPlanFingerprint: fingerprintCommands(selectedCommands),
    sourceFingerprint: sha256(readFileSync(fileURLToPath(import.meta.url))),
    selected,
    note: 'Impacted checks accelerate the inner loop. Only a complete run-build-check receipt can satisfy closeout.',
  };
}

function selfTest() {
  const fixtureCommands = [
    'node scripts/check-theme-boot-contract.mjs --check',
    'node scripts/check-mobile-contracts.mjs',
    'node scripts/lint-repo.mjs',
    'node scripts/check-deploy-currency-gate.mjs',
  ];
  const fakeMap = fixtureCommands.map((command, index) => ({ step: index + 1, command, entries: ['scripts/plan-build-check.mjs'], inputs: ['scripts/plan-build-check.mjs'] }));
  const coverage = validateCoverage(fakeMap, fixtureCommands);
  const plan = planForChanges(['assets/example.css'], fixtureCommands);
  const all = planForChanges(['package.json'], fixtureCommands);
  const cases = [
    ['fixture map covers every command', coverage.length === 0],
    ['style change selects mobile contract', plan.selected.some((row) => row.command.includes('mobile-contracts'))],
    ['global sentinel always selected', plan.selected.some((row) => row.command.includes('lint-repo'))],
    ['package change selects the full plan', all.selectedCommandCount === fixtureCommands.length],
    ['partial authority cannot satisfy closeout', plan.authority === 'partial' && plan.canSatisfyCloseout === false],
    ['full and selected fingerprints differ', plan.fullPlanFingerprint !== plan.selectedPlanFingerprint],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`plan-build-check --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--self-test')) selfTest();
  const map = buildImpactMap();
  if (process.argv.includes('--check-coverage')) {
    const errors = validateCoverage(map);
    if (errors.length) { errors.forEach((error) => console.error(`  - ${error}`)); process.exit(1); }
    console.log(`plan-build-check --check-coverage: ${map.length}/${map.length} commands classified`);
  } else {
    const explicit = process.argv.find((arg) => arg.startsWith('--changed='));
    const changed = explicit ? explicit.slice('--changed='.length).split(',').filter(Boolean) : gitChangedPaths();
    const plan = planForChanges(changed);
    console.log(JSON.stringify(plan, null, 2));
  }
}
