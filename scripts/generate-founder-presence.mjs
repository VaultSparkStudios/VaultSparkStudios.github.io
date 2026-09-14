#!/usr/bin/env node
/**
 * generate-founder-presence.mjs — Build `api/founder-presence.json`.
 *
 * Detects whether the studio owner is actively working RIGHT NOW by reading
 * the cross-repo active-sessions digest maintained by studio-ops:
 *
 *   ../vaultspark-studio-ops/portfolio/ACTIVE_SESSIONS.json
 *
 * Picks the most-recent active session (by session_start), maps its slug to a
 * registry entry, and emits a public-safe payload the browser can poll:
 *
 *   { generatedAt, live, project, slug, tier, label, startedAt, minutesAgo }
 *
 * Sealed-vault + voice-leak rules:
 *   - If the project is sealed / unannounced → no slug or name leaks;
 *     label collapses to a generic "in the forge" phrasing.
 *   - If no active session or the most recent lock is stale (>60min since
 *     session_start AND no stale-lock flag), `live: false`.
 *
 * Also respects a kill-switch env var: FOUNDER_PRESENCE_DISABLED=1 forces
 * `live: false` regardless of input, for privacy-preserving moments.
 *
 * Usage: node scripts/generate-founder-presence.mjs [--check]
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { matchesProjectSlug, normalizeProjectSlug } from './lib/public-activity.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'api', 'founder-presence.json');
const CHECK = process.argv.includes('--check') || process.argv.includes('--check-live');
const CHECK_LIVE = process.argv.includes('--check-live');
const SELF_TEST = process.argv.includes('--self-test');

// Everything in THIS repo that shapes the payload. External session state is not
// here on purpose: another repo starting a session must not fail this repo's gates.
const SOURCE_FILES = [
  'scripts/generate-founder-presence.mjs',
  'scripts/lib/public-activity.mjs',
  'studio-hub/src/data/studioRegistry.js',
];

export function sourceDigest(root = ROOT, read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')) {
  const hash = createHash('sha256');
  for (const rel of SOURCE_FILES) {
    let body = '';
    try { body = read(rel).replace(/\r\n/g, '\n'); } catch { body = '<absent>'; }
    hash.update(rel + '\0' + body + '\0');
  }
  return hash.digest('hex').slice(0, 16);
}

const PRESENCE_KEYS = ['generatedAt', 'live', 'project', 'slug', 'tier', 'label', 'startedAt', 'minutesAgo', 'sourceDigest'];
const TIERS = new Set(['sparked', 'forge', 'vaulted', 'sealed']);

/** Shape + invariants of a committed payload. Returns an array of problems (empty = valid). */
export function validatePresence(payload, expectedDigest) {
  const problems = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ['payload is not an object'];
  for (const key of PRESENCE_KEYS) if (!(key in payload)) problems.push(`missing key ${key}`);
  for (const key of Object.keys(payload)) if (!PRESENCE_KEYS.includes(key)) problems.push(`unexpected key ${key}`);
  if (Number.isNaN(Date.parse(payload.generatedAt))) problems.push('generatedAt is not a timestamp');
  if (typeof payload.live !== 'boolean') problems.push('live is not boolean');
  if (payload.sourceDigest !== expectedDigest) problems.push(`sourceDigest ${payload.sourceDigest} does not match current sources ${expectedDigest} — regenerate`);
  if (payload.live === true) {
    if (!TIERS.has(payload.tier)) problems.push('live payload has an invalid tier');
    if (typeof payload.label !== 'string' || !payload.label.startsWith('Live in the forge')) problems.push('live payload label is not a forge label');
    if (Number.isNaN(Date.parse(payload.startedAt))) problems.push('live payload startedAt is not a timestamp');
    if (!Number.isInteger(payload.minutesAgo) || payload.minutesAgo < 0 || payload.minutesAgo > MAX_AGE_MIN) problems.push('live payload minutesAgo is outside the live window');
    if (payload.project === null && payload.label !== 'Live in the forge') problems.push('a nameless (sealed or unregistered) session must use the generic label');
    if (payload.project !== null && payload.label !== `Live in the forge on ${payload.project}`) problems.push('label does not name the project');
  } else if (payload.live === false) {
    for (const key of ['project', 'slug', 'tier', 'label', 'startedAt', 'minutesAgo']) {
      if (payload[key] !== null) problems.push(`not-live payload must null ${key}`);
    }
  }
  return problems;
}
const MAX_AGE_MIN = 60;

async function loadRegistry() {
  const reg = path.join(ROOT, 'studio-hub', 'src', 'data', 'studioRegistry.js');
  if (!fs.existsSync(reg)) return [];
  const mod = await import(pathToFileURL(reg).href);
  const projects = mod.PROJECTS || mod.default?.PROJECTS || [];
  return Array.isArray(projects) ? projects : [];
}

function readActiveSessions() {
  const p = path.join(ROOT, '..', 'vaultspark-studio-ops', 'portfolio', 'ACTIVE_SESSIONS.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function isSealed(p) {
  return p?.sealed === true || p?.vaultStatus === 'sealed' || p?.launchStatus === 'sealed';
}

async function main() {
  const now = Date.now();
  let payload = {
    generatedAt: new Date(now).toISOString(),
    live: false,
    project: null,
    slug: null,
    tier: null,
    label: null,
    startedAt: null,
    minutesAgo: null,
    sourceDigest: sourceDigest(),
  };

  if (process.env.FOUNDER_PRESENCE_DISABLED === '1') {
    return write(payload);
  }

  const digest = readActiveSessions();
  const registry = await loadRegistry();
  const sessions = Array.isArray(digest?.activeSessions) ? digest.activeSessions : [];
  if (!sessions.length) return write(payload);

  // Pick the freshest session by session_start.
  const fresh = sessions
    .map((s) => ({ ...s, _ts: Date.parse(s.session_start || s.startedAt || s.start || 0) || 0 }))
    .sort((a, b) => b._ts - a._ts)[0];

  if (!fresh || !fresh._ts) return write(payload);
  const minutesAgo = Math.round((now - fresh._ts) / 60000);
  if (minutesAgo > MAX_AGE_MIN) return write(payload);

  const slug = fresh.slug || fresh.project || null;
  const entry = registry.find((p) => matchesProjectSlug(p, slug));
  const sealed = entry ? isSealed(entry) : false;
  const tier = (() => {
    const s = String(entry?.vaultStatus || '').toLowerCase();
    if (s === 'sparked') return 'sparked';
    if (s === 'forge')   return 'forge';
    if (s === 'vaulted') return 'vaulted';
    if (s === 'sealed')  return 'sealed';
    return 'forge';
  })();

  const safeName = sealed || !entry ? null : entry.name;
  const label = safeName
    ? `Live in the forge on ${safeName}`
    : `Live in the forge`;

  payload = {
    ...payload,
    live: true,
    project: safeName,
    slug: sealed ? null : normalizeProjectSlug(slug),
    tier,
    label,
    startedAt: new Date(fresh._ts).toISOString(),
    minutesAgo,
  };

  return write(payload);
}

function write(payload) {
  const serialized = JSON.stringify(payload, null, 2) + '\n';
  if (CHECK && !CHECK_LIVE) {
    let committed = null;
    try { committed = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* reported below */ }
    const problems = validatePresence(committed, sourceDigest());
    if (problems.length) {
      console.error('founder-presence drift — run: node scripts/generate-founder-presence.mjs');
      for (const problem of problems) console.error(`  - ${problem}`);
      process.exit(1);
    }
    console.log(`founder-presence.json valid for current sources (${committed.sourceDigest}); live session state is not a gate input (use --check-live)`);
    return;
  }
  if (CHECK_LIVE) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    const normalise = (s) => s.replace(/"generatedAt":\s*"[^"]+"/, '"generatedAt":"*"').replace(/"minutesAgo":\s*\d+/, '"minutesAgo":"*"');
    if (normalise(current) !== normalise(serialized)) {
      console.error('founder-presence drift — run: node scripts/generate-founder-presence.mjs');
      process.exit(1);
    }
    console.log('founder-presence.json up to date');
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, serialized, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT)}  ·  live=${payload.live}${payload.project ? ` · ${payload.project}` : ''}`);
}

function selfTest() {
  const digest = 'abc123def4567890';
  const notLive = { generatedAt: '2026-09-14T08:00:00.000Z', live: false, project: null, slug: null, tier: null, label: null, startedAt: null, minutesAgo: null, sourceDigest: digest };
  const live = { ...notLive, live: true, project: 'StatVault', slug: 'statsforge', tier: 'forge', label: 'Live in the forge on StatVault', startedAt: '2026-09-14T07:55:00.000Z', minutesAgo: 5 };
  const sealed = { ...live, project: null, slug: null, label: 'Live in the forge' };
  const cases = [
    ['a valid not-live payload passes', validatePresence(notLive, digest).length === 0],
    ['a valid live payload passes', validatePresence(live, digest).length === 0],
    ['a sealed live payload with the generic label passes', validatePresence(sealed, digest).length === 0],
    ['a different live session (another repo moved) still passes: sessions are not an input', validatePresence({ ...live, project: 'VEILOS', slug: 'veilos', label: 'Live in the forge on VEILOS', minutesAgo: 1 }, digest).length === 0],
    ['a stale sourceDigest (generator, lib or registry changed) fails', validatePresence(notLive, 'ffffffffffffffff').some((p) => p.includes('sourceDigest'))],
    ['a missing key fails', validatePresence({ ...notLive, label: undefined }, digest).length === 0 ? false : validatePresence((({ label, ...rest }) => rest)(notLive), digest).some((p) => p.includes('missing key label'))],
    ['an unexpected key fails', validatePresence({ ...notLive, extra: 1 }, digest).some((p) => p.includes('unexpected key extra'))],
    ['a not-live payload that leaks a project fails', validatePresence({ ...notLive, project: 'StatVault' }, digest).some((p) => p.includes('must null project'))],
    ['a live label that does not name its project fails', validatePresence({ ...live, label: 'Live in the forge on Somewhere Else' }, digest).some((p) => p.includes('label does not name'))],
    ['a live minutesAgo past the window fails', validatePresence({ ...live, minutesAgo: MAX_AGE_MIN + 1 }, digest).some((p) => p.includes('live window'))],
    ['the digest covers the registry: changing it changes the digest', sourceDigest(ROOT, (rel) => (rel.endsWith('studioRegistry.js') ? 'changed' : 'same')) !== sourceDigest(ROOT, () => 'same')],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${label}`);
  console.log(`generate-founder-presence --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (SELF_TEST) selfTest();
else main();
