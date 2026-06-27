#!/usr/bin/env node
/**
 * draft-changelog-entry.mjs — S229 changelog auto-drafter.
 *
 * Reads shipped items from the most recent WORK_LOG session entry and recent
 * git commits since the last changelog-narrative.json entry. Groups by theme
 * and writes a draft to context/changelog-drafts/<date>.md for founder review.
 *
 * HonestDark: the draft is NEVER auto-published. A founder must review and
 * promote it to changelog/index.html via the manual changelog update flow.
 *
 * Usage:
 *   node scripts/draft-changelog-entry.mjs             # draft for today
 *   node scripts/draft-changelog-entry.mjs --self-test # smoke check
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRAFTS_DIR = path.join(ROOT, 'context', 'changelog-drafts');
const WORK_LOG = path.join(ROOT, 'logs', 'WORK_LOG.md');
const CHANGELOG_NARRATIVE = path.join(ROOT, 'api', 'changelog-narrative.json');

const SELF_TEST = process.argv.includes('--self-test');
const DATE = new Date().toISOString().slice(0, 10);

// Theme buckets for grouping shipped items.
const THEME_PATTERNS = [
  { key: 'intelligence', label: 'AI & Intelligence', re: /ignis|oracle|ai|intel|context|answer|query|inp-telemetry|cwv/i },
  { key: 'performance',  label: 'Performance',       re: /perf|lcp|inp|cls|lqip|speed|webp|avif|cache|rum|cwv/i },
  { key: 'observability',label: 'Observability',     re: /rum|telemetry|probe|monitor|beacon|health|uptime|ci/i },
  { key: 'platform',     label: 'Platform',          re: /worker|cloudflare|shell|deploy|build|bundle|ci|push/i },
  { key: 'product',      label: 'Product',           re: /game|play|member|vault|changelog|push|subscribe|cta/i },
];

// Internal-only work that should NOT reach the public changelog — visitors do
// not benefit from CI/test/gate/build-infra churn (S230: the public /changelog/
// went 75 days stale precisely because the auto-feed was full of this jargon).
const INTERNAL_ONLY_RE = /\b(ci|gate|vr|baseline|root-?fix|build artifact|snapshot|yaml|eslint|lint|doctor|sil|allowlist|workflow|cron|orphan|self-test|--check|propagat|ark|repo-lock|cmd\.exe|node ?2[04]|networkidle|spawn)\b/i;

// CANON-030: expand acronyms / dev-jargon into plain visitor English the first
// time they appear. Applied to descriptions before they reach a human draft.
const HUMANIZE = [
  [/\bIGNIS\b/g, 'the Oracle (AI answer engine)'],
  [/\boracle\b/gi, 'the Oracle'],
  [/\bLCP\b/g, 'main-image load speed'],
  [/\bINP\b/g, 'tap responsiveness'],
  [/\bCLS\b/g, 'layout stability'],
  [/\bCWV\b/g, 'Core Web Vitals'],
  [/\bLQIP\b/g, 'blur-up image placeholders'],
  [/\bRUM\b/g, 'real-user performance data'],
  [/\bSEO\b/g, 'search visibility'],
  [/\bCTA\b/g, 'call-to-action'],
  [/\bJSON-LD\b/g, 'structured data for search engines'],
  [/\bP0\b/g, 'top-priority'],
];

function humanize(text) {
  let out = text;
  for (const [re, sub] of HUMANIZE) out = out.replace(re, sub);
  return out;
}

function isVisitorFacing(item) {
  return !INTERNAL_ONLY_RE.test(item.slug + ' ' + item.desc);
}

// Build a paste-ready cl-phase <article> matching changelog/index.html's exact
// markup, so promoting a draft is a single copy/paste (friction was the root
// cause of staleness). Only visitor-facing items are included.
function renderClPhase(sessionLabel, dateIso, items) {
  const visitor = items.filter(isVisitorFacing);
  if (!visitor.length) return '';
  const lis = visitor
    .map((it) => {
      const desc = humanize(it.desc);
      const short = desc.length > 160 ? desc.slice(0, 157) + '…' : desc;
      return `              <li>${short}</li>`;
    })
    .join('\n');
  return [
    `          <!-- ${sessionLabel} -->`,
    `          <article class="cl-phase" data-reveal="fade-up">`,
    `            <div class="cl-dot" aria-hidden="true"></div>`,
    `            <div class="cl-phase-header">`,
    `              <span class="cl-phase-num">${sessionLabel}</span><span class="cl-phase-date">${dateIso}</span>`,
    `              <div class="cl-phase-title">REVIEW: write a 4–6 word visitor-facing headline</div>`,
    `            </div>`,
    `            <ul class="cl-items">`,
    lis,
    `            </ul>`,
    `          </article>`,
  ].join('\n');
}

function parseWorkLogSession(text) {
  // Extract the most recent session block (## 2026-... heading).
  const sections = text.split(/^## /m).filter(Boolean);
  if (!sections.length) return null;
  const latest = sections[0]; // most recent comes first
  const lines = latest.split('\n');
  const header = lines[0] || '';
  // Extract shipped items from the "Shipped (N items):" bulleted list.
  const shippedStart = text.indexOf('**Shipped');
  if (shippedStart === -1) return { header, items: [] };
  const block = text.slice(shippedStart).split(/\n(?=##\s|\*\*Honest)/)[0];
  const items = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\d+\.\s+`([^`]+)`\s+[—–-]+\s+(.+)/);
    if (m) items.push({ slug: m[1], desc: m[2].replace(/\*\*/g, '').trim() });
  }
  return { header, items };
}

function getCommitsSince(sha) {
  try {
    const out = execFileSync('git', ['log', `${sha}..HEAD`, '--pretty=format:%h %s', '--no-merges'], {
      cwd: ROOT, encoding: 'utf8',
    }).trim();
    return out ? out.split('\n').filter(Boolean) : [];
  } catch { return []; }
}

function classifyItem(text) {
  for (const { key, re } of THEME_PATTERNS) {
    if (re.test(text)) return key;
  }
  return 'platform'; // default bucket
}

function groupByTheme(items) {
  const groups = {};
  for (const item of items) {
    const theme = classifyItem(item.slug + ' ' + item.desc);
    if (!groups[theme]) groups[theme] = [];
    groups[theme].push(item);
  }
  return groups;
}

if (SELF_TEST) {
  const cases = [];
  cases.push(['parse empty work log returns null', parseWorkLogSession('') === null]);
  const sampleLog = '## 2026-06-29 — Session 230\n\n**Shipped (2 items):**\n1. `ignis-feature` — IGNIS context boost.\n2. `lqip-fix` — Faster LCP.\n\n**Honest non-actions:** nothing.\n';
  const parsed = parseWorkLogSession(sampleLog);
  cases.push(['parse finds 2 items', parsed && parsed.items.length === 2]);
  cases.push(['parse slugs correct', parsed && parsed.items[0].slug === 'ignis-feature' && parsed.items[1].slug === 'lqip-fix']);
  cases.push(['classifyItem ignis → intelligence', classifyItem('ignis context boost') === 'intelligence']);
  cases.push(['classifyItem lqip → performance', classifyItem('lqip-fix Faster LCP') === 'performance']);
  cases.push(['humanize expands IGNIS', humanize('IGNIS answer engine').includes('Oracle')]);
  cases.push(['humanize expands LCP', humanize('Fixed LCP').includes('load speed')]);
  cases.push(['internal CI item filtered', isVisitorFacing({ slug: 'ci-rootfix', desc: 'CI gate hardening' }) === false]);
  cases.push(['visitor game item kept', isVisitorFacing({ slug: 'game-quiz', desc: 'find-your-game quiz' }) === true]);
  cases.push(['renderClPhase emits article for visitor items', renderClPhase('S999', '2026-06-27', [{ slug: 'game-quiz', desc: 'Find-your-game quiz' }]).includes('cl-phase')]);
  cases.push(['renderClPhase empty when all internal', renderClPhase('S999', '2026-06-27', [{ slug: 'ci', desc: 'CI gate' }]) === '']);
  let pass = 0, fail = 0;
  for (const [label, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${label}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

// --- Main ---
let workLogText = '';
try { workLogText = fs.readFileSync(WORK_LOG, 'utf8'); } catch { /* not found */ }

const session = parseWorkLogSession(workLogText);
if (!session || !session.items.length) {
  console.log('draft-changelog-entry: no shipped items found in WORK_LOG.md — nothing to draft');
  process.exit(0);
}

// Find the most recent changelog SHA to bound the git log.
let lastSha = '';
try {
  const narrative = JSON.parse(fs.readFileSync(CHANGELOG_NARRATIVE, 'utf8'));
  lastSha = (narrative.entries || [])[0]?.sha || '';
} catch { /* ok — no prior narrative */ }

const commits = lastSha ? getCommitsSince(lastSha) : [];
const groups = groupByTheme(session.items);

// Build the draft markdown.
const lines = [
  `<!-- draft-changelog-entry — ${DATE} — FOUNDER REVIEW REQUIRED before publishing -->`,
  `<!-- honest-dark: do NOT auto-publish this file; promote manually to changelog/index.html -->`,
  '',
  `# Changelog Draft — ${DATE}`,
  '',
  `> **Session ${session.header.split('Session')[1]?.trim().split(' ')[0] || 'N/A'} · ${DATE}**  `,
  `> Review this draft. Trim to 2–3 most user-visible bullets. Then update \`changelog/index.html\`.`,
  '',
];

for (const themeKey of Object.keys(groups)) {
  const themeLabel = THEME_PATTERNS.find((t) => t.key === themeKey)?.label || themeKey;
  lines.push(`## ${themeLabel}`);
  lines.push('');
  for (const { slug, desc } of groups[themeKey]) {
    const short = desc.length > 140 ? desc.slice(0, 137) + '…' : desc;
    lines.push(`- **${slug}** — ${short}`);
  }
  lines.push('');
}

if (commits.length) {
  lines.push('## Recent commits (context)');
  lines.push('');
  for (const c of commits.slice(0, 10)) {
    lines.push(`- \`${c}\``);
  }
  lines.push('');
}

// Paste-ready HTML — only visitor-facing items, acronyms expanded (CANON-030).
const sessionLabel = 'S' + (session.header.split('Session')[1]?.trim().split(/\s/)[0] || 'NNN');
const clPhase = renderClPhase(sessionLabel, DATE, session.items);
lines.push('## Paste-ready changelog HTML (visitor-facing only)');
lines.push('');
if (clPhase) {
  lines.push('> Review the headline + bullets, then paste this `<article>` above the newest');
  lines.push('> `<!-- S… -->` block in `changelog/index.html` (inside `.cl-timeline`).');
  lines.push('');
  lines.push('```html');
  lines.push(clPhase);
  lines.push('```');
} else {
  lines.push('_No visitor-facing items this session — all shipped work was internal (CI/build/test/infra). Nothing to add to the public changelog._');
}
lines.push('');
lines.push('---');
lines.push('');
lines.push('*Generated by `scripts/draft-changelog-entry.mjs` · honest-dark · not auto-published*');

const draft = lines.join('\n');
fs.mkdirSync(DRAFTS_DIR, { recursive: true });
const outPath = path.join(DRAFTS_DIR, `${DATE}.md`);
fs.writeFileSync(outPath, draft);
console.log(`draft-changelog-entry: wrote ${path.relative(ROOT, outPath)}`);
console.log(`  themes: ${Object.keys(groups).join(', ')}`);
console.log(`  items: ${session.items.length}`);
console.log(`  honest-dark: review required before publishing`);
