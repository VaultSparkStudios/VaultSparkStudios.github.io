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
        shippedCommits: commits.slice(0, 5).map((commit) => ({
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
<!-- generated-at: ${new Date().toISOString().slice(0, 10)} -->

# Ship Receipts

Public-safe receipts connecting aggregate feedback themes to shipped work and proof artifacts. Raw feedback text is intentionally absent.

| Theme | Signals | Shipped evidence | Visual proof |
|---|---:|---|---|
${rows}
`;
}

if (SELF_TEST) {
  const payload = buildReceipts({
    feedback: { themes: [{ key: 'speed', label: 'Speed', count: 2, commits: [{ sha: 'abc' }] }] },
    commitMap: { entries: [{ sha: 'abc', summary: 'fast', ts: 'today' }] },
    visualSets: [{ name: 'home-lcp-s173', routes: ['/'], captureCount: 4 }],
    fieldVerdicts: { boundaries: [{ date: '2026-06-05', label: 'S173', overall: 'improved', routes: { '/': { lcpDeltaPct: -23.4, confidence: 'medium' } } }] },
  });
  const cases = [
    ['receipt created', payload.receipts.length === 1],
    ['commit joined', payload.receipts[0].shippedCommits[0].summary === 'fast'],
    ['proof joined', payload.receipts[0].proof?.set === 'home-lcp-s173'],
    ['field verdict joined on speed', payload.receipts[0].fieldVerdict?.verdict === 'improved'],
    ['field delta carried', payload.receipts[0].fieldVerdict?.lcpDeltaPct === -23.4],
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
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(DOC, renderDoc(payload), 'utf8');
console.log(`build-ship-receipts: ${payload.receipts.length} receipt(s)`);
