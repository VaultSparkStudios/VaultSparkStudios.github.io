// Diagnostic storage is isolated from the KV budget used by visitor accounts.
import { FORM_MAX_ATTEMPTS, FORM_WINDOW_MS } from './public-form-rate-limit.mjs';

export const CSP_MAX_BODY_BYTES = 16384;
const MAX_BATCH_REPORTS = 5;
const HEADERS = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
const noContent = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const directiveName = value => {
  const token = value.trim().split(/\s/)[0].toLowerCase();
  return /^[a-z][a-z0-9-]{0,79}$/.test(token) ? token : 'unknown';
};

function cleanUri(value) {
  if (typeof value !== 'string') return '';
  try { const u = new URL(value); return `${u.origin}${u.pathname}`.slice(0, 200); }
  catch { return value.split(/[?#]/)[0].slice(0, 200); }
}

export async function readCspBody(request) {
  if (Number(request.headers.get('Content-Length')) > CSP_MAX_BODY_BYTES) throw new Error('oversized');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing body');
  const bytes = new Uint8Array(CSP_MAX_BODY_BYTES);
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > bytes.length) { await reader.cancel(); throw new Error('oversized'); }
      bytes.set(value, size); size += value.byteLength;
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(new TextDecoder().decode(bytes.subarray(0, size)));
}

export function normalizeCspReports(raw, now = new Date()) {
  return (Array.isArray(raw) ? raw.slice(0, MAX_BATCH_REPORTS) : [raw]).flatMap(entry => {
    const body = entry?.body && typeof entry.body === 'object' ? entry.body : entry;
    const report = body?.['csp-report'] || body?.['content-security-policy-report'] || body;
    if (!report || typeof report !== 'object') return [];
    const directive = report['violated-directive'] || report.violatedDirective || report['effective-directive'] || report.effectiveDirective;
    if (typeof directive !== 'string' || !directive.trim()) return [];
    return [{ ts: now.toISOString(), directive: directiveName(directive),
      blockedUri: cleanUri(report['blocked-uri'] || report.blockedURL),
      documentUri: cleanUri(report['document-uri'] || report.documentURL || entry?.url) }];
  });
}

export async function handleCspReport(request, env, ctx) {
  if (request.method !== 'POST') return noContent();
  let reports;
  try { reports = normalizeCspReports(await readCspBody(request)); } catch { return noContent(); }
  if (!reports.length || !env.TT_REPORTS || !env.FORM_RATE_LIMIT) return noContent();
  ctx.waitUntil(Promise.resolve().then(async () => {
    const counter = env.FORM_RATE_LIMIT.get(env.FORM_RATE_LIMIT.idFromName('diagnostic:csp:write-budget:v1'));
    const response = await counter.fetch('https://form-counter.internal/', { method: 'POST', body: JSON.stringify({ seed: 0 }) });
    if (!response.ok) throw new Error('CSP counter unavailable');
    const budget = await response.json();
    if (typeof budget.allowed !== 'boolean' || !Number.isInteger(budget.remaining) || budget.remaining < 0 || budget.remaining >= FORM_MAX_ATTEMPTS) return;
    if (!budget.allowed) return;
    await env.TT_REPORTS.put(`csp/raw/dt=${reports[0].ts.slice(0, 10)}/${crypto.randomUUID()}.json`, JSON.stringify({
      schemaVersion: 1, collection: { sampleRate: 1, globalBatchLimitPerHour: FORM_MAX_ATTEMPTS, maxBodyBytes: CSP_MAX_BODY_BYTES }, reports,
    }), { httpMetadata: { contentType: 'application/json' } });
  }).catch(() => {}));
  return noContent();
}

async function boundedMap(items, fn) {
  const result = [];
  for (let i = 0; i < items.length; i += 5) result.push(...await Promise.all(items.slice(i, i + 5).map(fn)));
  return result;
}

// Each legacy day has 200 ring slots. Count existing records, never the wrapped
// cursor. A cursor of zero can describe a full ring, not an empty observation.
async function legacyReports(kv, day) {
  const names = [], seen = new Set();
  let cursor;
  for (let page = 0; page < 3; page++) {
    const listing = await kv.list({ prefix: `csp:${day}:`, limit: 1000, ...(cursor ? { cursor } : {}) });
    if (!Array.isArray(listing.keys) || typeof listing.list_complete !== 'boolean') throw new Error('Invalid legacy listing');
    for (const { name } of listing.keys) {
      if (name === `csp:${day}:counter`) continue;
      if (!new RegExp(`^csp:${day}:0(?:0\\d\\d|1\\d\\d)$`).test(name) || names.includes(name)) throw new Error('Invalid legacy key');
      names.push(name);
    }
    if (names.length > 200) throw new Error('Legacy bound exceeded');
    if (listing.list_complete) return boundedMap(names, async name => {
      const raw = await kv.get(name);
      // Expiry between list/get is unobserved data, never proof of zero.
      if (!raw) throw new Error('Missing legacy record');
      const row = JSON.parse(raw);
      validateRow(row, day);
      return row;
    });
    cursor = listing.cursor;
    if (!cursor || seen.has(cursor)) throw new Error('Incomplete legacy listing');
    seen.add(cursor);
  }
  throw new Error('Legacy pagination bound exceeded');
}

function validateRow(row, day) {
  if (!row || typeof row.ts !== 'string' || !Number.isFinite(Date.parse(row.ts)) || row.ts.slice(0, 10) !== day || typeof row.directive !== 'string') throw new Error('Invalid report row');
}

async function storedReports(bucket, day) {
  const keys = [], seen = new Set();
  let cursor;
  for (let page = 0; page < 3; page++) {
    const listing = await bucket.list({ prefix: `csp/raw/dt=${day}/`, limit: 1000, ...(cursor ? { cursor } : {}) });
    if (!Array.isArray(listing.objects) || typeof listing.truncated !== 'boolean') throw new Error('Invalid CSP object listing');
    for (const { key } of listing.objects) {
      if (!new RegExp(`^csp/raw/dt=${day}/[a-zA-Z0-9-]+\\.json$`).test(key) || keys.includes(key)) throw new Error('Invalid CSP object key');
      keys.push(key);
    }
    // Normally 72/day. Leave room for in-flight admission across UTC midnight;
    // 96/day still keeps the full three-day request below 1000 internal reads.
    if (keys.length > 96) throw new Error('CSP storage bound exceeded');
    if (!listing.truncated) return (await boundedMap(keys, async key => {
      const object = await bucket.get(key);
      if (!object || object.size > CSP_MAX_BODY_BYTES * 2) throw new Error('Missing or oversized CSP object');
      const batch = await object.json();
      if (batch.schemaVersion !== 1 || !Array.isArray(batch.reports) || !batch.reports.length || batch.reports.length > MAX_BATCH_REPORTS) throw new Error('Invalid CSP batch');
      batch.reports.forEach(row => validateRow(row, day));
      return batch.reports;
    })).flat();
    cursor = listing.cursor;
    if (!cursor || seen.has(cursor)) throw new Error('Incomplete CSP listing');
    seen.add(cursor);
  }
  throw new Error('CSP pagination bound exceeded');
}

export async function handleCspSummary(env, now = new Date()) {
  try {
    // Admission is global and separate from intake/auth counters. Even failed
    // computations consume an attempt: a bad source cannot amplify read traffic.
    if (!env.FORM_RATE_LIMIT) throw new Error('Missing summary budget');
    const counter = env.FORM_RATE_LIMIT.get(env.FORM_RATE_LIMIT.idFromName('diagnostic:csp:summary-budget:v1'));
    const admission = await counter.fetch('https://form-counter.internal/', { method: 'POST', body: JSON.stringify({ seed: 0 }) });
    if (!admission.ok) throw new Error('Summary budget unavailable');
    const budget = await admission.json();
    if (typeof budget.allowed !== 'boolean' || !Number.isInteger(budget.remaining) || budget.remaining < 0 || budget.remaining >= FORM_MAX_ATTEMPTS || (!budget.allowed && budget.remaining !== 0)) throw new Error('Invalid summary budget');
    if (!budget.allowed) {
      const retryAfter = Math.ceil((FORM_WINDOW_MS - Date.now() % FORM_WINDOW_MS) / 1000);
      return unavailableSummary(now, 429, { 'Retry-After': String(retryAfter) });
    }
    if (!env.RATE_LIMIT || !env.TT_REPORTS) throw new Error('Missing diagnostic source');
    const byDay = [], directives = new Map();
    let legacyRecords = 0, r2Reports = 0;
    for (let i = 0; i < 3; i++) {
      const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      const legacy = await legacyReports(env.RATE_LIMIT, day);
      const stored = await storedReports(env.TT_REPORTS, day);
      legacyRecords += legacy.length; r2Reports += stored.length;
      const rows = [...legacy, ...stored];
      if (rows.length) byDay.push({ date: day, count: rows.length });
      for (const row of rows) {
        const directive = directiveName(row.directive);
        directives.set(directive, (directives.get(directive) || 0) + 1);
      }
    }
    return Response.json({ state: 'complete', total3d: legacyRecords + r2Reports, byDay,
      topDirectives: [...directives].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([directive, count]) => ({ directive, count })),
      collection: { countMeaning: 'retained-reports', exhaustive: false, window: 'current-and-prior-two-UTC-days',
        globalBatchLimitPerHour: FORM_MAX_ATTEMPTS, maxReportsPerBatch: MAX_BATCH_REPORTS, legacyRecords, r2Reports }, ts: now.toISOString(),
    }, { headers: HEADERS });
  } catch {
    return unavailableSummary(now, 503);
  }
}

function unavailableSummary(now, status, extraHeaders = {}) {
  return Response.json({ state: 'unavailable', error: status === 429 ? 'diagnostic_summary_rate_limited' : 'diagnostic_sources_incomplete', total3d: null,
    byDay: [], topDirectives: [], ts: now.toISOString() }, { status, headers: { ...HEADERS, ...extraHeaders } });
}
