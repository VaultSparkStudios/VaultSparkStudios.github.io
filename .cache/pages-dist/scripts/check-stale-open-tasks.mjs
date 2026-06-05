#!/usr/bin/env node
// Stale-open-task detector.
// Surfaces TASK_BOARD `- [ ]` lines whose normalized title closely matches a
// recent `- [x] **DONE S{N}**` line. Catches the audit-loop class where the
// real work was redone-and-closed under a different [S{N}] tag but the
// original `[ ]` was never flipped — which kept polluting the genius list.
//
// Companion to generate-genius-list.mjs::isRecentlyDone (which only protects
// the defaults injection list, not TASK_BOARD-sourced items).
//
// Usage:
//   node scripts/check-stale-open-tasks.mjs              # human report
//   node scripts/check-stale-open-tasks.mjs --check      # exit non-zero on drift
//   node scripts/check-stale-open-tasks.mjs --json       # machine-readable matches
//   node scripts/check-stale-open-tasks.mjs --self-test  # synthetic regression

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot  = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const jsonMode  = args.has('--json');
const selfTest  = args.has('--self-test');

const FRESHNESS_WINDOW = 3;        // sessions
const OVERLAP_THRESHOLD = 0.8;     // jaccard token overlap

// Strip bracketed tags + bold markers + tail description; return a token set.
function normalizeTitle(raw) {
  let s = String(raw || '').toLowerCase();
  // Drop everything after the first em-dash / en-dash / `—` description.
  s = s.split(/\s+[—–-]\s+/, 1)[0];
  // Strip bold/italic markers.
  s = s.replace(/\*+/g, ' ');
  // Strip bracketed tags like [S97], [P1], [INTELLIGENCE], [HAR:CF_TOKEN], [S97→S112], etc.
  s = s.replace(/\[[^\]]*\]/g, ' ');
  // Strip backticks/punctuation.
  s = s.replace(/[`"'(),:.\/]/g, ' ');
  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function tokenize(normalized) {
  const STOP = new Set([
    'the', 'a', 'an', 'of', 'for', 'and', 'or', 'in', 'on', 'to', 'with',
    'is', 'are', 'be', 'this', 'that', 'it', 'its', 'their', 'from', 'by',
    's', 'p1', 'p2', 'p3',
  ]);
  return new Set(
    normalized
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOP.has(t))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}

function getCurrentSession() {
  try {
    const ps = JSON.parse(fs.readFileSync(path.join(repoRoot, 'context', 'PROJECT_STATUS.json'), 'utf8'));
    if (Number.isFinite(ps.currentSession)) return Number(ps.currentSession);
  } catch (_) {}
  return 0;
}

function findStaleOpens(taskBoardText, currentSession) {
  const minSession = Math.max(0, currentSession - FRESHNESS_WINDOW);
  const lines = taskBoardText.split(/\r?\n/);

  // Pass 1: collect recent DONE lines with their normalized titles + tokens.
  const recentDone = [];
  for (const line of lines) {
    if (!/^- \[x\]/i.test(line)) continue;
    if (!/\bDONE\s+S\d+/i.test(line) && !/\*\*DONE\b/i.test(line)) continue;
    const sessionMatches = [...line.matchAll(/\bS(\d+)\b/gi)].map(m => parseInt(m[1], 10));
    const latestSession = sessionMatches.length ? Math.max(...sessionMatches) : 0;
    if (latestSession < minSession) continue;

    // Title is the bolded segment: **[tags] Title — description** OR **[tags] Title**
    const titleMatch = line.match(/^- \[x\]\s+\*\*([^*]+)\*\*/i);
    if (!titleMatch) continue;
    const norm = normalizeTitle(titleMatch[1]);
    const toks = tokenize(norm);
    if (toks.size < 2) continue;
    recentDone.push({ session: latestSession, normalized: norm, tokens: toks, raw: titleMatch[1].trim() });
  }

  // Pass 2: scan open `- [ ]` lines.
  const stale = [];
  for (const line of lines) {
    if (!/^- \[ \]/.test(line)) continue;
    const titleMatch = line.match(/^- \[ \]\s+\*\*([^*]+)\*\*/);
    if (!titleMatch) continue;
    const norm = normalizeTitle(titleMatch[1]);
    const toks = tokenize(norm);
    if (toks.size < 2) continue;

    let bestMatch = null;
    let bestScore = 0;
    for (const done of recentDone) {
      const score = jaccard(toks, done.tokens);
      if (score >= OVERLAP_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestMatch = done;
      }
    }
    if (bestMatch) {
      stale.push({
        openTitle: titleMatch[1].trim(),
        openNormalized: norm,
        doneTitle: bestMatch.raw,
        doneSession: bestMatch.session,
        overlap: bestScore,
      });
    }
  }
  return stale;
}

function runSelfTest() {
  const fixture = [
    '## Now (Session 50)',
    '',
    '- [x] **[S48][AUDIT] Cross-page content sweep** — done DONE S48',
    '- [ ] **[S45][AUDIT] Cross-page content sweep** — original open task',
    '- [ ] **[S46][INFRA] Unrelated open task — different scope** ',
    '',
  ].join('\n');
  // Synthetic currentSession=50, window=3 → S48 done is in window.
  const result = findStaleOpens(fixture, 50);
  if (result.length !== 1) {
    console.error(`self-test FAIL: expected 1 stale match, got ${result.length}`);
    return false;
  }
  const m = result[0];
  if (!m.openTitle.includes('Cross-page content sweep') || !m.doneTitle.includes('Cross-page content sweep')) {
    console.error(`self-test FAIL: wrong match — open="${m.openTitle}" done="${m.doneTitle}"`);
    return false;
  }
  if (m.overlap < OVERLAP_THRESHOLD) {
    console.error(`self-test FAIL: overlap ${m.overlap} below threshold ${OVERLAP_THRESHOLD}`);
    return false;
  }
  console.log(`stale-open-tasks · self-test passed · 1 synthetic match (overlap ${(m.overlap * 100).toFixed(0)}%)`);
  return true;
}

if (selfTest) {
  process.exit(runSelfTest() ? 0 : 1);
}

const taskBoardPath = path.join(repoRoot, 'context', 'TASK_BOARD.md');
if (!fs.existsSync(taskBoardPath)) {
  console.log('stale-open-tasks · context/TASK_BOARD.md not present — skipping');
  process.exit(0);
}

const taskBoard = fs.readFileSync(taskBoardPath, 'utf8');
const currentSession = getCurrentSession();
const stale = findStaleOpens(taskBoard, currentSession);

if (jsonMode) {
  console.log(JSON.stringify({
    ok: stale.length === 0,
    currentSession,
    freshnessWindow: FRESHNESS_WINDOW,
    overlapThreshold: OVERLAP_THRESHOLD,
    matches: stale,
  }, null, 2));
  process.exit(checkMode && stale.length > 0 ? 1 : 0);
}

if (stale.length === 0) {
  console.log(`stale-open-tasks · clean (window: last ${FRESHNESS_WINDOW} sessions, current: S${currentSession})`);
  process.exit(0);
}

console.error(`stale-open-tasks · ${stale.length} open task(s) appear satisfied by recent DONE entries:`);
for (const s of stale) {
  console.error(`  • OPEN:  ${s.openTitle}`);
  console.error(`    DONE: ${s.doneTitle} (S${s.doneSession}, overlap ${(s.overlap * 100).toFixed(0)}%)`);
  console.error(`    → flip the open [ ] to [x] referencing S${s.doneSession}, or rephrase if scope actually differs.`);
}
console.error('');
console.error('These items keep re-surfacing in the genius list because generate-genius-list.mjs::isRecentlyDone');
console.error('only suppresses defaults, not TASK_BOARD-sourced opens. Flipping the original entry breaks the loop.');

if (checkMode) process.exit(1);
process.exit(0);
