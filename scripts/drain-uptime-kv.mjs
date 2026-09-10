#!/usr/bin/env node
/**
 * drain-uptime-kv.mjs (S349)
 *
 * Folds edge-vantage uptime samples written by the Worker's scheduled() handler
 * into the EXISTING public uptime contract — it does not invent a second one.
 *
 * Why an edge vantage exists at all. GitHub Actions cannot observe our edge:
 * Cloudflare bot-challenges every datacenter client, so the apex liveness leg
 * returns 403 from CI and 200 from a real browser. probe-uptime.mjs now reports
 * that honestly as `edge-unobservable` instead of publishing a false outage — but
 * that leaves the edge genuinely unmeasured. A Cloudflare cron runs inside
 * Cloudflare and is never challenged, so it can see what CI structurally cannot.
 *
 * What this does NOT do, on purpose:
 *   - It never rewrites or re-scores existing history rows. Pre-S349 samples stay
 *     exactly as recorded and are reported as `unresolvedLegacyChecks`.
 *   - It never invents a sample for a window the sampler did not actually write.
 *     A gap in KV is a gap in the record, not an opportunity to interpolate.
 *   - It never marks a row `up` on the strength of the drain having run. The row
 *     carries what the edge measured; absence of evidence stays absence.
 *
 * Usage:
 *   node scripts/drain-uptime-kv.mjs --dry-run    # read + print, write nothing
 *   node scripts/drain-uptime-kv.mjs              # append new rows to history
 *   node scripts/drain-uptime-kv.mjs --self-test  # pure-logic checks
 *
 * Credentials resolve through the secrets gateway (CANON-012) — never process.env
 * directly, never a value printed to stdout.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'uptime-history.ndjson');
const HISTORY_CAP = 1488;
const DRY = process.argv.includes('--dry-run');

/**
 * Convert one Worker KV sample into a history row in the established shape.
 * `livenessObservable` is true because the sample was produced BY the edge: the
 * handler running is itself the observation. That is the entire point of the
 * cron vantage and the one thing CI can never assert about itself.
 */
export function sampleToRow(sample) {
  if (!sample || typeof sample.at !== 'string') return null;
  const routes = sample.routes || [];
  const down = Number.isFinite(sample.down) ? sample.down : routes.filter((r) => !r.ok).length;
  const contentOk = typeof sample.contentOk === 'boolean' ? sample.contentOk : down === 0;
  const allDown = routes.length > 0 && down >= routes.length;
  return {
    t: sample.at,
    overall: contentOk ? 'up' : allDown ? 'down' : 'degraded',
    down,
    contentOk,
    livenessOk: true,
    livenessObservable: true,
    vantage: 'cloudflare-scheduled',
    cv: 349,
  };
}

/**
 * Merge drained rows into existing history: append only, de-duplicated by
 * timestamp, chronologically ordered, capped. An existing row always wins — a
 * re-drain of the same window must be a no-op, never a rewrite.
 */
export function mergeRows(existing, drained) {
  const seen = new Set(existing.map((r) => r.t));
  const additions = drained.filter((r) => r && !seen.has(r.t));
  const merged = [...existing, ...additions]
    .sort((a, b) => String(a.t).localeCompare(String(b.t)))
    .slice(-HISTORY_CAP);
  return { merged, added: additions.length };
}

function readHistory() {
  try {
    return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

if (process.argv.includes('--self-test')) {
  const t = [
    ['healthy sample yields an up row', sampleToRow({ at: 'T1', contentOk: true, down: 0, routes: [{ ok: true }] })?.overall === 'up'],
    ['partial failure yields degraded', sampleToRow({ at: 'T1', contentOk: false, down: 1, routes: [{ ok: false }, { ok: true }] })?.overall === 'degraded'],
    ['every route failing yields down', sampleToRow({ at: 'T1', contentOk: false, down: 2, routes: [{ ok: false }, { ok: false }] })?.overall === 'down'],
    ['edge samples are observable by construction', sampleToRow({ at: 'T1', contentOk: true, down: 0, routes: [] })?.livenessObservable === true],
    ['rows carry the classifier version', sampleToRow({ at: 'T1', contentOk: true, down: 0, routes: [] })?.cv === 349],
    ['rows name their vantage', sampleToRow({ at: 'T1', contentOk: true, down: 0, routes: [] })?.vantage === 'cloudflare-scheduled'],
    ['a malformed sample is dropped, never guessed', sampleToRow({ nope: 1 }) === null],
    ['merge de-duplicates by timestamp', (() => {
      const { merged, added } = mergeRows([{ t: 'B' }], [{ t: 'B' }, { t: 'C' }]);
      return added === 1 && merged.length === 2;
    })()],
    ['merge never rewrites an existing row', (() => {
      const { merged } = mergeRows([{ t: 'B', overall: 'down' }], [{ t: 'B', overall: 'up' }]);
      return merged.find((r) => r.t === 'B').overall === 'down';
    })()],
    ['merge restores chronological order', (() => {
      const { merged } = mergeRows([{ t: 'C' }], [{ t: 'A' }]);
      return merged[0].t === 'A' && merged[1].t === 'C';
    })()],
    ['merge respects the history cap', mergeRows(
      Array.from({ length: HISTORY_CAP }, (_, i) => ({ t: 't' + String(i).padStart(5, '0') })),
      [{ t: 'zzz' }],
    ).merged.length === HISTORY_CAP],
    ['an empty drain changes nothing', mergeRows([{ t: 'A' }], []).added === 0],
  ];
  const failed = t.filter(([, ok]) => !ok);
  failed.forEach(([n]) => console.error('  x ' + n));
  console.log('drain-uptime-kv self-test: ' + (t.length - failed.length) + '/' + t.length + ' passing');
  process.exit(failed.length ? 1 : 0);
}

// --- live drain -------------------------------------------------------------
const { getSecret } = await import('./lib/secrets.mjs');
let accountId, apiToken;
const namespaceId = process.env.UPTIME_SAMPLES_NAMESPACE_ID || null;
try {
  accountId = getSecret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.kv');
  apiToken = getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.kv');
} catch (e) {
  console.log('drain-uptime-kv: credentials unavailable via the gateway (' + e.message + ').');
  console.log('This is not an outage and not a founder blocker — the sampler is not enabled yet.');
  process.exit(0);
}
if (!namespaceId) {
  console.log('drain-uptime-kv: UPTIME_SAMPLES_NAMESPACE_ID is not set — the sampler has not been enabled yet (see cloudflare/wrangler.toml). Nothing to drain.');
  process.exit(0);
}

const base = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/storage/kv/namespaces/' + namespaceId;
const auth = { authorization: 'Bearer ' + apiToken };
const listed = await fetch(base + '/keys?prefix=uptime:', { headers: auth }).then((r) => r.json());
if (!listed?.success) {
  console.error('drain-uptime-kv: KV list failed — leaving history untouched rather than writing a partial window.');
  process.exit(1);
}
const samples = [];
for (const k of listed.result || []) {
  const raw = await fetch(base + '/values/' + encodeURIComponent(k.name), { headers: auth }).then((r) => r.text());
  try { samples.push(JSON.parse(raw)); } catch { /* a corrupt sample is skipped, never guessed */ }
}
const rows = samples.map(sampleToRow).filter(Boolean);
const { merged, added } = mergeRows(readHistory(), rows);
if (DRY) {
  console.log('drain-uptime-kv (dry-run): ' + samples.length + ' sample(s) read · ' + added + ' new row(s) would be appended · history would hold ' + merged.length);
  process.exit(0);
}
fs.writeFileSync(HISTORY, merged.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log('drain-uptime-kv: ' + added + ' new row(s) appended · history holds ' + merged.length);
