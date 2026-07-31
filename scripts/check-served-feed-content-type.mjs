#!/usr/bin/env node
/**
 * Does every public JSON feed actually SERVE JSON — or does it serve a page?
 *
 * S300 context. Sweeping all 71 git-tracked `api/*.json` against production
 * found 62 serving JSON and 9 serving `text/html`: the Call of Doodie SPA shell.
 * Those 9 do not exist in the deployed 2026-07-26 tree, so Cloudflare Pages
 * falls through to a catch-all and answers an API request with a game page.
 *
 *   api/candidate-artifact-manifest.json   api/deploy-currency.json
 *   api/evidence-graph.json                api/identity-migration-receipt.json
 *   api/staging-deploy-continuity.json     api/staging-deploy-receipt.json
 *   api/supabase-control-plane.json        api/worker-route-history.json
 *   api/worker-route-provenance.json
 *
 * Latent rather than active at the time of writing — the DEPLOYED /status/ does
 * not read them; only HEAD's does. That is luck, not design, and it is the exact
 * shape this codebase keeps rediscovering: a generator self-test proves the FEED
 * is well-formed, nothing proves the READER receives it, and `JSON.parse` on an
 * HTML body throws into a plausible-looking fallback rather than a visible
 * failure. A 200 with the wrong content-type is worse than a 404: a 404 is
 * unambiguous, while a 200 full of HTML looks like a working endpoint.
 *
 * WHY CONTENT-TYPE AND NOT JUST STATUS: every one of the 9 returns HTTP 200. A
 * status-code check passes them all. The content-type IS the finding.
 *
 * VANTAGE HONESTY: a network failure or bot-challenge is NOT a finding — it is
 * an absence of evidence, reported as `unverified` and exit 0. Only a reachable
 * endpoint serving the wrong type fails. A gate that goes red when the network
 * is unavailable gets muted, and a muted gate is no gate.
 *
 * Usage:
 *   node scripts/check-served-feed-content-type.mjs --origin https://…
 *   node scripts/check-served-feed-content-type.mjs --json
 *   node scripts/check-served-feed-content-type.mjs --self-test
 */
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ORIGIN = process.env.PROD_ORIGIN || 'https://vaultsparkstudios.com';
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;

/** Statuses that mean "the vantage was refused", not "the feed is broken". */
export const CHALLENGE_STATUSES = Object.freeze([401, 403, 429]);

export function classifyResponse({ status, contentType, parsed, networkError }) {
  if (networkError) return { verdict: 'unverified', reason: `network: ${String(networkError).slice(0, 60)}` };
  if (CHALLENGE_STATUSES.includes(status)) return { verdict: 'unverified', reason: `vantage challenged (HTTP ${status})` };
  if (status === 404) return { verdict: 'missing', reason: 'HTTP 404 — not deployed (honest)' };
  if (status >= 500) return { verdict: 'unverified', reason: `origin error (HTTP ${status})` };
  if (status !== 200) return { verdict: 'fail', reason: `unexpected HTTP ${status}` };

  const type = String(contentType || '').toLowerCase();
  if (type.includes('html')) return { verdict: 'fail', reason: 'served text/html — SPA/404 fallback answering an API path' };
  if (!type.includes('json')) return { verdict: 'fail', reason: `served non-JSON content-type (${type || 'none'})` };
  // Content-type is necessary but not sufficient — a feed can be labelled JSON
  // and still be truncated or malformed. The reader would throw on both.
  if (parsed === false) return { verdict: 'fail', reason: 'content-type is JSON but the body does not parse' };
  return { verdict: 'ok', reason: 'application/json, parses' };
}

export function summarize(results) {
  const failed = results.filter((r) => r.verdict === 'fail');
  const missing = results.filter((r) => r.verdict === 'missing');
  const unverified = results.filter((r) => r.verdict === 'unverified');
  const ok = results.filter((r) => r.verdict === 'ok');
  return {
    pass: failed.length === 0,
    total: results.length,
    ok: ok.length,
    failed: failed.map((f) => ({ path: f.path, reason: f.reason })),
    missing: missing.map((m) => m.path),
    unverified: unverified.length,
    detail: failed.length
      ? `${failed.length}/${results.length} feed(s) serve the wrong type: ${failed.slice(0, 5).map((f) => f.path).join(', ')}${failed.length > 5 ? ` +${failed.length - 5}` : ''}`
      : `${ok.length}/${results.length} feed(s) serve JSON`
        + (missing.length ? ` · ${missing.length} not deployed (404)` : '')
        + (unverified.length ? ` · ${unverified.length} unverified` : ''),
  };
}

/** Git-tracked enumeration only — never a filesystem walk (local/CI divergence). */
function trackedFeeds() {
  const out = execFileSync('git', ['ls-files', 'api/*.json'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function probeOne(origin, rel) {
  try {
    const response = await fetch(new URL('/' + rel, origin), {
      headers: { accept: 'application/json', 'user-agent': 'VaultSparkFeedContract/1.0 (+https://vaultsparkstudios.com/agents.json)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type');
    let parsed = null;
    if (response.status === 200 && String(contentType || '').includes('json')) {
      try { JSON.parse(await response.text()); parsed = true; } catch { parsed = false; }
    }
    return { path: rel, ...classifyResponse({ status: response.status, contentType, parsed }) };
  } catch (error) {
    return { path: rel, ...classifyResponse({ networkError: error?.message || error }) };
  }
}

async function probeAll(origin, feeds) {
  const results = [];
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    results.push(...await Promise.all(feeds.slice(i, i + CONCURRENCY).map((f) => probeOne(origin, f))));
  }
  return results;
}

function selfTest() {
  const cases = [
    // THE LIVE CLASS: 200 + HTML. A status-code check passes every one of these.
    ['THE LIVE CASE: 200 text/html FAILS', classifyResponse({ status: 200, contentType: 'text/html; charset=utf-8' }).verdict === 'fail'],
    ['the html failure names the fallback', classifyResponse({ status: 200, contentType: 'text/html' }).reason.includes('fallback')],
    ['200 + json + parses is ok', classifyResponse({ status: 200, contentType: 'application/json', parsed: true }).verdict === 'ok'],
    ['json content-type with an unparseable body FAILS', classifyResponse({ status: 200, contentType: 'application/json', parsed: false }).verdict === 'fail'],
    ['a charset suffix does not break json detection', classifyResponse({ status: 200, contentType: 'application/json; charset=utf-8', parsed: true }).verdict === 'ok'],
    ['text/plain FAILS', classifyResponse({ status: 200, contentType: 'text/plain' }).verdict === 'fail'],
    ['a missing content-type FAILS', classifyResponse({ status: 200, contentType: null }).verdict === 'fail'],

    // Absence of evidence is not evidence of failure.
    ['a 403 is UNVERIFIED, not a failure', classifyResponse({ status: 403 }).verdict === 'unverified'],
    ['a 429 is UNVERIFIED', classifyResponse({ status: 429 }).verdict === 'unverified'],
    ['a 503 is UNVERIFIED', classifyResponse({ status: 503 }).verdict === 'unverified'],
    ['a network error is UNVERIFIED', classifyResponse({ networkError: 'ETIMEDOUT' }).verdict === 'unverified'],
    ['a 404 is honest-missing, not a wrong-type failure', classifyResponse({ status: 404 }).verdict === 'missing'],
    ['an unexpected 301 FAILS', classifyResponse({ status: 301 }).verdict === 'fail'],

    // Aggregate.
    ['all-ok passes', summarize([{ verdict: 'ok', path: 'a' }, { verdict: 'ok', path: 'b' }]).pass === true],
    ['ONE html feed fails the gate', summarize([{ verdict: 'ok', path: 'a' }, { verdict: 'fail', path: 'b', reason: 'html' }]).pass === false],
    ['unverified alone does NOT fail the gate', summarize([{ verdict: 'unverified', path: 'a', reason: 'x' }]).pass === true],
    ['404s alone do NOT fail the gate', summarize([{ verdict: 'missing', path: 'a' }]).pass === true],
    ['the failing feed is named', summarize([{ verdict: 'fail', path: 'api/x.json', reason: 'html' }]).detail.includes('api/x.json')],
    ['unverified count is surfaced, never hidden', summarize([{ verdict: 'ok', path: 'a' }, { verdict: 'unverified', path: 'b', reason: 'x' }]).detail.includes('1 unverified')],
    ['an empty sweep passes vacuously', summarize([]).pass === true],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-served-feed-content-type --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-served-feed-content-type --self-test: ${cases.length}/${cases.length} passed`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const json = process.argv.includes('--json');
  const originArg = process.argv.find((a) => a.startsWith('--origin='));
  const origin = originArg ? originArg.split('=')[1] : DEFAULT_ORIGIN;

  const feeds = trackedFeeds();
  const results = await probeAll(origin, feeds);
  const summary = { origin, ...summarize(results) };

  if (json) { console.log(JSON.stringify(summary)); return; }
  console.log(`served-feed-content-type: ${summary.pass ? 'ok' : 'FAIL'} · ${summary.detail}`);
  for (const f of summary.failed.slice(0, 12)) console.log(`  ✗ ${f.path} — ${f.reason}`);
  if (summary.missing.length) console.log(`  (404, not deployed: ${summary.missing.slice(0, 12).join(', ')}${summary.missing.length > 12 ? ` +${summary.missing.length - 12}` : ''})`);
  if (!summary.pass) process.exit(1);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) await main();
