import crypto from 'node:crypto';

const DAY_MS = 86_400_000;
const round = (value) => Math.round(Number(value) || 0);
const sum = (items, pick) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);

export function completeUtcWindows(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endExclusive = end.toISOString().slice(0, 10);
  const make = (days) => ({
    days,
    start: new Date(end.getTime() - days * DAY_MS).toISOString().slice(0, 10),
    endExclusive,
    timezone: 'UTC',
    completeDaysOnly: true,
  });
  return { seven: make(7), thirty: make(30) };
}

export function validateSurfaceRegistry(config, activeZoneNames = []) {
  const errors = [];
  const zones = Array.isArray(config?.zones) ? config.zones : [];
  const zoneNames = zones.map((entry) => entry.zone);
  const duplicates = zoneNames.filter((name, index) => zoneNames.indexOf(name) !== index);
  if (duplicates.length) errors.push(`duplicate zone mappings: ${[...new Set(duplicates)].join(', ')}`);
  for (const zone of zones) {
    if (!zone.zone || !zone.projectSlug || !zone.name || !zone.role) errors.push(`incomplete zone mapping: ${zone.zone || '(unnamed)'}`);
  }
  const missing = activeZoneNames.filter((name) => !zoneNames.includes(name));
  const retired = zoneNames.filter((name) => activeZoneNames.length && !activeZoneNames.includes(name));
  if (missing.length) errors.push(`active zones missing from registry: ${missing.join(', ')}`);
  return { ok: errors.length === 0, errors, missing, retired, mapped: zones.length };
}

export function classifyHost(input, config) {
  const host = String(input || '').trim().toLowerCase().replace(/:\d+$/, '');
  if (!host) return { host, state: 'invalid', public: false };
  const exact = (config.hosts || []).find((entry) => entry.host === host);
  if (exact) return { ...exact, host, state: exact.public && exact.environment === 'production' ? 'public-production' : exact.environment };
  if ((config.excludedHostPatterns || []).some((pattern) => new RegExp(pattern, 'i').test(host))) {
    return { host, state: 'excluded-environment', public: false, environment: 'non-production' };
  }
  const apex = host.startsWith('www.') ? host.slice(4) : host;
  const zone = (config.zones || []).find((entry) => entry.zone === apex);
  if (!zone) return { host, state: 'unmapped', public: false, environment: 'unknown' };
  return {
    host,
    projectSlug: zone.projectSlug,
    name: zone.name,
    environment: 'production',
    surfaceType: zone.role === 'alias' ? 'alias' : 'website',
    public: true,
    state: 'public-production',
  };
}

function confidenceValue(confidence, fallback) {
  if (confidence?.isValid === false) return { estimate: round(fallback), lower: null, upper: null, sampleSize: null, valid: false };
  return {
    estimate: round(confidence?.estimate ?? fallback),
    lower: Number.isFinite(confidence?.lower) ? round(confidence.lower) : null,
    upper: Number.isFinite(confidence?.upper) ? round(confidence.upper) : null,
    sampleSize: Number.isFinite(confidence?.sampleSize) ? round(confidence.sampleSize) : null,
    valid: confidence?.isValid !== false,
  };
}

function combineConfidence(rows, field, fallbackField) {
  const estimate = sum(rows, (row) => row.confidence?.[field]?.estimate ?? fallbackField(row));
  const lowerValues = rows.map((row) => row.confidence?.[field]?.lower).filter(Number.isFinite);
  const upperValues = rows.map((row) => row.confidence?.[field]?.upper).filter(Number.isFinite);
  return {
    estimate: round(estimate),
    lower: lowerValues.length === rows.length ? round(sum(rows, (row) => row.confidence[field].lower)) : null,
    upper: upperValues.length === rows.length ? round(sum(rows, (row) => row.confidence[field].upper)) : null,
    sampleSize: round(sum(rows, (row) => row.confidence?.[field]?.sampleSize ?? 0)) || null,
  };
}

function audienceMetrics(rows) {
  const pageLoads = combineConfidence(rows, 'pageLoads', (row) => row.count);
  const visits = combineConfidence(rows, 'visits', (row) => row.visits);
  return {
    pageLoads,
    visits,
    sampleIntervalMax: Math.max(1, ...rows.map((row) => Number(row.sampleInterval) || 1)),
    sampled: rows.some((row) => (Number(row.sampleInterval) || 1) > 1),
  };
}

function within(date, window) {
  return date >= window.start && date < window.endExclusive;
}

export function derivePublicSnapshot({ collectedAt, windows, rumRows, zoneRows, config }) {
  const classifiedRum = rumRows.map((row) => ({ ...row, classification: classifyHost(row.requestHost, config) }));
  const publicHuman = classifiedRum.filter((row) => row.classification.state === 'public-production' && Number(row.bot) === 0);
  const publicBots = classifiedRum.filter((row) => row.classification.state === 'public-production' && Number(row.bot) === 1);
  const excluded = classifiedRum.filter((row) => row.classification.state !== 'public-production');
  const zonesByName = new Map((config.zones || []).map((entry) => [entry.zone, entry]));

  const projects = new Map();
  const ensureProject = (entry) => {
    if (!projects.has(entry.projectSlug)) projects.set(entry.projectSlug, {
      slug: entry.projectSlug,
      name: entry.name,
      zones: new Set(),
      hosts: new Set(),
      roles: new Set(),
      audienceRows: [],
      botRows: [],
      zoneRows: [],
    });
    return projects.get(entry.projectSlug);
  };
  for (const entry of config.zones || []) {
    const project = ensureProject(entry);
    project.zones.add(entry.zone);
    project.roles.add(entry.role);
  }
  for (const row of publicHuman) {
    const project = ensureProject(row.classification);
    project.hosts.add(row.requestHost);
    project.audienceRows.push(row);
  }
  for (const row of publicBots) {
    const project = ensureProject(row.classification);
    project.botRows.push(row);
  }
  for (const row of zoneRows) {
    const mapping = zonesByName.get(row.zone);
    if (!mapping) continue;
    ensureProject(mapping).zoneRows.push(row);
  }

  const windowSummary = (window) => {
    const humanRows = publicHuman.filter((row) => within(row.date, window));
    const botRows = publicBots.filter((row) => within(row.date, window));
    const trafficRows = zoneRows.filter((row) => within(row.date, window));
    return {
      audience: {
        human: audienceMetrics(humanRows),
        bots: audienceMetrics(botRows),
        productionHostsMeasured: new Set(humanRows.map((row) => row.requestHost)).size,
      },
      infrastructure: {
        edgeRequests: round(sum(trafficRows, (row) => row.requests)),
        htmlPageViews: round(sum(trafficRows, (row) => row.pageViews)),
        cachedRequests: round(sum(trafficRows, (row) => row.cachedRequests)),
        bytes: round(sum(trafficRows, (row) => row.bytes)),
        threats: round(sum(trafficRows, (row) => row.threats)),
        zonesMeasured: new Set(trafficRows.map((row) => row.zone)).size,
      },
    };
  };

  const projectRows = [...projects.values()].map((project) => {
    const buildWindow = (window) => {
      const humanRows = project.audienceRows.filter((row) => within(row.date, window));
      const botRows = project.botRows.filter((row) => within(row.date, window));
      const trafficRows = project.zoneRows.filter((row) => within(row.date, window));
      return {
        audience: humanRows.length ? { ...audienceMetrics(humanRows), available: true } : { available: false, reason: 'No Cloudflare Web Analytics page-load rows observed for a mapped production host.' },
        bots: botRows.length ? { ...audienceMetrics(botRows), available: true } : { available: false, reason: 'No bot-attributed Web Analytics rows observed.' },
        infrastructure: trafficRows.length ? {
          available: true,
          edgeRequests: round(sum(trafficRows, (row) => row.requests)),
          htmlPageViews: round(sum(trafficRows, (row) => row.pageViews)),
          cachedRequests: round(sum(trafficRows, (row) => row.cachedRequests)),
          bytes: round(sum(trafficRows, (row) => row.bytes)),
          threats: round(sum(trafficRows, (row) => row.threats)),
        } : { available: false, reason: 'No zone traffic rows observed.' },
      };
    };
    return {
      slug: project.slug,
      name: project.name,
      zones: [...project.zones].sort(),
      hostsMeasured: [...project.hosts].sort(),
      zoneRoles: [...project.roles].sort(),
      measurementState: project.audienceRows.length ? 'audience-and-edge' : project.zoneRows.length ? 'edge-only' : 'unobserved',
      windows: { seven: buildWindow(windows.seven), thirty: buildWindow(windows.thirty) },
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const dailyHuman = new Map();
  for (const row of publicHuman.filter((item) => within(item.date, windows.thirty))) {
    dailyHuman.set(row.date, (dailyHuman.get(row.date) || 0) + confidenceValue(row.confidence?.pageLoads, row.count).estimate);
  }
  const website = projectRows.find((project) => project.slug === 'vaultsparkstudios-website') || null;
  const snapshot = {
    schemaVersion: 'cloudflare-analytics-snapshot/v1',
    generatedAt: collectedAt,
    observedThrough: windows.thirty.endExclusive,
    publicSafe: true,
    source: {
      provider: 'Cloudflare',
      webAnalyticsDataset: 'rumPageloadEventsAdaptiveGroups',
      trafficDataset: 'httpRequests1dGroups',
      adaptiveEstimates: true,
      confidenceLevel: 0.95,
    },
    windows,
    policy: config.publicAudiencePolicy,
    coverage: {
      zonesRegistered: (config.zones || []).length,
      zonesMeasured30: new Set(zoneRows.filter((row) => within(row.date, windows.thirty)).map((row) => row.zone)).size,
      productionHostsMeasured30: new Set(publicHuman.filter((row) => within(row.date, windows.thirty)).map((row) => row.requestHost)).size,
      projectsWithAudience30: projectRows.filter((project) => project.windows.thirty.audience.available).length,
      projectsWithEdge30: projectRows.filter((project) => project.windows.thirty.infrastructure.available).length,
      excludedHosts30: new Set(excluded.filter((row) => within(row.date, windows.thirty)).map((row) => row.requestHost)).size,
      unmappedHosts30: [...new Set(excluded.filter((row) => row.classification.state === 'unmapped' && within(row.date, windows.thirty)).map((row) => row.requestHost))].sort(),
    },
    ecosystem: { seven: windowSummary(windows.seven), thirty: windowSummary(windows.thirty) },
    website,
    projects: projectRows,
    history: {
      humanPageLoadsDaily: [...dailyHuman.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, estimate]) => ({ date, estimate: round(estimate) })),
    },
    reconciliation: {
      audience: 'Cloudflare Web Analytics page-load events, bot-excluded and production-only. Adaptive periods are estimates.',
      htmlResponses: 'Cloudflare zone HTTP pageViews. This counts HTML responses, including bots and repeat resource-navigation behavior defined by Cloudflare.',
      edgeRequests: 'All request traffic through the registered zones, including assets and automated traffic.',
      performanceSamples: 'VaultSpark RUM observations accepted for performance analysis. These are not page views.',
    },
  };
  snapshot.receiptId = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0, 24);
  return snapshot;
}

export function assertPublicSnapshot(snapshot) {
  const errors = [];
  if (snapshot?.schemaVersion !== 'cloudflare-analytics-snapshot/v1') errors.push('wrong schemaVersion');
  if (!snapshot?.source?.webAnalyticsDataset || !snapshot?.source?.trafficDataset) errors.push('missing source datasets');
  if (!snapshot?.windows?.seven?.endExclusive || !snapshot?.windows?.thirty?.endExclusive) errors.push('missing exclusive windows');
  if (snapshot?.policy?.environment !== 'production' || snapshot?.policy?.excludeBots !== true) errors.push('public audience policy must be production-only and bot-excluded');
  if (!Array.isArray(snapshot?.projects)) errors.push('missing projects array');
  if (snapshot?.website?.windows?.thirty?.audience?.available && snapshot.website.windows.thirty.audience.pageLoads?.estimate == null) errors.push('website audience lacks estimate');
  return { ok: errors.length === 0, errors };
}
