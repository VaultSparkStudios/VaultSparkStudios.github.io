#!/usr/bin/env node
/**
 * generate-leaderboard-api.mjs
 * Fetches leaderboard data from Supabase and writes static JSON files
 * that serve as the public Vault Score Leaderboard API.
 *
 * Output:
 *   api/leaderboard/v1/all.json          Top 100 across all games
 *   api/leaderboard/v1/{game-slug}.json   Top 50 per game
 *   api/leaderboard/v1/meta.json          Endpoint index + timestamp
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SB  = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
const GAMES = ['call-of-doodie', 'gridiron-gm', 'vaultspark-football-gm'];
const OUT_DIR = join(process.cwd(), 'api', 'leaderboard', 'v1');

const GAME_LABELS = {
  'call-of-doodie': 'Call of Doodie',
  'gridiron-gm': 'Gridiron GM',
  'vaultspark-football-gm': 'VaultSpark Football GM',
};

mkdirSync(OUT_DIR, { recursive: true });

async function sbFetch(path) {
  const url = `${SB}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: { apikey: KEY, Accept: 'application/json' },
  });
  if (!res.ok) {
    console.warn(`  WARN: ${res.status} from ${url}`);
    return [];
  }
  return res.json();
}

function mapEntries(rows) {
  return rows.map((row, i) => ({
    rank: i + 1,
    username: row.vault_members?.username || 'Anonymous',
    score: row.score,
    rank_title: row.vault_members?.rank_title || 'Spark Initiate',
  }));
}

async function generateGameFile(slug) {
  console.log(`  Fetching ${slug}...`);
  const rows = await sbFetch(
    `game_scores?select=user_id,score,vault_members(username,rank_title)` +
    `&game_slug=eq.${encodeURIComponent(slug)}` +
    `&order=score.desc&limit=50`
  );
  const data = {
    game: slug,
    game_name: GAME_LABELS[slug] || slug,
    updated_at: new Date().toISOString(),
    entries: mapEntries(rows),
  };
  const outPath = join(OUT_DIR, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  -> ${outPath} (${data.entries.length} entries)`);
  return data;
}

async function generateAllFile(perGameData) {
  console.log('  Building all.json...');
  // Merge all game entries, re-sort, take top 100
  const merged = [];
  for (const gd of perGameData) {
    for (const entry of gd.entries) {
      merged.push({ ...entry, game: gd.game, game_name: gd.game_name });
    }
  }
  merged.sort((a, b) => b.score - a.score);
  const top = merged.slice(0, 100).map((e, i) => ({ ...e, rank: i + 1 }));

  const data = {
    game: 'all',
    game_name: 'All Games',
    updated_at: new Date().toISOString(),
    entries: top,
  };
  const outPath = join(OUT_DIR, 'all.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  -> ${outPath} (${data.entries.length} entries)`);
}

async function generateMeta() {
  const endpoints = [
    { path: '/api/leaderboard/v1/all.json', description: 'Top 100 scores across all games' },
    ...GAMES.map(g => ({
      path: `/api/leaderboard/v1/${g}.json`,
      description: `Top 50 scores for ${GAME_LABELS[g] || g}`,
    })),
  ];
  const data = {
    api: 'VaultSpark Leaderboard API',
    version: 'v1',
    base_url: 'https://vaultsparkstudios.com/api/leaderboard/v1/',
    updated_at: new Date().toISOString(),
    games: GAMES.map(g => ({ slug: g, name: GAME_LABELS[g] || g })),
    endpoints,
    docs: 'https://vaultsparkstudios.com/api/leaderboard/',
  };
  const outPath = join(OUT_DIR, 'meta.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  -> ${outPath}`);
}

async function main() {
  console.log('Generating Vault Score Leaderboard API...');
  const perGameData = [];
  for (const slug of GAMES) {
    perGameData.push(await generateGameFile(slug));
  }
  await generateAllFile(perGameData);
  await generateMeta();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
