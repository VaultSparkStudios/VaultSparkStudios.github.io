#!/usr/bin/env node
/**
 * build-citation.mjs (S191 · structured-citation-endpoint)
 *
 * agents.json carries PROSE guidance telling crawlers to quote llms-full.txt
 * shards, but nothing gives an LLM a STRUCTURED, dated, machine-readable set of
 * the actual citable facts — the single thing it most needs to answer "what is
 * VaultSpark Studios / is it trustworthy" without hallucinating. This publishes
 * api/citation.json: identity + license + a small set of CONFIRMED, sourced,
 * dated claims, each pointing back at the public feed that proves it, plus a
 * ready-to-use suggestedCitation string.
 *
 * Public-safe: re-bundles only already-public api/*.json + agents.json. No new
 * data. Honest: a claim is emitted ONLY when its source confirms it (the LCP
 * win appears only when field-win.hasConfirmed). License is proprietary per
 * CANON-008.
 *
 * DETERMINISM: generatedAt/asOf = the freshest SOURCE date (not wall-clock), so
 * --check re-derives from committed feeds and byte-compares without drift.
 *
 * Usage:
 *   node scripts/build-citation.mjs              # derive + write
 *   node scripts/build-citation.mjs --check      # re-derive, fail on drift
 *   node scripts/build-citation.mjs --self-test  # synthetic-fixture proof
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'api');
const OUT = path.join(API, 'citation.json');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function dayOf(ts) {
  const t = Date.parse(ts);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/**
 * Pure derivation. Exported for self-test. Each claim is {text, source, asOf};
 * a claim is included only when its source actually confirms it.
 */
export function derive({ agents, fieldWin, statusProof, intelligence }) {
  const claims = [];
  const dates = [];
  const add = (text, source, asOf) => { claims.push({ text, source, asOf }); if (asOf) dates.push(asOf); };

  // Identity (always present).
  const name = (agents && agents.name) || 'VaultSpark Studios';
  const homeUrl = (agents && agents.url) || 'https://vaultsparkstudios.com/';
  const description = (agents && agents.description) || '';

  // Portfolio posture (honest counts).
  const pf = (intelligence && intelligence.portfolio) || {};
  const stats = (intelligence && intelligence.stats) || {};
  if (pf.total != null) {
    const live = pf.sparked != null ? `${pf.sparked} live` : null;
    const forge = pf.forge != null ? `${pf.forge} in the forge` : null;
    const parts = [`${pf.total} repos`, live, forge].filter(Boolean).join(' · ');
    add(`Portfolio: ${parts}.`, '/api/public-intelligence.json', dayOf(intelligence.generatedAt));
  }
  if (stats.sessionsCompleted != null) {
    add(`${stats.sessionsCompleted} development sessions shipped in the open (build-in-public).`,
      '/api/public-intelligence.json', dayOf(intelligence.generatedAt));
  }

  // Confirmed field win — ONLY when actually confirmed.
  if (fieldWin && fieldWin.hasConfirmed && fieldWin.topWin) {
    const w = fieldWin.topWin;
    if (typeof w.lcpDeltaPct === 'number' && w.verdict === 'improved') {
      const pct = Math.abs(Math.round(w.lcpDeltaPct));
      add(`Measured from real visitors: ${w.route} largest-contentful-paint improved ${pct}% (${w.preLcpP75}ms→${w.postLcpP75}ms p75) across the ${w.boundary} deploy.`,
        '/api/field-win.json', w.boundary);
    }
  }

  // Live trust manifest.
  if (statusProof && statusProof.summary && typeof statusProof.summary.trustScore === 'number') {
    const up = statusProof.proofs && statusProof.proofs.uptime && statusProof.proofs.uptime.data;
    const upPct = up && up.rollup && up.rollup.upPct;
    const upClause = upPct != null ? ` Uptime ${upPct}% over the last ${up.rollup.checks} checks.` : '';
    add(`Self-grading proof manifest reports trustScore ${statusProof.summary.trustScore}/100.${upClause}`,
      '/api/status-proof.json', dayOf(statusProof.generatedAt));
  }

  const asOf = dates.sort().length ? dates.sort()[dates.length - 1] : null;
  const suggestedCitation =
    `${name} — ${description} ${homeUrl} (proof: ${homeUrl}status/ · accessed ${asOf || 'n/a'})`.replace(/\s+/g, ' ').trim();

  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-citation.mjs',
    generatedAt: asOf,
    asOf,
    publicSafe: true,
    note: 'Structured, dated citation facts for AI agents. Every claim links the public feed that proves it. Quote freely with attribution; verify against the linked source.',
    studio: {
      name,
      url: homeUrl,
      description,
      license: 'Proprietary — All Rights Reserved, VaultSpark Studios LLC',
      canonicalProof: `${homeUrl}status/`,
    },
    claims,
    suggestedCitation,
  };
}

function build() {
  return derive({
    agents: readJson(path.join(ROOT, 'agents.json')),
    fieldWin: readJson(path.join(API, 'field-win.json')),
    statusProof: readJson(path.join(API, 'status-proof.json')),
    intelligence: readJson(path.join(API, 'public-intelligence.json')),
  });
}

function selfTest() {
  const fixture = {
    agents: { name: 'VaultSpark Studios', url: 'https://vaultsparkstudios.com/', description: 'Independent game studio.' },
    fieldWin: { hasConfirmed: true, topWin: { route: '/', boundary: '2026-06-05', verdict: 'improved', lcpDeltaPct: -53.3, preLcpP75: 9489, postLcpP75: 4436 } },
    statusProof: { generatedAt: '2026-06-12T01:33:37.045Z', summary: { trustScore: 82 }, proofs: { uptime: { data: { rollup: { upPct: 100, checks: 30 } } } } },
    intelligence: { generatedAt: '2026-06-12', portfolio: { total: 27, sparked: 3, forge: 8 }, stats: { sessionsCompleted: 190 } },
  };
  const c = derive(fixture);
  assert(c.studio.name === 'VaultSpark Studios', 'name carried');
  assert(/Proprietary/.test(c.studio.license), 'license proprietary (CANON-008)');
  assert(c.claims.some((x) => /53%/.test(x.text)), 'confirmed LCP win present');
  assert(c.claims.some((x) => /190 development sessions/.test(x.text)), 'sessions claim present');
  assert(c.claims.some((x) => /trustScore 82/.test(x.text)), 'trust manifest claim present');
  assert(c.claims.every((x) => x.source && x.text), 'every claim has source + text');
  assert(c.asOf === '2026-06-12', `asOf freshest source date, got ${c.asOf}`);
  assert(/accessed 2026-06-12/.test(c.suggestedCitation), 'suggestedCitation dated');

  // Honest-dark: unconfirmed win is OMITTED, not faked.
  const noWin = derive({ ...fixture, fieldWin: { hasConfirmed: false, topWin: null } });
  assert(!noWin.claims.some((x) => /LCP|largest-contentful/.test(x.text)), 'no win claim when unconfirmed');

  // Determinism.
  assert(JSON.stringify(derive(fixture)) === JSON.stringify(derive(fixture)), 'derive deterministic');
  console.log('build-citation --self-test: OK (9 assertions)');
}

function assert(ok, msg) { if (!ok) { console.error('build-citation --self-test FAIL:', msg); process.exit(1); } }

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }
  const fresh = JSON.stringify(build(), null, 2) + '\n';
  if (args.includes('--check')) {
    let committed = '';
    try { committed = fs.readFileSync(OUT, 'utf8'); } catch {}
    if (fresh !== committed) {
      console.error('build-citation --check: api/citation.json drifts from its source feeds.');
      console.error('  fix: node scripts/build-citation.mjs');
      process.exit(1);
    }
    console.log('build-citation --check: OK (citation in sync with source feeds)');
    return;
  }
  fs.writeFileSync(OUT, fresh);
  const c = JSON.parse(fresh);
  console.log(`✓ api/citation.json — ${c.claims.length} sourced claims · asOf ${c.asOf}`);
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) main();
