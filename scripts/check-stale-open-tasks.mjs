#!/usr/bin/env node
// Stale-open-task detector.
// Surfaces TASK_BOARD `- [ ]` lines that a `- [x]` line already satisfied.
// Catches the audit-loop class where the real work was redone-and-closed under
// a different [S{N}] tag but the original `[ ]` was never flipped — which kept
// polluting the genius list with already-shipped work.
//
// Two orthogonal detectors:
//   1. TITLE SIMILARITY — jaccard overlap vs recent done titles. Catches
//      re-tagged duplicates. Fragile to wording drift, so it is deliberately
//      held at a high threshold.
//   2. ARTIFACT EVIDENCE (S281) — does the open task name a concrete
//      deliverable that demonstrably exists NOW? A git-tracked file, an npm
//      script, or a build:check step. Immune to prose drift: it verifies the
//      artifact instead of guessing from wording. Only claims governed by a
//      creation verb appearing BEFORE the artifact count, so context mentions
//      ("guarded by `x.mjs`") are not read as deliverables.
//
// Why detector 2 exists: S280 shipped `docs/THROTTLED_VITALS.json` and the
// build:check self-test wiring under a NEW [x] entry but never flipped the two
// original [ ] items. Detector 1 missed it twice — the [x] line never said the
// word "DONE", and "Commit a snapshot" vs "Committed snapshot + wiring" scores
// only ~0.38 jaccard. S281 ranked both already-built items as top priorities.
//
// Suppression: append `<!-- evidence-open: reason -->` to a task line to keep
// it open despite satisfied claims. Kept inline (not a sidecar allowlist) so
// the suppressor and the validator can never read different corpora.
//
// Usage:
//   node scripts/check-stale-open-tasks.mjs              # human report
//   node scripts/check-stale-open-tasks.mjs --check      # exit non-zero on drift
//   node scripts/check-stale-open-tasks.mjs --json       # machine-readable matches
//   node scripts/check-stale-open-tasks.mjs --self-test  # synthetic regression

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot  = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const jsonMode  = args.has('--json');
const selfTest  = args.has('--self-test');

const FRESHNESS_WINDOW = 3;        // sessions
const OVERLAP_THRESHOLD = 0.8;     // jaccard token overlap

// Not every `[x]` means the work happened. Two kinds exist:
//   • work-done closure        → valid done-evidence
//   • record-consolidation     → closes a DUPLICATE RECORD; the work is still
//                                open under a surviving entry
// Conflating them is actively dangerous: consolidating three "Homepage LCP"
// records into one (S281) instantly produced a 100%-overlap match that told the
// next session to close the surviving, founder-gated carry. Marked lines are
// excluded from the done-evidence pool.
const RECORD_CONSOLIDATION = /<!--\s*record-consolidation\b/i;

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
    // A ticked checkbox IS the done state. Requiring the prose to *also* say
    // "DONE S{N}" made this blind to most closed entries — S280 closed the
    // throttled-vitals work without ever writing the word, so the original
    // opens were never candidates for matching (S281 root-fix).
    // ...but a record-consolidation closure is not evidence the work shipped.
    if (RECORD_CONSOLIDATION.test(line)) continue;
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

// ─── Detector 2 · artifact evidence ────────────────────────────────────────
// Only a creation verb positioned BEFORE an artifact, within PROXIMITY chars,
// makes that artifact a deliverable claim. This is what separates
// "Commit a snapshot (`--out docs/X.json`)" — a claim — from
// "Homepage LCP ... guarded by `check-x.mjs`" — mere context.
const CREATE_VERB = /\b(commit|commits|committed|add|adds|added|create|creates|created|build|builds|built|ship|ships|shipped|write|writes|wrote|wire|wires|wired|register|registers|registered)\b/gi;
const VERB_PROXIMITY = 90;
const EVIDENCE_SUPPRESS = /<!--\s*evidence-open:/i;

function isGovernedByCreateVerb(line, artifactIndex) {
  for (const m of line.matchAll(CREATE_VERB)) {
    if (m.index < artifactIndex && artifactIndex - m.index <= VERB_PROXIMITY) return true;
  }
  return false;
}

export function extractEvidenceClaims(line) {
  const claims = [];

  // "wire `X --flag` into build:check" → the step must be present in build:check.
  const wire = line.match(/\bwire\s+`([^`]+)`\s+into\s+`?([\w:.-]+)`?/i);
  if (wire) claims.push({ type: 'wire', what: wire[1].trim(), into: wire[2] });

  for (const span of line.matchAll(/`([^`]+)`/g)) {
    const inner = span[1];
    if (!isGovernedByCreateVerb(line, span.index)) continue;

    // Repo-relative paths, including ones embedded in a flag ("--out docs/X.json").
    for (const p of inner.matchAll(/([\w][\w./-]*\.(?:json|mjs|js|css|md|html|ndjson))/g)) {
      const rel = p[1].replace(/^\.\//, '');
      if (rel.includes('/')) claims.push({ type: 'file', path: rel });
    }
    const npm = inner.match(/^npm run ([\w:]+)$/);
    if (npm) claims.push({ type: 'npm', script: npm[1] });
  }
  return claims;
}

export function verifyEvidenceClaim(claim, env) {
  if (claim.type === 'file') {
    return { ok: env.tracked.has(claim.path), detail: `git-tracked file \`${claim.path}\`` };
  }
  if (claim.type === 'npm') {
    return { ok: Boolean(env.scripts[claim.script]), detail: `npm script \`${claim.script}\`` };
  }
  if (claim.type === 'wire') {
    const parts = claim.what.split(/\s+/);
    const base = parts[0].replace(/\.mjs$/, '');
    const ok = env.buildCheckSteps.includes(base)
      && parts.slice(1).every(flag => env.buildCheckSteps.includes(flag));
    return { ok, detail: `\`${claim.into}\` runs \`${claim.what}\`` };
  }
  return { ok: false, detail: 'unrecognized claim' };
}

export function findResolvedByEvidence(taskBoardText, env) {
  const resolved = [];
  for (const line of taskBoardText.split(/\r?\n/)) {
    if (!/^- \[ \]/.test(line)) continue;
    if (EVIDENCE_SUPPRESS.test(line)) continue;
    const claims = extractEvidenceClaims(line);
    if (!claims.length) continue;
    const verified = claims.map(c => ({ claim: c, ...verifyEvidenceClaim(c, env) }));
    if (!verified.every(v => v.ok)) continue;
    const titleMatch = line.match(/^- \[ \]\s+\*\*([^*]+)\*\*/);
    resolved.push({
      openTitle: (titleMatch ? titleMatch[1] : line.slice(4, 90)).trim(),
      evidence: verified.map(v => v.detail),
    });
  }
  return resolved;
}

function loadEvidenceEnv(root) {
  let tracked = new Set();
  let gitOk = true;
  try {
    const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    tracked = new Set(out.split(/\r?\n/).filter(Boolean));
  } catch (_) {
    gitOk = false; // no git (tarball/sandbox) → degrade, never hard-fail
  }
  let scripts = {};
  try {
    scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  } catch (_) {}
  const buildCheckSteps = Object.entries(scripts)
    .filter(([k]) => k.startsWith('build:check'))
    .map(([, v]) => v)
    .join(' ');
  return { tracked, scripts, buildCheckSteps, gitOk };
}

function findRunwayHygieneIssues(taskBoardText) {
  const lines = taskBoardText.split(/\r?\n/);
  const issues = [];
  const headings = lines
    .map((line, index) => ({ line, index: index + 1 }))
    .filter((h) => /^##\s+/.test(h.line));

  const firstPrevious = headings.find((h) => /^##\s+Previous\b/i.test(h.line));
  const activeEndLine = firstPrevious ? firstPrevious.index : lines.length + 1;
  const activeNow = headings.filter((h) => h.index < activeEndLine && /^##\s+Now\b/i.test(h.line));
  if (activeNow.length > 1) {
    issues.push({
      type: 'multiple-active-now',
      message: `multiple active Now runway sections before first Previous block (${activeNow.length})`,
      lines: activeNow.map((h) => h.index),
    });
  }

  const humanAction = headings.filter((h) => /^##\s+Human Action Required\b/i.test(h.line));
  if (humanAction.length > 1) {
    issues.push({
      type: 'multiple-human-action',
      message: `multiple Human Action Required sections (${humanAction.length})`,
      lines: humanAction.map((h) => h.index),
    });
  }

  return issues;
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
  const messyRunway = [
    '## Now (Session 50)',
    '## Now (Session 49)',
    '## Previous',
    '## Human Action Required',
    '## Human Action Required',
  ].join('\n');
  const issues = findRunwayHygieneIssues(messyRunway);
  if (!issues.some((i) => i.type === 'multiple-active-now') || !issues.some((i) => i.type === 'multiple-human-action')) {
    console.error('self-test FAIL: runway hygiene did not flag duplicate active sections');
    return false;
  }
  const cleanRunway = [
    '## Now (Session 50)',
    '## Previous',
    '## Historical Runway (Session 49)',
    '## Human Action Required',
    '## Historical Founder Actions',
  ].join('\n');
  const cleanIssues = findRunwayHygieneIssues(cleanRunway);
  if (cleanIssues.length !== 0) {
    console.error(`self-test FAIL: clean runway produced ${cleanIssues.length} issue(s)`);
    return false;
  }

  // ── Detector 1 · checkbox-alone counts as done (the S280 blind spot) ──
  const noWordDone = [
    '- [x] **[S280][OBS/P2] Ambient bundle rebuild** — shipped, prose never says the D-word',
    '- [ ] **[S277][OBS/P2] Ambient bundle rebuild** — original open entry',
  ].join('\n');
  if (findStaleOpens(noWordDone, 281).length !== 1) {
    console.error('self-test FAIL: a ticked [x] without the literal word "DONE" must still count as done');
    return false;
  }

  // ── Record-consolidation closures are NOT done-evidence ──
  // Regression guard: consolidating duplicate records must never cause the
  // surviving open entry to be reported as already-done.
  const consolidated = [
    '- [x] **[S277][PERF/P2] Homepage LCP measured pass — RECORD CONSOLIDATED S281 (work still open under S279).** <!-- record-consolidation: superseded-by S279 -->',
    '- [ ] **[S279][PERF/P2] Homepage LCP measured pass — sharpened honest-deferral.** Founder-device gated.',
  ].join('\n');
  const consolidationFps = findStaleOpens(consolidated, 281);
  if (consolidationFps.length !== 0) {
    console.error('self-test FAIL: a record-consolidation [x] must not count as done-evidence');
    console.error(`  got ${consolidationFps.length} false match(es) against the surviving open carry`);
    return false;
  }
  // ...but an UNMARKED [x] with the same title still legitimately matches.
  const unmarked = consolidated.replace(' <!-- record-consolidation: superseded-by S279 -->', '');
  if (findStaleOpens(unmarked, 281).length !== 1) {
    console.error('self-test FAIL: exclusion must be driven by the marker, not the title');
    return false;
  }

  // ── Detector 2 · artifact evidence ──
  const env = {
    tracked: new Set(['docs/THROTTLED_VITALS.json', 'scripts/check-home-critical-css-contract.mjs']),
    scripts: { 'verify:vitals:evidence': 'node scripts/measure-throttled-vitals.mjs --out docs/THROTTLED_VITALS.json' },
    buildCheckSteps: 'node scripts/measure-throttled-vitals.mjs --self-test && node scripts/lint-repo.mjs',
    gitOk: true,
  };

  // POSITIVE: the exact two phantoms that reached S281's hit list as top items.
  const phantoms = [
    '- [ ] **[SIL][OBS/P4] Commit a throttled-vitals evidence snapshot** (`--out docs/THROTTLED_VITALS.json` in the npm script) so the next session sees the numbers.',
    '- [ ] **[SIL][AUTOMATION/P3] Wire `measure-throttled-vitals --self-test` into build:check** (fast, no browser).',
  ].join('\n');
  const caught = findResolvedByEvidence(phantoms, env);
  if (caught.length !== 2) {
    console.error(`self-test FAIL: expected 2 evidence-resolved phantoms, got ${caught.length}`);
    return false;
  }

  // NEGATIVE: the false positives that sank title-similarity scoring. Each names
  // an artifact that EXISTS, but only as context — never as the deliverable.
  const genuinelyOpen = [
    // "guarded by" is not a creation verb → the tracked .mjs is context, not a claim.
    '- [ ] **[S277][PERF/P2] Homepage LCP measured pass** — the only lever is the 47KB inline-CSS split. Guarded by `check-home-critical-css-contract.mjs`. Floor NOT lowered.',
    // Verb sits AFTER the artifact → not a governing claim.
    '- [ ] **[S187][CONTENT/P1] Review + publish the forge devlog** — `docs/THROTTLED_VITALS.json` is generated already; founder reviews voice first.',
    // Named deliverable does not exist yet.
    '- [ ] **[SIL] Add `scripts/configure-beacon.mjs`** — create the beacon helper.',
    // Explicitly suppressed inline.
    '- [ ] **[X] Commit `docs/THROTTLED_VITALS.json`** — pending re-measure. <!-- evidence-open: awaiting throttled re-run -->',
  ].join('\n');
  const fps = findResolvedByEvidence(genuinelyOpen, env);
  if (fps.length !== 0) {
    console.error(`self-test FAIL: ${fps.length} false positive(s) on genuinely-open tasks:`);
    for (const f of fps) console.error(`  • ${f.openTitle} — ${f.evidence.join('; ')}`);
    return false;
  }

  console.log('stale-open-tasks · self-test passed · 10/10 · title-overlap(3) + runway hygiene(2) + checkbox-as-done(1) + record-consolidation(2) + evidence(2 caught, 4 negatives held)');
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
const runwayIssues = findRunwayHygieneIssues(taskBoard);
const evidenceEnv = loadEvidenceEnv(repoRoot);
const resolved = findResolvedByEvidence(taskBoard, evidenceEnv);

if (jsonMode) {
  console.log(JSON.stringify({
    ok: stale.length === 0 && runwayIssues.length === 0 && resolved.length === 0,
    currentSession,
    freshnessWindow: FRESHNESS_WINDOW,
    overlapThreshold: OVERLAP_THRESHOLD,
    matches: stale,
    runwayIssues,
    evidenceResolved: resolved,
    evidenceScanned: evidenceEnv.gitOk,
  }, null, 2));
  process.exit(checkMode && (stale.length > 0 || runwayIssues.length > 0 || resolved.length > 0) ? 1 : 0);
}

if (stale.length === 0 && runwayIssues.length === 0 && resolved.length === 0) {
  const evidenceNote = evidenceEnv.gitOk ? 'evidence scan ✓' : 'evidence scan skipped (no git)';
  console.log(`stale-open-tasks · clean (window: last ${FRESHNESS_WINDOW} sessions, current: S${currentSession}) · ${evidenceNote}`);
  process.exit(0);
}

if (resolved.length) {
  console.error(`evidence-resolved-open-tasks · ${resolved.length} open task(s) name a deliverable that already exists:`);
  for (const r of resolved) {
    console.error(`  • OPEN:  ${r.openTitle}`);
    for (const e of r.evidence) console.error(`    EVIDENCE: ${e} — exists now`);
    console.error('    → flip to [x] citing the session that shipped it, or add');
    console.error('      `<!-- evidence-open: why -->` if the artifact is context, not the deliverable.');
  }
  console.error('');
  console.error('This is the class that ranked already-shipped work as S281\'s top genius items.');
}

if (stale.length) {
  console.error(`stale-open-tasks · ${stale.length} open task(s) appear satisfied by recent DONE entries:`);
  for (const s of stale) {
    console.error(`  • OPEN:  ${s.openTitle}`);
    console.error(`    DONE: ${s.doneTitle} (S${s.doneSession}, overlap ${(s.overlap * 100).toFixed(0)}%)`);
    console.error(`    → flip the open [ ] to [x] referencing S${s.doneSession}, or rephrase if scope actually differs.`);
  }
  console.error('');
  console.error('These items keep re-surfacing in the genius list because generate-genius-list.mjs::isRecentlyDone');
  console.error('only suppresses defaults, not TASK_BOARD-sourced opens. Flipping the original entry breaks the loop.');
}

if (runwayIssues.length) {
  console.error(`taskboard-runway-hygiene · ${runwayIssues.length} active runway issue(s):`);
  for (const issue of runwayIssues) {
    console.error(`  • ${issue.message} at line(s): ${issue.lines.join(', ')}`);
  }
  console.error('    → keep one active Now runway and one Human Action Required block; rename older sections as Historical/Previous.');
}

if (checkMode) process.exit(1);
process.exit(0);
