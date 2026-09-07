#!/usr/bin/env node
/* build-changelog-narrative.mjs — S205 #18
   Transforms api/commit-map.json entries into SOUL-voice plain-English
   sentences for the public changelog. L1: regex + move-type rules only
   (no API cost). Output: api/changelog-narrative.json

   Usage:
     node scripts/build-changelog-narrative.mjs
     node scripts/build-changelog-narrative.mjs --check
     node scripts/build-changelog-narrative.mjs --self-test
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMMIT_MAP = join(ROOT, 'api', 'commit-map.json');
const OUT = join(ROOT, 'api', 'changelog-narrative.json');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('build-changelog-narrative.mjs');

// ── Jargon strip ──────────────────────────────────────────────────────────────
// Remove internal session/score markers from public-facing text.
const STRIP_RE = [
  /\s*\(S\d{3,4}\)/gi,      // (S204), (S205)
  /\bS\d{3,4}\b/g,           // S204, S205 bare
  /\bSIL\s+\d+\b/gi,         // SIL 981
  /\b\d{3}\/\d{4}\b/g,       // 981/1000
  /\s*—\s*SIL.*$/i,          // — SIL ...
  /\s*·\s*SIL.*$/i,          // · SIL ...
  /\s*\(attempt\s+\d+\)/gi,  // (attempt 1) — a CI retry counter, never public
];

function strip(text) {
  let s = String(text || '');
  STRIP_RE.forEach(function (re) { s = s.replace(re, ''); });
  // Remove orphaned separators left by stripping (trailing " + " or " · " etc.)
  s = s.replace(/\s*[+·,;]\s*$/, '').replace(/\s*—\s*$/, '').replace(/\s{2,}/g, ' ');
  return s.trim();
}

// ── Move → lead verb ──────────────────────────────────────────────────────────
const MOVE_VERB = {
  Shipped: 'Shipped',
  Tended: 'Refined',
  Fixed: 'Fixed',
  Documented: 'Published',
  Sparked: 'Launched',
  Built: 'Built',
  Cleaned: 'Cleaned up',
  feat: 'Shipped',
  fix: 'Fixed',
  docs: 'Published',
  refactor: 'Refactored',
  perf: 'Optimised',
  chore: null,   // filtered out from public narrative
  test: null,
};

const SCOPE_LABEL = {
  'ignis-platform': 'the IGNIS platform',
  'ignis': 'IGNIS',
  'oracle': 'the Ecosystem Oracle',
  'membership': 'membership',
  'vault-member': 'the vault member portal',
  'games': 'games',
  'hero': 'the hero experience',
  'studio-now': 'the Studio Now strip',
  'vault-momentum': 'the Vault Momentum score',
  'constellation': 'constellation challenges',
};

// ── Tone → emoji ──────────────────────────────────────────────────────────────
const TONE_BADGE = {
  sparked: '⚡',
  muted: '',
  refined: '✦',
  critical: '🔑',
};

// ── Build narrative for one commit ────────────────────────────────────────────
function narrativeFor(commit) {
  // S344 — STRUCTURAL GATE. A commit that touched nothing a visitor can
  // perceive has no public sentence, whatever its move type. `visitorFacing` is
  // written for every entry by build-commit-map.mjs, which regenerates the map
  // wholesale from git; an ABSENT field therefore means the producer did not
  // run, and the honest response to that is silence, not publishing everything.
  if (commit.visitorFacing !== true) return null;

  // S344 — PRECEDENCE. This read `MOVE_VERB[commit.move] || MOVE_VERB[commit.type]`,
  // which made the `chore: null` rule below DEAD CODE: build-commit-map maps
  // every chore commit to move `Tended`, and MOVE_VERB.Tended is the truthy
  // 'Refined', so the null was never reached. 13 of the 24 sentences on the live
  // feed were chore commits this filter was written to drop — including
  // "Refined resync after publisher race (attempt 1)." on the homepage.
  // The TYPE is the authority; the move label is only a fallback for types the
  // map has no own entry for (build, style).
  var verb = Object.prototype.hasOwnProperty.call(MOVE_VERB, commit.type)
    ? MOVE_VERB[commit.type]
    : (MOVE_VERB[commit.move] || null);
  if (!verb) return null; // filtered (chore/test)
  var summary = strip(commit.summary || '');
  if (!summary) return null;
  var badge = TONE_BADGE[commit.tone] || '';
  var sentence = verb + ' ' + summary + '.';
  // Capitalise first character.
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return { sha: commit.sha, ts: commit.ts, sentence, badge, tone: commit.tone || '', scope: commit.scope || '' };
}

// ── Group by ISO week ─────────────────────────────────────────────────────────
function isoWeek(ts) {
  try {
    var d = new Date(ts);
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return 'W' + String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0') + '-' + d.getUTCFullYear();
  } catch (_) { return 'unknown'; }
}

// ── Self-test ─────────────────────────────────────────────────────────────────
function selfTest() {
  var cases = [
    { name: 'strip S203', input: 'closeout — manifesto write-backs + SIL 981 (S203)', expect: 'closeout — manifesto write-backs' },
    { name: 'strip a CI retry counter', input: 'resync after publisher race (attempt 1)', expect: 'resync after publisher race' },
    { name: 'Shipped move', commit: { sha: 'a', ts: '2026-01-01', move: 'Shipped', type: 'feat', tone: 'sparked', visitorFacing: true, summary: 'live IGNIS intelligence panel on /ignis/' }, expectVerb: 'Shipped' },

    // S344 — this case USED to pass while the bug was live, because its fixture
    // set `move: null`, a shape build-commit-map.mjs never emits: it maps every
    // chore commit to move `Tended`. The test therefore exercised a path
    // production never took. Both shapes are pinned now.
    { name: 'chore filtered (move:null fixture)', commit: { sha: 'b', ts: '2026-01-01', move: null, type: 'chore', visitorFacing: true, summary: 'update CI' }, expectNull: true },
    { name: 'chore filtered in its REAL producer shape (move:Tended)', commit: { sha: 'b2', ts: '2026-01-01', move: 'Tended', type: 'chore', tone: 'muted', visitorFacing: true, summary: 'update CI' }, expectNull: true },

    // The exact sentence that reached the live homepage, pinned so it cannot return.
    { name: 'the live leak is refused', commit: { sha: 'd17f7380', ts: '2026-09-03', move: 'Tended', type: 'chore', tone: 'muted', visitorFacing: false, summary: 'resync after publisher race (attempt 1)' }, expectNull: true },

    // Structural gate, isolated from the type filter: a `feat` — the most
    // publishable type there is — still earns no sentence if it moved nothing
    // a visitor can see.
    { name: 'a feat touching no visitor surface is refused', commit: { sha: 'e', ts: '2026-01-01', move: 'Shipped', type: 'feat', tone: 'sparked', visitorFacing: false, summary: 'a new build gate' }, expectNull: true },
    { name: 'an absent visitorFacing field is refused, not defaulted open', commit: { sha: 'f', ts: '2026-01-01', move: 'Shipped', type: 'feat', tone: 'sparked', summary: 'producer did not run' }, expectNull: true },

    { name: 'Tended becomes Refined for a non-chore type', commit: { sha: 'c', ts: '2026-01-01', move: 'Tended', tone: 'muted', visitorFacing: true, summary: 'orbit shift' }, expectVerb: 'Refined' },
  ];
  var pass = 0, fail = 0;
  cases.forEach(function (c) {
    if (c.input !== undefined) {
      var result = strip(c.input);
      if (result.includes(c.expect)) { pass++; }
      else { fail++; console.error('  FAIL ' + c.name + ': got ' + JSON.stringify(result)); }
    } else if (c.commit) {
      var n = narrativeFor(c.commit);
      if (c.expectNull && n === null) { pass++; }
      else if (c.expectVerb && n && n.sentence.startsWith(c.expectVerb)) { pass++; }
      else { fail++; console.error('  FAIL ' + c.name + ': got ' + JSON.stringify(n)); }
    }
  });
  console.log('build-changelog-narrative self-test: ' + pass + '/' + cases.length + ' passed' + (fail ? ' — ' + fail + ' failed' : ''));
  process.exit(fail > 0 ? 1 : 0);
}

if (SELF_TEST) { selfTest(); }

// ── Main ──────────────────────────────────────────────────────────────────────
if (!SELF_TEST && RUN_DIRECT) {
  let commits = [];
  try { commits = JSON.parse(readFileSync(COMMIT_MAP, 'utf8')); } catch { /* no commit map */ }
  if (!Array.isArray(commits)) commits = commits.commits || commits.entries || [];

  const entries = commits
    .map(narrativeFor)
    .filter(Boolean);

  const byWeek = {};
  entries.forEach(function (e) {
    var wk = isoWeek(e.ts);
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(e);
  });

  const result = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString().slice(0, 10),
    totalEntries: entries.length,
    entries,
    byWeek,
  };

  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error('build-changelog-narrative --check: missing api/changelog-narrative.json');
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(OUT, 'utf8'));
    if (current.totalEntries !== result.totalEntries) {
      console.error('build-changelog-narrative --check: drift (' + current.totalEntries + ' → ' + result.totalEntries + ')');
      process.exit(1);
    }
    console.log('build-changelog-narrative --check: ok (' + result.totalEntries + ' narratives)');
  } else {
    writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
    console.log('build-changelog-narrative → api/changelog-narrative.json (' + result.totalEntries + ' entries)');
  }
}
