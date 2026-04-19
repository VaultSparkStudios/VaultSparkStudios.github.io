import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');

async function loadStudioRegistry() {
  const moduleUrl = pathToFileURL(path.join(root, 'studio-hub', 'src', 'data', 'studioRegistry.js')).href;
  return import(moduleUrl);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeSurfaceEntry(entry) {
  return {
    label: entry.label || null,
    url: entry.url || null,
    path: entry.path || null,
  };
}

function buildSocialSummary(accounts) {
  const live = accounts.filter((account) => account.apiSupport === 'full').length;
  const limited = accounts.filter((account) => account.apiSupport === 'limited').length;
  const stub = accounts.filter((account) => account.apiSupport === 'stub').length;

  return {
    trackedAccounts: accounts.length,
    liveApiAccounts: live,
    limitedApiAccounts: limited,
    stubAccounts: stub,
  };
}

function selectFeaturedAccounts(accounts) {
  const featuredIds = ['github', 'youtube', 'reddit-community', 'bluesky', 'gumroad'];
  return featuredIds
    .map((id) => accounts.find((account) => account.id === id))
    .filter(Boolean)
    .map((account) => ({
      id: account.id,
      platform: account.platform,
      handle: account.handle,
      url: account.url,
      apiSupport: account.apiSupport,
      description: account.description,
      color: account.color,
    }));
}

export async function buildPublicContracts(runtimePack, projectStatus, pulse, catalog) {
  const { PROJECTS, SOCIAL_ACCOUNTS } = await loadStudioRegistry();
  const manifest = runtimePack.manifest || {};
  const listingMetadata = runtimePack.listingMetadata || manifest.listingMetadata || {};
  const surfaces = manifest.surfaces || {};
  const integrations = manifest.integrations || {};
  const socialSummary = buildSocialSummary(SOCIAL_ACCOUNTS);
  const featuredAccounts = selectFeaturedAccounts(SOCIAL_ACCOUNTS);
  const websiteProject = PROJECTS.find((project) => project.id === 'website') || null;
  const socialDashboardProject = PROJECTS.find((project) => project.id === 'social-dashboard') || null;
  const normalizedActivity = {
    schemaVersion: '1.0',
    mode: 'public-safe-normalized-feed',
    source: 'website-public-contract',
    producer: 'social-dashboard',
    feedEndpoint: null,
    status: 'contract-ready',
    privacy: 'No private account identifiers, raw analytics, tokens, revenue figures, or internal operator notes.',
    fields: ['id', 'source', 'type', 'title', 'url', 'occurredAt', 'projectId', 'weight'],
    acceptedTypes: ['social_post', 'github_release', 'public_ship', 'community_signal', 'campaign_update'],
    latest: [],
  };

  const websitePublic = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    project: {
      slug: projectStatus.slug,
      name: projectStatus.name,
      repo: runtimePack.project?.repo || null,
      liveUrl: projectStatus.liveUrl,
      stagingUrl: projectStatus.stagingUrl,
      status: projectStatus.status,
      health: projectStatus.health,
      vaultStatus: projectStatus.vaultStatus,
    },
    listingMetadata: {
      canonicalSummary: listingMetadata.canonicalSummary || null,
      tagline: listingMetadata.tagline || null,
      websiteDescription: listingMetadata.websiteDescription || null,
      brandingLabel: listingMetadata.brandingLabel || null,
      tags: safeArray(listingMetadata.tags),
      categories: safeArray(listingMetadata.categories),
    },
    surfaces: {
      production: safeArray(surfaces.production).map(sanitizeSurfaceEntry),
      staging: safeArray(surfaces.staging).map(sanitizeSurfaceEntry),
      github: safeArray(surfaces.github).map(sanitizeSurfaceEntry),
    },
    intelligence: {
      publicEndpoint: '/api/public-intelligence.json',
      currentSession: projectStatus.currentSession,
      currentFocus: projectStatus.currentFocus,
      nextMilestone: projectStatus.nextMilestone,
      pulseKeys: ['now', 'next', 'shipped'],
    },
    feedbackSignals: {
      mode: 'browser-local-public-safe',
      prompts: ['goal', 'blocker', 'usefulness'],
      outputFields: ['topGoal', 'topBlocker', 'topUsefulness', 'totalResponses'],
      surfaces: ['/', '/membership/', '/vaultsparked/', '/join/', '/invite/', '/studio-pulse/'],
    },
    normalizedActivity,
    socialPresence: {
      summary: socialSummary,
      featuredAccounts,
    },
    bridges: {
      studioHub: {
        enabled: Boolean(integrations.studioHub?.enabled),
        mode: integrations.studioHub?.mode || null,
        consumes: ['listingMetadata', 'pulse', 'catalog', 'socialPresence'],
      },
      socialDashboard: {
        enabled: Boolean(integrations.socialDashboard?.enabled),
        mode: integrations.socialDashboard?.mode || null,
        consumes: ['listingMetadata', 'socialPresence', 'funnelSignals', 'normalizedActivity'],
      },
    },
  };

  const hub = {
    schemaVersion: '1.0',
    generatedAt: websitePublic.generatedAt,
    consumer: 'studio-hub',
    listingMetadata: {
      hubDescription: listingMetadata.hubDescription || listingMetadata.tagline || null,
      canonicalSummary: listingMetadata.canonicalSummary || null,
      brandingLabel: listingMetadata.brandingLabel || null,
    },
    bridge: {
      source: 'context/contracts/website-public.json',
      mode: integrations.studioHub?.mode || null,
      websiteProject: {
        name: websiteProject?.name || projectStatus.name,
        repo: websiteProject?.githubRepo || runtimePack.project?.repo || null,
        deployedUrl: websiteProject?.deployedUrl || projectStatus.liveUrl,
      },
      socialDashboardProject: socialDashboardProject ? {
        name: socialDashboardProject.name,
        repo: socialDashboardProject.githubRepo,
        deployedUrl: socialDashboardProject.deployedUrl,
      } : null,
    },
    pulse: {
      currentSession: projectStatus.currentSession,
      lastUpdated: projectStatus.lastUpdated,
      currentFocus: projectStatus.currentFocus,
      nextMilestone: projectStatus.nextMilestone,
      blockers: safeArray(projectStatus.blockers),
      queues: pulse,
      ignis: {
        score: projectStatus.ignisScore,
        grade: projectStatus.ignisGrade,
        lastComputed: projectStatus.ignisLastComputed,
      },
      stats: {
        liveCatalogItems: catalog.filter((item) => item.status === 'SPARKED').length,
        forgeCatalogItems: catalog.filter((item) => item.status === 'FORGE').length,
        trackedSocialAccounts: socialSummary.trackedAccounts,
      },
    },
    socialPresence: {
      summary: socialSummary,
      featuredAccounts,
    },
    normalizedActivity,
    feedbackSignals: {
      mode: 'browser-local-public-safe',
      source: '/api/public-intelligence.json',
      summaryFields: ['topGoal', 'topBlocker', 'topUsefulness', 'totalResponses'],
    },
  };

  const socialDashboard = {
    schemaVersion: '1.0',
    generatedAt: websitePublic.generatedAt,
    consumer: 'social-dashboard',
    listingMetadata: {
      socialDescription: listingMetadata.socialDescription || listingMetadata.websiteDescription || null,
      canonicalSummary: listingMetadata.canonicalSummary || null,
      tags: safeArray(listingMetadata.tags),
      categories: safeArray(listingMetadata.categories),
    },
    bridge: {
      source: 'context/contracts/website-public.json',
      mode: integrations.socialDashboard?.mode || null,
      websiteProject: {
        name: projectStatus.name,
        repo: runtimePack.project?.repo || null,
        liveUrl: projectStatus.liveUrl,
      },
      socialDashboardProject: socialDashboardProject ? {
        name: socialDashboardProject.name,
        repo: socialDashboardProject.githubRepo,
        deployedUrl: socialDashboardProject.deployedUrl,
      } : null,
    },
    socialPresence: {
      summary: socialSummary,
      featuredAccounts,
      accounts: SOCIAL_ACCOUNTS.map((account) => ({
        id: account.id,
        platform: account.platform,
        handle: account.handle,
        url: account.url,
        apiSupport: account.apiSupport,
        description: account.description,
      })),
    },
    funnelSignals: {
      publicIntelEndpoint: '/api/public-intelligence.json',
      stageTelemetryEnabled: true,
      entryPaths: ['/join/', '/invite/', '/membership/', '/vaultsparked/', '/contact/'],
    },
    feedbackSignals: {
      mode: 'browser-local-public-safe',
      summaryFields: ['topGoal', 'topBlocker', 'topUsefulness', 'totalResponses'],
    },
    normalizedActivity,
  };

  return { websitePublic, hub, socialDashboard };
}
