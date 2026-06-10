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
 * Usage: node scripts/build-status-proof.mjs [--check]
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
const FEEDS = [
  { key: 'uptime', staleAfterH: 2 },
  { key: 'field-win', staleAfterH: 48 },
  { key: 'ai-discovery-health', staleAfterH: 48 },
  { key: 'ci-status', staleAfterH: 96 },
  { key: 'site-health', staleAfterH: 48 },
  { key: 'staging-health', staleAfterH: 168 },
  { key: 'geo-vitals', staleAfterH: 48 },
  { key: 'field-verdicts', staleAfterH: 72 },
  { key: 'public-status', staleAfterH: 720 },
  { key: 'security-posture', staleAfterH: 720 },
];

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

export function buildManifest(nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.parse(new Date().toISOString());
  const proofs = {};
  let present = 0, fresh = 0;
  let worst = null;

  for (const feed of FEEDS) {
    const data = readJson(path.join(API, `${feed.key}.json`));
    if (data === null) {
      proofs[feed.key] = { present: false, source: `/api/${feed.key}.json`, staleAfterH: feed.staleAfterH };
      continue;
    }
    present++;
    const genAt = extractGeneratedAt(data);
    const ageSec = genAt ? Math.max(0, Math.round((now - Date.parse(genAt)) / 1000)) : null;
    const stale = ageSec === null ? true : ageSec > feed.staleAfterH * 3600;
    if (!stale) fresh++;
    if (ageSec !== null && (!worst || ageSec > worst.ageSeconds)) {
      worst = { key: feed.key, ageSeconds: ageSec, generatedAt: genAt };
    }
    proofs[feed.key] = {
      present: true,
      source: `/api/${feed.key}.json`,
      generatedAt: genAt,
      freshnessSeconds: ageSec,
      staleAfterH: feed.staleAfterH,
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

function main() {
  const check = process.argv.includes('--check');
  const fresh = buildManifest();
  if (check) {
    const existing = readJson(OUT);
    if (!existing) { console.error('status-proof: manifest missing — run without --check'); process.exit(1); }
    if (structure(existing) !== structure(fresh)) {
      console.error('status-proof: STRUCTURAL DRIFT — feed set / keys changed. Re-render: node scripts/build-status-proof.mjs');
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
