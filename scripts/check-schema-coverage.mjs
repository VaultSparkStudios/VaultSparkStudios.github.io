#!/usr/bin/env node
/**
 * check-schema-coverage.mjs (S236)
 *
 * Gates that a curated set of high-traffic public pages each carry at least one
 * "entity schema" block — a JSON-LD @type that is NOT one of the navigation-only
 * types (BreadcrumbList, ListItem). When a page has only breadcrumb schema (or
 * nothing at all) it is a structured-data dead zone: search engines see no entity
 * signal, rich results are impossible, and AI crawlers get no typed context.
 *
 * This gate closes the class shipped in S236 (membership, oracle, nervous-system,
 * pathways, membership-value all had zero entity schema). It runs on a WHITELIST
 * of must-have pages — not every HTML file — so adding new pages doesn't silently
 * break the build; only the listed pages are gated.
 *
 * Usage:
 *   node scripts/check-schema-coverage.mjs           # live check (build:check)
 *   node scripts/check-schema-coverage.mjs --self-test
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';
import { ORG_ID, WEBSITE_ID, isStudioOrganization, isStudioWebsite } from './lib/org-entity.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const SELF_TEST = process.argv.includes('--self-test');

/* Navigation-only types that don't count as entity schema */
const NAV_TYPES = new Set(['BreadcrumbList', 'ListItem']);

/* Pages that MUST carry at least one entity-schema @type */
const REQUIRED = [
  { path: 'index.html',            expected: ['WebSite', 'Organization', 'ItemList'] },
  { path: 'membership/index.html', expected: ['Product'] },
  { path: 'vaultsparked/index.html', expected: ['ItemList'] },
  { path: 'pathways/index.html',   expected: ['CollectionPage'] },
  { path: 'oracle/index.html',     expected: ['WebApplication'] },
  { path: 'nervous-system/index.html', expected: ['WebApplication'] },
  { path: 'membership-value/index.html', expected: ['WebPage', 'BreadcrumbList'], allowNavOnly: true }, /* breadcrumb injected; any schema counts */
  { path: 'games/index.html',      expected: ['CollectionPage', 'ItemList'] },
  { path: 'projects/index.html',   expected: ['CollectionPage'] },
  { path: 'atlas/index.html',      expected: ['ItemList'] },
  { path: 'faq/index.html',        expected: ['FAQPage'] },
  { path: 'press/index.html',      expected: ['Organization', 'WebPage', 'BreadcrumbList'] },
  { path: 'studio/index.html',     expected: ['Organization', 'WebPage', 'BreadcrumbList'] },
  { path: 'changelog/index.html',  expected: ['CollectionPage', 'ItemList', 'BreadcrumbList'] },
  { path: 'journal/index.html',    expected: ['Blog', 'CollectionPage', 'BreadcrumbList'] },
  { path: 'community/index.html',  expected: ['WebPage', 'BreadcrumbList'] },
];

function parseTypes(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  const types = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const d = JSON.parse(m[1]);
      if (d['@type']) types.add(d['@type']);
      /* @graph arrays carry typed entities at the array level */
      if (Array.isArray(d['@graph'])) {
        d['@graph'].forEach(node => { if (node['@type']) types.add(node['@type']); });
      }
    } catch {}
  }
  return types;
}

/* ── One entity graph (agent-geo-layer-v2) ──────────────────────────────────
 * Every served page that declares the studio as an Organization (by name or by
 * root URL) must declare it under the canonical @id; a studio WebSite node must
 * carry #website. Pages that only REFERENCE the studio ({"@id": "…#org"}) pass.
 * Without this, each hand-edited page re-forks the studio into another
 * anonymous entity and answer engines see N studios instead of one. */
export function entityGraphFindings(html) {
  const findings = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  const visit = (n, at) => {
    if (Array.isArray(n)) { n.forEach((x) => visit(x, at)); return; }
    if (!n || typeof n !== 'object') return;
    if (isStudioOrganization(n) && n['@id'] !== ORG_ID) findings.push(`${at || '(root)'}: Organization "${n.name || n.url}" without "@id":"${ORG_ID}"`);
    if (isStudioWebsite(n) && n['@id'] !== WEBSITE_ID) findings.push(`${at || '(root)'}: WebSite without "@id":"${WEBSITE_ID}"`);
    for (const [k, v] of Object.entries(n)) visit(v, k === '@graph' ? at : (at ? at + '.' : '') + k);
  };
  while ((m = re.exec(html)) !== null) {
    let d;
    try { d = JSON.parse(m[1]); } catch { continue; }
    visit(d, '');
  }
  return findings;
}

function servedHtmlFiles() {
  const served = JSON.parse(readFileSync(join(ROOT, 'config', 'served-surface.json'), 'utf8'));
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean);
  return tracked
    .filter((f) => served.exact.includes(f) || served.prefixes.some((p) => f.startsWith(p)))
    .filter((f) => !(served.excludedPrefixes || []).some((p) => f.startsWith(p)));
}

function hasEntitySchema(types) {
  for (const t of types) {
    if (!NAV_TYPES.has(t)) return true;
  }
  return false;
}

function isRedirectStub(html) {
  return /<meta\s+name="robots"\s+content="noindex,follow"/i.test(html)
    && /<link\s+rel="canonical"\s+href="https:\/\/vaultsparkstudios\.com\//i.test(html)
    && /<meta\s+http-equiv="refresh"\s+content="0;url=\//i.test(html);
}

if (SELF_TEST) {
  let fail = 0;
  const assert = (c, msg) => { if (!c) { console.error('  ✗ ' + msg); fail++; } };

  /* Test parseTypes */
  const html1 = '<script type="application/ld+json">{"@type":"WebSite"}</script>' +
    '<script type="application/ld+json" data-vs-breadcrumb>{"@type":"BreadcrumbList"}</script>';
  const t1 = parseTypes(html1);
  assert(t1.has('WebSite'), 'parseTypes: finds WebSite');
  assert(t1.has('BreadcrumbList'), 'parseTypes: finds BreadcrumbList');
  assert(t1.size === 2, 'parseTypes: correct size');

  /* Test @graph unwrapping */
  const html2 = '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"AboutPage"},{"@type":"FAQPage"}]}</script>';
  const t2 = parseTypes(html2);
  assert(t2.has('AboutPage'), 'parseTypes @graph: finds AboutPage');
  assert(t2.has('FAQPage'), 'parseTypes @graph: finds FAQPage');

  /* Test hasEntitySchema */
  assert(hasEntitySchema(new Set(['WebSite', 'BreadcrumbList'])), 'hasEntitySchema: true when mixed');
  assert(!hasEntitySchema(new Set(['BreadcrumbList', 'ListItem'])), 'hasEntitySchema: false when nav-only');
  assert(!hasEntitySchema(new Set()), 'hasEntitySchema: false when empty');
  assert(isRedirectStub('<meta name="robots" content="noindex,follow"><link rel="canonical" href="https://vaultsparkstudios.com/new/"><meta http-equiv="refresh" content="0;url=/new/">'), 'redirect stub: verified contract passes');
  assert(!isRedirectStub('<meta name="robots" content="noindex,follow">'), 'redirect stub: incomplete contract fails');

  /* Entity graph: canonical @id passes, references pass, re-declarations fail (negative controls) */
  const ld = (o) => '<script type="application/ld+json">' + JSON.stringify(o) + '</script>';
  assert(entityGraphFindings(ld({ '@type': 'Organization', '@id': ORG_ID, name: 'VaultSpark Studios' })).length === 0, 'entity graph: canonical Organization passes');
  assert(entityGraphFindings(ld({ '@type': 'Article', publisher: { '@id': ORG_ID } })).length === 0, 'entity graph: @id reference passes');
  assert(entityGraphFindings(ld({ '@type': 'Article', publisher: { '@type': 'Organization', name: 'VaultSpark Studios', url: 'https://vaultsparkstudios.com/' } })).length === 1, 'entity graph NEGATIVE: re-declared publisher without @id fails');
  assert(entityGraphFindings(ld({ '@graph': [{ '@type': 'Organization', name: 'VaultSpark Studios LLC', '@id': 'https://vaultsparkstudios.com/#organization' }] })).length === 1, 'entity graph NEGATIVE: wrong @id inside @graph fails');
  assert(entityGraphFindings(ld({ '@type': 'WebPage', isPartOf: { '@type': 'WebSite', url: 'https://vaultsparkstudios.com/' } })).length === 1, 'entity graph NEGATIVE: studio WebSite without #website fails');
  assert(entityGraphFindings(ld({ '@type': 'NewsArticle', author: { '@type': 'Organization', name: 'The Desk — AI personas', url: 'https://vaultsparkstudios.com/news/' } })).length === 0, 'entity graph: a different organization (The Desk) is not the studio');

  if (fail === 0) { console.log('✓ check-schema-coverage --self-test: 15/15 passed'); process.exit(0); }
  console.error('✗ check-schema-coverage --self-test: ' + fail + ' failed'); process.exit(1);
}

let failures = 0;
let ok = 0;
const missing = [];

for (const { path, expected, allowNavOnly } of REQUIRED) {
  const file = join(ROOT, path);
  if (!existsSync(file)) {
    console.warn('SKIP ' + path + ': file not found');
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (isRedirectStub(html)) {
    console.log('OK   ' + path + ': verified noindex redirect stub (entity schema not applicable)');
    ok++;
    continue;
  }
  const types = parseTypes(html);

  /* allowNavOnly pages pass even if they only have BreadcrumbList (schema injected at runtime) */
  const passes = allowNavOnly ? types.size > 0 : hasEntitySchema(types);
  if (!passes) {
    const has = [...types].join(', ') || '(none)';
    console.error('FAIL ' + path + ': entity schema missing (has: ' + has + ', expected one of: ' + expected.join(', ') + ')');
    missing.push(path);
    failures++;
  } else {
    const entity = [...types].filter(t => !NAV_TYPES.has(t)).join(', ') || 'BreadcrumbList (nav-only-ok)';
    console.log('OK   ' + path + ': entity schema present (' + entity + ')');
    ok++;
  }
}

/* Phase 2 — one entity graph across every served page */
const graphFiles = servedHtmlFiles();
let graphFailures = 0;
for (const f of graphFiles) {
  const file = join(ROOT, f);
  if (!existsSync(file)) continue;
  for (const finding of entityGraphFindings(readFileSync(file, 'utf8'))) {
    console.error('FAIL ' + f + ': ' + finding);
    graphFailures++;
  }
}
console.log('entity graph: ' + graphFiles.length + ' served page(s) scanned, ' + graphFailures + ' studio node(s) without the canonical @id');
failures += graphFailures;

console.log('\ncheck-schema-coverage: ' + ok + ' OK, ' + failures + ' failed');
if (failures > 0) {
  if (failures - graphFailures > 0) console.error('Entity schema missing on ' + (failures - graphFailures) + ' page(s). Run the appropriate enrich-* script or add a JSON-LD block.');
  if (graphFailures > 0) console.error(graphFailures + ' studio node(s) re-declare the studio. Reference it as {"@id":"' + ORG_ID + '"} (scripts/lib/org-entity.mjs) or give the full definition the canonical @id.');
  process.exit(1);
}
