#!/usr/bin/env node
// Project-info drift detector.
// Compares each projects/*/index.html + games/*/index.html landing page against:
//   1. The canonical sibling repo under $STUDIO_DEV_ROOT/<Folder>/README.md
//   2. studio-hub/src/data/studioRegistry.js
// Flags pages whose <meta name="description"> or body lead paragraph contradicts the sibling repo.
// Exits non-zero when drift is found (so it gates build:check).
//
// Usage:
//   node scripts/check-project-info-drift.mjs         # human report
//   node scripts/check-project-info-drift.mjs --json  # machine-readable
//   node scripts/check-project-info-drift.mjs --check # exit-non-zero-on-drift (for CI)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot  = path.resolve(__dirname, '..');
// Default: assume sibling repos sit one level above this repo (../<Folder>/).
// Override with STUDIO_DEV_ROOT for non-standard layouts.
const devRoot   = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');

const args = new Set(process.argv.slice(2));
const jsonMode  = args.has('--json');
const checkMode = args.has('--check');

// page-id → sibling-repo folder. Null = no sibling repo (feature page).
const PAGE_TO_REPO = {
  // games
  'games/call-of-doodie':        'Call-Of-Doodie',
  'games/gridiron-gm':           'Gridiron-GM',
  'games/mindframe':             'mindframe',
  'games/project-unknown':       null,
  'games/solara':                'Solara',
  'games/the-exodus':            'The-Exodus',
  'games/vaultfront':            'VaultFront',
  'games/vaultspark-football-gm':'VaultSpark Football GM',
  // projects
  'projects/canon':              'Canon',
  'projects/ideaforge':          'IdeaForge',
  'projects/promogrind':         'PromoGrind',
  'projects/signal-log':         null,
  'projects/statvault':          'StatVault',
  'projects/the-living-protocol':'The-Living-Protocol',
  'projects/vault-member':       null,
  'projects/vault-pipeline':     null,
  'projects/vaultfront':         'VaultFront',
  'projects/velaxis':            'Velaxis',
  'projects/vorn':               'Vorn',
};

// --- helpers ---

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractMetaDescription(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
}
function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}
function extractH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripHtml(m[1]) : null;
}
function extractFirstH2Block(html) {
  // H2 + its following <p>, so we can compare positioning prose.
  const m = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return null;
  return { h2: stripHtml(m[1]), lead: stripHtml(m[2]) };
}
function extractEyebrow(html) {
  const m = html.match(/<p\s+class=["']eyebrow["']\s*>([\s\S]*?)<\/p>/i);
  return m ? stripHtml(m[1]) : null;
}

// Pull the canonical sentence(s) from a README. Strategy:
//   1. If there is a bold tagline on line 3ish ("**...**"), prefer it.
//   2. Otherwise, the first non-heading non-badge paragraph.
function extractReadmeTruth(readme) {
  if (!readme) return null;
  const lines = readme.split(/\r?\n/);
  // Skip front matter + headings + blank + badges
  const candidates = [];
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('---')) continue;
    if (line.startsWith('![')) continue;   // badge image
    if (line.startsWith('[!')) continue;
    if (line.startsWith('>')) continue;    // blockquote
    // Prefer bold tagline
    const boldMatch = line.match(/^\*\*(.+?)\*\*\s*\.?$/);
    if (boldMatch) {
      return { kind: 'bold-tagline', text: boldMatch[1].trim() };
    }
    if (line.length > 40 && /[a-z]/i.test(line)) {
      candidates.push(line);
      if (candidates.length >= 2) break;
    }
  }
  if (candidates.length === 0) return null;
  return { kind: 'paragraph', text: candidates.join(' ').trim() };
}

// Simple tokenization → lowercase word set, strips punctuation.
function tokens(s) {
  return new Set(
    String(s).toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 4)
  );
}

// Compute what fraction of the README truth's distinctive words appear in the page description.
// Filters stopwords-ish by only keeping >=4-char words.
function coverage(pageDesc, truthText) {
  const tPage = tokens(pageDesc);
  const tTruth = tokens(truthText);
  if (tTruth.size === 0) return 1;
  let hit = 0;
  for (const t of tTruth) if (tPage.has(t)) hit++;
  return hit / tTruth.size;
}

// Words that appear in README but NOT page (distinctive misses).
function missingWords(pageDesc, truthText) {
  const tPage = tokens(pageDesc);
  const tTruth = [...tokens(truthText)];
  return tTruth.filter(t => !tPage.has(t)).slice(0, 12);
}

// --- studioRegistry parse ---
function loadRegistry() {
  const src = readFile(path.join(repoRoot, 'studio-hub', 'src', 'data', 'studioRegistry.js'));
  if (!src) return {};
  const out = {};
  // Parse each entry block between `{` and `}` that contains `id:`.
  const blockRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?\}/g;
  let m;
  while ((m = blockRegex.exec(src))) {
    const id = m[1];
    const block = m[0];
    const descM = block.match(/description:\s*"([^"]*)"/);
    const nameM = block.match(/name:\s*"([^"]*)"/);
    const statusM = block.match(/statusLabel:\s*"([^"]*)"/);
    const vaultM = block.match(/vaultStatus:\s*"([^"]*)"/);
    out[id] = {
      name: nameM ? nameM[1] : null,
      description: descM ? descM[1] : null,
      statusLabel: statusM ? statusM[1] : null,
      vaultStatus: vaultM ? vaultM[1] : null,
    };
  }
  return out;
}

// --- main ---
const registry = loadRegistry();
const results = [];

const THRESHOLD = 0.20; // at least 20% of README keywords must appear in page description

for (const [pageId, repoFolder] of Object.entries(PAGE_TO_REPO)) {
  const pagePath = path.join(repoRoot, pageId, 'index.html');
  const html = readFile(pagePath);
  if (!html) {
    results.push({ page: pageId, severity: 'ERROR', type: 'page-missing', detail: pagePath });
    continue;
  }

  const desc     = extractMetaDescription(html);
  const title    = extractTitle(html);
  const h1       = extractH1(html);
  const eyebrow  = extractEyebrow(html);
  const firstH2  = extractFirstH2Block(html);

  const issues = [];

  // Basic sanity checks
  if (!desc)    issues.push({ severity: 'P1', type: 'missing-meta-description' });
  if (!h1)     issues.push({ severity: 'P1', type: 'missing-h1' });

  // Registry cross-check (soft)
  const registryId = pageId.replace(/^(games|projects)\//, '');
  const reg = registry[registryId];
  if (reg && h1 && reg.name && !h1.toLowerCase().includes(reg.name.toLowerCase().split(/\s/)[0])) {
    issues.push({ severity: 'P2', type: 'h1-mismatches-registry-name', detail: `page H1="${h1}" vs registry.name="${reg.name}"` });
  }

  if (!repoFolder) {
    issues.push({ severity: 'INFO', type: 'no-sibling-repo', detail: 'Pulls metadata from studioRegistry only (no standalone repo)' });
    results.push({ page: pageId, desc, h1, eyebrow, h2: firstH2?.h2, lead: firstH2?.lead, truthText: null, issues });
    continue;
  }

  // README truth extraction
  const readmePath = path.join(devRoot, repoFolder, 'README.md');
  const readme = readFile(readmePath);
  if (!readme) {
    issues.push({ severity: 'P1', type: 'sibling-readme-missing', detail: readmePath });
    results.push({ page: pageId, desc, h1, eyebrow, h2: firstH2?.h2, lead: firstH2?.lead, truthText: null, issues });
    continue;
  }
  const truth = extractReadmeTruth(readme);
  if (!truth) {
    issues.push({ severity: 'P2', type: 'sibling-readme-empty', detail: 'README had no extractable tagline/paragraph' });
    results.push({ page: pageId, desc, h1, eyebrow, h2: firstH2?.h2, lead: firstH2?.lead, truthText: null, issues });
    continue;
  }

  const truthText = truth.text;
  const combinedPageText = [desc, firstH2?.lead, eyebrow].filter(Boolean).join(' ');
  const cov = coverage(combinedPageText, truthText);

  if (cov < THRESHOLD) {
    issues.push({
      severity: 'P0',
      type: 'description-drift',
      detail: `Page body covers only ${(cov * 100).toFixed(0)}% of distinctive README keywords (threshold ${THRESHOLD * 100}%)`,
      missing: missingWords(combinedPageText, truthText),
    });
  } else if (cov < 0.40) {
    issues.push({
      severity: 'P1',
      type: 'description-weak',
      detail: `Page body covers ${(cov * 100).toFixed(0)}% of README keywords — consider strengthening`,
      missing: missingWords(combinedPageText, truthText),
    });
  }

  results.push({
    page: pageId,
    desc,
    h1,
    eyebrow,
    h2: firstH2?.h2,
    lead: firstH2?.lead,
    truthKind: truth.kind,
    truthText,
    coverage: Number(cov.toFixed(3)),
    issues,
  });
}

// --- output ---
if (jsonMode) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const ORDER = { P0: 0, P1: 1, P2: 2, INFO: 3, ERROR: -1 };
  const SEV_LABEL = { P0: 'P0', P1: 'P1', P2: 'P2', INFO: '··', ERROR: '!!' };
  console.log('# Project-info drift — ' + new Date().toISOString().slice(0, 10));
  console.log('');
  let p0 = 0, p1 = 0, p2 = 0;
  for (const r of results) {
    const issues = r.issues || [];
    const worst = issues.reduce((acc, i) => (ORDER[i.severity] < ORDER[acc] ? i.severity : acc), 'INFO');
    console.log(`## ${r.page}  [${SEV_LABEL[worst]}]`);
    if (r.truthText) console.log(`- truth: "${r.truthText.slice(0, 140)}${r.truthText.length > 140 ? '…' : ''}"`);
    if (r.desc)      console.log(`- page : "${r.desc.slice(0, 140)}${r.desc.length > 140 ? '…' : ''}"`);
    if (r.coverage !== undefined) console.log(`- coverage: ${(r.coverage * 100).toFixed(0)}%`);
    for (const iss of issues) {
      if (iss.severity === 'P0') p0++;
      if (iss.severity === 'P1') p1++;
      if (iss.severity === 'P2') p2++;
      const miss = iss.missing ? `  missing=[${iss.missing.join(', ')}]` : '';
      console.log(`  [${iss.severity}] ${iss.type} — ${iss.detail || ''}${miss}`);
    }
    console.log('');
  }
  console.log(`Summary: ${p0} P0 · ${p1} P1 · ${p2} P2 across ${results.length} pages.`);
  if (checkMode && p0 > 0) {
    console.error(`\nFAIL: ${p0} P0 drift issue(s) must be resolved.`);
    process.exit(1);
  }
}
