#!/usr/bin/env node
/**
 * Project-scoped wrapper for the canonical Studio npm IOC scanner.
 *
 * CANON-023 requires a supply-chain scan after lockfile changes and before
 * push. The canonical scanner is portfolio-capable, but this repository's
 * gate must scan only this repository: per-project skills may not walk every
 * sibling checkout, and doing so made one check consume a third of build time.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const SELF_TEST = args.includes('--self-test');
const SCANNER = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'scan-npm-supply-chain.mjs');

export function projectSlug(root = ROOT) {
  try {
    const status = JSON.parse(fs.readFileSync(path.join(root, 'context', 'PROJECT_STATUS.json'), 'utf8'));
    return typeof status.slug === 'string' && status.slug.trim() ? status.slug.trim() : null;
  } catch {
    return null;
  }
}

export function scannerArgs(slug) {
  if (!slug) return null;
  return ['--json', '--repo', slug];
}

export function parseScannerReport(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || '').trim());
  } catch {
    return { available: false, findings: [], incidentCount: 0 };
  }

  const findings = [];
  if (Array.isArray(parsed)) findings.push(...parsed);
  for (const key of ['findings', 'issues', 'iocs']) {
    if (Array.isArray(parsed?.[key])) findings.push(...parsed[key]);
  }
  for (const incident of Array.isArray(parsed?.incidents) ? parsed.incidents : []) {
    for (const repo of Array.isArray(incident?.repos) ? incident.repos : []) {
      const buckets = repo.findings && typeof repo.findings === 'object' ? repo.findings : repo;
      for (const kind of ['hits', 'iocs', 'droppers']) {
        for (const finding of Array.isArray(buckets?.[kind]) ? buckets[kind] : []) {
          findings.push({ incident: incident.id ?? null, repo: repo.slug ?? repo.repo ?? null, kind, finding });
        }
      }
    }
  }
  return {
    available: true,
    findings,
    incidentCount: Array.isArray(parsed?.incidents) ? parsed.incidents.length : 0,
  };
}

function selfTest() {
  const nested = JSON.stringify({
    incidents: [{ id: 'ioc-1', repos: [{ slug: 'demo', findings: { hits: [{ name: 'bad' }], iocs: [], droppers: [] } }] }],
  });
  const cases = [
    ['scoped args include the exact project', JSON.stringify(scannerArgs('demo')) === JSON.stringify(['--json', '--repo', 'demo'])],
    ['missing slug never falls back to a portfolio scan', scannerArgs(null) === null],
    ['canonical clean report parses', parseScannerReport('{"incidents":[]}').available],
    ['malformed scanner output is unavailable, not clean', parseScannerReport('not-json').available === false],
    ['nested canonical findings are not silently dropped', parseScannerReport(nested).findings.length === 1],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`verify-supply-chain --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

if (SELF_TEST) selfTest();

if (!fs.existsSync(path.join(ROOT, 'package-lock.json'))) {
  console.log('verify-supply-chain: no package-lock.json — nothing to scan');
  process.exit(0);
}
if (!fs.existsSync(SCANNER)) {
  console.warn('verify-supply-chain: UNAVAILABLE — canonical studio-ops scanner is not present');
  process.exit(STRICT ? 1 : 0);
}

const slug = projectSlug();
const scopedArgs = scannerArgs(slug);
if (!scopedArgs) {
  console.warn('verify-supply-chain: UNAVAILABLE — PROJECT_STATUS.json has no canonical slug; portfolio fallback refused');
  process.exit(STRICT ? 1 : 0);
}

const res = spawnSync(process.execPath, [SCANNER, ...scopedArgs], { cwd: ROOT, encoding: 'utf8' });
const report = parseScannerReport(res.stdout);
if (!report.available) {
  console.warn(`verify-supply-chain: UNAVAILABLE — scanner output was not valid JSON (scope=${slug}, exit=${res.status ?? 'unknown'})`);
  const detail = String(res.stderr || res.stdout || '').trim();
  if (detail) console.warn(detail.split('\n').slice(0, 8).join('\n'));
  process.exit(STRICT ? 1 : 0);
}

if (report.findings.length) {
  console.log(`verify-supply-chain: ${report.findings.length} finding(s) in scope=${slug}:`);
  for (const finding of report.findings.slice(0, 20)) console.log(`  • ${JSON.stringify(finding)}`);
  if (STRICT) {
    console.error('\n✗ supply-chain findings present (strict)');
    process.exit(1);
  }
  console.log('\n(advisory mode — findings surfaced, not hidden)');
  process.exit(0);
}

if (res.status && res.status !== 0) {
  console.warn(`verify-supply-chain: UNAVAILABLE — scanner exited ${res.status} without parseable findings (scope=${slug})`);
  process.exit(STRICT ? 1 : 0);
}

console.log(`verify-supply-chain: ✓ no IOC findings · scope=${slug} · ${report.incidentCount} incident set(s) (CANON-023)`);
process.exit(0);
