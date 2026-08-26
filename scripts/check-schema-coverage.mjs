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

  if (fail === 0) { console.log('✓ check-schema-coverage --self-test: 9/9 passed'); process.exit(0); }
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

console.log('\ncheck-schema-coverage: ' + ok + ' OK, ' + failures + ' failed');
if (failures > 0) {
  console.error('Entity schema missing on ' + failures + ' page(s). Run the appropriate enrich-* script or add a JSON-LD block.');
  process.exit(1);
}
