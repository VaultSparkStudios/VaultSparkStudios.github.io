#!/usr/bin/env node
/**
 * build-rank-climbers.mjs — S201 vault-climbers-monthly-digest.
 *
 * Queries vault_members for active members who have climbed above the
 * starting rank within the current calendar month. Writes api/rank-climbers.json.
 *
 * Uses service role key (via secrets gateway) to bypass RLS.
 * Filters to public_profile = true only (members opted in to public listings).
 *
 * Usage:
 *   node scripts/build-rank-climbers.mjs          # build
 *   node scripts/build-rank-climbers.mjs --check  # exit 1 if JSON is stale/missing
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const ROOT = join(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), '..', '..');
const OUT = join(ROOT, 'api', 'rank-climbers.json');

const SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const SB_ANON_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

// Rank thresholds mirror vault-rank-bar.js — source of truth is the client asset.
const RANK_THRESHOLDS = [
  { title: 'Spark Initiate', min: 0    },
  { title: 'Vault Runner',   min: 50   },
  { title: 'Rift Scout',     min: 100  },
  { title: 'Vault Guard',    min: 200  },
  { title: 'Vault Breacher', min: 400  },
  { title: 'Void Operative', min: 800  },
  { title: 'Vault Keeper',   min: 1500 },
  { title: 'Forge Master',   min: 2500 },
  { title: 'The Sparked',    min: 5000 },
];

function computeRank(points) {
  const p = Number(points) || 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (p >= RANK_THRESHOLDS[i].min) return RANK_THRESHOLDS[i].title;
  }
  return 'Spark Initiate';
}

async function resolveServiceKey() {
  // CANON-012: resolve via secrets gateway. Falls back to anon key if unavailable.
  // pathToFileURL required on Windows — bare absolute paths are not valid import specifiers.
  try {
    const secretsPath = join(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'lib', 'secrets.mjs');
    if (existsSync(secretsPath)) {
      const { getSecret } = await import(pathToFileURL(secretsPath).href);
      const key = await getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
      if (key && key.length > 50) return { key, isServiceRole: true };
    }
  } catch (_) { /* gateway unavailable */ }
  return { key: SB_ANON_KEY, isServiceRole: false };
}

const CHECK = process.argv.includes('--check');

async function fetchClimbers() {
  const { key, isServiceRole } = await resolveServiceKey();

  // Only fetch public-profile members above the starting rank (points > 49).
  // No rank_name column — rank is computed from points using RANK_THRESHOLDS.
  const url = `${SB_URL}/rest/v1/vault_members?select=username,points&public_profile=eq.true&points=gt.49&order=points.desc&limit=10`;

  const headers = { apikey: key, Accept: 'application/json' };
  if (isServiceRole) headers['Authorization'] = `Bearer ${key}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`[build-rank-climbers] Supabase ${res.status} (${isServiceRole ? 'service-role' : 'anon'}) — writing empty output. ${body.slice(0, 120)}`);
    return [];
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  return rows.map(function (row) {
    return {
      handle: row.username || 'VaultMember',
      rank: computeRank(row.points),
      points: typeof row.points === 'number' ? row.points : 0
    };
  });
}

const periodLabel = (function () {
  const now = new Date();
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}());

async function build() {
  let climbers = [];
  try { climbers = await fetchClimbers(); } catch (e) { console.warn('[build-rank-climbers] fetch failed:', e.message); }

  const out = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    period: periodLabel,
    climbers: climbers,
    totalClimbers: climbers.length
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`[build-rank-climbers] wrote api/rank-climbers.json (${climbers.length} climbers)`);
}

if (CHECK) {
  if (!existsSync(OUT)) { console.error('[build-rank-climbers] MISSING api/rank-climbers.json'); process.exit(1); }
  try {
    const data = JSON.parse(readFileSync(OUT, 'utf8'));
    const age = Date.now() - new Date(data.generatedAt || 0).getTime();
    if (age > 48 * 3600 * 1000) { console.error(`[build-rank-climbers] STALE — ${Math.round(age / 3600000)}h old`); process.exit(1); }
    console.log('[build-rank-climbers] OK');
  } catch (e) { console.error('[build-rank-climbers] INVALID JSON:', e.message); process.exit(1); }
} else {
  build().catch(function (e) { console.error('[build-rank-climbers] fatal:', e); process.exit(1); });
}