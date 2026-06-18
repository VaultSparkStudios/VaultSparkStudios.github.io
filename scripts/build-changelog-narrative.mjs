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
  var verb = MOVE_VERB[commit.move] || MOVE_VERB[commit.type] || null;
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
    { name: 'Shipped move', commit: { sha: 'a', ts: '2026-01-01', move: 'Shipped', tone: 'sparked', summary: 'live IGNIS intelligence panel on /ignis/' }, expectVerb: 'Shipped' },
    { name: 'chore filtered', commit: { sha: 'b', ts: '2026-01-01', move: null, type: 'chore', summary: 'update CI' }, expectNull: true },
    { name: 'Tended becomes Refined', commit: { sha: 'c', ts: '2026-01-01', move: 'Tended', tone: 'muted', summary: 'orbit shift' }, expectVerb: 'Refined' },
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
