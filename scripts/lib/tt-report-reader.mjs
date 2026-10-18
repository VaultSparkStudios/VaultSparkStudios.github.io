// Private diagnostic evidence only. A failed or truncated source never becomes a clean soak.
import { signRequest, rfc3986 } from './r2-signing.mjs';

export function decodeXml(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] === '#') return String.fromCodePoint(parseInt(entity.slice(entity[1] === 'x' ? 2 : 1), entity[1] === 'x' ? 16 : 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity];
  });
}

export function parseTtListing(xml) {
  // S3 has a small XML envelope. Reject anything we cannot completely read;
  // an HTTP 200 or opening root tag alone is never evidence of an empty bucket.
  const stack = [];
  let roots = 0, offset = 0;
  for (const match of xml.matchAll(/<[^>]*>/g)) {
    if (xml.slice(offset, match.index).includes('<')) throw new Error('Malformed TT R2 XML');
    const tag = match[0]; offset = match.index + tag.length;
    if (/^<\?xml\s[^?]*\?>$/.test(tag) && match.index === 0) continue;
    const close = tag.match(/^<\/([A-Za-z][\w:-]*)\s*>$/);
    if (close) { if (stack.pop() !== close[1]) throw new Error('Malformed TT R2 XML'); continue; }
    const open = tag.match(/^<([A-Za-z][\w:-]*)(?:\s+[^<>]*)?\s*\/?>$/);
    if (!open) throw new Error('Unsupported TT R2 XML');
    if (!stack.length && (++roots !== 1 || open[1] !== 'ListBucketResult')) throw new Error('Invalid TT R2 root');
    if (!tag.endsWith('/>')) stack.push(open[1]);
  }
  if (stack.length || roots !== 1 || xml.slice(offset).trim()) throw new Error('Incomplete TT R2 XML');
  const truncated = [...xml.matchAll(/<IsTruncated>(true|false)<\/IsTruncated>/g)];
  if (truncated.length !== 1) throw new Error('Invalid TT R2 truncation flag');
  const tokens = [...xml.matchAll(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/g)];
  if (tokens.length > 1 || (truncated[0][1] === 'true' && tokens.length !== 1)) throw new Error('Incomplete TT R2 listing');
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(match => decodeXml(match[1]));
  if (keys.length !== [...xml.matchAll(/<Contents>/g)].length) throw new Error('Incomplete TT R2 contents');
  return { keys, cursor: truncated[0][1] === 'true' ? decodeXml(tokens[0][1]) : '' };
}

export async function readTtReports({ days = 30, namespace = '6fde74ca7f3d462786afbb85c85611e0', bucket = 'vaultspark-rum', fetchImpl = fetch, secret, now = new Date() } = {}) {
  if (!secret) ({ getSecret: secret } = await import('./secrets.mjs'));
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString();
  const account = secret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
  const token = secret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  const kvApi = `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${namespace}`;
  const accessKey = secret('R2_ACCESS_KEY_ID', 'cloudflare.r2');
  const secretKey = secret('R2_SECRET_ACCESS_KEY', 'cloudflare.r2');
  const host = `${secret('R2_ACCOUNT_ID', 'cloudflare.r2')}.r2.cloudflarestorage.com`;
  async function kv(part) {
    let response = await fetchImpl(kvApi + part, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    // Deploy and account-administration credentials are separate existing planes.
    // Probe the existing administrative capability on a scoped-token refusal.
    if (response.status === 401 || response.status === 403) {
      const admin = secret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio');
      response = await fetchImpl(kvApi + part, { headers: { Authorization: `Bearer ${admin}` }, signal: AbortSignal.timeout(30000) });
    }
    if (!response.ok) throw new Error(`TT legacy KV read HTTP ${response.status}`);
    return response.json();
  }
  async function r2(key = '', query = {}) {
    const signed = signRequest({ method: 'GET', host, pathName: `/${rfc3986(bucket)}${key ? '/' + key.split('/').map(rfc3986).join('/') : ''}`, query, accessKey, secretKey });
    const response = await fetchImpl(signed.url, { headers: signed.headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`TT R2 read HTTP ${response.status}`);
    return response.text();
  }
  const rows = [], legacyKeys = [], objectKeys = [];
  let cursor = '', seen = new Set();
  do {
    const page = await kv(`/keys?prefix=tt%3A&limit=1000${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
    if (page.success !== true || !Array.isArray(page.result)) throw new Error('Invalid TT KV listing');
    legacyKeys.push(...page.result.map(k => k.name).filter(k => /^tt:\d{4}-\d{2}-\d{2}:\d{4}$/.test(k) && k.slice(3, 13) >= cutoff.slice(0,10)));
    cursor = page.result_info?.cursor || '';
    if (cursor && seen.has(cursor)) throw new Error('Repeated TT KV cursor');
    seen.add(cursor);
  } while (cursor);
  for (const key of legacyKeys) {
    const row = await kv(`/values/${encodeURIComponent(key)}`);
    if (!row || typeof row.ts !== 'string') throw new Error('Invalid legacy TT report');
    if (row.ts >= cutoff) rows.push(row);
  }
  cursor = ''; seen = new Set();
  do {
    const xml = await r2('', { 'list-type': '2', prefix: 'tt/raw/', 'max-keys': '1000', ...(cursor ? { 'continuation-token': cursor } : {}) });
    const page = parseTtListing(xml);
    for (const key of page.keys) {
      if (!/^tt\/raw\/dt=\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9-]+\.json$/.test(key)) throw new Error('Unexpected TT R2 key');
      if (key.slice(10,20) >= cutoff.slice(0,10)) objectKeys.push(key);
    }
    cursor = page.cursor;
    if (cursor && seen.has(cursor)) throw new Error('Incomplete TT R2 listing');
    seen.add(cursor);
  } while (cursor);
  for (const key of objectKeys) {
    const batch = JSON.parse(await r2(key));
    if (!Array.isArray(batch.reports) || batch.reports.length > 5) throw new Error('Invalid TT R2 batch');
    for (const row of batch.reports) {
      if (!row || typeof row.ts !== 'string') throw new Error('Invalid TT R2 report');
      if (row.ts >= cutoff) rows.push(row);
    }
  }
  return { reports: rows, legacyRecords: legacyKeys.length, r2Objects: objectKeys.length, complete: true };
}
