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
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { matchesProjectSlug, normalizeProjectSlug } from './lib/public-activity.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'api', 'founder-presence.json');
const CHECK = process.argv.includes('--check');
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
  if (CHECK) {
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

main();
