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

function publicText(value) {
  return String(value || '')
    .replace(/\bHuman Action Required\b/gi, 'manual confirmation')
    .replace(/\bFounder Action Required\b/gi, 'manual confirmation')
    .replace(/\bfounder action\b/gi, 'manual confirmation')
    .replace(/\bAPI key\b/gi, 'capability')
    .replace(/\bsecret\b/gi, 'capability');
}

function build() {
  const intel = readJson('api/public-intelligence.json', {});
  const feedback = readJson('api/feedback-provenance.json', {});
  const ci = readJson('api/ci-status.json', {});
  const roi = readJson('api/ignis-roi.json', {});
  const nav = readJson('api/nav-sheet-stats.json', {});
  const social = readJson('api/social-dashboard-public.json', {});
  const ux = readJson('api/ux-decision-ledger.json', {});
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-nervous-system.mjs',
    publicSafe: true,
    tiles: [
      { key: 'studio', label: 'Studio Health', value: intel?.project?.health || 'unknown', href: '/studio-pulse/' },
      { key: 'ci', label: 'CI', value: ci?.allGreen === true ? 'green' : 'check', href: '/status/' },
      { key: 'ignis', label: 'IGNIS ROI', value: roi?.summary?.tokensSaved ? `${roi.summary.tokensSaved} tokens saved` : 'active', href: '/ignis/roi/' },
      { key: 'feedback', label: 'Feedback Themes', value: String(feedback?.themeCount || 0), href: '/feedback/' },
      { key: 'mobile', label: 'Mobile Nav Ready', value: nav?.readiness?.defaultSwapReady ? 'ready' : 'canary', href: '/api/nav-sheet-stats.json' },
      { key: 'social', label: 'Social Channels', value: String(social?.channels?.length || intel?.stats?.trackedSocialAccounts || 0), href: '/social/' }
    ],
    focus: publicText(intel?.project?.currentFocus || ''),
    nextMilestone: publicText(intel?.project?.nextMilestone || ''),
    pulse: intel?.pulse || {},
    decisions: ux?.decisions || [],
    sources: [
      '/api/public-intelligence.json',
      '/api/feedback-provenance.json',
      '/api/ci-status.json',
      '/api/ignis-roi.json',
      '/api/nav-sheet-stats.json',
      '/api/social-dashboard-public.json',
      '/api/ux-decision-ledger.json'
    ]
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
