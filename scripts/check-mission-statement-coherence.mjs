#!/usr/bin/env node
/* check-mission-statement-coherence.mjs — S204/S205 identity-drift gate.

   Mission: WARN when any mission surface reintroduces retired framing outside
   /universe/ lore. The failure this closes: a future session's copy, context
   carry, or AI hallucination silently restores "pressure system", "moment before
   ignition", or "not a metaphor for storage" to a public mission surface —
   contradicting the S204 purpose-first rewrite.

   Decision source: DECISIONS.md 2026-06-18 — retired phrases and /universe/
   exemption documented. SIL brainstorm #1 committed to TASK_BOARD.

   Six mission surfaces checked:
     index.html              — homepage hero + "Inside The Vault" panel
     studio/index.html       — The VaultSpark Manifesto (canonical mission)
     press/index.html        — press bio
     join/index.html         — join subtext
     universe/index.html     — EXEMPT (in-world cosmology, not studio mission)
     universe/voidfall/index.html — EXEMPT (fiction lore)

   Retired phrases (case-insensitive):
     "moment before ignition"
     "pressure system"
     "not a metaphor for storage"
     "cannot be un-sparked"
     "cannot go back into containment"
     "permanent" (in context of sparked status — broad, WARNs not ERRORs)

   Exit codes:
     0 — clean (no violations on checked surfaces)
     1 — WARN (violations found; non-fatal in CI — WARN not ERROR per spec)

   Usage:
     node scripts/check-mission-statement-coherence.mjs
     node scripts/check-mission-statement-coherence.mjs --self-test
     node scripts/check-mission-statement-coherence.mjs --verbose
*/

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const VERBOSE = args.includes('--verbose');

// Surfaces to CHECK (relative to ROOT)
const MISSION_SURFACES = [
  'index.html',
  'studio/index.html',
  'press/index.html',
  'join/index.html',
];

// Surfaces EXEMPT (in-world fiction / lore — not studio mission copy)
const EXEMPT_PREFIXES = [
  'universe/',
];

// Retired phrases: [pattern, severity ('error'|'warn'), description]
const RETIRED_PHRASES = [
  [/moment before ignition/i, 'error', 'Retired mission framing: "moment before ignition"'],
  [/pressure system/i, 'error', 'Retired mission framing: "pressure system"'],
  [/not a metaphor for storage/i, 'error', 'Retired mission framing: "not a metaphor for storage"'],
  [/cannot be un-sparked/i, 'error', 'Retired lifecycle claim: "cannot be un-sparked"'],
  [/cannot go back into containment/i, 'error', 'Retired lifecycle claim: "cannot go back into containment"'],
  // "permanently sparked" / "sparked permanently" / "sparked... cannot... permanent" lifecycle claims
  [/sparked\s+permanently|permanently\s+sparked|sparked.*cannot.*permanent|once\s+sparked.*permanent/i, 'warn', 'Possible permanence claim about sparked lifecycle status (review)'],
];

function isExempt(path) {
  return EXEMPT_PREFIXES.some(p => path.startsWith(p));
}

function checkSurface(relPath) {
  const fullPath = join(ROOT, relPath);
  if (!existsSync(fullPath)) {
    return { relPath, skipped: true, reason: 'file not found' };
  }
  const html = readFileSync(fullPath, 'utf8');
  const violations = [];
  for (const [pattern, severity, desc] of RETIRED_PHRASES) {
    const match = html.match(pattern);
    if (match) {
      violations.push({ severity, desc, match: match[0].slice(0, 60) });
    }
  }
  return { relPath, violations };
}

// --- self-test ---
function selfTest() {
  const cases = [
    { html: 'The vault is where we work', expect: 0 },
    { html: 'This is a moment before ignition', expect: 1 },
    { html: 'The pressure system holds worlds', expect: 1 },
    { html: 'The vault is not a metaphor for storage', expect: 1 },
    { html: 'A sparked project cannot be un-sparked', expect: 1 },
  ];
  let pass = 0;
  let fail = 0;
  for (const { html, expect } of cases) {
    const found = RETIRED_PHRASES.filter(([p]) => p.test(html)).length > 0 ? 1 : 0;
    if (found === expect) {
      pass++;
    } else {
      fail++;
      console.error(`  FAIL: expected ${expect} violation(s) in: "${html}"`);
    }
  }
  console.log(`check-mission-statement-coherence self-test: ${pass}/${cases.length} passed${fail ? ' — ' + fail + ' failed' : ''}`);
  process.exit(fail > 0 ? 1 : 0);
}

if (SELF_TEST) { selfTest(); }

// --- main scan ---
let totalErrors = 0;
let totalWarns = 0;
const results = [];

for (const relPath of MISSION_SURFACES) {
  if (isExempt(relPath)) {
    if (VERBOSE) console.log(`  skip (exempt): ${relPath}`);
    continue;
  }
  const result = checkSurface(relPath);
  results.push(result);

  if (result.skipped) {
    if (VERBOSE) console.log(`  skip (missing): ${relPath}`);
    continue;
  }

  for (const v of result.violations) {
    if (v.severity === 'error') totalErrors++;
    else totalWarns++;
    const icon = v.severity === 'error' ? '⛔' : '⚠ ';
    console.log(`  ${icon} ${relPath}: ${v.desc}`);
    if (VERBOSE) console.log(`     matched: "${v.match}"`);
  }
}

const checked = results.filter(r => !r.skipped).length;
const clean = results.filter(r => !r.skipped && r.violations.length === 0).length;

if (totalErrors === 0 && totalWarns === 0) {
  console.log(`✓ check-mission-statement-coherence · ${checked} surfaces clean · no retired framing detected`);
  process.exit(0);
} else {
  console.log(`check-mission-statement-coherence · ${clean}/${checked} clean · ${totalErrors} error(s) · ${totalWarns} warn(s)`);
  console.log('  Retired framing detected — review before deploying mission surfaces.');
  // WARN mode: exit 1 so build:check surfaces it but CI doesn't hard-block (advisory)
  process.exit(1);
}
