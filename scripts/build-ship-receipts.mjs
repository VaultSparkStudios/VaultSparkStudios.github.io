#!/usr/bin/env node
/**
 * Public-safe feedback → shipped receipts.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'api', 'ship-receipts.json');
const DOC = path.join(ROOT, 'docs', 'SHIP_RECEIPTS.md');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; }
}

/**
 * S357 — a reader-legibility firewall on the one field that reaches a visitor.
 *
 * This feed is rendered on /changelog/ under the heading "You asked → we
 * shipped", and `summary` is a raw git subject with its conventional-commit
 * prefix stripped. Observed live, about to ship to production:
 *
 *   "bind visual + mobile proof to the S357 candidate a1c97bfa8612"
 *   "make the hero-ticker sink guard measure the hazard, not a call-site snapshot"
 *   "re-capture visual + mobile proof against candidate b7f213dd4b88"
 *
 * Two problems, and the smaller one is the vocabulary. The larger one is that
 * nobody asked for those: they are internal receipt operations presented under
 * "You asked". S344 already noticed the vocabulary edge and answered it with a
 * disclaimer ("the wording is ours"), which excuses jargon rather than removing
 * it — and a disclaimer cannot rescue a line carrying a candidate hash.
 *
 * The repo already has the right idiom twice over: `publicNote` and
 * build-nervous-system's stripDevTalk, both of which this surface bypassed. The
 * honest move is not to rewrite a commit subject into marketing — that would be
 * fabricating a reader-facing claim from an internal one — but to DROP the line
 * when it cannot be published truthfully, exactly like every other honest-dark
 * surface here. A theme with no legible ship still carries its signal count and
 * its visual proof; it just stops inventing prose.
 */
export const ILLEGIBLE_TO_A_READER = [
  /\b[0-9a-f]{7,}\b/i,                                        // a sha or candidate hash
  /\bS\d{2,4}\b/,                                             // a session code
  /\b[\w-]+\.(?:mjs|js|json|css|sql|html|ts|ndjson|yml)\b/i,  // a filename
  /\bnpm run\b|build:check|--check|--self-test|--probe/i,        // a command or flag
  // Working vocabulary. A visitor has no reason to know any of these, and
  // S344's disclaimer cannot rescue a sentence built out of them. Every entry
  // after 'shell asset' was added because it was OBSERVED leaking to the public
  // page during this session, not because it seemed likely to — which is the
  // whole argument for the two structural filters above doing the real work.
  /\b(?:self-test|negative control|receipt|candidate|gate|guard|preflight|resync|rebase|closeout|handoff|write-back|drift|cascade|ratchet|sweep|parity|shell asset|commit|subject|denylist|memoi[sz]e|derivative|fixture|selector)\b/i,
  // Internal-operation verbs: work done TO the repo, not a change a reader can
  // observe on the site.
  /\b(?:scope|wire|bind|re-?capture|regenerate|converge|hand-run|harvest)\b/i,
];

/**
 * Conventional-commit types that can describe something a reader observes.
 *
 * Structural, so it needs no vocabulary: perf, chore, refactor, test, ci, build,
 * style and docs are never a user-visible change, whatever words they use. This
 * exists because the denylist below was out-vocabularied twice in one session —
 * first by "memoize panel derivatives too — 95.9s -> 16.5s", then by the commit
 * that installed the denylist itself.
 */
export const READER_FACING_TYPES = new Set(['feat', 'fix']);

/**
 * All three filters, and every one of them fails CLOSED.
 *
 * A git subject is written for the next engineer, not for a reader, and no
 * filter turns one into the other — these only decide what is safe to NOT
 * publish. The box being empty is the honest outcome when nothing in the window
 * was written for a reader. The durable fix is to stop feeding this surface from
 * git at all and source it from data/consumer-changelog.json, which is reader
 * prose by construction; that is recorded on the task board.
 */
export function reachesAReader(commit) {
  if (!commit || commit.visitorFacing !== true) return false;
  if (!READER_FACING_TYPES.has(String(commit.type || '').toLowerCase())) return false;
  return readerLegible(commit.summary);
}

/** True when a commit subject can stand on a public page without a glossary. */
export function readerLegible(summary) {
  const text = String(summary || '').trim();
  if (text.length < 12) return false;
  return !ILLEGIBLE_TO_A_READER.some((re) => re.test(text));
}

export function buildReceipts({ feedback, commitMap, visualSets, fieldVerdicts }) {
  const commitsBySha = new Map((commitMap.entries || []).map((entry) => [entry.sha, entry]));
  // S174 field-verdict-engine: speed-theme receipts carry the latest
  // deploy-boundary field verdict so "we shipped speed work" is graded by
  // real visitors, not by us.
  const latestBoundary = (fieldVerdicts?.boundaries || []).slice(-1)[0] || null;
  const fieldVerdict = latestBoundary ? {
    boundary: latestBoundary.date,
    label: latestBoundary.label,
    verdict: latestBoundary.overall,
    lcpDeltaPct: latestBoundary.routes?.['/']?.lcpDeltaPct ?? null,
    confidence: latestBoundary.routes?.['/']?.confidence ?? null,
  } : null;
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-ship-receipts.mjs',
    publicSafe: true,
    note: 'Aggregate theme-to-ship receipts. No raw feedback text.',
    receipts: (feedback.themes || []).map((theme) => {
      const commits = (theme.commits || []).map((commit) => commitsBySha.get(commit.sha) || commit);
      const proof = visualSets.find((set) => {
        const needle = theme.key === 'trust' ? 'privacy' : theme.key === 'speed' ? 'home' : theme.key;
        return String(set.name).includes(needle) || (set.routes || []).some((route) => String(route).includes(needle));
      }) || null;
      return {
        theme: theme.key,
        label: theme.label,
        feedbackSignals: theme.count || 0,
        // Two filters, and the STRUCTURAL one leads.
        //
        // `visitorFacing` is computed by build-commit-map from the commit's
        // touched FILES against config-declared visitor-facing paths. It already
        // existed, build-changelog-narrative already consumed it, and this
        // surface simply never read it — which is why a denylist of dev words
        // was the first thing that looked like a fix. A denylist only catches
        // the words its author thought of: the first version of this filter let
        // "memoize panel derivatives too — 95.9s -> 16.5s" straight through.
        // Paths cannot be out-vocabularied.
        //
        // The prose filter stays as a second pass, because a commit CAN touch a
        // visitor-facing path and still have an internal subject — this very
        // change does. A missing `visitorFacing` is treated as false: the
        // producer writes it for every entry on every run, so its absence means
        // the producer did not run, which is not a licence to publish.
        // Illegible lines are dropped, never rewritten: inventing reader-facing
        // prose from an internal subject would fabricate the very claim this
        // surface exists to evidence.
        shippedCommits: commits.filter(reachesAReader).slice(0, 5).map((commit) => ({
          sha: commit.sha,
          summary: commit.summary,
          ts: commit.ts,
        })),
        proof: proof ? { set: proof.name, captures: proof.captureCount, routes: proof.routes } : null,
        fieldVerdict: theme.key === 'speed' ? fieldVerdict : undefined,
      };
    }),
  };
}

function loadVisualSets() {
  const base = path.join(ROOT, 'docs', 'visual-proof');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const manifestPath = path.join(base, d.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return { name: d.name, routes: manifest.routes || [], captureCount: (manifest.captures || []).length };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function renderDoc(payload) {
  const rows = payload.receipts.map((r) =>
    `| ${r.label} | ${r.feedbackSignals} | ${r.shippedCommits.map((c) => `${c.sha} ${c.summary}`).join('<br>')} | ${r.proof ? `${r.proof.set} (${r.proof.captures})` : 'pending'} |`
  ).join('\n');
  return `<!-- generated-by: scripts/build-ship-receipts.mjs -->
<!-- generated-at: ${(payload.generatedAt || new Date().toISOString()).slice(0, 10)} -->

# Ship Receipts

Public-safe receipts connecting aggregate feedback themes to shipped work and proof artifacts. Raw feedback text is intentionally absent.

| Theme | Signals | Shipped evidence | Visual proof |
|---|---:|---|---|
${rows}
`.replace(/\n+$/, '\n');
}

if (SELF_TEST) {
  const payload = buildReceipts({
    feedback: { themes: [{ key: 'speed', label: 'Speed', count: 2, commits: [{ sha: 'abc' }] }] },
    // A reader-legible summary: 'fast' is now correctly dropped as too short to
    // be a sentence, so the fixture has to carry something publishable.
    commitMap: { entries: [{ sha: 'abc', summary: 'pages load faster on a phone', ts: 'today', visitorFacing: true, type: 'feat' }] },
    visualSets: [{ name: 'home-lcp-s173', routes: ['/'], captureCount: 4 }],
    fieldVerdicts: { boundaries: [{ date: '2026-06-05', label: 'S173', overall: 'improved', routes: { '/': { lcpDeltaPct: -23.4, confidence: 'medium' } } }] },
  });
  // S357 — the reader-legibility firewall. These are the exact subjects that were
  // rendering on /changelog/ under "You asked → we shipped" before it existed.
  const illegible = buildReceipts({
    feedback: { themes: [{ key: 'frontdoor', label: 'Front door', count: 4, commits: [{ sha: 'a1' }, { sha: 'a2' }, { sha: 'a3' }] }] },
    commitMap: { entries: [
      { sha: 'a1', summary: 'bind visual + mobile proof to the S357 candidate a1c97bfa8612', ts: 'today', visitorFacing: true, type: 'feat' },
      { sha: 'a2', summary: 'harvest the header controls instead of hand-writing them', ts: 'today', visitorFacing: true, type: 'feat' },
      { sha: 'a3', summary: 'every Desk article opens with its own illustration', ts: 'today', visitorFacing: true, type: 'feat' },
    ] },
    visualSets: [], fieldVerdicts: { boundaries: [] },
  });
  const cases = [
    ['a candidate hash never reaches a reader', !readerLegible('bind visual + mobile proof to the S357 candidate a1c97bfa8612')],
    ['a session code never reaches a reader', !readerLegible('S356 — Desk flagship and site-wide crawl fixes')],
    ['a filename never reaches a reader', !readerLegible('teach generate-pathways.mjs about the strip')],
    ['a flag or command never reaches a reader', !readerLegible('wire four gates into npm run build:check')],
    ['working vocabulary never reaches a reader', !readerLegible('rebuild the derived graph after the rebase')],
    ['a plain reader-facing sentence still publishes', readerLegible('the mobile menu now opens on the first tap')],
    ['a non-visitor-facing commit never publishes, whatever its prose', buildReceipts({
      feedback: { themes: [{ key: 'speed', label: 'Speed', count: 1, commits: [{ sha: 'n1' }] }] },
      commitMap: { entries: [{ sha: 'n1', summary: 'the mobile menu now opens on the first tap', ts: 'today', visitorFacing: false, type: 'fix' }] },
      visualSets: [], fieldVerdicts: { boundaries: [] },
    }).receipts[0].shippedCommits.length === 0],
    ['a missing visitorFacing flag is treated as false, never as permission', buildReceipts({
      feedback: { themes: [{ key: 'speed', label: 'Speed', count: 1, commits: [{ sha: 'n2' }] }] },
      commitMap: { entries: [{ sha: 'n2', summary: 'the mobile menu now opens on the first tap', ts: 'today' }] },
      visualSets: [], fieldVerdicts: { boundaries: [] },
    }).receipts[0].shippedCommits.length === 0],
    ['the denylist gap that motivated the structural filter stays closed', buildReceipts({
      feedback: { themes: [{ key: 'speed', label: 'Speed', count: 1, commits: [{ sha: 'n3' }] }] },
      commitMap: { entries: [{ sha: 'n3', summary: 'memoize panel derivatives too', ts: 'today', visitorFacing: false, type: 'perf' }] },
      visualSets: [], fieldVerdicts: { boundaries: [] },
    }).receipts[0].shippedCommits.length === 0],
    ['a perf/chore commit never publishes, however readable its prose', !reachesAReader(
      { summary: 'pages load faster on a phone', visitorFacing: true, type: 'perf' })],
    ['a missing type is treated as not-reader-facing', !reachesAReader(
      { summary: 'pages load faster on a phone', visitorFacing: true })],
    ['a feat on a visitor-facing path with reader prose does publish', reachesAReader(
      { summary: 'the mobile menu now opens on the first tap', visitorFacing: true, type: 'feat' })],
    ['illegible lines are DROPPED, not rewritten', illegible.receipts[0].shippedCommits.length === 1
      && illegible.receipts[0].shippedCommits[0].summary === 'every Desk article opens with its own illustration'],
    ['the signal count survives the drop, so the theme stays honest', illegible.receipts[0].feedbackSignals === 4],
    ['receipt created', payload.receipts.length === 1],
    ['commit joined', payload.receipts[0].shippedCommits[0].summary === 'pages load faster on a phone'],
    ['proof joined', payload.receipts[0].proof?.set === 'home-lcp-s173'],
    ['field verdict joined on speed', payload.receipts[0].fieldVerdict?.verdict === 'improved'],
    ['field delta carried', payload.receipts[0].fieldVerdict?.lcpDeltaPct === -23.4],
    ['empty document has exactly one trailing newline', /[^\n]\n$/.test(renderDoc({ receipts: [] }))],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const payload = buildReceipts({
  feedback: readJson('api/feedback-provenance.json', { themes: [] }),
  commitMap: readJson('api/commit-map.json', { entries: [] }),
  visualSets: loadVisualSets(),
  fieldVerdicts: readJson('data/field-verdicts.json', null),
});
if (CHECK) {
  if (!fs.existsSync(OUT) || !fs.existsSync(DOC)) {
    console.error('build-ship-receipts --check: missing outputs; run without --check');
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const comparableCurrent = { ...current, generatedAt: '' };
  const comparableNext = { ...payload, generatedAt: '' };
  if (JSON.stringify(comparableCurrent) !== JSON.stringify(comparableNext)) {
    console.error('build-ship-receipts --check: artifact drift; run node scripts/build-ship-receipts.mjs');
    process.exit(1);
  }
  console.log(`build-ship-receipts --check: ok (${payload.receipts.length} receipt(s))`);
  process.exit(0);
}
// S291 low-churn: preserve generatedAt when the receipt CONTENT is unchanged.
// Rationale (root-fix for the you-asked-shipped SSR drift class): the changelog
// SSR box computes its "· 2d ago" labels relative to THIS generatedAt, and the
// 4h refresh-live-data cron regenerates this feed unconditionally. A fresh
// Date.now() every run bumped generatedAt with no content change, which (a)
// committed a churn diff every 4h and (b) stranded changelog/index.html — the
// SSR consumer the cron never re-rendered — so `npm run build:check` went red
// for anyone pulling a day later. Mirror the --check identity above (generatedAt
// excluded): an unchanged corpus now writes byte-identical output, so the cron
// produces no diff and the relative labels only move when a real receipt lands.
if (fs.existsSync(OUT)) {
  try {
    const prior = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const same = JSON.stringify({ ...prior, generatedAt: '' }) === JSON.stringify({ ...payload, generatedAt: '' });
    if (same && prior.generatedAt) payload.generatedAt = prior.generatedAt;
  } catch { /* corrupt/absent prior → write a fresh timestamp */ }
}
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(DOC, renderDoc(payload), 'utf8');
console.log(`build-ship-receipts: ${payload.receipts.length} receipt(s)`);
