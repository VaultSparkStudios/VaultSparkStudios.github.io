#!/usr/bin/env node
/**
 * build-status-proof.mjs — Unified status proof manifest (S184)
 *
 * /status/ historically hand-fetched ~10 separate /api/*.json proof feeds with
 * no freshness contract. This merges the proof-relevant feeds into ONE
 * CI-generated /api/status-proof.json so:
 *   - /status/ (and any AI agent) verifies the studio's entire live posture in
 *     a single fetch instead of ten,
 *   - every embedded proof is self-grading: it carries its OWN source
 *     generatedAt + a computed freshnessSeconds + a `stale` flag, and the
 *     manifest exposes a top-level trustScore + worstStale.
 *
 * Public-safe: only re-bundles already-public api/*.json feeds. No new data.
 *
 * Usage: node scripts/build-status-proof.mjs [--check|--self-test]
 *   --check : verify the on-disk manifest matches a fresh render (drift gate),
 *             comparing STRUCTURE (keys + staleness thresholds), not volatile
 *             timestamps. Exit 1 on structural drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'api');
const OUT = path.join(API, 'status-proof.json');

// Proof feeds to bundle. staleAfterH = how old (hours) before the signal is
// flagged stale (tuned per feed cadence: live probes short, static posture long).
// honestDarkOk: a feed that is legitimately frozen until data arrives (e.g. the
//   conversion funnel below minSamples) carries honestDark=true and is graded
//   present+fresh — it is EXPECTED, not stale, and never the worstStale. This
//   keeps trustScore honest: a data-starved funnel must not read as a broken feed.
export const FEEDS = [
  { key: 'uptime', staleAfterH: 6 },
  { key: 'worker-route-provenance', staleAfterH: 6 },
  { key: 'deploy-currency', staleAfterH: 6 },
  { key: 'field-win', staleAfterH: 48 },
  { key: 'ai-discovery-health', staleAfterH: 48 },
  { key: 'ci-status', staleAfterH: 96 },
  { key: 'newsroom-run', staleAfterH: 48 },
  // S287: post-promotion reconciliation. Freshness-graded (not honest-dark) so a
  // reconciliation that stops refreshing honestly drags trustScore. The pass/fail
  // verdict (receiptState) surfaces on the /status/ card; here we grade recency.
  // 336h ≈ 14d tolerates the closeout cadence between refreshes.
  { key: 'promotion-receipt', staleAfterH: 336 },
  { key: 'site-health', staleAfterH: 48 },
  { key: 'staging-health', staleAfterH: 168 },
  // S290: identity migration and provider authority remain separately graded.
  // Both are honest-dark capable: an explicit hold is current evidence, not a
  // missing signal, while an old receipt still becomes stale.
  { key: 'identity-migration-receipt', staleAfterH: 336 },
  { key: 'supabase-control-plane', staleAfterH: 168 },
  { key: 'geo-vitals', staleAfterH: 48 },
  // field-verdicts is the raw grading ledger; field-win is the fresh public proof distilled from it.
  { key: 'funnel-summary', staleAfterH: null, honestDarkOk: true }, // S191: conversion posture; frozen honest-dark until traffic
  { key: 'attention-pressure', staleAfterH: null, honestDarkOk: true }, // S332: post-consent aggregate; private below cohort floor
  { key: 'canonical-destination-reachability', staleAfterH: 36 }, // S332: bounded external runtime sampler, refreshed every four hours
  { key: 'public-status', staleAfterH: 720 },
  { key: 'security-posture', staleAfterH: 720 },
];

// Long-window "posture" feeds (≥ this) are hand-maintained seeds, not CI-refreshed
// live probes. When one passes half its window it is approaching seed-rot and
// should be refreshed before it silently drags trustScore. (S191 seed-rot guard.)
const SEED_WINDOW_H = 168;

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

// Best-effort extraction of a feed's own generation timestamp.
function extractGeneratedAt(d) {
  if (!d || typeof d !== 'object') return null;
  const cands = [
    d.generatedAt, d.generated_at, d.generatedAtUtc, d.timestamp,
    d.updatedAt, d.lastUpdated, d.date,
    d.rollup && d.rollup.generatedAt,
  ].filter(Boolean);
  for (const c of cands) {
    const t = Date.parse(c);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return null;
}

export function buildManifest(nowMs, readFeed = (key) => readJson(path.join(API, `${key}.json`))) {
  const now = typeof nowMs === 'number' ? nowMs : Date.parse(new Date().toISOString());
  const proofs = {};
  let present = 0, fresh = 0;
  let worst = null;
  const seedRisk = [];

  for (const feed of FEEDS) {
    const data = readFeed(feed.key);
    if (data === null) {
      proofs[feed.key] = { present: false, source: `/api/${feed.key}.json`, staleAfterH: feed.staleAfterH };
      continue;
    }
    present++;
    const genAt = extractGeneratedAt(data);
    const ageSec = genAt ? Math.max(0, Math.round((now - Date.parse(genAt)) / 1000)) : null;
    // honestDarkOk feeds (staleAfterH null OR data.honestDark) are EXPECTED-frozen:
    // present + fresh, never stale, never worstStale.
    const honestDark = feed.honestDarkOk && (feed.staleAfterH === null || data.honestDark === true);
    const stale = honestDark ? false : (ageSec === null ? true : ageSec > feed.staleAfterH * 3600);
    if (!stale) fresh++;
    if (!honestDark && ageSec !== null && (!worst || ageSec > worst.ageSeconds)) {
      worst = { key: feed.key, ageSeconds: ageSec, generatedAt: genAt };
    }
    // Seed-rot watch: a hand-maintained posture feed past half its window.
    if (!honestDark && feed.staleAfterH >= SEED_WINDOW_H && ageSec !== null && ageSec > feed.staleAfterH * 3600 * 0.5) {
      seedRisk.push({
        key: feed.key,
        ageHours: Math.round(ageSec / 3600),
        staleAfterH: feed.staleAfterH,
        pctOfWindow: Math.round((ageSec / (feed.staleAfterH * 3600)) * 100),
      });
    }
    proofs[feed.key] = {
      present: true,
      source: `/api/${feed.key}.json`,
      generatedAt: genAt,
      freshnessSeconds: ageSec,
      staleAfterH: feed.staleAfterH,
      honestDark,
      stale,
      data,
    };
  }

  const trustScore = present ? Math.round((fresh / present) * 100) : 0;
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-status-proof.mjs',
    generatedAt: new Date(now).toISOString(),
    publicSafe: true,
    note: 'Unified, self-grading proof manifest. Each proof carries its own source generatedAt + staleness. One fetch verifies the studio\'s live posture.',
    summary: {
      feeds: FEEDS.length,
      present,
      fresh,
      stale: present - fresh,
      trustScore,
      worstStale: worst,
      seedRisk,
    },
    proofs,
  };
}

// Structural fingerprint for --check (ignores volatile timestamps/payloads).
function structure(m) {
  return JSON.stringify({
    schemaVersion: m.schemaVersion,
    feeds: FEEDS.map((f) => ({ key: f.key, staleAfterH: f.staleAfterH })),
    proofKeys: Object.keys(m.proofs || {}).sort(),
  });
}

// Source-content fingerprint: unlike the historical structural gate, this
// detects a feed that changed after status-proof was rendered while ignoring
// inherently volatile age/timestamp calculations.
function sourceContent(m) {
  const stableData = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value ?? null;
    const copy = JSON.parse(JSON.stringify(value));
    // Feed generation time is already represented by proof.generatedAt and
    // freshnessSeconds. A deterministic rebuild with identical semantics must
    // not invalidate the embedded-content fingerprint merely because its clock
    // advanced (the live ai-discovery-health race caught this in S307).
    delete copy.generatedAt;
    delete copy.generated_at;
    return copy;
  };
  return JSON.stringify(Object.fromEntries(Object.entries(m?.proofs || {}).map(([key, proof]) => [key, {
    present: proof.present === true,
    source: proof.source,
    data: stableData(proof.data),
  }])));
}

function warnSeedRot(seedRisk) {
  if (!seedRisk || !seedRisk.length) return;
  for (const r of seedRisk) {
    console.warn(`⚠ status-proof seed-rot watch: ${r.key} is ${r.pctOfWindow}% through its ${r.staleAfterH}h window (${r.ageHours}h old) — refresh its generator before it drags trustScore.`);
  }
}

function selfTest() {
  const now = Date.parse('2026-07-26T12:00:00.000Z');
  const fixtures = new Map([
    ['uptime', { generatedAt: '2026-07-26T11:00:00.000Z' }],
    ['worker-route-provenance', { generatedAt: '2026-07-25T12:00:00.000Z' }],
    ['funnel-summary', { generatedAt: '2025-01-01T00:00:00.000Z', honestDark: true }],
  ]);
  const manifest = buildManifest(now, (key) => fixtures.get(key) ?? null);
  const cases = [
    ['counts present fixtures', manifest.summary.present === 3],
    ['fresh + honest-dark count as fresh', manifest.summary.fresh === 2],
    ['stale count excludes missing feeds', manifest.summary.stale === 1],
    ['trust score derives from present evidence only', manifest.summary.trustScore === 67],
    ['fresh source is graded current', manifest.proofs.uptime.stale === false && manifest.proofs.uptime.freshnessSeconds === 3600],
    ['old live source is graded stale', manifest.proofs['worker-route-provenance'].stale === true],
    ['honest-dark source never becomes worst-stale', manifest.proofs['funnel-summary'].honestDark === true && manifest.summary.worstStale?.key === 'worker-route-provenance'],
    ['missing source is explicit', manifest.proofs['deploy-currency'].present === false],
    ['fixed clock makes output deterministic', manifest.generatedAt === '2026-07-26T12:00:00.000Z'],
    ['timestamp-only feed regeneration does not become source-content drift', (() => {
      const newer = JSON.parse(JSON.stringify(manifest));
      newer.proofs.uptime.data.generatedAt = '2026-07-26T11:05:00.000Z';
      return sourceContent(manifest) === sourceContent(newer);
    })()],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`build-status-proof --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`build-status-proof --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const check = process.argv.includes('--check');
  const fresh = buildManifest();
  warnSeedRot(fresh.summary.seedRisk);
  if (check) {
    const existing = readJson(OUT);
    if (!existing) { console.error('status-proof: manifest missing — run without --check'); process.exit(1); }
    if (structure(existing) !== structure(fresh)) {
      console.error('status-proof: STRUCTURAL DRIFT — feed set / keys changed. Re-render: node scripts/build-status-proof.mjs');
      process.exit(1);
    }
    if (process.argv.includes('--check-content') && sourceContent(existing) !== sourceContent(fresh)) {
      console.error('status-proof: SOURCE CONTENT DRIFT — an embedded feed changed after the manifest; rebuild status-proof');
      process.exit(1);
    }
    console.log(`status-proof ✓ structure stable (${fresh.summary.present}/${fresh.summary.feeds} feeds, trust ${fresh.summary.trustScore}%)`);
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(fresh, null, 2) + '\n');
  const s = fresh.summary;
  console.log(`✓ api/status-proof.json — ${s.present}/${s.feeds} feeds · ${s.fresh} fresh · trust ${s.trustScore}%${s.worstStale ? ` · oldest: ${s.worstStale.key} (${Math.round(s.worstStale.ageSeconds / 3600)}h)` : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-status-proof.mjs')) {
  main();
}
