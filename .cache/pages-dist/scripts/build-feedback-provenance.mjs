#!/usr/bin/env node
/**
 * build-feedback-provenance.mjs (S163 audit #3 · feedback-ship-provenance)
 *
 * Joins two things S162 shipped separately and never connected:
 *   • api/commit-map.json     — the public "Forge ledger" (noise-filtered git log)
 *   • feedback theme bucketing — assets/feedback-insights.js classifies feedback
 *                                by the part of the studio it speaks to
 *
 * The join turns the hand-curated "you asked → we shipped" page into an
 * EVIDENCE-backed one: for each feedback theme, which recent forge moves
 * actually shipped against it. No studio publicly shows commit-level provenance
 * for the parts of the product people flag.
 *
 * Public-safe by construction: it reads only commit SUBJECTS (already public via
 * git) and classifies them by keyword into the SAME themes the feedback page
 * uses. No raw feedback text, no member data, ever touches this surface.
 *
 * Honesty contract: this is a correlation surface ("here's what shipped in the
 * area you flagged"), not a 1:1 ticket link. The rendered copy says so.
 *
 * Output: api/feedback-provenance.json  → consumed by assets/feedback-provenance.js
 *
 * Usage:
 *   node scripts/build-feedback-provenance.mjs            # write
 *   node scripts/build-feedback-provenance.mjs --check     # present + parseable
 *   node scripts/build-feedback-provenance.mjs --self-test # classifier checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COMMIT_MAP = path.join(ROOT, 'api', 'commit-map.json');
const OUT = path.join(ROOT, 'api', 'feedback-provenance.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

const MAX_PER_THEME = 6;

// Themes mirror assets/feedback-insights.js (path-prefix → theme). Here we match
// commit subjects (type/scope/summary) by keyword to the same theme buckets, so
// "the area you flagged" lines up with "what we shipped there." Order matters:
// first match wins, so more-specific themes precede 'frontdoor'.
const THEMES = [
  { key: 'conversion',   label: 'Conversion',     keywords: ['member', 'membership', 'join', 'invite', 'vaultspark', 'pricing', 'signup', 'sign-up', 'checkout', 'tier', 'upgrade', 'subscription', 'account', 'sso', 'auth', 'login', 'identity', 'passkey'] },
  { key: 'worlds',       label: 'Worlds',         keywords: ['game', 'universe', 'voidfall', 'dreadspike', 'solara', 'gridiron', 'football', 'doodie', 'play', 'world'] },
  { key: 'transparency', label: 'Transparency',   keywords: ['oracle', 'ignis', 'studio-pulse', 'pulse', 'roadmap', 'changelog', 'journal', 'press', 'forge ledger', 'forge-ledger', 'commit-map', 'commit map', 'conduit', 'narration', 'heartbeat', 'roi', 'status'] },
  { key: 'trust',        label: 'Trust & legal',  keywords: ['privacy', 'terms', 'cookie', 'accessibility', 'a11y', 'security', 'csp', 'trusted types', 'trusted-types', 'gdpr', 'consent', 'data-deletion', 'rights', 'sri', 'supply-chain', 'supply chain'] },
  { key: 'speed',        label: 'Speed',          keywords: ['perf', 'lcp', 'cls', 'inp', 'ttfb', 'speed', 'fast', 'bundle', 'lazy', 'defer', 'preconnect', 'cache', 'rum', 'budget', 'warm-trace', 'critical-path'] },
  { key: 'frontdoor',    label: 'Front door',     keywords: ['home', 'homepage', 'hero', 'landing', 'nav', 'navigation', 'drawer', 'mobile', 'wordmark', 'brand', 'menu', 'header', 'footer'] },
];

/** Classify a commit-map entry into a theme key, or null for 'other'. */
function themeForEntry(entry) {
  const hay = `${entry.type || ''} ${entry.scope || ''} ${entry.summary || ''}`.toLowerCase();
  for (const theme of THEMES) {
    if (theme.keywords.some((kw) => hay.includes(kw))) return theme.key;
  }
  return null;
}

function build(commitMap) {
  const entries = Array.isArray(commitMap?.entries) ? commitMap.entries : [];
  const byTheme = new Map(THEMES.map((t) => [t.key, []]));
  for (const e of entries) {
    const key = themeForEntry(e);
    if (!key) continue;
    const bucket = byTheme.get(key);
    if (bucket.length >= MAX_PER_THEME) continue;
    bucket.push({
      sha: e.sha,
      move: e.move || 'Shipped',
      tone: e.tone || 'forge',
      summary: e.summary || '',
      ts: e.ts || null,
    });
  }
  const themes = THEMES
    .map((t) => ({ key: t.key, label: t.label, count: byTheme.get(t.key).length, commits: byTheme.get(t.key) }))
    .filter((t) => t.count > 0);
  return themes;
}

if (SELF_TEST) {
  const cases = [
    ['membership commit → conversion', themeForEntry({ type: 'feat', scope: 'S160', summary: 'progressive membership journey' }) === 'conversion'],
    ['LCP commit → speed', themeForEntry({ type: 'perf', summary: 'RUM field-LCP gate + warm-trace-mode' }) === 'speed'],
    ['oracle commit → transparency', themeForEntry({ type: 'feat', summary: 'Forge Ledger on studio-pulse' }) === 'transparency'],
    ['privacy commit → trust', themeForEntry({ type: 'fix', summary: 'tighten CSP and trusted-types report' }) === 'trust'],
    ['mobile drawer → frontdoor', themeForEntry({ type: 'fix', summary: 'mobile drawer stacking context' }) === 'frontdoor'],
    ['unrelated chore → null', themeForEntry({ type: 'chore', summary: 'bump dependency lockfile' }) === null],
    ['build caps per theme at MAX', (() => {
      const many = Array.from({ length: 20 }, (_, i) => ({ sha: `s${i}`, type: 'perf', summary: `lcp tweak ${i}` }));
      const themes = build({ entries: many });
      const speed = themes.find((t) => t.key === 'speed');
      return speed && speed.commits.length === MAX_PER_THEME;
    })()],
    ['empty themes excluded', (() => {
      const themes = build({ entries: [{ sha: 'a', type: 'chore', summary: 'nothing matchable zzz' }] });
      return themes.length === 0;
    })()],
  ];
  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (!fs.existsSync(COMMIT_MAP)) {
  console.error('build-feedback-provenance: api/commit-map.json missing — run build-commit-map.mjs first');
  process.exit(CHECK ? 1 : 0);
}

const commitMap = JSON.parse(fs.readFileSync(COMMIT_MAP, 'utf8'));
const themes = build(commitMap);
const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  generatedBy: 'scripts/build-feedback-provenance.mjs',
  source: 'api/commit-map.json (theme-classified, public commit subjects only)',
  kind: 'feedback-provenance',
  note: 'Recent forge moves in the areas people flag. A correlation surface, not a per-ticket link.',
  themeCount: themes.length,
  themes,
};

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('build-feedback-provenance --check: api/feedback-provenance.json missing — run without --check first');
    process.exit(1);
  }
  try {
    JSON.parse(fs.readFileSync(OUT, 'utf8'));
    console.log(`build-feedback-provenance --check: ok (${themes.length} themes)`);
    process.exit(0);
  } catch {
    console.error('build-feedback-provenance --check: output is not valid JSON');
    process.exit(1);
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`build-feedback-provenance → ${path.relative(ROOT, OUT)} (${themes.length} themes, ${themes.reduce((n, t) => n + t.count, 0)} commits)`);
