#!/usr/bin/env node
// build-oracle-query-clusters.mjs (S185 · oracle-query-learning-loop)
//
// Reads api/oracle-queries.json (seeded representative queries per audience tier)
// and data/ignis-search-index.json (all indexed pages), then clusters queries by
// shared keywords and surfaces the top 3 doc matches per cluster as "oracle
// insights" — pre-computed relevance hints the Oracle panel can surface proactively.
//
// S190: re-ranks clusters by recency-weighted helpful-rate from
//   data/oracle-feedback.ndjson (when present). Falls back to coverage score.
//   Each cluster gains a `helpfulScore` field for frontend transparency.
//
// Output: api/oracle-insights.json
// Wired into: npm run build (via build-ignis-search-index step)
// Gates: --check (fail if output is >48h stale)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkHash, saveHash } from './lib/build-cache.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUERIES_SRC = path.join(ROOT, 'api', 'oracle-queries.json');
const INDEX_SRC = path.join(ROOT, 'data', 'ignis-search-index.json');
const FEEDBACK_SRC = path.join(ROOT, 'data', 'oracle-feedback.ndjson');
// S219 oracle-live-answers — public-safe live feeds that turn each cluster's
// canned question into a CURRENT answer (most-active game, latest ships, counts,
// leaderboard leader) instead of only keyword-matched static docs.
const LIVE_SRC = path.join(ROOT, 'api', 'public-intelligence.json');
const LEADERBOARD_SRC = path.join(ROOT, 'api', 'leaderboard', 'v1', 'all.json');
const OUT = path.join(ROOT, 'api', 'oracle-insights.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');
const FORCE = process.argv.includes('--force');

if (SELF_TEST) {
  const testQueries = { anonymous: ['What games exist?', 'How do I join?'] };
  const testIndex = [{ title: 'Games', url: '/games/', body: 'games play arcade', summary: '' }];
  const feedbackMap = { 'what_games': { helpful: 5, unhelpful: 1, lastDay: '2026-06-10' } };
  const testLive = buildLive({
    catalog: [{ type: 'game', status: 'SPARKED', name: 'Call of Doodie', progress: 85 }],
    stats: { liveProjects: 1, projectsInForge: 2, vaultRankTiers: 9 },
    normalizedActivity: { latest: [{ title: 'X shipped a closeout', url: '/' }] },
    pulse: { now: ['Building the Oracle'] },
    generatedAt: '2026-06-23T00:00:00.000Z',
  }, { game_name: 'Call of Doodie', entries: [{ display_name: 'Ada', score: 999 }] });
  const out = buildClusters(testQueries, testIndex, feedbackMap, testLive);
  const ok = Array.isArray(out.clusters) && out.clusters.length > 0 && out.clusters[0].topDocs;
  const ranked = out.clusters[0].key === 'what_games'; // higher helpful-rate should rank first
  const hasHelpfulScore = typeof out.clusters[0].helpfulScore === 'number';
  const liveOk = out.clusters.some(c => typeof c.liveAnswer === 'string' && c.liveAnswer.length > 0);
  const liveSafe = out.clusters.every(c => c.liveAnswer === null || typeof c.liveAnswer === 'string');
  console.log([
    ok ? '  ✓ clusters built' : '  ✗ clusters missing',
    ranked ? '  ✓ helpful-rate ranking applied' : '  ✗ helpful-rate ranking failed',
    hasHelpfulScore ? '  ✓ helpfulScore field present' : '  ✗ helpfulScore field missing',
    liveOk ? '  ✓ live answer derived from live feeds' : '  ✗ live answer missing',
    liveSafe ? '  ✓ liveAnswer is always string|null' : '  ✗ liveAnswer wrong type',
  ].join('\n'));
  const pass = ok && ranked && hasHelpfulScore && liveOk && liveSafe;
  console.log(pass ? '✓ self-test passed' : '✗ self-test failed');
  process.exit(pass ? 0 : 1);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('✗ oracle-insights.json missing — run build'); process.exit(1); }
  const age = Date.now() - fs.statSync(OUT).mtimeMs;
  if (age > 48 * 60 * 60 * 1000) { console.error('✗ oracle-insights.json stale (>48h)'); process.exit(1); }
  console.log('✓ oracle-insights.json fresh');
  process.exit(0);
}

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

/** Parse oracle-feedback.ndjson → Map<clusterKey, {helpful, unhelpful, lastDay}>.
    Aggregates all rows per key; recency-weights by applying 0.9^daysOld decay. */
function loadFeedbackMap(feedbackPath, refDay) {
  if (!fs.existsSync(feedbackPath)) return {};
  const refMs = new Date(refDay || new Date().toISOString().slice(0, 10)).getTime();
  const acc = {};
  const lines = fs.readFileSync(feedbackPath, 'utf8').trim().split('\n');
  for (const line of lines) {
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    const { clusterKey, date, helpful = 0, unhelpful = 0 } = row;
    if (!clusterKey) continue;
    const daysOld = Math.max(0, Math.round((refMs - new Date(date || '').getTime()) / 86400000));
    const weight = Math.pow(0.9, daysOld); // recency decay: 90% per day older
    if (!acc[clusterKey]) acc[clusterKey] = { helpful: 0, unhelpful: 0, lastDay: date || '' };
    acc[clusterKey].helpful += (helpful || 0) * weight;
    acc[clusterKey].unhelpful += (unhelpful || 0) * weight;
    if ((date || '') > acc[clusterKey].lastDay) acc[clusterKey].lastDay = date;
  }
  return acc;
}

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function scoreDoc(queryTokens, doc) {
  const haystack = tokenize((doc.title || '') + ' ' + (doc.summary || '') + ' ' + (doc.body || ''));
  const haystackSet = new Set(haystack);
  return queryTokens.filter(t => haystackSet.has(t)).length;
}

/** Compute sort score: helpful-rate (0-1) when feedback exists, else coverage score normalised. */
function rankScore(clusterKey, coverageScore, feedbackMap, maxCoverage) {
  const fb = feedbackMap[clusterKey];
  if (fb && (fb.helpful + fb.unhelpful) > 0) {
    const rate = fb.helpful / (fb.helpful + fb.unhelpful);
    return { helpfulScore: Math.round(rate * 100) / 100, sortKey: rate, hasFeedback: true };
  }
  // No feedback yet: normalise coverage score so it lives in [0, 0.5) range,
  // always below any cluster with real feedback (which starts at ≥0).
  const normalised = maxCoverage > 0 ? (coverageScore / maxCoverage) * 0.5 : 0;
  return { helpfulScore: null, sortKey: normalised, hasFeedback: false };
}

/**
 * buildLive(pi, lb) — distill the public-safe live feeds into the handful of
 * CURRENT facts the Oracle answers about. Everything here is already public-safe
 * (it ships in api/*.json); we add NO new data, just summarise what's live.
 * Returns null when the feed is absent so the Oracle degrades to doc-match only.
 */
function buildLive(pi, lb) {
  if (!pi) return null;
  const catalog = Array.isArray(pi.catalog) ? pi.catalog : [];
  const games = catalog.filter(c => c.type === 'game');
  const sparkedGames = games.filter(c => String(c.status).toUpperCase() === 'SPARKED');
  const stats = pi.stats || {};

  // Most active = the public ship stream's latest game/project, else the
  // highest-progress SPARKED game.
  const latest = (pi.normalizedActivity && Array.isArray(pi.normalizedActivity.latest))
    ? pi.normalizedActivity.latest : [];
  const latestShip = latest.find(e => e && e.title) || null;
  const topGame = sparkedGames.slice().sort((a, b) => (b.progress || 0) - (a.progress || 0))[0]
    || games[0] || null;

  const focus = (pi.pulse && Array.isArray(pi.pulse.now) && pi.pulse.now[0]) ? pi.pulse.now[0] : null;

  // Leaderboard leader (top entry of the aggregate board, if present).
  let leader = null;
  try {
    const entries = lb && Array.isArray(lb.entries) ? lb.entries : [];
    if (entries.length) {
      const e = entries[0];
      leader = { name: e.display_name || e.name || e.handle || 'a Vault member', score: e.score ?? e.points ?? null, game: lb.game_name || null };
    }
  } catch { leader = null; }

  return {
    gamesLive: sparkedGames.length || stats.liveProjects || 0,
    inForge: games.filter(c => String(c.status).toUpperCase() === 'FORGE').length || stats.projectsInForge || 0,
    totalGames: games.length,
    sparkedNames: sparkedGames.map(g => g.name).filter(Boolean),
    topGame: topGame ? { name: topGame.name, note: topGame.note || '', url: topGame.deployedUrl || '' } : null,
    latestShip: latestShip ? { title: latestShip.title, url: latestShip.url || '', at: latestShip.occurredAt || '' } : null,
    focus,
    rankTiers: stats.vaultRankTiers || null,
    leader,
    asOf: pi.generatedAt || null,
  };
}

/**
 * deriveLiveAnswer(tokens, live) — map a cluster's intent to a CURRENT, public-safe
 * one-liner from the live feeds. Returns null when no live fact fits (the cluster
 * then falls back to its doc matches, unchanged). Intent matched on tokens so it is
 * robust to phrasing.
 */
function deriveLiveAnswer(tokens, live) {
  if (!live) return null;
  const has = (...ws) => ws.some(w => tokens.includes(w));
  const playable = live.sparkedNames.slice(0, 3).join(', ');

  // Order matters: most-specific intent first so a broad token ('vault') never
  // shadows a precise question (leaderboards, ranks, what-to-play, membership).

  // 1. Leaderboard standings (honest when there's no board data yet)
  if (has('leaderboard', 'leaderboards', 'leading', 'winning', 'leader')) {
    if (live.leader) {
      const s = live.leader.score != null ? ` (${live.leader.score} pts)` : '';
      return `Right now ${live.leader.name} leads${s}. Standings reset every week.`;
    }
    return `Weekly leaderboards reset every 7 days — climb the ${live.rankTiers || 9}-tier ladder and be the first name up top.`;
  }
  // 2. Rank / points mechanics
  if (has('rank', 'points', 'tier', 'tiers', 'ranking') && live.rankTiers) {
    return `The Vault rank ladder has ${live.rankTiers} tiers — earn Vault Points by playing, referring, and showing up.`;
  }
  // 3. "What should I play / speedrun / start with" → a real recommendation
  if (has('should', 'speedrun', 'first', 'start', 'recommend') && live.topGame) {
    const n = live.topGame.note ? ` — ${live.topGame.note}` : '';
    const others = live.sparkedNames.filter(name => name !== live.topGame.name).slice(0, 2).join(', ');
    return `Start with ${live.topGame.name}${n}${others ? ` Also live: ${others}.` : ''}`;
  }
  // 4. Membership — what makes a member different
  if (has('member', 'membership', 'different', 'makes', 'subscriber')) {
    return `Vault members get the ${live.rankTiers || 9}-tier rank ladder, the member portal, weekly leaderboards, and first look at what leaves the forge.`;
  }
  // 5. "Most active / hottest"
  if (has('active', 'hottest', 'popular', 'hardest', 'challenge') && live.topGame) {
    const n = live.topGame.note ? ` — ${live.topGame.note}` : '';
    return `Most active right now: ${live.topGame.name}${n}`;
  }
  // 6. "What's new / latest / shipping this week"
  if (has('new', 'latest', 'shipping', 'shipped', 'recent', 'week') && live.latestShip) {
    return `Latest from the forge: ${live.latestShip.title}.`;
  }
  // 7. "What games are in the vault / playable"
  if (has('games', 'game', 'play', 'playable') && (live.gamesLive || live.totalGames)) {
    const tail = playable ? ` Playable now: ${playable}.` : '';
    return `${live.gamesLive} game(s) live and ${live.inForge} more in the Forge.${tail}`;
  }
  // 8. "What is VaultSpark building / studio focus"
  if (has('building', 'focus', 'working', 'vaultspark', 'studio', 'vault') && live.focus) {
    return `Current focus: ${live.focus}`;
  }
  return null;
}

function buildClusters(queries, index, feedbackMap = {}, live = null) {
  const clusters = [];
  const allQueries = Object.entries(queries).flatMap(([tier, qs]) => qs.map(q => ({ tier, q })));
  const seen = new Set();

  for (const { tier, q } of allQueries) {
    const tokens = tokenize(q);
    if (!tokens.length) continue;

    const clusterKey = tokens.slice(0, 2).join('_');
    if (seen.has(clusterKey)) continue;
    seen.add(clusterKey);

    const scoredDocs = (index || [])
      .map(doc => ({ doc, score: scoreDoc(tokens, doc) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const topDocs = scoredDocs.slice(0, 3)
      .map(({ doc }) => ({ title: doc.title, url: doc.url, summary: doc.summary }));

    const coverageScore = scoredDocs.reduce((s, { score }) => s + score, 0);
    const liveAnswer = deriveLiveAnswer(tokens, live);
    clusters.push({ key: clusterKey, query: q, tier, tokens: tokens.slice(0, 4), liveAnswer, topDocs, _coverage: coverageScore });
  }

  const maxCoverage = clusters.reduce((m, c) => Math.max(m, c._coverage || 0), 0);

  // Attach helpful-rate scores and sort: real feedback first (by rate), then by coverage
  const ranked = clusters
    .map(c => {
      const { helpfulScore, sortKey } = rankScore(c.key, c._coverage || 0, feedbackMap, maxCoverage);
      const { _coverage, ...rest } = c; // strip internal field
      return { ...rest, helpfulScore, _sortKey: sortKey };
    })
    .sort((a, b) => b._sortKey - a._sortKey)
    .map(({ _sortKey, ...c }) => c); // strip sort helper

  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), publicSafe: true, clusters: ranked };
}

// Content-hash skip: rebuild when the queries, index, feedback, OR the live feeds
// (public-intelligence / leaderboard) change — so the Oracle's live answers stay
// current as the studio ships (S219 oracle-live-answers).
const ORACLE_INPUTS = [QUERIES_SRC, INDEX_SRC, FEEDBACK_SRC, LIVE_SRC, LEADERBOARD_SRC];
const oracleCache = (!FORCE) ? checkHash('oracle-clusters', ORACLE_INPUTS) : { hit: false, hash: '' };
if (!CHECK && oracleCache.hit) {
  console.log('build-oracle-query-clusters: SKIP (inputs unchanged)');
  process.exit(0);
}

const queries = readJson(QUERIES_SRC);
const index = readJson(INDEX_SRC);
const feedbackMap = loadFeedbackMap(FEEDBACK_SRC);
const live = buildLive(readJson(LIVE_SRC), readJson(LEADERBOARD_SRC));

if (!queries) { console.error('oracle-queries.json missing — skipping'); process.exit(0); }
if (!index) { console.warn('ignis-search-index.json missing — clusters will have empty topDocs'); }

const indexDocs = Array.isArray(index) ? index : (index && Array.isArray(index.documents) ? index.documents : []);
const result = buildClusters(queries, indexDocs, feedbackMap, live);
const liveCount = result.clusters.filter(c => c.liveAnswer).length;
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
saveHash('oracle-clusters', oracleCache.hash);
const feedbackNote = Object.keys(feedbackMap).length ? ` (${Object.keys(feedbackMap).length} clusters with feedback data)` : ' (no feedback data yet — ranked by coverage)';
console.log(`✓ oracle-insights.json — ${result.clusters.length} clusters · ${liveCount} with live answers${feedbackNote}`);
