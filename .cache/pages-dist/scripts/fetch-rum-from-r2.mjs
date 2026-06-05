#!/usr/bin/env node
/**
 * fetch-rum-from-r2.mjs (S172 audit #1 · rum-r2-field-unlock)
 *
 * The missing R2→local hop in the RUM pipeline. The Worker `/v/rum` ingest
 * (S154) writes raw visit rows to the `vaultspark-rum` R2 bucket at
 * `rum/raw/dt=<YYYY-MM-DD>/<uuid>.json` (security-headers-worker.js). Every
 * downstream consumer — rollup-rum.mjs → pull-rum-summary.mjs →
 * check-perf-budget --source=rum — only ever read LOCAL files, so the field
 * loop sat dormant at 0 samples while the `cloudflare.r2` credential was
 * READY the whole time (CANON-019 phantom blocker, resolved this session).
 *
 * This script lists + downloads recent raw rows into `.cache/rum-raw/` using
 * the S3-compatible R2 API with vanilla AWS SigV4 signing (node:crypto only —
 * no new dependencies, per the repo's no-build-step constraint).
 *
 * Credentials resolve through the secrets gateway (CANON-012):
 *   R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_ACCOUNT_ID  (cloudflare.r2)
 * The bucket defaults to `vaultspark-rum` (wrangler.toml RUM_BUCKET binding),
 * NOT the capability's backup bucket.
 *
 * Usage:
 *   node scripts/fetch-rum-from-r2.mjs                 # pull last 30 days
 *   node scripts/fetch-rum-from-r2.mjs --days=7        # narrower window
 *   node scripts/fetch-rum-from-r2.mjs --dry-run       # list + count only
 *   node scripts/fetch-rum-from-r2.mjs --max=500       # cap downloads
 *   node scripts/fetch-rum-from-r2.mjs --self-test     # signing unit checks
 *
 * After a pull: `npm run rum:rollup && npm run rum:summary`
 * (or just `npm run rum:pull` which chains all three).
 *
 * Never prints secret material; errors are redacted before logging.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, '.cache', 'rum-raw');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SELF_TEST = args.includes('--self-test');

function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const DAYS = Math.max(1, Number(flag('--days', 30)) || 30);
const MAX = Math.max(1, Number(flag('--max', 2000)) || 2000);
const BUCKET = flag('--bucket', 'vaultspark-rum');

// ---------------------------------------------------------------------------
// AWS SigV4 (region "auto", service "s3") — minimal, query-string-free paths
// ---------------------------------------------------------------------------

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const sha256hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

// RFC 3986 strict encoding for query values (S3 canonical form)
function rfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function signRequest({ method, host, pathName, query, accessKey, secretKey, now = new Date() }) {
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const payloadHash = sha256hex(''); // GET requests, empty body

  const canonicalQuery = Object.entries(query || {})
    .map(([k, v]) => [rfc3986(k), rfc3986(String(v))])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, pathName, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return {
    url: `https://${host}${pathName}${canonicalQuery ? `?${canonicalQuery}` : ''}`,
    headers: {
      Host: host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Self-test — deterministic signing structure (no network, no real keys)
// ---------------------------------------------------------------------------

if (SELF_TEST) {
  const fixed = new Date('2026-06-03T12:00:00.000Z');
  const a = signRequest({
    method: 'GET', host: 'acct.r2.cloudflarestorage.com', pathName: '/bucket',
    query: { 'list-type': '2', prefix: 'rum/raw/dt=' },
    accessKey: 'AKTEST', secretKey: 'SECRETTEST', now: fixed,
  });
  const b = signRequest({
    method: 'GET', host: 'acct.r2.cloudflarestorage.com', pathName: '/bucket',
    query: { prefix: 'rum/raw/dt=', 'list-type': '2' }, // same params, different order
    accessKey: 'AKTEST', secretKey: 'SECRETTEST', now: fixed,
  });
  assert(/Signature=[0-9a-f]{64}$/.test(a.headers.Authorization), 'signature must be 64 hex chars');
  assert(a.headers.Authorization === b.headers.Authorization, 'canonical query must sort params (order-independent)');
  assert(a.url.includes('list-type=2') && a.url.includes('prefix=rum%2Fraw%2Fdt%3D'), 'query must be RFC3986-encoded');
  assert(a.headers['x-amz-date'] === '20260603T120000Z', 'amz-date format');
  const traversal = sanitizeKeyToRelPath('rum/raw/dt=2026-06-03/../../../etc/passwd');
  assert(traversal === null, 'path traversal keys must be rejected');
  const ok = sanitizeKeyToRelPath('rum/raw/dt=2026-06-03/abc-123.json');
  assert(ok === path.join('dt=2026-06-03', 'abc-123.json'), 'normal keys map to dt-scoped relpath');
  console.log('fetch-rum-from-r2 --self-test: OK (4 signing + 2 path checks)');
  process.exit(0);
}

function assert(ok, msg) {
  if (!ok) { console.error(`self-test FAIL: ${msg}`); process.exit(1); }
}

// Map an R2 key to a safe relative path under DEST; null = reject.
function sanitizeKeyToRelPath(key) {
  if (!key || !key.startsWith('rum/raw/')) return null;
  const rel = key.slice('rum/raw/'.length);
  if (rel.includes('..') || path.isAbsolute(rel)) return null;
  const resolved = path.resolve(DEST, rel);
  if (!resolved.startsWith(path.resolve(DEST) + path.sep)) return null;
  return rel.split('/').join(path.sep);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { getSecret, redact } = await import('./lib/secrets.mjs');

let accessKey, secretKey, accountId;
try {
  accessKey = getSecret('R2_ACCESS_KEY_ID', 'cloudflare.r2');
  secretKey = getSecret('R2_SECRET_ACCESS_KEY', 'cloudflare.r2');
  accountId = getSecret('R2_ACCOUNT_ID', 'cloudflare.r2');
} catch (err) {
  console.error(`fetch-rum-from-r2: credential resolution failed — ${redact(String(err?.message || err))}`);
  console.error('  Run: node scripts/check-secrets.mjs --for cloudflare.r2');
  process.exit(1);
}

const HOST = `${accountId}.r2.cloudflarestorage.com`;
const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);

async function s3Fetch(pathName, query) {
  const signed = signRequest({ method: 'GET', host: HOST, pathName, query, accessKey, secretKey });
  const res = await fetch(signed.url, { headers: signed.headers });
  const text = await res.text();
  if (!res.ok) {
    const code = (text.match(/<Code>([^<]+)<\/Code>/) || [])[1] || `HTTP ${res.status}`;
    const msg = (text.match(/<Message>([^<]+)<\/Message>/) || [])[1] || '';
    throw new Error(`${code}${msg ? `: ${msg}` : ''} (${pathName})`);
  }
  return text;
}

async function listKeys() {
  const keys = [];
  let token = null;
  do {
    const query = { 'list-type': '2', prefix: 'rum/raw/', 'max-keys': '1000' };
    if (token) query['continuation-token'] = token;
    const xml = await s3Fetch(`/${BUCKET}`, query);
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1]);
    token = (xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/) || [])[1] || null;
  } while (token && keys.length < 50000);
  return keys;
}

try {
  const allKeys = await listKeys();
  const recent = allKeys.filter((k) => {
    const day = (k.match(/dt=(\d{4}-\d{2}-\d{2})/) || [])[1];
    return day && day >= cutoff;
  });
  console.log(`fetch-rum-from-r2: bucket=${BUCKET} · ${allKeys.length} total object(s) · ${recent.length} within ${DAYS}d window`);

  if (DRY_RUN) {
    const byDay = {};
    for (const k of recent) {
      const day = (k.match(/dt=(\d{4}-\d{2}-\d{2})/) || [])[1];
      byDay[day] = (byDay[day] || 0) + 1;
    }
    for (const [day, n] of Object.entries(byDay).sort()) console.log(`  ${day}  ${n} row(s)`);
    console.log('(dry-run — nothing downloaded)');
    process.exit(0);
  }

  fs.mkdirSync(DEST, { recursive: true });
  let downloaded = 0, skipped = 0, rejected = 0;
  for (const key of recent.slice(0, MAX)) {
    const rel = sanitizeKeyToRelPath(key);
    if (!rel) { rejected++; continue; }
    const dest = path.join(DEST, rel);
    if (fs.existsSync(dest)) { skipped++; continue; }
    const body = await s3Fetch(`/${BUCKET}/${key.split('/').map(rfc3986).join('/')}`, {});
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body, 'utf8');
    downloaded++;
  }
  console.log(`fetch-rum-from-r2: downloaded ${downloaded} · skipped ${skipped} existing${rejected ? ` · rejected ${rejected} unsafe key(s)` : ''}`);
  if (recent.length > MAX) console.log(`  note: window had ${recent.length} rows, capped at --max=${MAX}`);
  console.log('  next: npm run rum:rollup && npm run rum:summary');
  process.exit(0);
} catch (err) {
  console.error(`fetch-rum-from-r2: ${redact(String(err?.message || err))}`);
  console.error('  If AccessDenied: the R2 token may be scoped to the backup bucket only.');
  console.error('  Durable evidence path: log the exact code above in TASK_BOARD before any human-blocked label.');
  process.exit(1);
}
