#!/usr/bin/env node
/**
 * report-ambient-coverage.mjs (S163 audit #12 · ambient-bundle-coverage-report)
 *
 * The ambient bundle ships ~24 sources / ~130KB to EVERY page, but several
 * modules only do work under a condition (a ?param, a matchMedia breakpoint, the
 * presence of a specific element, a signed-in session). This report is the
 * data-driven input to any future bundle split: for each source it computes
 * size and an ACTIVATION SHAPE — "always" (runs unconditionally) vs "guarded"
 * (early-returns unless a condition holds). Guarded + heavy = lazy-load candidate.
 *
 * Honesty note: this is STATIC activation-shape analysis, not a runtime execution
 * trace. It answers "which modules are conditional and how big" — the decision
 * input. Confirming actual per-page execution with the Playwright harness is a
 * follow-up; this gets the founder the split shortlist for free, every build.
 *
 * Output: docs/AMBIENT_COVERAGE.md (report-only — informs, changes nothing).
 *
 * Usage:
 *   node scripts/report-ambient-coverage.mjs
 *   node scripts/report-ambient-coverage.mjs --check     # present + parseable
 *   node scripts/report-ambient-coverage.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILDER = path.join(ROOT, 'scripts', 'build-ambient-bundle.mjs');
const OUT = path.join(ROOT, 'docs', 'AMBIENT_COVERAGE.md');
const CANDIDATES_OUT = path.join(ROOT, '.cache', 'ambient-split-candidates.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const FORBIDDEN_AMBIENT_SOURCES = new Map([
  ['assets/command-palette.js', 'Use assets/command-palette-loader.js so the 18KB palette is parsed only after search intent.'],
]);

/** Parse the AMBIENT_SOURCES array out of the builder (single source of truth). */
function parseSources(builderText) {
  const m = builderText.match(/AMBIENT_SOURCES\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+\.js)['"]/g)].map((x) => x[1]);
}

// Patterns that signal a module gates its own work behind a runtime condition.
const GUARD_SIGNALS = [
  { re: /location\.search|URLSearchParams|[?&][a-z]+=|getParam|\?nav=/i, why: 'query-param gated' },
  { re: /matchMedia|max-width|min-width|innerWidth\s*[<>]/i, why: 'viewport gated' },
  { re: /getElementById\(['"][^'"]+['"]\)\s*;?\s*\n?\s*if\s*\(\s*!|querySelector\([^)]*\)\s*;?\s*\n?\s*if\s*\(\s*!/i, why: 'element-presence gated' },
  { re: /signed-in|data-vs-signed-in|access_token|auth-token|VSIdentity|session/i, why: 'session gated' },
  { re: /prefers-reduced-motion|matchMedia\(['"]\(hover/i, why: 'capability gated' },
  { re: /localStorage\.getItem\([^)]*\)\s*[!=]==?|vs_[a-z_]+\)\s*[!=]/i, why: 'preference gated' },
];

/** Classify a module's activation shape from its source text. */
function activationShape(text) {
  // Look at the first ~1200 chars (the IIFE preamble where guards live).
  const head = text.slice(0, 1200);
  const hits = GUARD_SIGNALS.filter((g) => g.re.test(head)).map((g) => g.why);
  // An early `return;` near the top is the strongest guard signal.
  const earlyReturn = /\)\s*return\s*;|return\s*;\s*\/\//.test(head);
  if (hits.length || earlyReturn) {
    return { shape: 'guarded', reasons: [...new Set(hits)].slice(0, 3) };
  }
  return { shape: 'always', reasons: [] };
}

function analyze(sources) {
  return sources.map((rel) => {
    const abs = path.join(ROOT, rel);
    let bytes = 0, text = '';
    try { text = fs.readFileSync(abs, 'utf8'); bytes = Buffer.byteLength(text, 'utf8'); } catch { /* missing */ }
    const { shape, reasons } = activationShape(text);
    return { source: rel, bytes, shape, reasons };
  });
}

function proofStepFor(row) {
  if ((row.reasons || []).some((reason) => reason.includes('viewport'))) {
    return `Run npx playwright test with desktop and mobile viewports, then verify ${row.source} only loads where its viewport condition is true.`;
  }
  if ((row.reasons || []).some((reason) => reason.includes('session'))) {
    return `Run signed-out and signed-in browser smoke checks, then verify ${row.source} is lazy-loaded only after session state is known.`;
  }
  if ((row.reasons || []).some((reason) => reason.includes('query-param'))) {
    return `Open the default route and the query-flagged route, then verify ${row.source} is absent by default and present only after intent.`;
  }
  if ((row.reasons || []).some((reason) => reason.includes('element'))) {
    return `Crawl pages with and without the target element, then verify ${row.source} is only loaded on pages that can use it.`;
  }
  return `Confirm behavior with a focused Playwright smoke before moving ${row.source} behind a conditional loader.`;
}

function writeCandidateArtifact(rows, sources) {
  const candidates = rows
    .filter((row) => row.shape === 'guarded' && row.bytes >= 4096)
    .sort((a, b) => b.bytes - a.bytes)
    .map((row, index) => ({
      rank: index + 1,
      source: row.source,
      sizeKb: Number((row.bytes / 1024).toFixed(1)),
      reasons: row.reasons,
      forbiddenAmbient: FORBIDDEN_AMBIENT_SOURCES.has(row.source),
      risk: row.bytes >= 10240 ? 'medium' : 'low',
      firstProofStep: proofStepFor(row),
    }));
  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/report-ambient-coverage.mjs',
    totalSources: rows.length,
    totalBytes: rows.reduce((n, r) => n + r.bytes, 0),
    forbiddenAmbientSourcesPresent: sources.filter((source) => FORBIDDEN_AMBIENT_SOURCES.has(source)),
    candidates,
  };
  fs.mkdirSync(path.dirname(CANDIDATES_OUT), { recursive: true });
  fs.writeFileSync(CANDIDATES_OUT, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (SELF_TEST) {
  const cases = [
    ['parses sources array', parseSources("const AMBIENT_SOURCES = [\n 'assets/a.js',\n 'assets/b.js',\n];").length === 2],
    ['query-param module → guarded', activationShape("(function(){if(!location.search.includes('nav=sheet'))return;})();").shape === 'guarded'],
    ['viewport module → guarded', activationShape("(function(){if(!matchMedia('(max-width:768px)').matches)return;})();").shape === 'guarded'],
    ['session module → guarded', activationShape("(function(){var t=localStorage.getItem('auth-token');if(!t)return;})();").shape === 'guarded'],
    ['unconditional module → always', activationShape("(function(){document.body.classList.add('native-feel');})();").shape === 'always'],
    ['analyze returns bytes + shape', (() => { const r = analyze(['scripts/report-ambient-coverage.mjs']); return r[0].bytes > 0 && !!r[0].shape; })()],
  ];
  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (!fs.existsSync(BUILDER)) {
  console.error('report-ambient-coverage: build-ambient-bundle.mjs missing');
  process.exit(1);
}
const sources = parseSources(fs.readFileSync(BUILDER, 'utf8'));
const rows = analyze(sources).sort((a, b) => b.bytes - a.bytes);
const total = rows.reduce((n, r) => n + r.bytes, 0);
const guarded = rows.filter((r) => r.shape === 'guarded');
const guardedBytes = guarded.reduce((n, r) => n + r.bytes, 0);
const candidateArtifact = writeCandidateArtifact(rows, sources);

const md = [
  '<!-- generated-by: scripts/report-ambient-coverage.mjs -->',
  `<!-- generated-at: ${new Date().toISOString().slice(0, 10)} -->`,
  '',
  '# Ambient Bundle — Activation Shape Report',
  '',
  '> STATIC activation-shape analysis (not a runtime execution trace). Identifies',
  '> which always-shipped ambient modules gate their own work behind a runtime',
  '> condition — the shortlist for a future conditional/lazy split. Runtime',
  '> confirmation via the Playwright harness is the follow-up step.',
  '',
  `- Sources: **${rows.length}**  ·  Total: **${(total / 1024).toFixed(1)} KB** (raw)`,
  `- Guarded (conditional): **${guarded.length}** modules · **${(guardedBytes / 1024).toFixed(1)} KB** — split candidates`,
  `- Always-on: **${rows.length - guarded.length}** modules · **${((total - guardedBytes) / 1024).toFixed(1)} KB**`,
  '',
  '## By size (split candidates flagged)',
  '',
  '| Source | Size | Shape | Why conditional |',
  '|---|--:|:-:|---|',
  ...rows.map((r) => `| \`${r.source.replace('assets/', '')}\` | ${(r.bytes / 1024).toFixed(1)} KB | ${r.shape === 'guarded' ? '🔶 guarded' : 'always'} | ${r.reasons.join(', ') || '—'} |`),
  '',
  '## Read',
  '',
  'A 🔶 guarded module ships to every page but only executes under its condition',
  '(a query param, a viewport, a session, an element). The largest guarded modules',
  'are the highest-value candidates to move behind a conditional `import()` so the',
  'cold-bundle parse cost drops for visitors who never trigger them.',
  '',
].join('\n');

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('report-ambient-coverage --check: docs/AMBIENT_COVERAGE.md missing'); process.exit(1); }
  const forbidden = sources.filter((source) => FORBIDDEN_AMBIENT_SOURCES.has(source));
  if (forbidden.length) {
    for (const source of forbidden) {
      console.error(`report-ambient-coverage --check: forbidden ambient source ${source}. ${FORBIDDEN_AMBIENT_SOURCES.get(source)}`);
    }
    process.exit(1);
  }
  console.log(`report-ambient-coverage --check: ok (${rows.length} sources, ${guarded.length} guarded, ${candidateArtifact.candidates.length} candidates)`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`report-ambient-coverage → docs/AMBIENT_COVERAGE.md (${rows.length} sources · ${guarded.length} guarded · ${(guardedBytes / 1024).toFixed(1)}KB split-candidate)`);
console.log(`ambient split candidates → .cache/ambient-split-candidates.json (${candidateArtifact.candidates.length})`);
