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

/**
 * S358 — the durable fix D-S357.3 recorded: the shipped lines come from
 * data/consumer-changelog.json, never from git.
 *
 * The filters above were a firewall on the wrong material. Within a day of
 * shipping them a subject ("rebind the mobile proof without re-running the
 * 215-cell audit") was on the feed, because `rebind` is not `\bbind\b` — the
 * third time a denylist was out-vocabularied. No filter turns a subject written
 * for the next engineer into a sentence written for a reader.
 *
 * The consumer changelog IS reader prose: founder-approved, and dev-voice
 * rejected at publish time by publish-changelog-draft. The LINK between a
 * feedback theme and a change is a claim, so it is declared, never inferred: an
 * entry answers a theme only when its `answers` array names that theme's key.
 * No keyword matching — guessing "this is what you asked for" would fabricate
 * the very claim the surface exists to evidence. An untagged corpus renders the
 * box honest-dark, which is the correct outcome, not a regression.
 *
 * The field keeps the name `shippedCommits` because three shipped clients read
 * it (you-asked-shipped.js, studio-now.js, portal-dashboard.js), each only for
 * `summary` + `ts`; renaming it would rotate fingerprinted scripts to say
 * nothing new. The git filters stay exported and self-tested for any future
 * consumer that must read commit subjects, but nothing on this surface does.
 */
export function shippedFromChangelog(changelog, themeKey, limit = 5) {
  const key = String(themeKey || '').toLowerCase();
  if (!key) return [];
  return ((changelog && changelog.entries) || [])
    .filter((entry) => Array.isArray(entry.answers) && entry.answers.map((a) => String(a).toLowerCase()).includes(key))
    .filter((entry) => typeof entry.title === 'string' && entry.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || '')))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
    .map((entry) => ({ summary: entry.title.trim(), ts: entry.date, source: 'consumer-changelog' }));
}

/**
 * S359 — "you asked" must count people who asked, not commits.
 *
 * `feedback.themes[].count` is the number of COMMITS build-feedback-provenance
 * keyword-classified into a theme (its own header: "a correlation surface, not a
 * per-ticket link"). This surface rendered that number under "You asked", so
 * three commits touching the homepage read as three readers asking for it.
 *
 * The only reader signal on the site is the decision sampler: aggregate
 * clarity/proof/value choices, published only once a choice reaches the
 * k-anonymity threshold. A theme appears here only when readers qualified it;
 * below the threshold the box is honest-dark rather than counting our own work
 * as demand.
 */
const THEME_LABELS = { frontdoor: 'Front door', trust: 'Trust', conversion: 'Conversion' };
export function readerThemes(feedback) {
  const qualified = (feedback && feedback.decisionSampler && feedback.decisionSampler.qualifiedThemes) || [];
  const threshold = Number(feedback?.decisionSampler?.kAnonymityThreshold) || 5;
  return qualified
    .filter((q) => q && q.theme && Number(q.count) >= threshold)
    .map((q) => ({ key: q.theme, label: THEME_LABELS[q.theme] || q.theme, count: Number(q.count) }));
}

export function buildReceipts({ feedback, changelog, visualSets, fieldVerdicts }) {
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
    receipts: readerThemes(feedback).map((theme) => {
      const proof = visualSets.find((set) => {
        const needle = theme.key === 'trust' ? 'privacy' : theme.key === 'speed' ? 'home' : theme.key;
        return String(set.name).includes(needle) || (set.routes || []).some((route) => String(route).includes(needle));
      }) || null;
      return {
        theme: theme.key,
        label: theme.label,
        feedbackSignals: theme.count || 0,
        // Declared links only — see shippedFromChangelog.
        shippedCommits: shippedFromChangelog(changelog, theme.key),
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
    `| ${r.label} | ${r.feedbackSignals} | ${r.shippedCommits.map((c) => `${c.ts} ${c.summary}`).join('<br>')} | ${r.proof ? `${r.proof.set} (${r.proof.captures})` : 'pending'} |`
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
    feedback: { decisionSampler: { kAnonymityThreshold: 5, qualifiedThemes: [{ choice: 'x', theme: 'conversion', count: 6 }] } },
    changelog: { entries: [{ date: '2026-06-05', title: 'Pages load faster on a phone', highlights: ['x'], answers: ['conversion'] }] },
    visualSets: [{ name: 'conversion-journey-s173', routes: ['/membership/'], captureCount: 4 }],
    fieldVerdicts: { boundaries: [{ date: '2026-06-05', label: 'S173', overall: 'improved', routes: { '/': { lcpDeltaPct: -23.4, confidence: 'medium' } } }] },
  });
  // S358 — the surface reads the reader changelog, and only DECLARED links.
  const changelog = { entries: [
    { date: '2026-09-01', title: 'Older front-door change', answers: ['frontdoor'] },
    { date: '2026-09-17', title: 'Newer front-door change', answers: ['FrontDoor'] },
    { date: '2026-09-10', title: 'Front door mentioned but not declared as an answer' },
    { date: '2026-09-12', title: 'Answers a different theme', answers: ['speed'] },
    { date: 'soon', title: 'Undated entry', answers: ['frontdoor'] },
  ] };
  const declared = buildReceipts({
    feedback: { decisionSampler: { kAnonymityThreshold: 5, qualifiedThemes: [{ choice: 'x', theme: 'frontdoor', count: 5 }] } },
    changelog, visualSets: [], fieldVerdicts: { boundaries: [] },
  });
  const ships = declared.receipts[0].shippedCommits;
  const cases = [
    ['a candidate hash never reaches a reader', !readerLegible('bind visual + mobile proof to the S357 candidate a1c97bfa8612')],
    ['a session code never reaches a reader', !readerLegible('S356 — Desk flagship and site-wide crawl fixes')],
    ['a filename never reaches a reader', !readerLegible('teach generate-pathways.mjs about the strip')],
    ['a flag or command never reaches a reader', !readerLegible('wire four gates into npm run build:check')],
    ['working vocabulary never reaches a reader', !readerLegible('rebuild the derived graph after the rebase')],
    ['a plain reader-facing sentence still publishes', readerLegible('the mobile menu now opens on the first tap')],
    ['a perf/chore commit never publishes, however readable its prose', !reachesAReader(
      { summary: 'pages load faster on a phone', visitorFacing: true, type: 'perf' })],
    ['a missing type is treated as not-reader-facing', !reachesAReader(
      { summary: 'pages load faster on a phone', visitorFacing: true })],
    ['a feat on a visitor-facing path with reader prose does publish', reachesAReader(
      { summary: 'the mobile menu now opens on the first tap', visitorFacing: true, type: 'feat' })],
    // The exact line that leaked on 2026-09-18: git is no longer an input at all.
    ['a commit subject can never reach the surface, whatever it says', buildReceipts({
      feedback: { ...({ decisionSampler: { kAnonymityThreshold: 5, qualifiedThemes: [{ choice: 'x', theme: 'frontdoor', count: 5 }] } }), themes: [{ key: 'frontdoor', label: 'Front door', count: 3, commits: [{ sha: 'r1', summary: 'rebind the mobile proof without re-running the 215-cell audit' }] }] },
      changelog: { entries: [] }, visualSets: [], fieldVerdicts: { boundaries: [] },
    }).receipts[0].shippedCommits.length === 0],
    ['only entries that DECLARE the theme answer it', ships.length === 2 && ships.every((c) => /front-door change/.test(c.summary))],
    ['a keyword in the title is not a declaration', !ships.some((c) => /mentioned/.test(c.summary))],
    ['theme keys match case-insensitively', ships.some((c) => c.summary === 'Newer front-door change')],
    ['newest declared answer first', ships[0].summary === 'Newer front-door change' && ships[0].ts === '2026-09-17'],
    ['an undated entry is never published', !ships.some((c) => /Undated/.test(c.summary))],
    ['each line names its source', ships.every((c) => c.source === 'consumer-changelog')],
    ['an untagged corpus is honest-dark, not an error', shippedFromChangelog({ entries: [{ date: '2026-09-01', title: 'x' }] }, 'frontdoor').length === 0],
    ['the reader signal count survives an empty box', declared.receipts[0].feedbackSignals === 5],
    // S359 — the defect: commit counts were rendered as reader asks.
    ['commits classified into a theme are NOT reader signals', buildReceipts({
      feedback: { themes: [{ key: 'frontdoor', label: 'Front door', count: 3 }], decisionSampler: { kAnonymityThreshold: 5, observedTotal: 0, qualifiedThemes: [] } },
      changelog: { entries: [{ date: '2026-09-17', title: 'x', answers: ['frontdoor'] }] }, visualSets: [], fieldVerdicts: { boundaries: [] },
    }).receipts.length === 0],
    ['a choice below the k-anonymity threshold stays dark', readerThemes({ decisionSampler: { kAnonymityThreshold: 5, qualifiedThemes: [{ theme: 'trust', count: 4 }] } }).length === 0],
    ['reader themes map to their labels', readerThemes({ decisionSampler: { kAnonymityThreshold: 5, qualifiedThemes: [{ theme: 'trust', count: 7 }] } })[0].label === 'Trust'],
    ['receipt created', payload.receipts.length === 1],
    ['declared change joined', payload.receipts[0].shippedCommits[0].summary === 'Pages load faster on a phone'],
    ['proof joined', payload.receipts[0].proof?.set === 'conversion-journey-s173'],
    ['no field verdict on a non-speed theme', payload.receipts[0].fieldVerdict === undefined],
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
  changelog: readJson('data/consumer-changelog.json', { entries: [] }),
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
