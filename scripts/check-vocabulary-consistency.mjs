#!/usr/bin/env node
// check-vocabulary-consistency.mjs — fail if deprecated vocabulary appears in public HTML.
// Prevents "Forge Window" from re-entering after the Studio Pulse rename.
//
// Usage: node scripts/check-vocabulary-consistency.mjs
//        node scripts/check-vocabulary-consistency.mjs --self-test
// Wired into: npm run build:check

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

// Terms banned from public-facing HTML (label, regex, scanFooter?)
// scanFooter:true scans the FULL document (nav + footer included) — required for
// structural status vocab that lives in the shared footer legend. Without it the
// footer is stripped (default) so a banned prose term doesn't fire once per page.
// D-S208: SEALED was retired as a lifecycle status (folds into VAULTED, D-S207.9).
// S207's closeout claimed "purged sitewide" but the footer legend rendered it on
// 89 pages — this gate strips the footer, so it never caught the lie. These precise
// patterns match the retired *status label* only (class + exact legend text + the
// all-caps standalone status badge) and will NOT false-positive on legitimate
// "sealed" brand prose (Canon's "sealed record", narrative flavor, offline page).
const BANNED = [
  { label: 'Forge Window (renamed to Studio Pulse)', pattern: /\bForge\s+Window\b/g },
  { label: 'SEALED status legend class (retired — use VAULTED)', pattern: /legend-status-sealed/g, scanFooter: true },
  { label: 'SEALED status legend text (retired — use VAULTED)', pattern: /SEALED\s+&mdash;\s+Vault sealed|SEALED — Vault sealed/g, scanFooter: true },
  { label: 'SEALED standalone status badge (retired — use VAULTED)', pattern: /<span[^>]*>\s*SEALED\s*<\/span>/g, scanFooter: true },
];

// ─── Operator-vocabulary rule (S335) ────────────────────────────────────────
// The studio's internal working terms (session scores, numbered canon, the
// closeout/handoff ritual) leak onto public pages because those pages are fed
// by the same records the studio runs on. They are not banned — they are a
// feature — but a visitor must be able to find out what they mean. Rule: a
// public page may use one of these terms only if its OWN copy (nav + footer
// stripped, so the sitewide Resources column cannot satisfy it) links to the
// explainer at /how-we-build/. Offenders are reported as `file: term`.
export const OPERATOR_TERMS = [
  { term: 'SIL score', pattern: /\bSIL [Ss]core\b/g },
  { term: 'CANON-NNN', pattern: /\bCANON-\d{3}\b/g },
  { term: 'closeout', pattern: /\bcloseout\b/gi },
  { term: 'handoff', pattern: /\bhandoff\b/gi },
];
// Matches both markup (href="/how-we-build/#canon") and a script-built link
// (el.href = '/how-we-build/#canon') — the status tiles are rendered by JS.
export const HOW_WE_BUILD_LINK = /href\s*=\s*["'](?:https:\/\/vaultsparkstudios\.com)?\/how-we-build\/(?:#[\w-]+)?["']/;
// Public pages = tracked */index.html minus the gated/internal/agent/news surfaces.
// The explainer itself is exempt (it is the definition, not a leak).
const OPERATOR_EXCLUDED_DIRS = ['vault-member', 'investor-portal', 'studio-hub', 'ignis-health', '.ai', 'news'];
export function isOperatorPublicPage(rel) {
  const p = String(rel).replace(/\\/g, '/');
  if (!/(^|\/)index\.html$/.test(p)) return false;
  if (p === 'how-we-build/index.html') return false;
  const segments = p.split('/').slice(0, -1);
  return !segments.some((s) => OPERATOR_EXCLUDED_DIRS.includes(s));
}
/** Strip shared chrome + HTML/CSS/JS block comments so only the page's own copy is judged. */
export function ownCopy(html) {
  return html
    .replace(/<nav[\s\S]*?<\/nav>/g, '')
    .replace(/<footer[\s\S]*?<\/footer>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}
/** Returns the operator terms a page uses without linking to /how-we-build/ ([] when clean). */
export function operatorTermOffenders(html) {
  const copy = ownCopy(html);
  if (HOW_WE_BUILD_LINK.test(copy)) return [];
  const found = [];
  for (const { term, pattern } of OPERATOR_TERMS) {
    pattern.lastIndex = 0;
    if (pattern.test(copy)) found.push(term);
  }
  return found;
}
function trackedPublicPages() {
  const out = execFileSync('git', ['ls-files', 'index.html', '*/index.html'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean).filter(isOperatorPublicPage);
}

// HTML files to scan — skip generated/internal dirs
const SKIP_DIRS = new Set(['node_modules', '.git', '.cache', 'context', 'scripts', 'docs', 'logs', 'data']);

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

if (SELF_TEST) {
  // Verify each banned pattern detects a known violation, and that legitimate
  // "sealed" brand prose does NOT trip the status-vocab patterns.
  const fixtures = {
    'Forge Window (renamed to Studio Pulse)': 'Forge Window is old',
    'SEALED status legend class (retired — use VAULTED)': '<span class="legend-status-sealed">x</span>',
    'SEALED status legend text (retired — use VAULTED)': '<span>⬡ SEALED — Vault sealed</span>',
    'SEALED standalone status badge (retired — use VAULTED)': '<span class="vs-sealed-label">SEALED</span>',
  };
  // These must NOT match any status pattern (legitimate brand/product/narrative prose).
  const safe = ['a sealed record of who you are', 'the vault is sealed', 'sealed lore drops', 'vaulted again to hold their charge'];
  let pass = 0;
  for (const { label, pattern } of BANNED) {
    pattern.lastIndex = 0;
    if (fixtures[label] && pattern.test(fixtures[label])) pass++;
    else console.error(`✗ self-test: "${label}" failed to detect its fixture`);
  }
  let falsePos = 0;
  for (const { label, pattern, scanFooter } of BANNED) {
    if (!scanFooter) continue; // only status-vocab patterns are tested against safe prose
    for (const s of safe) { pattern.lastIndex = 0; if (pattern.test(s)) { falsePos++; console.error(`✗ self-test: "${label}" false-positived on "${s}"`); } }
  }
  // Operator-vocabulary rule: linked → clean; unlinked → every term reported;
  // footer-only link does NOT count; excluded dirs are not public pages.
  const opFail = [];
  const linked = '<main><p>The <a href="/how-we-build/#sil">SIL score</a> and CANON-007 after closeout.</p></main>';
  if (operatorTermOffenders(linked).length) opFail.push('linked page must be clean');
  const unlinked = '<main><p>Handoff done. SIL Score 812. CANON-031 holds after closeout.</p></main><footer><a href="/how-we-build/">How We Build</a></footer>';
  const off = operatorTermOffenders(unlinked);
  if (off.join(',') !== 'SIL score,CANON-NNN,closeout,handoff') opFail.push(`unlinked page must report all four terms (got: ${off.join(',') || 'none'})`);
  if (operatorTermOffenders('<p>Canon-free copy about a hand off and a scoreboard.</p>').length) opFail.push('word-bounded: "hand off" / "scoreboard" must not match');
  if (!isOperatorPublicPage('status/index.html') || !isOperatorPublicPage('index.html')) opFail.push('status/ and root index must be public');
  for (const rel of ['vault-member/index.html', 'investor-portal/apply/index.html', 'studio-hub/index.html', 'ignis-health/index.html', 'projects/seamline/.ai/index.html', 'news/2026/some-post/index.html', 'how-we-build/index.html', 'status/page.html']) {
    if (isOperatorPublicPage(rel)) opFail.push(`${rel} must be excluded`);
  }
  for (const f of opFail) console.error(`✗ self-test (operator vocabulary): ${f}`);
  const ok = pass === BANNED.length && falsePos === 0 && opFail.length === 0;
  console.log(ok ? `✓ self-test passed (${pass}/${BANNED.length} detect, 0 false-positives, operator-vocabulary rule ok)` : '✗ self-test failed');
  process.exit(ok ? 0 : 1);
}

let errorCount = 0;
for (const file of htmlFiles(ROOT)) {
  const content = readFileSync(file, 'utf8');
  // Default pass: skip nav/footer/comments — focus on unique page prose so a banned
  // term in the shared footer doesn't fire once per page.
  const pageContent = content.replace(/<nav[\s\S]*?<\/nav>/g, '').replace(/<footer[\s\S]*?<\/footer>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const { label, pattern, scanFooter } of BANNED) {
    pattern.lastIndex = 0;
    const target = scanFooter ? content : pageContent; // structural status vocab is checked against the FULL doc
    const matches = target.match(pattern);
    if (matches) {
      console.error(`✗ ${relative(ROOT, file)}: "${label}" (${matches.length} occurrences)`);
      errorCount++;
    }
  }
}

// Operator-vocabulary pass: public pages using studio working terms must link
// /how-we-build/ in their own copy. Fix by LINKING the term, never by deleting it.
let operatorCount = 0;
for (const rel of trackedPublicPages()) {
  const offenders = operatorTermOffenders(readFileSync(join(ROOT, rel), 'utf8'));
  for (const term of offenders) {
    console.error(`✗ ${rel}: ${term} (operator term without a /how-we-build/ link in page copy)`);
    operatorCount++;
  }
}

if (errorCount === 0 && operatorCount === 0) {
  console.log('✓ vocabulary-consistency: no deprecated terms found; every operator term links /how-we-build/');
  process.exit(0);
} else {
  if (errorCount) console.error(`✗ vocabulary-consistency: ${errorCount} file(s) with deprecated terms — fix before push`);
  if (operatorCount) console.error(`✗ vocabulary-consistency: ${operatorCount} unexplained operator term(s) — link them to /how-we-build/ (see that page's anchors)`);
  process.exit(1);
}
