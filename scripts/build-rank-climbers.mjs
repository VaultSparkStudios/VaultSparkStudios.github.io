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
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'node:path';

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

export function sameSupabaseProject(configuredUrl, targetUrl = SB_URL) {
  try { return new URL(configuredUrl).origin === new URL(targetUrl).origin; }
  catch { return false; }
}

async function resolveServiceKey() {
  // CANON-012: resolve via secrets gateway. Falls back to anon key if unavailable.
  // pathToFileURL required on Windows — bare absolute paths are not valid import specifiers.
  try {
    const secretsPath = join(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'lib', 'secrets.mjs');
    if (existsSync(secretsPath)) {
      const { getSecret } = await import(pathToFileURL(secretsPath).href);
      // The shared gateway can describe a different project's database. Never
      // send that project's privileged credential to this website's endpoint.
      const configuredUrl = await getSecret('SUPABASE_URL', 'supabase.admin');
      if (!sameSupabaseProject(configuredUrl)) return { key: SB_ANON_KEY, isServiceRole: false };
      const key = await getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
      if (key && key.length > 50) return { key, isServiceRole: true };
    }
  } catch (_) { /* gateway unavailable */ }
  return { key: SB_ANON_KEY, isServiceRole: false };
}

const CHECK = process.argv.includes('--check');

export async function fetchClimbers({ fetchImpl = fetch, resolveKey = resolveServiceKey } = {}) {
  const { key, isServiceRole } = await resolveKey();

  // Only fetch public-profile members above the starting rank (points > 49).
  // No rank_name column — rank is computed from points using RANK_THRESHOLDS.
  const url = `${SB_URL}/rest/v1/vault_members?select=username,points&public_profile=eq.true&points=gt.49&order=points.desc&limit=10`;

  const headers = { apikey: key, Accept: 'application/json' };
  if (isServiceRole) headers['Authorization'] = `Bearer ${key}`;

  const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    throw new Error(`Supabase HTTP ${res.status}; previous rank report preserved`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('Supabase rank response is not an array; previous report preserved');

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
  const climbers = await fetchClimbers();

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

async function selfTest() {
  const assert = await import('node:assert/strict');
  assert.equal(sameSupabaseProject(SB_URL + '/'), true);
  assert.equal(sameSupabaseProject('https://different-project.example'), false);
  assert.equal(sameSupabaseProject('not a URL'), false);
  const resolveKey = async () => ({ key: 'public-fixture', isServiceRole: false });
  const rows = await fetchClimbers({ resolveKey, fetchImpl: async (url, options) => {
    assert.match(url, /public_profile=eq.true/);
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, json: async () => [] };
  } });
  assert.deepEqual(rows, []);
  await assert.rejects(fetchClimbers({ resolveKey, fetchImpl: async () => ({ ok: false, status: 401 }) }), /HTTP 401/);
  await assert.rejects(fetchClimbers({ resolveKey, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /not an array/);
  await assert.rejects(fetchClimbers({ resolveKey, fetchImpl: async () => { throw new Error('offline'); } }), /offline/);
  console.log('build-rank-climbers --self-test: passed (target identity, public read, empty success and failure negatives)');
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct && process.argv.includes('--self-test')) {
  selfTest().catch(error => { console.error(error.message); process.exitCode = 1; });
} else if (direct && process.argv.includes('--help')) {
  console.log('build-rank-climbers [--check|--self-test]: refresh public opt-in rankings; failed fetches preserve the previous report.');
} else if (direct && CHECK) {
  if (!existsSync(OUT)) { console.error('[build-rank-climbers] MISSING api/rank-climbers.json'); process.exit(1); }
  try {
    const data = JSON.parse(readFileSync(OUT, 'utf8'));
    const age = Date.now() - new Date(data.generatedAt || 0).getTime();
    if (age > 48 * 3600 * 1000) { console.error(`[build-rank-climbers] STALE — ${Math.round(age / 3600000)}h old`); process.exit(1); }
    console.log('[build-rank-climbers] OK');
  } catch (e) { console.error('[build-rank-climbers] INVALID JSON:', e.message); process.exit(1); }
} else if (direct) {
  build().catch(function (e) { console.error('[build-rank-climbers] fatal:', e); process.exit(1); });
}
