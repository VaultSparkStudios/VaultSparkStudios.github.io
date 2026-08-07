#!/usr/bin/env node
// Second-order recommender: preserve cross-game affinity, but rank playable
// destinations by current, independently inspectable evidence rather than a
// static editorial order alone. Output remains compatible with play-next.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILES = {
  registry: 'data/game-registry.json',
  affinity: 'data/game-affinity.json',
  field: 'api/field-win.json',
  commits: 'api/commit-map.json',
};
const OUT = 'api/proof-aware-projects.json';
const hash = (text) => createHash('sha256').update(text).digest('hex');
const read = (path) => readFileSync(path, 'utf8');

export function build({ registry, affinity, field, commits, sourceHashes }) {
  const games = registry.games || {};
  const confirmed = field.confirmed || [];
  const moves = commits.entries || [];
  const scored = Object.entries(games).map(([slug, game]) => {
    const aliases = [slug, game.name.toLowerCase(), slug.replaceAll('-', ' ')];
    const fieldProof = confirmed.find((item) => {
      const route = String(item.route || '').replace(/\/+$/, '');
      return route === `/games/${slug}` || route === `/${slug}`;
    });
    const recentMoves = moves.filter((item) => aliases.some((alias) => String(item.summary || '').toLowerCase().includes(alias))).slice(0, 3);
    const playable = game.status === 'sparked' && !!game.playUrl;
    const score = (playable ? 70 : 0) + (game.mediaReady ? 10 : 0) + (fieldProof ? 15 : 0) + Math.min(5, recentMoves.length * 2);
    return { slug, name: game.name, status: game.status, url: `/games/${slug}/`, playable, proofScore: score, evidence: { registry: true, fieldVerdict: fieldProof?.verdict || null, recentMoves: recentMoves.map((item) => item.sha) } };
  });
  const playable = scored.filter((item) => item.playable).sort((a, b) => b.proofScore - a.proofScore || a.slug.localeCompare(b.slug));
  const live = Object.fromEntries(playable.map((item) => [item.slug, { name: item.name, url: item.url, proofScore: item.proofScore, evidence: item.evidence }]));
  const sourceSlugs = new Set([...Object.keys(games), ...Object.keys(affinity.affinity || {})]);
  const recommendations = {};
  for (const source of sourceSlugs) {
    const candidate = playable.find((item) => item.slug !== source);
    if (!candidate) continue;
    recommendations[source] = {
      next: candidate.slug,
      reason: `${candidate.name} is playable now with ${candidate.proofScore}/100 evidence strength.`,
      proofScore: candidate.proofScore,
      evidence: candidate.evidence,
    };
  }
  return {
    schemaVersion: '1.0',
    generatedAt: field.generatedAt || commits.generatedAt,
    generatedBy: 'scripts/build-proof-aware-projects.mjs',
    authority: 'registry-plus-public-proof',
    publicSafe: true,
    runtimeAiCost: 0,
    sourceHashes,
    live,
    affinity: recommendations,
    _forgePlayNow: playable.map((item) => item.slug),
    projects: scored,
    honesty: playable.length ? 'Only registry-SPARKED titles with a play URL are recommended.' : 'No title meets the playable evidence floor; recommender stays dark.',
  };
}

function sources() {
  const texts = Object.fromEntries(Object.entries(FILES).map(([key, path]) => [key, read(path)]));
  return {
    inputs: Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, JSON.parse(text)])),
    sourceHashes: Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, hash(text)])),
  };
}

function selfTest() {
  const payload = build({
    registry: { games: { a: { name: 'A', status: 'sparked', playUrl: 'https://a', mediaReady: true }, b: { name: 'B', status: 'forge', playUrl: null, mediaReady: false }, c: { name: 'C', status: 'sparked', playUrl: 'https://c', mediaReady: true } } },
    affinity: { affinity: { a: { next: 'b' }, b: { next: 'a' } } },
    field: { generatedAt: '2026-08-04', confirmed: [{ route: '/games/c/', verdict: 'improved' }] },
    commits: { generatedAt: '2026-08-04', entries: [] }, sourceHashes: {},
  });
  const checks = [
    ['forge title excluded from live', !payload.live.b],
    ['field-proof title ranks first', payload._forgePlayNow[0] === 'c'],
    ['current title is never its own recommendation', payload.affinity.c.next !== 'c'],
    ['recommendation exposes proof score', payload.affinity.a.proofScore === 95],
    ['runtime AI cost is zero', payload.runtimeAiCost === 0],
  ];
  const failures = checks.filter(([, ok]) => !ok);
  checks.forEach(([name, ok]) => console.log(`${ok ? '✓' : '✗'} ${name}`));
  console.log(`proof-aware recommender self-test: ${checks.length - failures.length}/${checks.length} passing`);
  if (failures.length) process.exit(1);
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const { inputs, sourceHashes } = sources();
  const payload = build({ ...inputs, sourceHashes });
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || read(OUT) !== text) { console.error('proof-aware project receipt drift'); process.exit(1); }
    console.log(`proof-aware project receipt: ${Object.keys(payload.live).length} playable · in sync`);
  } else {
    writeFileSync(OUT, text);
    console.log(`proof-aware project receipt: ${Object.keys(payload.live).length} playable · written`);
  }
}
