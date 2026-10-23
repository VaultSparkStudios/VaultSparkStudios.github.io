#!/usr/bin/env node
/**
 * generate-heartbeat.mjs — Build `api/heartbeat.json` for the public-site
 * Portfolio Heartbeat Visualizer.
 *
 * Input sources (in order of preference):
 *   1. ../vaultspark-studio-ops/portfolio/events.ndjson  (canonical studio-wide log)
 *   2. portfolio/events.ndjson                           (local fallback)
 *   3. studioRegistry.js PROJECTS                         (baseline shape + tiers)
 *
 * Output shape:
 *   {
 *     generatedAt: ISO,
 *     windowDays:  30,
 *     projects: [
 *       { slug, name, tier, pulses7d, pulses30d, lastActivity, soulSafeLabel }
 *     ]
 *   }
 *
 * Sealed-vault rule: if a registry entry has `sealed: true` OR its vaultStatus
 * is "sealed", the slug + name are replaced with a sigil-only placeholder so
 * unannounced projects never leak through the public heartbeat.
 *
 * Usage: node scripts/generate-heartbeat.mjs [--check]
 * --check  exit 1 if the generated JSON differs from the current file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readPortfolioEvents } from './lib/public-activity.mjs';
import { deriveProjectPulse } from './lib/project-activity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'heartbeat.json');
const CHECK = process.argv.includes('--check');

const WINDOW_DAYS = 30;
const RECENT_DAYS = 7;

async function loadRegistry() {
  const reg = path.join(ROOT, 'studio-hub', 'src', 'data', 'studioRegistry.js');
  if (!fs.existsSync(reg)) return [];
  const mod = await import(pathToFileURL(reg).href);
  const projects = mod.PROJECTS || mod.default?.PROJECTS || [];
  return Array.isArray(projects) ? projects : [];
}

function isSealed(p) {
  return p?.sealed === true || p?.vaultStatus === 'sealed' || p?.launchStatus === 'sealed';
}

function soulSafeName(p) {
  return isSealed(p) ? 'Sealed in the vault' : (p.name || p.id);
}

function tierOf(p) {
  const s = String(p?.vaultStatus || '').toLowerCase();
  if (s === 'sparked' || s === 'sparked-public') return 'sparked';
  if (s === 'forge')   return 'forge';
  if (s === 'vaulted') return 'vaulted';
  if (s === 'sealed')  return 'sealed';
  return 'forge';
}

export function heartbeatCheckTime(current, now = Date.now()) {
  const value = current?.generatedAt;
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error('heartbeat check requires a canonical ISO generatedAt timestamp');
  }
  if (timestamp > now) throw new Error('heartbeat generatedAt is in the future');
  return timestamp;
}

export function heartbeatSnapshot(registry, events, now) {
    const projects = registry.map((p) => {
      // Shared derivation (scripts/lib/project-activity.mjs) — all event types,
      // windowed lastActivity; the public-intelligence catalog reuses the same code.
      const pulse = deriveProjectPulse(p, events, { now, windowDays: WINDOW_DAYS, recentDays: RECENT_DAYS });
      const sealed = isSealed(p);
      return {
        slug: sealed ? `sealed-${p.id?.slice(0, 6) || 'x'}` : (p.id || p.slug),
        name: soulSafeName(p),
        tier: tierOf(p),
        pulses7d: pulse.pulses7d || 0,
        pulses30d: pulse.pulses30d || 0,
        lastActivity: pulse.lastActivity ? new Date(pulse.lastActivity).toISOString() : null,
      };
    }).sort((a, b) => (b.pulses7d - a.pulses7d) || (b.pulses30d - a.pulses30d));

    return {
      generatedAt: new Date(now).toISOString(),
      windowDays: WINDOW_DAYS,
      projects,
    };

}

export function checkHeartbeatSnapshot(current, registry, events, now = Date.now()) {
  const asOf = heartbeatCheckTime(current, now);
  return JSON.stringify(current) === JSON.stringify(heartbeatSnapshot(registry, events, asOf));
}

async function main() {
    const events = readPortfolioEvents(ROOT);
    const registry = await loadRegistry();

    if (CHECK) {
      const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      // Windowed counters are a snapshot at generatedAt. Replaying them against
      // the current clock turns an unchanged source into drift at every boundary.
      // This verifies source consistency; freshness is a separate observation.
      if (!checkHeartbeatSnapshot(current, registry, events)) {
        console.error('heartbeat drift — run: node scripts/generate-heartbeat.mjs');
        process.exit(1);
      }
      console.log(`heartbeat source snapshot matches as of ${current.generatedAt}; freshness not evaluated`);
      return;
    }

    const out = heartbeatSnapshot(registry, events, Date.now());
    const serialized = JSON.stringify(out, null, 2) + '\n';
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, serialized, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, OUT)}  ·  ${out.projects.length} projects  ·  ${out.projects.reduce((a, p) => a + p.pulses30d, 0)} total pulses / ${WINDOW_DAYS}d`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
