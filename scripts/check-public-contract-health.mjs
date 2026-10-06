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
      // These deterministic indexes identify their contract/content without a
      // build-clock timestamp. Publication times belong to their source rows.
      const compactSearch = /^api\/news-desk-search(?:-\d{4}-\d{2})?\.json$/.test(norm(name))
        && parsed.v === 1
        && (norm(name) === 'api/news-desk-search.json'
          ? Array.isArray(parsed.row) && parsed.row[1] === 'slug' && Number.isInteger(parsed.storyCount) && Array.isArray(parsed.shards)
          : /^\d{4}-\d{2}$/.test(parsed.month || '') && Array.isArray(parsed.stories));
      const revisionedNavigation = norm(name) === 'api/spark-manifest.json'
        && parsed.schemaVersion === 1 && parsed.kind === 'public-navigation'
        && /^[a-f0-9]{16}$/.test(parsed.revision || '')
        && parsed.publicSafe === true && Array.isArray(parsed.destinations);
      if (!legacy && !parsed.schemaVersion && !compactSearch) findings.push('missing schemaVersion');
      const honestlyUnobserved = parsed.state === 'unobserved'
        && parsed.generatedAt === null
        && parsed.observedAt === null;
      if (!legacy && !parsed.generatedAt && !honestlyUnobserved && !compactSearch && !revisionedNavigation && !['ci-status.json'].includes(path.basename(name))) findings.push('missing generatedAt');
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
    const deskFeed = JSON.parse(fs.readFileSync(path.join(root, 'api/news-desk-feed.json'), 'utf8'));
    if (feed.measurement?.metric !== 'visible-and-focused-seconds') findings.push('Desk engaged time uses the wrong metric');
    if (feed.measurement?.minObservations < 5) findings.push('Desk engaged-time privacy floor is below five');
    if (!/not unique people.*not Cloudflare visits/i.test(feed.measurement?.caveat || '')) findings.push('Desk engagement lacks audience-class caveat');
    findings.push(...deskEngagementCoverage(feed, deskFeed));
    for (const story of feed.stories || []) {
      if (story.state !== 'sufficient' && (story.observations !== null || story.averageEngagedSeconds !== null)) {
        findings.push(story.slug + ': suppressed engagement leaks a number');
      }
      const html = fs.readFileSync(path.join(root, story.url.replace(/^\//, ''), 'index.html'), 'utf8');
      if (!html.includes('data-desk-engagement=')) findings.push(story.slug + ': reader activity panel missing');
      if (!html.includes('/panel/editorial-illustration-1')) findings.push(story.slug + ': per-panel reaction scope missing');
      if ((html.match(/data-reaction="panel-/g) || []).length !== 8) findings.push(story.slug + ': expected eight panel reactions');
      if (!html.includes('desk-presence.shell-')) findings.push(story.slug + ': hashed presence client missing');
    }
  } catch (error) {
    findings.push('Desk engagement contract read failed: ' + error.message);
  }
  return findings;
}

function deskEngagementCoverage(feed, deskFeed) {
  if (!Array.isArray(feed?.stories) || !Array.isArray(deskFeed?.items)) {
    return ['Desk engagement or public all-story feed is missing'];
  }
  const expected = new Set(deskFeed.items.map((item) => {
    try { return new URL(item.url).pathname; } catch { return null; }
  }).filter(Boolean));
  const actual = new Set(feed.stories.map((story) => story.url).filter(Boolean));
  const missing = [...expected].filter((href) => !actual.has(href));
  const unexpected = [...actual].filter((href) => !expected.has(href));
  const findings = [];
  if (missing.length) findings.push(`Desk engagement misses ${missing.length} published stor${missing.length === 1 ? 'y' : 'ies'}`);
  if (unexpected.length) findings.push(`Desk engagement carries ${unexpected.length} unpublished stor${unexpected.length === 1 ? 'y' : 'ies'}`);
  return findings;
}

if (SELF_TEST) {
  const good = evaluate('api/x.json', '{"schemaVersion":"1.0","generatedAt":"2026-05-27","publicSafe":true}');
  const bad = evaluate('api/x.json', '{"generatedAt":"2026-05-27","note":"api key"}');
  const unobserved = evaluate('api/x.json', '{"schemaVersion":"1.0","generatedAt":null,"observedAt":null,"state":"unobserved","publicSafe":true}');
  const navigation = evaluate('api/spark-manifest.json', JSON.stringify({schemaVersion:1,kind:'public-navigation',revision:'1234567890abcdef',publicSafe:true,destinations:[]}));
  const invalidNavigation = evaluate('api/spark-manifest.json', JSON.stringify({schemaVersion:1,kind:'public-navigation',revision:'invalid',publicSafe:true,destinations:[]}));
  const compact = evaluate('api/news-desk-search-2026-10.json', JSON.stringify({v:1,month:'2026-10',stories:[]}));
  const invalidCompact = evaluate('api/news-desk-search-2026-10.json', JSON.stringify({v:2,month:'2026-10',stories:[]}));
  const deskCoverage = deskEngagementCoverage(
    { stories: [{ url: '/news/a/' }, { url: '/news/b/' }] },
    { items: [{ url: 'https://example.test/news/a/' }, { url: 'https://example.test/news/b/' }] },
  );
  const deskDrift = deskEngagementCoverage(
    { stories: [{ url: '/news/a/' }] },
    { items: [{ url: 'https://example.test/news/a/' }, { url: 'https://example.test/news/b/' }] },
  );
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good contract`);
  console.log(`  ${bad.length >= 2 ? 'ok' : 'fail'} bad contract`);
  console.log(`  ${unobserved.length === 0 ? 'ok' : 'fail'} honest-dark contract`);
  console.log(`  ${navigation.length === 0 && invalidNavigation.length > 0 ? 'ok' : 'fail'} revisioned navigation is narrow`);
  console.log(`  ${compact.length === 0 && invalidCompact.length > 0 ? 'ok' : 'fail'} compact search is version and shape checked`);
  console.log(`  ${deskCoverage.length === 0 ? 'ok' : 'fail'} Desk coverage tracks the live corpus`);
  console.log(`  ${deskDrift.length === 1 ? 'ok' : 'fail'} Desk coverage catches a newly published story without engagement`);
  process.exit(good.length === 0 && bad.length >= 2 && unobserved.length === 0 && navigation.length === 0 && invalidNavigation.length > 0 && compact.length === 0 && invalidCompact.length > 0 && deskCoverage.length === 0 && deskDrift.length === 1 ? 0 : 1);
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
