#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'ignis-search-index.json');
const CHECK = process.argv.includes('--check');

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; }
}
function readJson(rel) {
  try { return JSON.parse(read(rel)); } catch { return null; }
}
function strip(s, max = 700) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function build() {
  const docs = [];
  const add = (title, urlPath, body, summary = '') => docs.push({ title, url: urlPath, summary: strip(summary || body, 240), body: strip(body) });
  add('VaultSpark Studios public memory', '/llms-full.txt', read('llms-full.txt'));
  const intel = readJson('api/public-intelligence.json');
  if (intel) {
    add('Current studio focus', '/studio-pulse/', `${intel.project?.currentFocus || ''} ${intel.project?.nextMilestone || ''}`);
    (intel.catalog || []).forEach((p) => add(p.name, p.deployedUrl || `/${p.type === 'game' ? 'games' : 'projects'}/${p.id}/`, `${p.name} ${p.status || ''} ${p.note || ''} ${p.summary || ''}`));
    (intel.consumerChangelog || []).forEach((c) => add(c.title, '/changelog/', `${c.title} ${(c.highlights || []).join(' ')}`));
  }
  const feedback = readJson('api/feedback-provenance.json');
  if (feedback) add('Feedback loop', '/feedback/', JSON.stringify(feedback.themes || []));
  const security = readJson('api/security-posture.json');
  if (security) add('Security posture', '/security/', JSON.stringify(security.controls || []));
  ['privacy/index.html', 'terms/index.html', 'rights/index.html', 'membership/index.html', 'games/index.html', 'universe/index.html', 'oracle/index.html'].forEach((rel) => {
    const body = read(rel);
    if (body) add(rel.replace('/index.html', ''), '/' + rel.replace('index.html', ''), body);
  });
  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), generatedBy: 'scripts/build-ignis-search-index.mjs', publicSafe: true, documents: docs };
}

const artifact = build();
const text = JSON.stringify(artifact, null, 2) + '\n';
if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const normalize = (s) => s.replace(/"generatedAt": ".*?"/, '"generatedAt": "<ts>"');
  if (normalize(current) !== normalize(text)) {
    console.error('build-ignis-search-index --check: data/ignis-search-index.json is stale');
    process.exit(1);
  }
  console.log(`build-ignis-search-index --check: ok (${artifact.documents.length} docs)`);
  process.exit(0);
}
fs.writeFileSync(OUT, text);
console.log(`build-ignis-search-index -> data/ignis-search-index.json (${artifact.documents.length} docs)`);
