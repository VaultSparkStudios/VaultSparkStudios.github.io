#!/usr/bin/env node
/**
 * check-hero-jsonld-completeness.mjs — S223 gate (S220 committed brainstorm)
 *
 * S220 flagship: enriched hero ItemList JSON-LD (description/genre/image + VideoGame fields
 * + sameAs per tile). This gate locks that win against silent regression by parsing the
 * LIVE injected `data-hero-portfolio-ld` block in index.html and asserting completeness
 * per tile type.
 *
 * Rules per tile:
 *   SPARKED VideoGame   — must have: description, genre, image, applicationCategory, sameAs
 *   SPARKED CreativeWork — must have: description, genre, sameAs
 *   FORGE/VAULTED tiles — advisory only (not yet live; fields may be sparse)
 *
 * Modes:
 *   (no flag)   check + exit 1 on failures (default — CI gate)
 *   --warn-only advisory only, never exit 1
 *   --self-test run internal assertions then exit 0/1
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WARN_ONLY = process.argv.includes('--warn-only');
const SELF_TEST = process.argv.includes('--self-test');
const INDEX_HTML = join(ROOT, 'index.html');

function extractJsonLd(html) {
  const m = html.match(/data-hero-portfolio-ld>([\s\S]*?)<\/script>/);
  if (!m) return null;
  // Reverse the < escape applied at render time
  return JSON.parse(m[1].replace(/\\u003c/g, '<'));
}

function auditItems(ld) {
  const items = (ld.itemListElement || []).map((e) => e.item || e);
  const failures = [];
  const warnings = [];

  for (const item of items) {
    const name = item.name || '(unnamed)';
    const isGame = item['@type'] === 'VideoGame';
    const isPublished = item.creativeWorkStatus === 'Published';

    if (!isPublished) {
      // FORGE/VAULTED — advisory only
      const missingFields = [];
      if (!item.description) missingFields.push('description');
      if (!item.genre) missingFields.push('genre');
      if (missingFields.length) {
        warnings.push(`${name} (in-development) missing: ${missingFields.join(', ')}`);
      }
      continue;
    }

    // SPARKED tile — required fields
    const required = ['description', 'genre', 'sameAs'];
    if (isGame) required.push('image', 'applicationCategory');

    const missing = required.filter((f) => !item[f]);
    if (missing.length) {
      failures.push(`${name} (${item['@type']}, SPARKED) missing: ${missing.join(', ')}`);
    }
  }

  return { failures, warnings, count: items.length };
}

function selfTest() {
  let pass = 0; let fail = 0;
  const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

  // Test 1: extract JSON-LD
  const sampleHtml = `<script type="application/ld+json" data-hero-portfolio-ld>{"@context":"https://schema.org","@type":"ItemList","itemListElement":[{"@type":"ListItem","position":1,"item":{"@type":"VideoGame","name":"Test Game","creativeWorkStatus":"Published","description":"desc","genre":"Action","image":"https://example.com/cover.png","applicationCategory":"GameApplication","sameAs":"https://example.com/game/"}},{"@type":"ListItem","position":2,"item":{"@type":"CreativeWork","name":"Test Project","creativeWorkStatus":"Published","description":"proj","genre":"Tool","sameAs":"https://project.com"}}]}</script>`;

  const ld = extractJsonLd(sampleHtml);
  assert(ld !== null, 'extractJsonLd parses valid HTML');
  assert(ld.itemListElement.length === 2, 'two items extracted');

  const { failures, warnings, count } = auditItems(ld);
  assert(failures.length === 0, 'complete SPARKED tiles pass (no failures)');
  assert(count === 2, 'item count returned');

  // Test 2: incomplete SPARKED VideoGame → should fail
  const badHtml = `<script type="application/ld+json" data-hero-portfolio-ld>{"@context":"https://schema.org","@type":"ItemList","itemListElement":[{"@type":"ListItem","position":1,"item":{"@type":"VideoGame","name":"Bad Game","creativeWorkStatus":"Published"}}]}</script>`;
  const badLd = extractJsonLd(badHtml);
  const { failures: bf } = auditItems(badLd);
  assert(bf.length > 0, 'incomplete SPARKED VideoGame produces failures');
  assert(bf[0].includes('description'), 'missing description is reported');

  // Test 3: FORGE item without fields → warning only, not failure
  const forgeHtml = `<script type="application/ld+json" data-hero-portfolio-ld>{"@context":"https://schema.org","@type":"ItemList","itemListElement":[{"@type":"ListItem","position":1,"item":{"@type":"VideoGame","name":"Forge Game","creativeWorkStatus":"In development"}}]}</script>`;
  const forgeLd = extractJsonLd(forgeHtml);
  const { failures: ff, warnings: fw } = auditItems(forgeLd);
  assert(ff.length === 0, 'FORGE item missing fields does not cause failure');
  assert(fw.length > 0, 'FORGE item missing fields produces advisory warning');

  // Test 4: null on missing block
  assert(extractJsonLd('<html>no ld here</html>') === null, 'returns null when block absent');

  console.log(`check-hero-jsonld-completeness --self-test: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

function main() {
  if (!existsSync(INDEX_HTML)) {
    console.error('check-hero-jsonld-completeness: index.html not found');
    if (!WARN_ONLY) process.exit(1);
    return;
  }

  const html = readFileSync(INDEX_HTML, 'utf8');
  const ld = extractJsonLd(html);

  if (!ld) {
    console.error('check-hero-jsonld-completeness: data-hero-portfolio-ld block not found in index.html');
    if (!WARN_ONLY) process.exit(1);
    return;
  }

  const { failures, warnings, count } = auditItems(ld);

  if (warnings.length) {
    for (const w of warnings) console.warn(`  ⚠ ${w}`);
  }

  if (failures.length === 0) {
    console.log(`check-hero-jsonld-completeness: ✓ ${count} tile(s) — SPARKED tiles carry required JSON-LD fields`);
    return;
  }

  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`check-hero-jsonld-completeness: ${failures.length} SPARKED tile(s) missing required JSON-LD fields`);
  console.error('  Fix: run `node scripts/build-hero-portfolio.mjs` (add description/genre/image/sameAs to the catalog entry)');
  if (!WARN_ONLY) process.exit(1);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  if (SELF_TEST) { selfTest(); process.exit(0); }
  main();
}
