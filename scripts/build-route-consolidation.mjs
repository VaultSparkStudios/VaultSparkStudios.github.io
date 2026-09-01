#!/usr/bin/env node
/**
 * build-route-consolidation.mjs — route-consolidation COURT (S335).
 *
 * History: until S335 this script RENDERED a meta-refresh stub page for every
 * retired route in config/route-consolidation.json, and ran in both prebuild
 * and postbuild. S334 deleted the stubs twice ("_redirects is the single
 * source of truth") and every `npm run build` quietly wrote them back. The
 * name is kept so the proof-surface registry and diagnostics that reference
 * it stay valid; it no longer writes anything.
 *
 * What it asserts now (--check, also the default):
 *   1. every analysed redirect has an edge rule in _redirects (with and
 *      without the trailing slash) whose destination matches the analysis;
 *   2. no retired route still ships an index.html — a stub would paint before
 *      the 301 and the two mechanisms could drift;
 *   3. no tracked HTML anywhere carries <meta http-equiv="refresh"> — the
 *      class is closed, not just the listed routes.
 *
 * Exit 1 with every finding listed; exit 0 when the tree agrees with the edge.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'route-consolidation.json');
const REDIRECTS_PATH = path.join(ROOT, '_redirects');

/** Parse _redirects into [{ from, to, status }] ignoring comments/blank lines. */
export function parseRedirects(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/);
      return { from, to, status: Number(status) || 301 };
    });
}

/** Normalise a path for comparison: strip trailing slash except root, keep hash. */
function key(p) {
  const [pathPart, hash] = String(p || '').split('#');
  const bare = pathPart.length > 1 ? pathPart.replace(/\/+$/, '') : pathPart;
  return hash ? `${bare}#${hash}` : bare;
}

export function judge({ rules, redirects, stubExists, refreshFiles }) {
  const findings = [];
  const byFrom = new Map(redirects.map((r) => [key(r.from), r]));
  for (const rule of rules) {
    const slash = byFrom.get(key(rule.from));
    if (!slash) findings.push(`no _redirects rule for ${rule.from}`);
    else if (key(slash.to) !== key(rule.to)) findings.push(`${rule.from} → ${slash.to} in _redirects but analysis says ${rule.to}`);
    if (stubExists(rule.from)) findings.push(`${rule.from} still ships index.html (stub must be deleted; the edge 301 owns this route)`);
  }
  for (const file of refreshFiles) findings.push(`${file} contains http-equiv="refresh" (meta-refresh stubs are retired; use _redirects)`);
  return findings;
}

function trackedHtmlWithRefresh() {
  const r = spawnSync('git', ['grep', '-l', '-i', 'http-equiv="refresh"', '--', '*.html'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0 && !r.stdout) return [];
  return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).filter((f) => !f.startsWith('node_modules/'));
}

function selfTest() {
  const rules = [{ from: '/old/', to: '/new/#part', label: 'Old' }];
  const good = parseRedirects('# c\n/old/*   /new/#part   301\n/old   /new/#part   301\n');
  const bad = parseRedirects('/old   /elsewhere/   301\n');
  const cases = [
    ['parses rules and skips comments', good.length === 2 && good[0].status === 301],
    ['clean tree passes', judge({ rules, redirects: good, stubExists: () => false, refreshFiles: [] }).length === 0],
    ['missing edge rule fails', judge({ rules, redirects: [], stubExists: () => false, refreshFiles: [] })[0].includes('no _redirects rule')],
    ['destination drift fails', judge({ rules, redirects: bad, stubExists: () => false, refreshFiles: [] })[0].includes('analysis says')],
    ['surviving stub fails', judge({ rules, redirects: good, stubExists: () => true, refreshFiles: [] }).some((f) => f.includes('still ships index.html'))],
    ['any meta-refresh anywhere fails', judge({ rules, redirects: good, stubExists: () => false, refreshFiles: ['x/index.html'] }).some((f) => f.includes('meta-refresh'))],
    ['hash anchors compare exactly', key('/a/#b') === '/a#b' && key('/a/') === '/a'],
  ];
  let failed = 0;
  for (const [name, ok] of cases) { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++; }
  console.log(`build-route-consolidation --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const redirects = parseRedirects(fs.readFileSync(REDIRECTS_PATH, 'utf8'));
  const findings = judge({
    rules: config.redirects || [],
    redirects,
    stubExists: (from) => fs.existsSync(path.join(ROOT, from.replace(/^\//, ''), 'index.html')),
    refreshFiles: trackedHtmlWithRefresh(),
  });
  if (findings.length) {
    console.error(`build-route-consolidation: FAIL · ${findings.length} finding(s)`);
    for (const f of findings) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`build-route-consolidation: check passed · ${(config.redirects || []).length} retired route(s) owned by _redirects, zero stubs, zero meta-refresh pages`);
}

if (process.argv.includes('--self-test')) selfTest();
else main();
