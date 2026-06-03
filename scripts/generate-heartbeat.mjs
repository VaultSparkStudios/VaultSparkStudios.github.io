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
import { pathToFileURL } from 'node:url';
import { matchesProjectSlug, readPortfolioEvents } from './lib/public-activity.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'api', 'heartbeat.json');
const CHECK = process.argv.includes('--check');

const WINDOW_DAYS = 30;
const RECENT_DAYS = 7;
const MS_DAY = 86_400_000;

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

function main() {
  const now = Date.now();
  const events = readPortfolioEvents(ROOT);

  return (async () => {
    const registry = await loadRegistry();
    const projects = registry.map((p) => {
      const pulse = events.reduce((acc, ev) => {
        if (!ev?.slug || !ev?.ts) return acc;
        if (!matchesProjectSlug(p, ev.slug)) return acc;
        const ts = Date.parse(ev.ts);
        if (!Number.isFinite(ts)) return acc;
        const ageDays = (now - ts) / MS_DAY;
        if (ageDays > WINDOW_DAYS) return acc;
        acc.pulses30d += 1;
        if (ageDays <= RECENT_DAYS) acc.pulses7d += 1;
        if (ts > acc.lastActivity) acc.lastActivity = ts;
        return acc;
      }, { pulses7d: 0, pulses30d: 0, lastActivity: 0 });
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

    const out = {
      generatedAt: new Date(now).toISOString(),
      windowDays: WINDOW_DAYS,
      projects,
    };

    const serialized = JSON.stringify(out, null, 2) + '\n';

    if (CHECK) {
      const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
      // Compare everything except generatedAt so the check isn't time-sensitive.
      const normalise = (s) => s.replace(/"generatedAt":\s*"[^"]+"/, '"generatedAt":"*"');
      if (normalise(current) !== normalise(serialized)) {
        console.error('heartbeat drift — run: node scripts/generate-heartbeat.mjs');
        process.exit(1);
      }
      console.log('heartbeat.json up to date');
      return;
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, serialized, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, OUT)}  ·  ${projects.length} projects  ·  ${projects.reduce((a, p) => a + p.pulses30d, 0)} total pulses / ${WINDOW_DAYS}d`);
  })();
}

main();
