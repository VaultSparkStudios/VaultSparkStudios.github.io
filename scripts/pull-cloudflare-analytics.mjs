#!/usr/bin/env node
/**
 * Pulls public-safe Cloudflare audience + zone traffic aggregates.
 * Credentials are resolved only through the Studio secrets gateway.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecret } from './lib/secrets.mjs';
import {
  assertPublicSnapshot,
  completeUtcWindows,
  derivePublicSnapshot,
  validateSurfaceRegistry,
} from './lib/cloudflare-analytics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'cloudflare-analytics-surfaces.json');
const OUT = path.join(ROOT, 'data', 'cloudflare-analytics.json');
const HISTORY = path.join(ROOT, 'data', 'cloudflare-analytics-history.ndjson');
const PUBLIC = path.join(ROOT, 'api', 'ecosystem-analytics.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const API = 'https://api.cloudflare.com/client/v4';

const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const parseJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function token() {
  return getSecret('CLOUDFLARE_ANALYTICS_READ_TOKEN', 'cloudflare.analytics-read')
    || getSecret('CLOUDFLARE_ANALYTICS_TOKEN', 'cloudflare.analytics-read')
    || null;
}

async function request(url, bearer, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) throw new Error(`Cloudflare HTTP ${response.status}: ${body?.errors?.[0]?.message || 'request failed'}`);
  return body;
}

async function graphql(query, bearer) {
  const body = await request(GRAPHQL, bearer, { method: 'POST', body: JSON.stringify({ query }) });
  if (body.errors?.length) throw new Error(`Cloudflare GraphQL: ${body.errors.map((error) => error.message).join('; ')}`);
  return body.data;
}

async function listZones(bearer) {
  const body = await request(`${API}/zones?per_page=50&status=active`, bearer);
  return body.result.map((zone) => ({ id: zone.id, name: zone.name, accountId: zone.account?.id })).sort((a, b) => a.name.localeCompare(b.name));
}

async function pullRum(bearer, accountId, window) {
  const query = `query PublicWebAnalytics { viewer { accounts(filter: {accountTag: "${accountId}"}) { groups: rumPageloadEventsAdaptiveGroups(limit: 10000, filter: {datetime_geq: "${window.start}T00:00:00Z", datetime_lt: "${window.endExclusive}T00:00:00Z"}) { count dimensions { date requestHost bot } sum { visits } avg { sampleInterval } confidence(level: 0.95) { count { estimate lower upper sampleSize isValid } sum { visits { estimate lower upper sampleSize isValid } } } } } } }`;
  const data = await graphql(query, bearer);
  return (data.viewer.accounts[0]?.groups || []).map((row) => ({
    date: row.dimensions.date,
    requestHost: String(row.dimensions.requestHost || '').toLowerCase(),
    bot: Number(row.dimensions.bot),
    count: Number(row.count),
    visits: Number(row.sum?.visits || 0),
    sampleInterval: Number(row.avg?.sampleInterval || 1),
    confidence: {
      pageLoads: row.confidence?.count || null,
      visits: row.confidence?.sum?.visits || null,
    },
  }));
}

function chunks(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

async function pullZoneBatch(bearer, zones, window) {
  const selections = zones.map((zone, index) => `z${index}: zones(filter: {zoneTag: "${zone.id}"}) { daily: httpRequests1dGroups(limit: 40, filter: {date_geq: "${window.start}", date_lt: "${window.endExclusive}"}, orderBy: [date_ASC]) { dimensions { date } sum { requests pageViews cachedRequests bytes threats } } }`).join('\n');
  const data = await graphql(`query PublicZoneTraffic { viewer { ${selections} } }`, bearer);
  return zones.flatMap((zone, index) => (data.viewer[`z${index}`]?.[0]?.daily || []).map((row) => ({
    zone: zone.name,
    date: row.dimensions.date,
    requests: Number(row.sum?.requests || 0),
    pageViews: Number(row.sum?.pageViews || 0),
    cachedRequests: Number(row.sum?.cachedRequests || 0),
    bytes: Number(row.sum?.bytes || 0),
    threats: Number(row.sum?.threats || 0),
  })));
}

async function collect() {
  const bearer = token();
  if (!bearer) throw new Error('cloudflare.analytics-read is unavailable; use the secrets gateway intake flow');
  const config = parseJson(CONFIG_PATH);
  const zones = await listZones(bearer);
  const registry = validateSurfaceRegistry(config, zones.map((zone) => zone.name));
  if (!registry.ok) throw new Error(registry.errors.join('; '));
  const accountIds = [...new Set(zones.map((zone) => zone.accountId).filter(Boolean))];
  if (accountIds.length !== 1) throw new Error(`expected one analytics account for registered zones; observed ${accountIds.length}`);
  const windows = completeUtcWindows();
  const [rumRows, ...zoneBatches] = await Promise.all([
    pullRum(bearer, accountIds[0], windows.thirty),
    ...chunks(zones, 10).map((batch) => pullZoneBatch(bearer, batch, windows.thirty)),
  ]);
  const snapshot = derivePublicSnapshot({
    collectedAt: new Date().toISOString(),
    windows,
    rumRows,
    zoneRows: zoneBatches.flat(),
    config,
  });
  snapshot.coverage.activeZonesAccessible = zones.length;
  snapshot.coverage.registryComplete = registry.ok;
  const validity = assertPublicSnapshot(snapshot);
  if (!validity.ok) throw new Error(validity.errors.join('; '));
  return snapshot;
}

function writeHistory(snapshot) {
  const rows = fs.existsSync(HISTORY) ? fs.readFileSync(HISTORY, 'utf8').trim().split('\n').filter(Boolean) : [];
  const last = rows.length ? JSON.parse(rows.at(-1)) : null;
  if (last?.receiptId === snapshot.receiptId || last?.windows?.thirty?.endExclusive === snapshot.windows.thirty.endExclusive) return false;
  fs.appendFileSync(HISTORY, `${JSON.stringify(snapshot)}\n`);
  return true;
}

if (SELF_TEST) {
  const config = parseJson(CONFIG_PATH);
  const windows = { seven: { days: 7, start: '2026-08-06', endExclusive: '2026-08-13', timezone: 'UTC', completeDaysOnly: true }, thirty: { days: 30, start: '2026-07-14', endExclusive: '2026-08-13', timezone: 'UTC', completeDaysOnly: true } };
  const snapshot = derivePublicSnapshot({
    collectedAt: '2026-08-13T12:00:00.000Z', windows, config,
    rumRows: [
      { date: '2026-08-12', requestHost: 'vaultsparkstudios.com', bot: 0, count: 10, visits: 7, sampleInterval: 2, confidence: { pageLoads: { estimate: 10, lower: 8, upper: 12, sampleSize: 5 }, visits: { estimate: 7, lower: 5, upper: 9, sampleSize: 5 } } },
      { date: '2026-08-12', requestHost: 'vaultsparkstudios.com', bot: 1, count: 4, visits: 3, sampleInterval: 1, confidence: {} },
      { date: '2026-08-12', requestHost: 'staging.usemindframe.com', bot: 0, count: 99, visits: 99, sampleInterval: 1, confidence: {} },
    ],
    zoneRows: [{ zone: 'vaultsparkstudios.com', date: '2026-08-12', requests: 100, pageViews: 20, cachedRequests: 50, bytes: 1000, threats: 2 }],
  });
  const checks = [
    ['exclusive 7-day window', windows.seven.start === '2026-08-06' && windows.seven.endExclusive === '2026-08-13'],
    ['staging excluded from audience', snapshot.ecosystem.thirty.audience.human.pageLoads.estimate === 10],
    ['bots separated', snapshot.ecosystem.thirty.audience.bots.pageLoads.estimate === 4],
    ['request traffic separate', snapshot.ecosystem.thirty.infrastructure.edgeRequests === 100],
    ['adaptive sampling labeled', snapshot.ecosystem.thirty.audience.human.sampled === true],
    ['registry maps all declared zones', validateSurfaceRegistry(config, config.zones.map((zone) => zone.zone)).ok],
    ['snapshot valid', assertPublicSnapshot(snapshot).ok],
  ];
  for (const [label, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  console.log(`pull-cloudflare-analytics --self-test: ${checks.filter(([, ok]) => ok).length}/${checks.length}`);
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
}

if (CHECK) {
  if (!fs.existsSync(PUBLIC)) throw new Error('api/ecosystem-analytics.json is missing');
  const snapshot = parseJson(PUBLIC);
  const validity = assertPublicSnapshot(snapshot);
  if (!validity.ok) throw new Error(validity.errors.join('; '));
  const config = parseJson(CONFIG_PATH);
  const registry = validateSurfaceRegistry(config);
  if (!registry.ok) throw new Error(registry.errors.join('; '));
  console.log(`pull-cloudflare-analytics --check: valid · ${snapshot.coverage.zonesRegistered} zones · ${snapshot.projects.length} projects · through ${snapshot.windows.thirty.endExclusive}`);
  process.exit(0);
}

try {
  const snapshot = await collect();
  fs.writeFileSync(OUT, stableJson(snapshot));
  fs.writeFileSync(PUBLIC, stableJson(snapshot));
  const appended = writeHistory(snapshot);
  console.log(`pull-cloudflare-analytics: wrote ${snapshot.projects.length} projects · ${snapshot.coverage.productionHostsMeasured30} production audience hosts · ${snapshot.coverage.zonesMeasured30}/${snapshot.coverage.zonesRegistered} zones · history ${appended ? 'appended' : 'unchanged'}`);
} catch (error) {
  console.error(`pull-cloudflare-analytics: ${error.message}`);
  process.exit(1);
}
