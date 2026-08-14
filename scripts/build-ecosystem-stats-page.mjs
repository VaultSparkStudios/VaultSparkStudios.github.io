#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');
const OUT_JSON = path.join(ROOT, 'api', 'ecosystem-stats.json');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

export function deriveEcosystemStats({ analytics, ecosystem }) {
  const analyticsBySlug = new Map(analytics.projects.map((project) => [project.slug, project]));
  const unavailableAudience = { available: false, reason: 'No mapped production Web Analytics host was observed.' };
  const unavailableInfrastructure = { available: false, reason: 'No registered zone traffic was observed.' };
  const projects = ecosystem.projects.map((publicProject) => {
    const project = analyticsBySlug.get(publicProject.slug);
    return {
      slug: publicProject.slug,
      name: publicProject.name || project?.name,
      medium: publicProject.medium,
      vaultStatus: publicProject.vaultStatus,
      health: publicProject.health,
      liveUrl: publicProject.liveUrl,
      measurementState: project?.measurementState || 'unobserved',
      zones: project?.zones || [],
      hostsMeasured: project?.hostsMeasured || [],
      audience30: project?.windows.thirty.audience || unavailableAudience,
      infrastructure30: project?.windows.thirty.infrastructure || unavailableInfrastructure,
    };
  });
  const totalPublic = ecosystem.studioTotals.publicProjects;
  const measuredAudience = projects.filter((project) => project.audience30.available).length;
  const measuredEdge = projects.filter((project) => project.infrastructure30.available).length;
  return {
    schemaVersion: 'ecosystem-stats/v1',
    generatedAt: analytics.generatedAt,
    observedThrough: analytics.windows.thirty.endExclusive,
    publicSafe: true,
    title: 'VaultSpark Studio Ecosystem Analytics',
    policy: analytics.policy,
    source: analytics.source,
    windows: analytics.windows,
    totals: {
      publicProjects: totalPublic,
      audienceMeasuredProjects: measuredAudience,
      edgeMeasuredProjects: measuredEdge,
      humanPageLoads30: analytics.ecosystem.thirty.audience.human.pageLoads,
      humanVisits30: analytics.ecosystem.thirty.audience.human.visits,
      edgeRequests30: analytics.ecosystem.thirty.infrastructure.edgeRequests,
      htmlResponses30: analytics.ecosystem.thirty.infrastructure.htmlPageViews,
      cachedRequests30: analytics.ecosystem.thirty.infrastructure.cachedRequests,
      bytes30: analytics.ecosystem.thirty.infrastructure.bytes,
      threats30: analytics.ecosystem.thirty.infrastructure.threats,
    },
    coverage: {
      ...analytics.coverage,
      publicProjects: totalPublic,
      audienceProjectCoveragePct: totalPublic ? Math.round(measuredAudience / totalPublic * 100) : 0,
      edgeProjectCoveragePct: totalPublic ? Math.round(measuredEdge / totalPublic * 100) : 0,
      feedCoverageNote: 'Project-specific Analytica Feed v1 coverage is independent from Cloudflare audience and edge coverage and must not be merged into one flattering percentage.',
    },
    projects,
    reconciliation: analytics.reconciliation,
    privacy: { aggregateOnly: true, smallCountThreshold: analytics.policy.smallCountThreshold, trafficRanking: false },
  };
}

if (SELF_TEST) {
  const analytics = {
    generatedAt: '2026-08-13T12:00:00Z', windows: { thirty: { endExclusive: '2026-08-13' } },
    policy: { environment: 'production', excludeBots: true }, source: { provider: 'Cloudflare' },
    coverage: {}, reconciliation: {},
    ecosystem: { thirty: { audience: { human: { pageLoads: { estimate: 12 }, visits: { estimate: 8 } } }, infrastructure: { edgeRequests: 100, htmlPageViews: 20, cachedRequests: 30, bytes: 400, threats: 2 } } },
    projects: [
      { slug: 'measured', name: 'Measured', measurementState: 'audience-and-edge', zones: ['measured.test'], hostsMeasured: ['measured.test'], windows: { thirty: { audience: { available: true, pageLoads: { estimate: 12 }, visits: { estimate: 8 } }, infrastructure: { available: true, edgeRequests: 100, htmlPageViews: 20 } } } },
      { slug: 'private-project', name: 'Private', measurementState: 'edge-only', zones: [], hostsMeasured: [], windows: { thirty: { audience: { available: false }, infrastructure: { available: true } } } },
    ],
  };
  const ecosystem = { studioTotals: { publicProjects: 2 }, projects: [
    { slug: 'measured', name: 'Measured', medium: 'app', vaultStatus: 'sparked', health: 'green', liveUrl: 'https://measured.test' },
    { slug: 'unmeasured', name: 'Unmeasured', medium: 'game', vaultStatus: 'forge', health: 'yellow', liveUrl: null },
  ] };
  const result = deriveEcosystemStats({ analytics, ecosystem });
  const checks = [
    ['private project excluded', !result.projects.some((project) => project.slug === 'private-project')],
    ['missing project renders unavailable, not zero', result.projects.find((project) => project.slug === 'unmeasured')?.audience30.available === false],
    ['audience coverage denominator is public portfolio', result.coverage.audienceProjectCoveragePct === 50],
    ['edge and audience coverage stay separate', result.coverage.edgeProjectCoveragePct === 50],
  ];
  for (const [label, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  console.log(`build-ecosystem-stats-page --self-test: ${checks.filter(([, ok]) => ok).length}/${checks.length}`);
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
}

const payload = deriveEcosystemStats({ analytics: readJson('api/ecosystem-analytics.json'), ecosystem: readJson('api/ecosystem-state.json') });
const content = stable(payload);
if (CHECK) {
  if (!fs.existsSync(OUT_JSON) || fs.readFileSync(OUT_JSON, 'utf8') !== content) throw new Error('api/ecosystem-stats.json drifted; run node scripts/build-ecosystem-stats-page.mjs');
  console.log(`build-ecosystem-stats-page --check: current · ${payload.projects.length} public projects`);
} else {
  fs.writeFileSync(OUT_JSON, content);
  console.log(`build-ecosystem-stats-page: wrote ${payload.projects.length} public projects · audience coverage ${payload.coverage.audienceProjectCoveragePct}% · edge coverage ${payload.coverage.edgeProjectCoveragePct}%`);
}
