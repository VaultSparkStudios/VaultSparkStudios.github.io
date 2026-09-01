#!/usr/bin/env node
/** Generate the public outcome→route→evidence map for humans and AI agents. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'intent-map.json');
const SITE = 'https://vaultsparkstudios.com';

const DEFINITIONS = [
  { id: 'play', label: 'Play a VaultSpark world', aliases: ['play', 'games', 'demo', 'browser game'], audience: ['player'], primary: '/games/', fallback: '/', action: 'navigate', evidence: ['api/public-intelligence.json'], maxAgeHours: 168 },
  { id: 'join', label: 'Join the Vault', aliases: ['join', 'membership', 'create account', 'sign up'], audience: ['player', 'supporter'], primary: '/membership/', fallback: '/vault-member/', action: 'identity.begin', evidence: ['api/membership-tiers.json', 'api/identity-migration-receipt.json'], maxAgeHours: 168 },
  // Intent freshness must come from pre-seal feeds. Consuming release-proof,
  // status-proof, citation, or agents.json here creates a generator cycle:
  // intent -> agents -> candidate -> release -> status/citation -> intent.
  { id: 'verify', label: 'Verify studio claims', aliases: ['verify', 'proof', 'evidence', 'status'], audience: ['agent', 'press', 'investor'], primary: '/evidence/#verify', fallback: '/status/', action: 'evidence.ledger.verify', evidence: ['api/deploy-currency.json', 'api/worker-route-provenance.json'], maxAgeHours: 24 },
  { id: 'invest', label: 'Review the investor path', aliases: ['invest', 'investor', 'portfolio', 'due diligence'], audience: ['investor'], primary: '/investor-portal/', fallback: '/contact/', action: 'identity.begin', evidence: ['api/public-intelligence.json', 'api/public-status.json'], maxAgeHours: 168 },
  { id: 'press', label: 'Find press facts and assets', aliases: ['press', 'media', 'brand kit', 'citation'], audience: ['press', 'agent'], primary: '/press/', fallback: '/brand/', action: 'navigate', evidence: ['api/public-intelligence.json', 'api/og-coverage.json'], maxAgeHours: 168 },
  { id: 'build', label: 'Explore what the studio builds', aliases: ['build', 'projects', 'tools', 'platforms'], audience: ['builder', 'agent'], primary: '/projects/', fallback: '/studio-pulse/', action: 'navigate', evidence: ['api/public-intelligence.json', 'api/public-status.json'], maxAgeHours: 168 },
  { id: 'news', label: 'Read The Desk', aliases: ['news', 'the desk', 'ai news', 'daily signal'], audience: ['reader', 'press', 'agent'], primary: '/news/', fallback: '/journal/', action: 'navigate', evidence: ['api/news-desk.json'], maxAgeHours: 72 },
];

function readJson(relative) {
  try { return JSON.parse(readFileSync(join(ROOT, relative), 'utf8')); } catch { return null; }
}

function routeExists(route) {
  const relative = route.replace(/^\//, '').replace(/\/$/, '');
  if (!relative) return existsSync(join(ROOT, 'index.html'));
  return existsSync(join(ROOT, relative, 'index.html')) || existsSync(join(ROOT, `${relative}.html`));
}

function timestampOf(value) {
  const raw = value?.generatedAt || value?.updatedAt || value?.date || null;
  const parsed = Date.parse(raw || '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function deriveFreshness(sources, asOf, maxAgeHours) {
  const stamps = sources.map((source) => source.generatedAt).filter(Boolean).sort();
  if (!stamps.length || !asOf) return { state: 'unobserved', observedAt: null, ageHours: null, maxAgeHours };
  const observedAt = stamps[0]; // weakest evidence owns the outcome
  const ageHours = Math.max(0, (Date.parse(asOf) - Date.parse(observedAt)) / 3_600_000);
  return { state: ageHours <= maxAgeHours ? 'fresh' : 'stale', observedAt, ageHours: Math.round(ageHours * 10) / 10, maxAgeHours };
}

export function deriveIntentMap({ definitions = DEFINITIONS, values = {}, newsPreview = false } = {}) {
  const allStamps = Object.values(values).map(timestampOf).filter(Boolean).sort();
  const generatedAt = allStamps.at(-1) || null;
  const intents = definitions.map((definition) => {
    const sources = definition.evidence.map((path) => ({ path, generatedAt: timestampOf(values[path]) }));
    const freshness = deriveFreshness(sources, generatedAt, definition.maxAgeHours);
    const primaryExists = routeExists(definition.primary);
    const fallbackExists = routeExists(definition.fallback);
    let abstentionReason = null;
    if (!primaryExists && !fallbackExists) abstentionReason = 'no-resolvable-route';
    else if (freshness.state === 'unobserved') abstentionReason = 'evidence-unobserved';
    else if (freshness.state === 'stale') abstentionReason = 'evidence-stale';
    if (definition.id === 'news' && newsPreview) abstentionReason = 'preview-dark-run-not-navigation-promoted';
    return {
      id: definition.id,
      label: definition.label,
      aliases: definition.aliases,
      audience: definition.audience,
      primary: { url: primaryExists ? `${SITE}${definition.primary}` : null, path: definition.primary },
      fallback: { url: fallbackExists ? `${SITE}${definition.fallback}` : null, path: definition.fallback },
      action: { capability: definition.action, method: 'GET' },
      evidence: sources.map((source) => ({ url: `${SITE}/${source.path}`, generatedAt: source.generatedAt })),
      freshness: definition.id === 'news' && newsPreview ? { ...freshness, state: 'preview' } : freshness,
      abstentionReason,
    };
  });
  return {
    schemaVersion: 1,
    generatedAt,
    generatedBy: 'scripts/build-intent-map.mjs',
    publicSafe: true,
    runtimeAiCost: 0,
    intents,
    summary: {
      intents: intents.length,
      resolvable: intents.filter((intent) => intent.primary.url || intent.fallback.url).length,
      fresh: intents.filter((intent) => intent.freshness.state === 'fresh').length,
      preview: intents.filter((intent) => intent.freshness.state === 'preview').length,
      abstaining: intents.filter((intent) => intent.abstentionReason).length,
    },
  };
}

export function validateIntentMap(map) {
  const errors = [];
  if (map?.schemaVersion !== 1 || map?.publicSafe !== true || map?.runtimeAiCost !== 0) errors.push('envelope invalid');
  if (!Array.isArray(map?.intents) || map.intents.length < 6) errors.push('canonical intents missing');
  const ids = new Set();
  for (const intent of map?.intents || []) {
    if (ids.has(intent.id)) errors.push(`duplicate intent ${intent.id}`); else ids.add(intent.id);
    if (!intent.primary?.url && !intent.fallback?.url) errors.push(`${intent.id}: no route`);
    if (!Array.isArray(intent.evidence) || !intent.evidence.length) errors.push(`${intent.id}: evidence missing`);
    if (!['fresh', 'stale', 'unobserved', 'preview'].includes(intent.freshness?.state)) errors.push(`${intent.id}: freshness invalid`);
    const serialized = JSON.stringify(intent);
    if (/context\/|scripts\/|[A-Z]:\\|localhost|\.session-lock/i.test(serialized)) errors.push(`${intent.id}: internal path leakage`);
  }
  return errors;
}

function fromRepo() {
  const values = Object.fromEntries([...new Set(DEFINITIONS.flatMap((definition) => definition.evidence))].map((path) => [path, readJson(path)]));
  let newsPreview = false;
  try {
    const news = readFileSync(join(ROOT, 'news', 'index.html'), 'utf8');
    newsPreview = /<meta name="robots" content="noindex/i.test(news) || /Preview dry-run/i.test(news);
  } catch {}
  return deriveIntentMap({ values, newsPreview });
}

export function writeIntentMap({ check = false } = {}) {
  const map = fromRepo();
  const errors = validateIntentMap(map);
  if (errors.length) throw new Error(errors.join('; '));
  const content = `${JSON.stringify(map, null, 2)}\n`;
  if (check) {
    const actual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (actual !== content) throw new Error('api/intent-map.json drifted');
  } else writeFileSync(OUT, content);
  return map;
}

function selfTest() {
  const values = Object.fromEntries(DEFINITIONS.flatMap((definition) => definition.evidence).map((path) => [path, { generatedAt: '2026-01-01T00:00:00Z' }]));
  const map = deriveIntentMap({ values, newsPreview: true });
  const cases = [
    ['seven bounded intents', map.intents.length === 7],
    ['canonical six present', ['play', 'join', 'verify', 'invest', 'press', 'build'].every((id) => map.intents.some((intent) => intent.id === id))],
    ['news preview abstains honestly', map.intents.find((intent) => intent.id === 'news')?.abstentionReason === 'preview-dark-run-not-navigation-promoted'],
    ['zero runtime AI cost', map.runtimeAiCost === 0],
    ['freshness graph has no post-seal cycle', !DEFINITIONS.flatMap((definition) => definition.evidence).some((path) => ['agents.json', 'api/candidate-artifact-manifest.json', 'api/release-proof.json', 'api/status-proof.json', 'api/citation.json'].includes(path))],
    ['all intents are route-resolvable', map.summary.resolvable === 7],
    ['schema validates', validateIntentMap(map).length === 0],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`build-intent-map --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--self-test')) selfTest();
  try {
    const map = writeIntentMap({ check: process.argv.includes('--check') });
    console.log(`build-intent-map${process.argv.includes('--check') ? ' --check' : ''}: ${map.summary.resolvable}/${map.summary.intents} resolvable · ${map.summary.abstaining} abstaining`);
  } catch (error) { console.error(`build-intent-map failed: ${error.message}`); process.exit(1); }
}
