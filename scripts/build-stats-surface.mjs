#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
// The project and ecosystem surfaces form one publication transaction. The
// child builder inherits --check so neither JSON contract can drift alone.
import './build-ecosystem-stats-page.mjs';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const iso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`invalid source timestamp: ${value}`);
  return date.toISOString();
};

export function deriveStatsSurface({ ecosystem, publicStatus, analytics, cloudflare, proof, news, rum }) {
  const sources = {
    ecosystem: '/api/ecosystem-state.json',
    portfolio: '/api/public-status.json',
    analytics: '/api/analytics-summary.json',
    cloudflare: '/api/ecosystem-analytics.json',
    proof: '/api/status-proof.json',
    news: '/api/news-desk-stats.json',
    rum: '/data/rum-summary.json',
  };
  const timestamps = {
    ecosystem: iso(ecosystem.generatedAt),
    portfolio: iso(publicStatus.generatedAt),
    analytics: iso(analytics.generatedAt),
    cloudflare: iso(cloudflare.generatedAt),
    proof: iso(proof.generatedAt),
    news: iso(news.generatedAt),
    rum: iso(rum.generatedAt),
  };
  const freshness = (computedAt) => (Date.now() - new Date(computedAt).getTime()) <= 48 * 3600_000 ? 'fresh' : 'stale';
  const metric = (id, label, value, unitOrDenominator, period, computedAt, source, extra = {}) => ({
    id, label, ...(value == null ? {} : { value }), unitOrDenominator, period, computedAt, source,
    sourceType: extra.sourceType || 'derived-public-receipt',
    sourceDataset: extra.sourceDataset || source,
    environment: extra.environment || 'production',
    botPolicy: extra.botPolicy || 'not-applicable',
    measurement: extra.measurement || { kind: 'exact' },
    observedThrough: extra.observedThrough || computedAt,
    freshnessState: extra.freshnessState || freshness(computedAt),
    ...extra,
  });
  const websiteAudience = cloudflare.website?.windows?.thirty?.audience;
  const audienceAvailable = websiteAudience?.available === true;
  const metrics = [
    metric('public-projects', 'Public projects', ecosystem.studioTotals.publicProjects, 'public portfolio projects', 'current snapshot', timestamps.ecosystem, sources.ecosystem, {
      category: 'portfolio', format: 'integer',
      interpretation: `${ecosystem.studioTotals.green} are currently green and ${ecosystem.studioTotals.yellow} yellow; private and sealed work is excluded.`,
    }),
    metric('sparked-projects', 'Sparked projects', publicStatus.studio.sparked, 'projects marked SPARKED', 'current snapshot', timestamps.portfolio, sources.portfolio, {
      category: 'portfolio', format: 'integer',
      interpretation: `${publicStatus.studio.sparked} of ${publicStatus.studio.reposOnline} tracked initiatives are live and active; FORGE work is reported separately.`,
    }),
    metric('human-page-loads-30d', 'Human page loads', audienceAvailable ? websiteAudience.pageLoads.estimate : null, 'bot-excluded browser page loads', '30 complete UTC days', timestamps.cloudflare, sources.cloudflare, {
      category: 'audience', format: 'integer', privacySafe: true, available: audienceAvailable,
      unavailableReason: audienceAvailable ? undefined : 'Cloudflare Web Analytics has not observed this production hostname in the current window. Performance samples are not substituted.',
      sourceType: 'cloudflare-web-analytics', sourceDataset: cloudflare.source.webAnalyticsDataset,
      botPolicy: 'excluded', observedThrough: cloudflare.windows.thirty.endExclusive,
      window: cloudflare.windows.thirty,
      measurement: audienceAvailable ? { kind: websiteAudience.sampled ? 'estimate' : 'exact', sampleInterval: websiteAudience.sampleIntervalMax, confidenceLevel: 0.95, confidence: websiteAudience.pageLoads } : { kind: 'unavailable' },
      interpretation: audienceAvailable ? 'Production-only browser page loads with Cloudflare-classified bots excluded.' : 'Audience remains explicitly unavailable until the production hostname emits Web Analytics data.',
    }),
    metric('news-stories', 'Desk stories', news.desk.stories, 'published editorial stories', 'all published editions', timestamps.news, sources.news, {
      category: 'editorial', format: 'integer',
      interpretation: `${news.desk.facts} sourced facts across ${news.desk.stories} stories; prediction accuracy remains withheld until the sample earns it.`,
    }),
    metric('forge-projects', 'In the Forge', publicStatus.studio.forge, 'projects marked FORGE', 'current snapshot', timestamps.portfolio, sources.portfolio, {
      category: 'portfolio', format: 'integer', interpretation: 'Work in development is counted separately from live SPARKED projects.',
    }),
    metric('sourced-facts', 'Sourced Desk facts', news.desk.facts, 'source-linked factual claims', 'all published editions', timestamps.news, sources.news, {
      category: 'editorial', format: 'integer', interpretation: `Drawn from ${news.desk.sourceCount} named source domains; opinions are not counted as facts.`,
    }),
    metric('proof-freshness', 'Proof freshness', proof.summary.trustScore, 'percent of proof feeds fresh', 'current proof snapshot', timestamps.proof, sources.proof, {
      category: 'trust', format: 'percent',
      interpretation: `${proof.summary.fresh} of ${proof.summary.feeds} proof feeds are within their declared freshness windows; ${proof.summary.stale} are stale, not silently treated as green.`,
    }),
    metric('performance-samples-7d', 'Performance samples', analytics.performanceSamples7, 'accepted anonymous route-performance observations', '7 complete UTC days', timestamps.analytics, sources.analytics, {
      category: 'performance', format: 'integer', privacySafe: true,
      sourceType: 'vaultspark-rum', sourceDataset: 'data/rum-history.ndjson', botPolicy: 'not-classified',
      observedThrough: analytics.windows.seven.endExclusive, window: analytics.windows.seven,
      interpretation: `${rum.sufficientRoutes} routes meet the ${rum.minSamples}-sample confidence floor. These are performance observations—not visitors, visits, or page loads.`,
    }),
  ];
  return {
    feedVersion: 'analytica-feed-v1',
    schemaVersion: '1.0',
    generatedAt: Object.values(timestamps).sort().at(-1),
    generatedBy: 'scripts/build-stats-surface.mjs',
    publicSafe: true,
    project: { slug: 'vaultsparkstudios-website', name: 'VaultSpark Studios', type: 'public-portfolio', audience: 'public', url: 'https://vaultsparkstudios.com/' },
    machineReadable: '/stats.json',
    refreshSeconds: 86400,
    refreshMechanism: 'rebuild',
    precomputed: true,
    transport: 'http',
    showcase: ['public-projects', 'sparked-projects', 'human-page-loads-30d', 'news-stories'],
    privacy: { aggregateOnly: true, smallCountThreshold: 5, note: 'No visitor-level records, identities, or private portfolio data are published.' },
    metrics,
    breakdowns: {
      portfolioStatus: { source: sources.portfolio, computedAt: timestamps.portfolio, values: { sparked: publicStatus.studio.sparked, forge: publicStatus.studio.forge, vaulted: publicStatus.studio.vaulted } },
      proofFreshness: { source: sources.proof, computedAt: timestamps.proof, values: { fresh: proof.summary.fresh, stale: proof.summary.stale, total: proof.summary.feeds } },
      deskRecord: { source: sources.news, computedAt: timestamps.news, values: { stories: news.desk.stories, facts: news.desk.facts, sources: news.desk.sourceCount, predictionsGraded: news.desk.predictions.graded } },
    },
    history: {
      performanceSamplesDaily: analytics.daily.map(({ day, samples }) => ({ day, samples })),
      source: sources.analytics,
      computedAt: timestamps.analytics,
      warning: 'Performance samples are not an audience trend.',
    },
    reconciliation: {
      source: sources.cloudflare,
      computedAt: timestamps.cloudflare,
      dimensions: [
        { id: 'human-page-loads', meaning: cloudflare.reconciliation.audience, publicHeadline: true },
        { id: 'html-responses', meaning: cloudflare.reconciliation.htmlResponses, publicHeadline: false },
        { id: 'edge-requests', meaning: cloudflare.reconciliation.edgeRequests, publicHeadline: false },
        { id: 'performance-samples', meaning: cloudflare.reconciliation.performanceSamples, publicHeadline: false }
      ],
      ecosystemUrl: '/stats/ecosystem/',
    },
    definitions: {
      'public-projects': 'Entries in the public-only ecosystem feed. Private, internal, and sealed projects are excluded.',
      'sparked-projects': 'Tracked initiatives whose current Vault Status is SPARKED: live and active.',
      'human-page-loads-30d': 'Cloudflare Web Analytics browser page-load events for mapped production hosts, excluding Cloudflare-classified bots. Adaptive intervals are estimates and carry sampling metadata.',
      'news-stories': 'Distinct published stories in The Desk corpus.',
      'forge-projects': 'Tracked initiatives whose current Vault Status is FORGE: in development.',
      'sourced-facts': 'Fact entries in published Desk stories with an authored evidence source.',
      'proof-freshness': 'Share of proof feeds whose source timestamp remains within that feed’s declared freshness window.',
      'performance-samples-7d': 'Anonymous accepted performance observations collected during seven complete UTC days; not page views, visits, sessions, or unique visitors.',
    },
  };
}

function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function writeOrCheck(rel, content) {
  const file = path.join(ROOT, rel);
  if (CHECK) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) throw new Error(`${rel} drifted; run node scripts/build-stats-surface.mjs`);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

const feed = deriveStatsSurface({
  ecosystem: readJson('api/ecosystem-state.json'),
  publicStatus: readJson('api/public-status.json'),
  analytics: readJson('api/analytics-summary.json'),
  cloudflare: readJson('api/ecosystem-analytics.json'),
  proof: readJson('api/status-proof.json'),
  news: readJson('api/news-desk-stats.json'),
  rum: readJson('data/rum-summary.json'),
});
const out = stableJson(feed);
writeOrCheck('data/stats-surface.json', out);
writeOrCheck('stats.json', out);
console.log(`build-stats-surface: ${CHECK ? 'current' : 'wrote'} ${feed.metrics.length} metrics · ${feed.showcase.length} homepage headlines · as of ${feed.generatedAt}`);
