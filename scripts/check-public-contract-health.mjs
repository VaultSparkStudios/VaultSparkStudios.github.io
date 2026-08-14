#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { assertPublicSnapshot, validateSurfaceRegistry } from './lib/cloudflare-analytics.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const INTERNAL_TERMS = /\b(human action required|founder action required|api key|private financial|mrr|arr)\b/i;
// S231: entries are forward-slash and lookups are normalized to '/'. The list was
// authored with Windows '\\' separators while the scan keys come from path.join — which
// yields '\' on Windows (matched, exempt) but '/' on Linux (no match → checked → fail).
// That made the whole gate pass locally yet fail in CI on 14 legacy feeds. Normalize both.
const LEGACY_SHAPE_ALLOWLIST = new Set([
  'api/ci-status.json',
  'api/commit-map.json',
  'api/eternal-credits.json',
  'api/feedback-provenance.json',
  'api/feedback-summary.json',
  'api/founder-presence.json',
  'api/heartbeat.json',
  'api/ignis-conduit.json',
  'api/ignis-roi.json',
  'api/oracle-queries.json',
  'api/public-intelligence.json',
  'api/public-status.json',
  'api/vault-narrative-history.json',
  '.well-known/entity-graph.json',
  '.well-known/llms-full.txt',
  'llms-full.txt'
]);
const norm = (p) => p.replace(/\\/g, '/');

function evaluate(name, text) {
  const findings = [];
  const legacy = LEGACY_SHAPE_ALLOWLIST.has(norm(name));
  if (!legacy && INTERNAL_TERMS.test(text)) findings.push('internal/private vocabulary');
  if (name.endsWith('.json')) {
    try {
      const parsed = JSON.parse(text);
      if (!legacy && !parsed.schemaVersion) findings.push('missing schemaVersion');
      const honestlyUnobserved = parsed.state === 'unobserved'
        && parsed.generatedAt === null
        && parsed.observedAt === null;
      if (!legacy && !parsed.generatedAt && !honestlyUnobserved && !['ci-status.json'].includes(path.basename(name))) findings.push('missing generatedAt');
    } catch {
      findings.push('invalid JSON');
    }
  }
  return findings;
}

function evaluateAnalyticsContracts(root = ROOT) {
  const findings = [];
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  try {
    const config = read('config/cloudflare-analytics-surfaces.json');
    const snapshot = read('api/ecosystem-analytics.json');
    const ecosystem = read('api/ecosystem-stats.json');
    const project = read('stats.json');
    findings.push(...validateSurfaceRegistry(config).errors.map((message) => `registry: ${message}`));
    findings.push(...assertPublicSnapshot(snapshot).errors.map((message) => `snapshot: ${message}`));
    if (ecosystem.policy?.environment !== 'production' || ecosystem.policy?.excludeBots !== true) findings.push('ecosystem audience is not production-only and bot-excluded');
    if (ecosystem.projects.some((item) => item.audience30?.available === false && Object.hasOwn(item.audience30, 'pageLoads'))) findings.push('unavailable project audience carries a numeric page-load value');
    if (project.metrics.some((metric) => metric.id === 'page-views-30d')) findings.push('legacy RUM-as-page-views metric remains');
    const required = ['sourceType', 'sourceDataset', 'environment', 'botPolicy', 'measurement', 'observedThrough', 'freshnessState'];
    for (const metric of project.metrics) {
      const missing = required.filter((field) => metric[field] == null);
      if (missing.length) findings.push(`${metric.id}: missing provenance ${missing.join(', ')}`);
    }
    const performance = project.metrics.find((metric) => metric.id === 'performance-samples-7d');
    if (!performance || !/not visitors/i.test(performance.interpretation || '')) findings.push('performance samples lack explicit non-audience disclosure');
  } catch (error) {
    findings.push(`analytics contract read failed: ${error.message}`);
  }
  return findings;
}

function evaluateDeskEngagementContracts(root = ROOT) {
  const findings = [];
  try {
    const feed = JSON.parse(fs.readFileSync(path.join(root, 'api/news-desk-engagement.json'), 'utf8'));
    if (feed.measurement?.metric !== 'visible-and-focused-seconds') findings.push('Desk engaged time uses the wrong metric');
    if (feed.measurement?.minObservations < 5) findings.push('Desk engaged-time privacy floor is below five');
    if (!/not unique people.*not Cloudflare visits/i.test(feed.measurement?.caveat || '')) findings.push('Desk engagement lacks audience-class caveat');
    if (!Array.isArray(feed.stories) || feed.stories.length !== 7) findings.push('Desk engagement does not cover all seven published stories');
    for (const story of feed.stories || []) {
      if (story.state !== 'sufficient' && (story.observations !== null || story.averageEngagedSeconds !== null)) {
        findings.push(story.slug + ': suppressed engagement leaks a number');
      }
      const html = fs.readFileSync(path.join(root, story.url.replace(/^\//, ''), 'index.html'), 'utf8');
      if (!html.includes('data-desk-engagement=')) findings.push(story.slug + ': reader activity panel missing');
      if (!html.includes('/panel/editorial-illustration-1')) findings.push(story.slug + ': per-panel reaction scope missing');
      if ((html.match(/data-reaction="panel-/g) || []).length !== 4) findings.push(story.slug + ': expected four panel reactions');
      if (!html.includes('desk-presence.shell-')) findings.push(story.slug + ': hashed presence client missing');
    }
  } catch (error) {
    findings.push('Desk engagement contract read failed: ' + error.message);
  }
  return findings;
}

if (SELF_TEST) {
  const good = evaluate('api/x.json', '{"schemaVersion":"1.0","generatedAt":"2026-05-27","publicSafe":true}');
  const bad = evaluate('api/x.json', '{"generatedAt":"2026-05-27","note":"api key"}');
  const unobserved = evaluate('api/x.json', '{"schemaVersion":"1.0","generatedAt":null,"observedAt":null,"state":"unobserved","publicSafe":true}');
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good contract`);
  console.log(`  ${bad.length >= 2 ? 'ok' : 'fail'} bad contract`);
  console.log(`  ${unobserved.length === 0 ? 'ok' : 'fail'} honest-dark contract`);
  process.exit(good.length === 0 && bad.length >= 2 && unobserved.length === 0 ? 0 : 1);
}

const targets = [];
for (const dir of ['api', '.well-known']) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const entry of fs.readdirSync(abs)) {
    if (/\.(json|txt)$/.test(entry)) targets.push(path.join(dir, entry));
  }
}
targets.push('llms-full.txt');

const failures = [];
for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const findings = evaluate(rel, fs.readFileSync(abs, 'utf8'));
  if (findings.length) failures.push({ rel, findings });
}
failures.push(...evaluateAnalyticsContracts().map((finding) => ({ rel: 'analytics-contracts', findings: [finding] })));
failures.push(...evaluateDeskEngagementContracts().map((finding) => ({ rel: 'desk-engagement-contracts', findings: [finding] })));

if (failures.length) {
  console.error(`public contract health failed (${failures.length})`);
  failures.forEach((f) => console.error(`  ${f.rel}: ${f.findings.join(', ')}`));
  process.exit(1);
}
console.log(`public contract health ok (${targets.length} files checked)`);
