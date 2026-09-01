#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'nervous-system.json');
const CHECK = process.argv.includes('--check');

function readJson(rel, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}

// Translate technical tile values to visitor language
const TILE_VALUE_MAP = {
  green: 'Healthy', yellow: 'Attention', red: 'Needs work',
  active: 'Live', check: 'Passing', canary: 'Testing',
  ready: 'Live', unknown: 'Checking', hold: 'Under review',
};
function humanTileValue(v) {
  return TILE_VALUE_MAP[String(v).toLowerCase()] || String(v);
}

// Translate decision surface names to visitor language
const SURFACE_LABEL_MAP = {
  'mobile-nav': 'Mobile navigation',
  'performance': 'Site performance',
  'feedback': 'Community feedback',
  'ci': 'Build pipeline',
  'studio': 'Studio health',
};
function humanSurface(s) {
  return SURFACE_LABEL_MAP[String(s).toLowerCase()] || String(s).replace(/-/g, ' ');
}

// Translate decision verdicts to visitor language
const VERDICT_LABEL_MAP = {
  canary: 'Testing with a small group',
  hold: 'Monitoring before full rollout',
  investigate: 'Gathering feedback',
  ready: 'Live for everyone',
  green: 'Working well',
  yellow: 'Under observation',
  red: 'Actively fixing',
};
function humanVerdict(v) {
  return VERDICT_LABEL_MAP[String(v).toLowerCase()] || String(v);
}

// Strip dev-speak markers from text. Used as fallback when no publicNote is set.
function stripDevTalk(text) {
  if (!text) return '';
  return String(text)
    // Remove session codes like S200, S201 #5
    .replace(/\bS\d{2,3}(?:\s+(?:goal|carry|#\d+))?\s*/gi, '')
    // Remove slash commands
    .replace(/\/(?:implement|audit|start|closeout|go)\b/g, '')
    // Remove file names with extensions (build-x.mjs etc.)
    .replace(/\b[\w-]+\.(?:mjs|js|json|css|sql|html|ts)\b\s*(?:→\s*)?/g, '')
    // Remove npm/build commands
    .replace(/\bnpm run [^\s·,]+/g, '')
    .replace(/build:check[^\s·,→)]*/g, '')
    .replace(/EXIT\s+\d+/g, '')
    // Remove parenthetical technical details
    .replace(/\([^)]*(?:\.mjs|\.js|check|deploy|zero deps|EXIT|→|--)[^)]*\)/g, '')
    // Clean up arrow and bullet artifacts
    .replace(/\s*→\s*/g, ', ')
    .replace(/\s+[·•]\s+/g, '. ')
    // Clean leading/trailing noise
    .replace(/^[·,\-\s]+|[·,\-\s]+$/gm, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function build() {
  const intel = readJson('api/public-intelligence.json', {});
  const feedback = readJson('api/feedback-provenance.json', {});
  const ci = readJson('api/ci-status.json', {});
  const roi = readJson('api/ignis-roi.json', {});
  const nav = readJson('api/nav-sheet-stats.json', {});
  const social = readJson('api/social-dashboard-public.json', {});
  const ux = readJson('api/ux-decision-ledger.json', {});
  const status = readJson('context/PROJECT_STATUS.json', {});

  // Visitor-friendly note: prefer explicit publicNote from PROJECT_STATUS, fall back to stripped text.
  const rawFocus = intel?.project?.currentFocus || '';
  const focus = status?.publicNote || stripDevTalk(rawFocus) || 'The studio is actively shipping new features.';

  const rawNext = intel?.project?.nextMilestone || '';
  const nextStep = status?.publicNextStep || stripDevTalk(rawNext) || '';

  // Translate decisions to visitor-readable format
  const decisions = (ux?.decisions || []).map(function (d) {
    return {
      surface: humanSurface(d.surface || ''),
      status: humanVerdict(d.verdict || ''),
      note: d.next || '',
    };
  });

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-nervous-system.mjs',
    publicSafe: true,
    tiles: [
      { key: 'studio', label: 'Studio Health',       value: humanTileValue(intel?.project?.health || 'unknown'), href: '/studio-pulse/' },
      { key: 'ci',     label: 'Builds',               value: ci?.allGreen === true ? 'Passing' : 'Check',       href: '/status/' },
      { key: 'ignis',  label: 'AI Intelligence',      value: humanTileValue(roi?.summary?.tokensSaved ? 'active' : 'active'), href: '/ignis/' },
      { key: 'feedback', label: 'Feedback themes',    value: String(feedback?.themeCount || 0),                 href: '/changelog/#requests' },
      { key: 'mobile', label: 'Mobile experience',    value: humanTileValue(nav?.readiness?.defaultSwapReady ? 'ready' : 'canary'), href: '/' },
      { key: 'social', label: 'Social channels',      value: String(social?.channels?.length || intel?.stats?.trackedSocialAccounts || 0), href: '/social/' },
    ],
    focus,
    nextStep,
    decisions,
  };
}

const artifact = build();
const text = JSON.stringify(artifact, null, 2) + '\n';

if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const normalize = (s) => s.replace(/"generatedAt": ".*?"/, '"generatedAt": "<ts>"');
  if (normalize(current) !== normalize(text)) {
    console.error('build-nervous-system --check: api/nervous-system.json is stale');
    process.exit(1);
  }
  console.log(`build-nervous-system --check: ok (${artifact.tiles.length} tiles)`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log(`build-nervous-system -> api/nervous-system.json (${artifact.tiles.length} tiles)`);