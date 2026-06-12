#!/usr/bin/env node
// draft-weekly-forge.mjs — turn the auto-generated forge ledger into a
// studio-VOICE "This week in the Forge" devlog DRAFT.
//
// The competitive read (Mullins / Lou / Dinh / levels.io) is unanimous: the
// build-in-public that converts is honest process + what broke + the numbers,
// not press releases. VaultSpark already auto-publishes commit telemetry
// (feed/forge-ledger.json) but the human-voice surface (journal/) went stale
// ~11 weeks. This bridges the two: it drafts a recurring entry from the ledger
// + the TASK_BOARD DONE block so the founder reviews a near-finished post
// instead of a blank page.
//
// IT NEVER PUBLISHES. Output goes to journal/_drafts/ (gitignored-or-reviewed),
// because hand-curated truth surfaces require founder review (studio canon).
//
//   node scripts/draft-weekly-forge.mjs            # write the draft
//   node scripts/draft-weekly-forge.mjs --days 14  # widen the window
//   node scripts/draft-weekly-forge.mjs --self-test
//
// Per DECISIONS (S178): exports are pure; side effects gate on RUN_DIRECT.
// S190: SOUL-voice upgrade — slug-to-sentence mapping, narrative paragraphs,
//       forbidden internal term sanitizer.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LEDGER = 'feed/forge-ledger.json';
const DRAFTS_DIR = 'journal/_drafts';

// Terms that should never appear in a public-facing draft. Strip or replace.
const FORBIDDEN_TERMS = [
  [/\bRUM\b/g, 'real-user metrics'],
  [/\bSIL\b/g, 'the studio improvement loop'],
  [/\bLCP\b/g, 'page-load time'],
  [/\bTTI\b/g, 'time to interactive'],
  [/\bFCP\b/g, 'first paint'],
  [/\bCWV\b/g, 'Core Web Vitals'],
  [/\bCSP\b/g, 'security policy'],
  [/\bTT\b(?!\s*\w)/g, 'browser security'],
  [/build:check\b/g, 'the build pipeline'],
  [/check-rum-allowlist\b/gi, 'beacon validation'],
  [/\bwrangler\b/gi, 'the edge deploy tool'],
  [/\bsupabase\b/gi, 'the database layer'],
  [/\bWorker\b(?!\s+bee)/g, 'the edge layer'],
  [/\bS(\d{3})\b/g, 'session S$1'],          // S186 → session S186
  [/\bbuild:check\b/g, 'the build pipeline'],
  [/\bNDJSON\b/gi, 'event log'],
  [/\bKV\b(?!\s*\w)/g, 'edge cache'],
  [/\bR2\b(?!\s*\w)/g, 'object storage'],
  [/\bCF\b\s+Pages/g, 'the CDN'],
  [/\bCF\b\s+/g, 'Cloudflare '],
];

// Sentence-level rewrites for common ledger title patterns. Keys are regexes;
// values are human-readable replacements (no internal jargon, active voice).
const SLUG_SENTENCES = [
  [/proof.+conversion|trust.+microline|proof.+line/i,
    'Added a live proof microline to the signup page — measured field data, not marketing claims'],
  [/dispatch.*subscrib|footer.*email/i,
    'Wired the studio email capture to the existing list (not a new vendor — the one we already had)'],
  [/membership.*unlock|progressive.*unlock/i,
    'Launched progressive membership callouts on the signup page — returning visitors now see context relevant to where they are in the journey'],
  [/velocity.*badge|session.*velocity|traction.*scoreboard/i,
    'Added a count-up animation and session-cadence badge to the traction numbers — makes the build frequency legible at a glance'],
  [/funnel.*waterfall|conversion.*funnel|funnel.*pedagog/i,
    'Rebuilt the conversion funnel display as a waterfall — shows the four stages clearly even before data fills in'],
  [/oracle.*chip|oracle.*adaptive|chip.*rank/i,
    'Made the IGNIS Oracle chip order adapt to which questions actually got helpful answers'],
  [/oracle.*feedback|oracle.*corpus/i,
    'Wired unhelpful-answer feedback from the Oracle into the training corpus — closes the loop on what isn\'t working'],
  [/perf.+budget|speed.+gate/i,
    'Tightened the automated performance budget gate — it now fails the build if page load times regress'],
  [/ambient.*bundle|shell.*bundle/i,
    'Reduced cold-cache JS requests by consolidating ambient scripts into a single shell bundle'],
  [/nav.*sheet|mobile.*nav/i,
    'Shipped an overhaul to the mobile navigation drawer — fixed the stacking-context trap that buried it'],
  [/uptime.*probe|uptime.*monitor/i,
    'Replaced the broken third-party uptime monitor with a first-party probe — two signals, honest data'],
  [/rum.*anomaly|rum.*rollup/i,
    'Built out the real-user metrics rollup — field data now feeds directly into the performance budget check'],
  [/csp|trusted.type/i,
    'Hardened the browser security policy — no more unsafe inline scripts allowed in any new surface'],
];

/** Replace forbidden internal terms in a line of text. */
export function sanitizeLine(line) {
  let s = line;
  for (const [pattern, replacement] of FORBIDDEN_TERMS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

/** Map a ledger item title to a human-readable sentence, or return the title sanitized. */
export function toSentence(title) {
  const clean = title.replace(/^shipped:\s*/i, '').trim();
  for (const [pattern, sentence] of SLUG_SENTENCES) {
    if (pattern.test(clean)) return sentence;
  }
  return sanitizeLine(clean);
}

// Pure: build the markdown body from ledger items + a board-done list.
export function buildForgeDraft({ items = [], doneLines = [], asOf = '2026-01-01', days = 7 } = {}) {
  const cutoff = new Date(asOf).getTime() - days * 86400000;
  const recent = items
    .filter((it) => it.date_published && new Date(it.date_published).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date_published) - new Date(a.date_published));

  const shipped = recent.filter((it) => /shipped/i.test(it.title || '') || (it.tags || []).includes('Shipped'));
  const count = shipped.length;

  const dateStr = new Date(asOf).toISOString().slice(0, 10);
  const weekEnding = new Date(asOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  const lines = [];
  lines.push(`<!-- DRAFT — founder review required before publishing to journal/. Generated by scripts/draft-weekly-forge.mjs -->`);
  lines.push(`# This Week in the Forge — ${weekEnding}`);
  lines.push('');

  // 2-paragraph narrative intro (SOUL voice: honest process, not press release)
  if (!count) {
    lines.push(`A quiet week in the forge — nothing left the build queue this window. That's worth a sentence too: sometimes the work is just holding the line, fixing the thing that keeps breaking, or deciding what *not* to build. [Write one honest paragraph here — what were you wrestling with?]`);
    lines.push('');
    lines.push(`The ledger shows no new ships but the board is still moving. [Add what's close, what got harder than expected, or what you learned that changes the plan.]`);
  } else {
    // Paragraph 1: what moved, plain English
    const topSentences = shipped.slice(0, 3).map((it) => toSentence(it.title || ''));
    lines.push(`${count === 1 ? 'One thing' : count} left the forge this week — and one of the more useful ones is ${topSentences[0].charAt(0).toLowerCase() + topSentences[0].slice(1)}. The rest of the list is mix of hardening and new surface: the kind of week where you can't point at one flashy thing, but the product visibly tightened.`);
    lines.push('');
    // Paragraph 2: the honest frame
    lines.push(`[Replace this paragraph: what was the hardest part of the week? What broke before it shipped? What number actually moved? One paragraph, plain English — no press-release language. This is what readers come back for.]`);
  }
  lines.push('');

  if (count) {
    lines.push('## What shipped');
    lines.push('');
    for (const it of shipped) {
      lines.push(`- ${toSentence(it.title || '')}`);
    }
    lines.push('');
  }

  if (doneLines.length) {
    lines.push('## From the board (unedited receipts)');
    lines.push('');
    lines.push('What the task board actually shows closed — including fixes, regressions, and things that took longer than planned:');
    lines.push('');
    for (const d of doneLines.slice(0, 8)) {
      lines.push(`- ${sanitizeLine(d)}`);
    }
    lines.push('');
  }

  lines.push('## The numbers');
  lines.push('');
  lines.push(`- Ships this window: **${count}**`);
  lines.push('- _(Fill in: page-load time (field), measured uptime %, member/play deltas from /status/ — include regressions honestly.)_');
  lines.push('- _(Fill in: anything you expected to ship but didn\'t, and why — this is where the real credibility lives.)_');
  lines.push('');
  lines.push('---');
  lines.push('*Voice check before publishing: process + what broke + real numbers. No marketing gloss.*');
  lines.push('*Studio lexicon (Forge/Vault/Sparked/VaultSparked) is seasoning — use it once or twice, not as the vehicle for every sentence.*');
  lines.push('*Forbidden in final copy: session codes (S186 etc.), internal tool names, abbreviations the reader doesn\'t know.*');

  return lines.join('\n');
}

// Pure: extract recent '[x]' DONE lines from a TASK_BOARD string.
export function extractDoneLines(taskBoard, max = 8) {
  return taskBoard.split('\n')
    .filter((l) => /^\s*-\s*\[x\]/.test(l))
    .map((l) => l.replace(/^\s*-\s*\[x\]\s*/, '').replace(/\*\*/g, '').trim())
    .slice(0, max);
}

function selfTest() {
  let pass = 0, fail = 0;
  const check = (n, c) => { c ? pass++ : (fail++, console.log('  ✗ ' + n)); };
  const items = [
    { title: 'Shipped: seed Oracle empty-state chips', date_published: '2026-06-11T01:00:00Z', tags: ['Shipped', 's186-oracle'] },
    { title: 'Shipped: build-order module', date_published: '2026-06-11T00:00:00Z', tags: ['Shipped', 's186-build'] },
    { title: 'Shipped: ancient thing', date_published: '2026-01-01T00:00:00Z', tags: ['Shipped', 's100-x'] },
  ];
  const md = buildForgeDraft({ items, doneLines: ['[UX] RUM rollup gate'], asOf: '2026-06-11', days: 7 });
  check('has title', md.includes('This Week in the Forge'));
  check('counts 2 in-window ships', md.includes('Ships this window: **2**'));
  check('draft marker present', md.includes('founder review required'));
  check('empty window handled', buildForgeDraft({ items: [], asOf: '2026-06-11' }).includes('quiet week'));
  check('done line RUM replaced', md.includes('real-user metrics'));
  check('done line RUM not raw', !md.includes('RUM rollup gate'));
  check('sanitizeLine replaces LCP', sanitizeLine('LCP improved 40%').includes('page-load time'));
  check('sanitizeLine keeps brand terms', sanitizeLine('Vault Sparked').includes('Vault'));
  check('toSentence membership-unlock', toSentence('progressive membership unlock').includes('progressive membership'));
  check('toSentence unknown falls back sanitized', !toSentence('fixed S186 RUM gate').includes('RUM'));
  const done = extractDoneLines('- [x] **[A] one**\n- [ ] open\n- [x] [B] two');
  check('extractDone filters to [x]', done.length === 2 && done[0].includes('one'));
  console.log(`draft-weekly-forge self-test: ${pass}/${pass + fail} passing`);
  return fail === 0;
}

const RUN_DIRECT = (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('draft-weekly-forge.mjs')));

if (RUN_DIRECT) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const di = argv.indexOf('--days');
  const days = di >= 0 ? parseInt(argv[di + 1], 10) || 7 : 7;

  let ledger = { items: [] };
  try { ledger = JSON.parse(readFileSync(LEDGER, 'utf8')); } catch { console.error(`! cannot read ${LEDGER}`); }
  let board = '';
  try { board = readFileSync('context/TASK_BOARD.md', 'utf8'); } catch {}

  // asOf = newest ledger date so the script is deterministic (no Date.now()).
  const dates = (ledger.items || []).map((i) => i.date_published).filter(Boolean).sort();
  const asOf = dates.length ? dates[dates.length - 1] : '2026-01-01';

  const md = buildForgeDraft({ items: ledger.items || [], doneLines: extractDoneLines(board), asOf, days });
  if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
  const out = join(DRAFTS_DIR, `forge-week-${new Date(asOf).toISOString().slice(0, 10)}.md`);
  writeFileSync(out, md + '\n');
  console.log(`✓ forge devlog draft → ${out}`);
  console.log('  (DRAFT only — review + publish to journal/ by hand; never auto-published.)');
}
