#!/usr/bin/env node
/**
 * check-decision-currency.mjs — S218 (second-order innovation)
 *
 * Makes context/DECISIONS.md self-validating against the LIVE deployed corpus.
 *
 * THE FAILURE THIS PREVENTS (S218 B3): DECISIONS.md carried D-S106/S151 "Forge Window
 * is the public label" on top, with NO superseded marker — but S185 had reverted the
 * product label to "Studio Pulse" (enforced by check-s151-contracts). The stale decision
 * spawned a PHANTOM genius-list item ("Forge Window propagation") that wasted a whole
 * implement cycle before the contract caught the regression. A decision that asserts a
 * CURRENT-STATE fact can rot; the live site is the source of truth.
 *
 * THE CHECK: extract every "<Label> is [now] the public[-facing] label" / "use <Label>
 * as the public[-facing] label" claim from DECISIONS.md. For each claimed label, count
 * its occurrences in the VISIBLE TEXT of the CANONICAL PUBLIC SURFACE — index.html, which
 * carries the shared nav, footer, hero, and primary copy (the exact places D-S106-class
 * decisions say a "public label" lives). A label asserted as "the public label" that
 * appears ZERO times on that surface is STALE. (We deliberately scan index.html, not the
 * whole corpus: deep data-dump pages — oracle-insights, changelog history — echo retired
 * labels in past-tense prose and would mask a stale claim with a false hit.)
 *
 * Pure fs (no spawns) — safe under the Windows Git Bash throttle. Derives its verdict
 * from source-of-truth (the deployed HTML), never from a hand-maintained list.
 *
 *   node scripts/check-decision-currency.mjs            # check (exit 1 on stale claim)
 *   node scripts/check-decision-currency.mjs --self-test
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Capture the asserted label from a public-label claim. Tolerates **bold**, "is now the",
// "use X as the", and public / public-facing. The label is a short Title-Case phrase.
const CLAIM_RES = [
  /(?:use\s+)?\*{0,2}([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\*{0,2}\s+(?:is\s+(?:now\s+)?the|as\s+the)\s+public(?:-facing)?\s+label/g,
];

// A claim is exempt if its surrounding line already records that it was reversed.
const SUPERSEDED_NEAR = /supersed|reverted|no longer|deprecated|historical/i;

function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Strip everything that is not user-visible text: scripts, styles, comments, and all
// tag markup (which removes href/src/id/class attribute values where slugs/urls live).
function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

function extractClaims(decisionsText) {
  const claims = [];
  const lines = decisionsText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of CLAIM_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const label = m[1].trim();
        // Window of context: the claim line ± 1 line catches an inline superseded note.
        const ctx = (lines[i - 1] || '') + ' ' + line + ' ' + (lines[i + 1] || '');
        claims.push({ label, line: i + 1, exempt: SUPERSEDED_NEAR.test(ctx) });
      }
    }
  }
  // De-dup by label, keeping the first (claims repeat across re-affirmations).
  const seen = new Set();
  return claims.filter((c) => (seen.has(c.label) ? false : seen.add(c.label)));
}

function countVisible(label, corpusTexts) {
  const re = new RegExp('\\b' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  let n = 0;
  for (const t of corpusTexts) n += (t.match(re) || []).length;
  return n;
}

function run({ decisionsText, corpusTexts }) {
  const claims = extractClaims(decisionsText);
  const stale = [];
  for (const c of claims) {
    if (c.exempt) continue;
    const hits = countVisible(c.label, corpusTexts);
    if (hits === 0) stale.push({ ...c, hits });
  }
  return { claims, stale };
}

function selfTest() {
  // Fixture: a stale claim (label absent from corpus, unmarked) + a healthy claim +
  // a stale-but-superseded claim (must be exempt).
  const decisions = [
    '### Forge Window is now the public label; /studio-pulse/ stays the URL',
    'Decision: use **Forge Window** as the public-facing label across nav and copy.',
    '',
    '### Studio Pulse is the public label (S185 rename)',
    'Live product label is Studio Pulse.',
    '',
    '### Old Name is the public label',
    'This was SUPERSEDED by a later rename; kept for history.',
  ].join('\n');
  const corpus = [visibleText('<h1>Studio Pulse</h1><p>Open Studio Pulse</p><a href="/forge-window/">x</a>')];
  const { stale } = run({ decisionsText: decisions, corpusTexts: corpus });
  const labels = stale.map((s) => s.label);
  const assert = (cond, msg) => { if (!cond) { console.error('  ✗ ' + msg); process.exitCode = 1; } else console.log('  ✓ ' + msg); };
  assert(labels.includes('Forge Window'), 'flags stale "Forge Window" (0 visible occurrences, unmarked)');
  assert(!labels.includes('Studio Pulse'), 'passes "Studio Pulse" (present in corpus)');
  assert(!labels.includes('Old Name'), 'exempts SUPERSEDED-marked "Old Name"');
  if (process.exitCode) console.error('check-decision-currency self-test FAILED'); else console.log('check-decision-currency self-test passed');
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const decPath = join(ROOT, 'context', 'DECISIONS.md');
  if (!existsSync(decPath)) { console.log('check-decision-currency: no DECISIONS.md — skip'); process.exit(0); }
  const decisionsText = readFileSync(decPath, 'utf8');
  // Canonical public surface: the homepage carries the shared nav + footer + hero where a
  // real "public label" must appear. Scanning it (not the full corpus) avoids historical
  // data-echo on deep pages masking a stale claim. Fall back to full corpus if absent.
  const indexPath = join(ROOT, 'index.html');
  const corpusTexts = existsSync(indexPath)
    ? [visibleText(readFileSync(indexPath, 'utf8'))]
    : walkHtml(ROOT).map((f) => visibleText(readFileSync(f, 'utf8')));
  const { claims, stale } = run({ decisionsText, corpusTexts });
  if (stale.length) {
    console.error(`✗ check-decision-currency: ${stale.length} stale public-label decision(s) — claimed label absent from the live corpus:`);
    for (const s of stale) {
      console.error(`   DECISIONS.md:${s.line} — "${s.label}" asserted as the public label but appears 0× in visible page text.`);
      console.error(`     → mark the decision SUPERSEDED (the live label changed) or re-propagate "${s.label}".`);
    }
    process.exit(1);
  }
  console.log(`✓ check-decision-currency: ${claims.length} public-label decision(s) all current in the live corpus`);
}
