#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'ux-decision-ledger.json');
const CHECK = process.argv.includes('--check');

function json(rel, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; }
}

function build() {
  const nav = json('api/nav-sheet-stats.json');
  const rum = json('data/rum-summary.json');
  const feedback = json('api/feedback-provenance.json');
  const decisions = [];
  decisions.push({
    surface: 'mobile-nav',
    verdict: nav?.readiness?.defaultSwapReady ? 'graduate' : 'canary',
    evidence: `${nav?.totals?.opens || 0} nav-sheet opens; defaultSwapReady=${!!nav?.readiness?.defaultSwapReady}`,
    next: nav?.readiness?.defaultSwapReady ? 'Flip mobile sheet default and keep rollback guard.' : 'Expose a small deterministic mobile cohort and re-check close mix.'
  });
  decisions.push({
    surface: 'performance',
    verdict: rum?.routes?.['/']?.samples >= 50 ? 'evaluate-strict' : 'hold',
    evidence: `Home RUM samples=${rum?.routes?.['/']?.samples || 0}`,
    next: 'Flip strict only after field p75 is sufficient and healthy.'
  });
  decisions.push({
    surface: 'feedback',
    verdict: (feedback?.themeCount || 0) > 0 ? 'investigate' : 'collect',
    evidence: `${feedback?.themeCount || 0} public-safe feedback themes`,
    next: 'Route top themes into feedback decision board lanes.'
  });
  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), generatedBy: 'scripts/build-ux-decision-ledger.mjs', publicSafe: true, decisions };
}

const artifact = build();
const text = JSON.stringify(artifact, null, 2) + '\n';
if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const normalize = (s) => s.replace(/"generatedAt": ".*?"/, '"generatedAt": "<ts>"');
  if (normalize(current) !== normalize(text)) {
    console.error('build-ux-decision-ledger --check: api/ux-decision-ledger.json is stale');
    process.exit(1);
  }
  console.log(`build-ux-decision-ledger --check: ok (${artifact.decisions.length} decisions)`);
  process.exit(0);
}
fs.writeFileSync(OUT, text);
console.log(`build-ux-decision-ledger -> api/ux-decision-ledger.json (${artifact.decisions.length} decisions)`);
