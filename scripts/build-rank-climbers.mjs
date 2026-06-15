#!/usr/bin/env node
/**
 * build-rank-climbers.mjs — S201 vault-climbers-monthly-digest.
 *
 * Queries vault_members for active members who have climbed above the
 * starting rank within the current calendar month. Writes api/rank-climbers.json.
 *
 * Usage:
 *   node scripts/build-rank-climbers.mjs          # build
 *   node scripts/build-rank-climbers.mjs --check  # exit 1 if JSON is stale/missing
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), '..', '..');
const OUT = join(ROOT, 'api', 'rank-climbers.json');

const SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const SB_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

const CHECK = process.argv.includes('--check');

async function fetchClimbers() {
  // Select members above the starting rank (points > 49) sorted by points.
  // No updated_at filter — uses current snapshot as the monthly digest
  // (showing who is climbing right now, not tracking individual promotions).
  const url = `${SB_URL}/rest/v1/vault_members?select=username,points,rank_name&points=gt.49&order=points.desc&limit=10`;

  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Accept: 'application/json' }
  });
  if (!res.ok) {
    console.warn(`[build-rank-climbers] Supabase ${res.status} — writing empty output`);
    return [];
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  return rows.map(function (row) {
    return {
      handle: row.username || 'VaultMember',
      rank: row.rank_name || 'Vault Runner',
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
