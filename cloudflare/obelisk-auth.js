/**
 * Obelisk OIDC relying-party + VaultSpark data-plane bridge.
 *
 * Obelisk is the sole human-facing identity authority. Supabase remains a
 * private compatibility/data plane because the existing member and investor
 * row-level-security policies are keyed to auth.uid() UUIDs. Obelisk tokens
 * never enter browser storage; the browser receives only a short-lived
 * Supabase session for those existing policies.
 */

const DEFAULTS = Object.freeze({
  issuer: 'https://obeliskgate.com',
  clientId: 'vaultsparkstudios-website',
  redirectUri: 'https://vaultsparkstudios.com/auth/callback',
  supabaseUrl: 'https://fjnpzjjyhnpmunfoycrp.supabase.co',
  supabaseAnonKey: 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij',
  cookieName: 'vs_portal_session',
  flowCookieName: 'vs_obelisk_flow',
});

const FLOW_TTL_SECONDS = 10 * 60;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_SKEW_MS = 2 * 60 * 1000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let discoveryCache = null;
let jwksCache = null;
// Issuers observed to advertise revocation without implementing it (see
// revokeObeliskTokens). Cached so a doomed round trip is paid once, not per
// sign-out. Module-scoped like the discovery/JWKS caches above.
const unsupportedRevocation = new Set();

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

// S343 — a person who clicked "Create your Obelisk account" during a provider
// outage was shown a raw JSON blob in their browser window. The 503 is the right
// STATUS and the JSON is the right body for a programmatic caller, but a browser
// navigation deserves a page. Content-negotiated so both callers keep what they
// need: `Accept: text/html` gets this, everything else keeps the JSON shape.
function outagePage(status, heading, detail, retryHref) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(heading)} — VaultSpark Studios</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e8eaf0;
font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:2rem}
.card{max-width:34rem;text-align:left;border:1px solid #232838;border-radius:14px;padding:2rem;background:#11141c}
h1{font-size:1.35rem;margin:0 0 .6rem}
p{color:#a8b0c2;margin:0 0 1rem}
code{background:#0b0d12;border:1px solid #232838;border-radius:5px;padding:.1rem .35rem;font-size:.85em;color:#8f97ab}
a.btn{display:inline-block;background:#f5c542;color:#0b0d12;font-weight:600;text-decoration:none;
padding:.6rem 1.1rem;border-radius:9px}
a.alt{color:#8f97ab;font-size:.86rem;margin-left:1rem}
</style></head><body><main class="card">
<h1>${esc(heading)}</h1>
<p>${esc(detail)}</p>
<p><a class="btn" href="${esc(retryHref)}">Try again</a><a class="alt" href="/">Back to VaultSpark Studios</a></p>
<p style="font-size:.8rem;margin:0"><code>${status}</code> — this is an upstream identity-provider outage, not a problem with your account. Nothing was lost; sign-in will work once it returns.</p>
</main></body></html>`;
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function wantsHtml(request) {
  return /text\/html/i.test(request.headers.get('accept') || '');
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store', Vary: 'Cookie', ...headers },
  });
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid_base64url');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    out[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return out;
}

function cookie(name, value, { maxAge = SESSION_TTL_SECONDS, clear = false } = {}) {
  return `${name}=${clear ? '' : value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear ? 0 : maxAge}`;
}

function authConfig(env = {}) {
  return {
    issuer: String(env.OBELISK_ISSUER || DEFAULTS.issuer).replace(/\/$/, ''),
    clientId: env.OBELISK_CLIENT_ID || DEFAULTS.clientId,
    redirectUri: env.OBELISK_REDIRECT_URI || DEFAULTS.redirectUri,
    supabaseUrl: String(env.SUPABASE_URL || DEFAULTS.supabaseUrl).replace(/\/$/, ''),
    supabaseAnonKey: env.SUPABASE_ANON_KEY || DEFAULTS.supabaseAnonKey,
    cookieName: env.PORTAL_GATE_COOKIE || DEFAULTS.cookieName,
    flowCookieName: env.OBELISK_FLOW_COOKIE || DEFAULTS.flowCookieName,
  };
}

function signingSecret(env = {}) {
  return env.OBELISK_SESSION_SIGNING_KEY || env.CSRF_SIGNING_KEY || '';
}

export function safeReturnPath(value, fallback = '/vault-member/') {
  if (typeof value !== 'string' || value.length < 1 || value.length > 1024) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || /[\r\n\\]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, 'https://vaultsparkstudios.com');
    if (parsed.origin !== 'https://vaultsparkstudios.com') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return fallback;
  }
}

function errorReturnPath(flow, code, detail) {
  const target = new URL(safeReturnPath(flow?.returnTo), 'https://vaultsparkstudios.com');
  target.searchParams.set('auth_error', code);
  // Bounded failure family only — never free text, never an identifier.
  if (detail && LINK_FAILURE_CODES.has(detail)) target.searchParams.set('auth_detail', detail);
  return `${target.pathname}${target.search}${target.hash}`;
}

/**
 * S303 — structured receipt on identity-link FAILURE.
 *
 * A failed first login used to log one console line and redirect to a generic
 * `bridge_failed`; the member saw nothing actionable and we learned nothing.
 * The receipt is privacy-safe by construction: a bounded code family plus the
 * plane that failed — no email, no subject, no tokens, no free-text messages.
 */
export const LINK_FAILURE_CODES = new Set([
  'identity_email_duplicate', 'identity_email_conflict', 'identity_subject_duplicate',
  'supabase_user_scan_limit', 'token_exchange_failed', 'id_token_invalid',
  'supabase_session_failed', 'supabase_session_identity_mismatch', 'unknown',
]);

export function linkFailureCode(error) {
  const message = String(error?.message || '');
  for (const code of LINK_FAILURE_CODES) if (code !== 'unknown' && message.includes(code)) return code;
  return 'unknown';
}

export function linkFailureReceipt(error, plane) {
  return {
    version: 1,
    at: Date.now(),
    plane: ['exchange', 'verify', 'link', 'session'].includes(plane) ? plane : 'unknown',
    code: linkFailureCode(error),
  };
}

async function recordLinkFailure(env, error, plane) {
  // Diagnosability must never worsen the member's failure: best-effort only.
  try {
    if (!env.RATE_LIMIT) return;
    const receipt = linkFailureReceipt(error, plane);
    await env.RATE_LIMIT.put(
      `auth:linkfail:${receipt.at}-${randomToken(6)}`,
      JSON.stringify(receipt),
      { expirationTtl: 30 * 86400 },
    );
  } catch (_) { /* never fatal */ }
}

/**
 * S305 — journey receipts. The real-provider-e2e evidence needs machine
 * observation of a REAL sign-in journey, and the Worker is the only party
 * present at every leg. Same privacy contract as link-failure receipts:
 * bounded legs, bounded reasons, counts — never an email, subject, or token.
 */
const JOURNEY_LEGS = new Set(['callback', 'compat', 'logout']);
const JOURNEY_LOGOUT_REASONS = new Set([
  'no_session', 'discovery_unavailable', 'no_revocation_endpoint', 'not_implemented',
]);

export function journeyReceipt(leg, detail = {}) {
  const receipt = {
    version: 1,
    at: Date.now(),
    leg: JOURNEY_LEGS.has(leg) ? leg : 'unknown',
  };
  if (receipt.leg === 'logout') {
    receipt.attempted = detail.attempted === true;
    receipt.revoked = Math.min(9, Array.isArray(detail.revoked) ? detail.revoked.length : 0);
    receipt.failed = Math.min(9, Array.isArray(detail.failed) ? detail.failed.length : 0);
    receipt.reason = JOURNEY_LOGOUT_REASONS.has(detail.reason) ? detail.reason : null;
  }
  return receipt;
}

async function recordJourney(env, leg, detail) {
  try {
    if (!env.RATE_LIMIT) return;
    const receipt = journeyReceipt(leg, detail);
    await env.RATE_LIMIT.put(
      `auth:journey:${receipt.at}-${randomToken(6)}`,
      JSON.stringify(receipt),
      { expirationTtl: 7 * 86400 },
    );
  } catch (_) { /* never fatal */ }
}

async function signedValue(value, env) {
  const secret = signingSecret(env);
  if (!secret) throw new Error('missing_session_signing_key');
  return `${value}.${await hmac(value, secret)}`;
}

async function verifySignedValue(value, env) {
  if (typeof value !== 'string') return null;
  const split = value.lastIndexOf('.');
  if (split < 1) return null;
  const plain = value.slice(0, split);
  const supplied = value.slice(split + 1);
  const secret = signingSecret(env);
  if (!secret) return null;
  const expected = await hmac(plain, secret);
  return timingSafeEqual(supplied, expected) ? plain : null;
}

async function readJson(response, code) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    const error = new Error(code);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function getDiscovery(config, fetchImpl = fetch, force = false) {
  if (!force && discoveryCache && discoveryCache.issuer === config.issuer) return discoveryCache.value;
  const response = await fetchImpl(`${config.issuer}/.well-known/openid-configuration`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
  });
  const value = await readJson(response, 'oidc_discovery_failed');
  if (value.issuer !== config.issuer || !value.authorization_endpoint || !value.token_endpoint || !value.jwks_uri) {
    throw new Error('oidc_discovery_invalid');
  }
  discoveryCache = { issuer: config.issuer, value };
  return value;
}

async function getJwks(config, discovery, fetchImpl = fetch, force = false) {
  if (!force && jwksCache && jwksCache.uri === discovery.jwks_uri) return jwksCache.value;
  const response = await fetchImpl(discovery.jwks_uri, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
  });
  const value = await readJson(response, 'oidc_jwks_failed');
  if (!Array.isArray(value.keys)) throw new Error('oidc_jwks_invalid');
  jwksCache = { uri: discovery.jwks_uri, value };
  return value;
}

function decodeJwtPart(value) {
  return JSON.parse(decoder.decode(base64UrlToBytes(value)));
}

export async function verifyObeliskIdToken(token, {
  config,
  nonce = null,
  expectedSubject = null,
  fetchImpl = fetch,
  now = Date.now(),
} = {}) {
  if (typeof token !== 'string' || token.length > 16384) throw new Error('id_token_invalid');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('id_token_invalid');
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  if (header.alg !== 'ES256' || typeof header.kid !== 'string') throw new Error('id_token_algorithm_invalid');

  const discovery = await getDiscovery(config, fetchImpl);
  let jwks = await getJwks(config, discovery, fetchImpl);
  let jwk = jwks.keys.find((key) => key.kid === header.kid && key.kty === 'EC' && key.crv === 'P-256');
  if (!jwk) {
    jwks = await getJwks(config, discovery, fetchImpl, true);
    jwk = jwks.keys.find((key) => key.kid === header.kid && key.kty === 'EC' && key.crv === 'P-256');
  }
  if (!jwk) throw new Error('id_token_key_unknown');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, key, base64UrlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error('id_token_signature_invalid');

  const nowSeconds = Math.floor(now / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== config.issuer || !audience.includes(config.clientId)) throw new Error('id_token_claims_invalid');
  if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds - 30) throw new Error('id_token_expired');
  if (Number.isFinite(claims.nbf) && claims.nbf > nowSeconds + 60) throw new Error('id_token_not_yet_valid');
  if (Number.isFinite(claims.iat) && claims.iat > nowSeconds + 60) throw new Error('id_token_issued_in_future');
  if (nonce !== null && claims.nonce !== nonce) throw new Error('id_token_nonce_invalid');
  if (expectedSubject !== null && claims.sub !== expectedSubject) throw new Error('id_token_subject_changed');
  if (typeof claims.sub !== 'string' || claims.sub.length < 1 || claims.sub.length > 512) throw new Error('id_token_subject_invalid');
  if (claims.email_verified !== true || typeof claims.email !== 'string') throw new Error('verified_email_required');
  return claims;
}

function supabaseHeaders(config, serviceRole, extra = {}) {
  return {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function supabaseRequest(path, { config, serviceRole, fetchImpl, method = 'GET', body, headers = {} }) {
  const response = await fetchImpl(`${config.supabaseUrl}${path}`, {
    method,
    headers: supabaseHeaders(config, serviceRole, headers),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  return readJson(response, `supabase_${response.status}`);
}

function normalizedEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 320 || !email.includes('@')) throw new Error('verified_email_invalid');
  return email;
}

async function scanSupabaseUsers(options, { email = null, subject = null } = {}) {
  let emailUser = null;
  let subjectUser = null;
  for (let page = 1; page <= 20; page += 1) {
    const result = await supabaseRequest(`/auth/v1/admin/users?page=${page}&per_page=100`, options);
    const users = Array.isArray(result) ? result : (result.users || []);
    for (const user of users) {
      if (email && String(user.email || '').trim().toLowerCase() === email) {
        if (emailUser && emailUser.id !== user.id) throw new Error('identity_email_duplicate');
        emailUser = user;
      }
      if (subject && user.app_metadata?.obelisk_sub === subject) {
        if (subjectUser && subjectUser.id !== user.id) throw new Error('identity_subject_duplicate');
        subjectUser = user;
      }
    }
    if (users.length < 100) break;
    if (page === 20) throw new Error('supabase_user_scan_limit');
  }
  return { emailUser, subjectUser };
}

/**
 * S304 (D-S301.10, founder-approved): indexed identity-link table.
 *
 * `public.obelisk_identity_link` (obelisk_sub PK, user_id UNIQUE) supplies the
 * uniqueness guarantee `auth.users` denies us (42501) plus an O(1) subject
 * lookup, replacing the per-login full admin scans that fail closed at ~2,000
 * accounts. Additive by construction: ANY table-plane failure (missing table,
 * REST error, timeout) falls back to the legacy scan path, so a misapplied
 * migration can never break login. The row is inserted BEFORE the privileged
 * metadata write, so an interruption leaves a self-healing orphan link row —
 * never an orphan metadata write.
 */
const LINK_TABLE_PATH = '/rest/v1/obelisk_identity_link';

async function linkTableLookup(subject, options) {
  try {
    const rows = await supabaseRequest(
      `${LINK_TABLE_PATH}?obelisk_sub=eq.${encodeURIComponent(subject)}&select=user_id`,
      options,
    );
    if (!Array.isArray(rows)) return { available: false, userId: null };
    return { available: true, userId: rows[0]?.user_id || null };
  } catch (_) {
    return { available: false, userId: null };
  }
}

async function linkTableInsert(subject, userId, options) {
  try {
    await supabaseRequest(LINK_TABLE_PATH, {
      ...options,
      method: 'POST',
      body: { obelisk_sub: subject, user_id: userId },
      headers: { Prefer: 'return=representation' },
    });
    return true;
  } catch (_) {
    // Conflict, missing table, or transient failure — re-read to distinguish.
    // Only a genuine cross-user mapping fails closed; everything else keeps
    // the legacy path authoritative for this login.
    const lookup = await linkTableLookup(subject, options);
    if (lookup.available && lookup.userId && lookup.userId !== userId) throw new Error('identity_subject_duplicate');
    return lookup.available && lookup.userId === userId;
  }
}

async function fetchUserById(userId, options) {
  return supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, options);
}

function linkedMetadata(user, claims, config) {
  const current = user?.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {};
  if (current.obelisk_sub && current.obelisk_sub !== claims.sub) throw new Error('identity_user_already_linked');
  return {
    ...current,
    obelisk_sub: claims.sub,
    obelisk_issuer: config.issuer,
    obelisk_verified_email: normalizedEmail(claims.email),
    obelisk_last_verified_at: new Date().toISOString(),
  };
}

export async function ensureSupabaseIdentityLink(claims, {
  config,
  serviceRole,
  fetchImpl = fetch,
} = {}) {
  if (!serviceRole) throw new Error('supabase_service_role_missing');
  const options = { config, serviceRole, fetchImpl };
  const verifiedEmail = normalizedEmail(claims.email);

  // FAST PATH (S304): a returning linked member resolves via one indexed read
  // + one user fetch — zero admin scans. An orphan link row (interrupted first
  // login: row written, metadata write never landed) self-heals through the
  // same metadata write the slow path uses.
  const fastLookup = await linkTableLookup(claims.sub, options);
  if (fastLookup.available && fastLookup.userId) {
    let linkedUser = await fetchUserById(fastLookup.userId, options);
    if (!linkedUser?.id) throw new Error('identity_user_missing');
    const fastMetadata = linkedMetadata(linkedUser, claims, config);
    linkedUser = await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(linkedUser.id)}`, {
      ...options,
      method: 'PUT',
      body: { app_metadata: fastMetadata },
    });
    if (!linkedUser?.id || linkedUser.app_metadata?.obelisk_sub !== claims.sub) throw new Error('supabase_identity_link_invalid');
    // Exact verification: the link row still names this user (replaces the
    // legacy full-table verification walk with an indexed re-read).
    const verifyLookup = await linkTableLookup(claims.sub, options);
    if (!verifyLookup.available || verifyLookup.userId !== linkedUser.id) throw new Error('supabase_identity_link_invalid');
    return {
      userId: linkedUser.id,
      email: verifiedEmail,
      compatibilityEmail: normalizedEmail(linkedUser.email),
      existing: true,
    };
  }

  let { emailUser, subjectUser } = await scanSupabaseUsers(options, { email: verifiedEmail, subject: claims.sub });
  if (subjectUser && emailUser && subjectUser.id !== emailUser.id) throw new Error('identity_email_conflict');
  let user = subjectUser || emailUser;
  let created = false;
  if (!user) {
    created = true;
    try {
      user = await supabaseRequest('/auth/v1/admin/users', {
        ...options,
        method: 'POST',
        body: {
          email: verifiedEmail,
          email_confirm: true,
          user_metadata: { display_name: claims.name || claims.preferred_username || null },
          app_metadata: linkedMetadata(null, claims, config),
        },
      });
    } catch (createError) {
      // Supabase Auth email uniqueness arbitrates simultaneous first links.
      ({ emailUser, subjectUser } = await scanSupabaseUsers(options, { email: verifiedEmail, subject: claims.sub }));
      if (subjectUser && emailUser && subjectUser.id !== emailUser.id) throw new Error('identity_email_conflict');
      user = subjectUser || emailUser;
      if (!user) throw createError;
      created = false;
    }
  }
  if (!user?.id) throw new Error('identity_user_missing');

  // S304: write the link row BEFORE the privileged metadata write (D-S301.10).
  // An interruption between the two leaves a self-healing orphan row; the
  // reverse order would leave an orphan metadata write nothing can index.
  const linkRowWritten = await linkTableInsert(claims.sub, user.id, options);

  const appMetadata = linkedMetadata(user, claims, config);
  user = await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    ...options,
    method: 'PUT',
    body: { app_metadata: appMetadata },
  });
  if (!user?.id || user.app_metadata?.obelisk_sub !== claims.sub) throw new Error('supabase_identity_link_invalid');

  if (linkRowWritten) {
    // Indexed verification: the table's uniqueness already arbitrated any
    // concurrent callback; one exact read replaces the legacy full walk.
    const verifyLookup = await linkTableLookup(claims.sub, options);
    if (!verifyLookup.available || verifyLookup.userId !== user.id) throw new Error('supabase_identity_link_invalid');
  } else {
    // Legacy verification (table unavailable): re-scan after the privileged
    // metadata write. A duplicate can only arise from a concurrent provider
    // callback; fail closed instead of guessing.
    const verified = await scanSupabaseUsers(options, { subject: claims.sub });
    if (!verified.subjectUser || verified.subjectUser.id !== user.id) throw new Error('supabase_identity_link_invalid');
  }
  return {
    userId: user.id,
    email: verifiedEmail,
    compatibilityEmail: normalizedEmail(user.email),
    existing: !created,
  };
}
export async function issueSupabaseCompatibilitySession(email, {
  config,
  serviceRole,
  fetchImpl = fetch,
} = {}) {
  const options = { config, serviceRole, fetchImpl };
  const link = await supabaseRequest('/auth/v1/admin/generate_link', {
    ...options, method: 'POST', body: { type: 'magiclink', email },
  });
  const tokenHash = link.hashed_token || link.properties?.hashed_token;
  if (!tokenHash) throw new Error('supabase_link_token_missing');
  const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token_hash: tokenHash, type: 'email' }),
    signal: AbortSignal.timeout(8000),
  });
  const session = await readJson(response, 'supabase_session_issue_failed');
  if (!session.access_token || !session.refresh_token || !session.user?.id) throw new Error('supabase_session_invalid');
  return session;
}

async function refreshSupabaseSession(refreshToken, { config, fetchImpl = fetch }) {
  const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal: AbortSignal.timeout(8000),
  });
  return readJson(response, 'supabase_session_refresh_failed');
}

async function startLogin(request, env, fetchImpl) {
  const config = authConfig(env);
  if (!env.RATE_LIMIT) return json({ ok: false, code: 'auth_store_missing' }, 503);
  if (!signingSecret(env)) return json({ ok: false, code: 'auth_signing_key_missing' }, 503);
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get('return') || url.searchParams.get('next'));
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const challenge = bytesToBase64Url(await sha256(verifier));
  const intent = url.searchParams.get('intent') === 'signup' ? 'signup' : 'signin';

  // S319 — A BROKEN PROVIDER MUST NOT CRASH THE WORKER.
  //
  // getDiscovery() throws `oidc_discovery_invalid` when the provider's OIDC
  // document is unusable. Nothing caught it, so the throw escaped the fetch
  // handler and Cloudflare returned error 1101 — a bare `HTTP 500` with the body
  // "error code: 1101" on the sign-in route. Measured live on 2026-08-18:
  // vaultsparkstudios.com/login AND website.staging.vaultsparkstudios.com/login
  // were both 500, because obeliskgate.com/.well-known/openid-configuration
  // answers 200 with HTML (its SPA catch-all shadows the discovery path), so
  // authorization_endpoint was undefined.
  //
  // A dependency being down is a KNOWN state, not an unhandled error. It now
  // degrades to the same honest 503 shape the store/signing-key guards above
  // already use, so the surface reports a provider outage instead of looking
  // like our own crash. Reported to the owning repo via Ark (CANON-018).
  //
  // Discovery is also resolved BEFORE the flow record is written: the previous
  // order persisted a KV flow for a login that could never start, leaving an
  // orphan record on every failed attempt for the full TTL.
  let discovery;
  try {
    discovery = await getDiscovery(config, fetchImpl);
  } catch (error) {
    // S343: a browser gets a page, a programmatic caller keeps the JSON contract.
    if (wantsHtml(request)) {
      return outagePage(
        503,
        'Sign-in is temporarily unavailable',
        'Our identity provider is not responding right now, so we cannot start a secure sign-in. This is on our side, not yours.',
        url.pathname + url.search,
      );
    }
    return json({
      ok: false,
      code: 'identity_provider_unavailable',
      detail: String(error?.message || error).slice(0, 120),
    }, 503);
  }

  // S319 — the OTHER half of the live 500. Free-tier KV allows ~1,000 writes a
  // day, and the /v/rum beacon was writing a rate-limit counter on every single
  // request against this same namespace. Once the quota was exhausted this
  // `.put()` rejected, the rejection escaped, and sign-in returned Cloudflare
  // 1101 / HTTP 500 — a telemetry endpoint taking down authentication.
  //
  // Unlike the beacon this cannot fail open: without a persisted flow record the
  // callback has no nonce or PKCE verifier to verify against, so continuing
  // would start a login that can never complete securely. It fails CLOSED, but
  // as a named 503 rather than a crash.
  try {
    await env.RATE_LIMIT.put(`auth:flow:${state}`, JSON.stringify({ nonce, verifier, returnTo, intent }), {
      expirationTtl: FLOW_TTL_SECONDS,
    });
  } catch (error) {
    return json({
      ok: false,
      code: 'auth_store_unavailable',
      detail: String(error?.message || error).slice(0, 120),
    }, 503);
  }
  const authorize = new URL(discovery.authorization_endpoint);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('redirect_uri', config.redirectUri);
  authorize.searchParams.set('scope', 'openid email profile offline_access');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');
  authorize.searchParams.set('login_hint', intent);
  return redirect(authorize.toString(), {
    'Set-Cookie': cookie(config.flowCookieName, await signedValue(state, env), { maxAge: FLOW_TTL_SECONDS }),
  });
}

async function exchangeCode(code, flow, config, fetchImpl) {
  const discovery = await getDiscovery(config, fetchImpl);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: flow.verifier,
  });
  const response = await fetchImpl(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  });
  const tokens = await readJson(response, 'oidc_code_exchange_failed');
  if (!tokens.id_token || !tokens.access_token) throw new Error('oidc_token_response_invalid');
  return tokens;
}

async function finishLogin(request, env, fetchImpl) {
  const config = authConfig(env);
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const signedFlow = parseCookies(request)[config.flowCookieName];
  const cookieState = await verifySignedValue(signedFlow, env);
  if (!state || state !== cookieState || !env.RATE_LIMIT) return redirect('/vault-member/?auth_error=state_invalid');
  // S321 — the CALLBACK leg of the same crash class S319 fixed in startLogin.
  // `.delete()` is a KV *write*, so the free-tier write-quota exhaustion that took
  // sign-in down in S319 rejects here exactly as it did there. Left unguarded, the
  // rejection escaped finishLogin → handleObeliskAuthRequest → the Worker fetch
  // handler (which has no last-resort catch), and Cloudflare answered 1101 /
  // HTTP 500. S319 hardened only the start leg; this is the costlier one, because
  // the member has already completed the passkey ceremony by the time they arrive.
  //
  // Same rule as S319: a dependency being down is a KNOWN state, not an unhandled
  // error. It degrades to the identical honest named 503 the start leg uses. It
  // fails CLOSED — without the flow record there is no nonce or PKCE verifier to
  // verify against, so continuing would finish a login that cannot be trusted.
  let flowRaw;
  try {
    flowRaw = await env.RATE_LIMIT.get(`auth:flow:${state}`);
    await env.RATE_LIMIT.delete(`auth:flow:${state}`);
  } catch (error) {
    return json({
      ok: false,
      code: 'auth_store_unavailable',
      detail: String(error?.message || error).slice(0, 120),
    }, 503);
  }
  let flow = null;
  if (flowRaw) {
    try {
      flow = JSON.parse(flowRaw);
    } catch (_) {
      // The key was already deleted above; a second delete is redundant, and as a
      // KV write it was itself an unguarded throw on the same quota condition.
      return json({ ok: false, code: 'invalid_flow_state' }, 400, {
        'Set-Cookie': cookie(config.flowCookieName, '', { clear: true }),
      });
    }
  }
  if (!flow) return redirect('/vault-member/?auth_error=flow_expired');
  if (url.searchParams.has('error')) return redirect(errorReturnPath(flow, 'provider_denied'));
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) return redirect(errorReturnPath(flow, 'code_missing'));

  let plane = 'exchange';
  try {
    const tokens = await exchangeCode(code, flow, config, fetchImpl);
    plane = 'verify';
    const claims = await verifyObeliskIdToken(tokens.id_token, { config, nonce: flow.nonce, fetchImpl });
    plane = 'link';
    const link = await ensureSupabaseIdentityLink(claims, {
      config, serviceRole: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl,
    });
    plane = 'session';
    const supabase = await issueSupabaseCompatibilitySession(link.compatibilityEmail, {
      config, serviceRole: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl,
    });
    if (supabase.user.id !== link.userId) throw new Error('supabase_session_identity_mismatch');

    const sessionId = randomToken(32);
    const now = Date.now();
    const record = {
      version: 1,
      createdAt: now,
      lastSeenAt: now,
      obelisk: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name || claims.preferred_username || null,
        assurance: claims.acr || claims.amr || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        idTokenExpiresAt: claims.exp * 1000,
      },
      supabase,
      link,
    };
    await env.RATE_LIMIT.put(`auth:session:${sessionId}`, JSON.stringify(record), { expirationTtl: SESSION_TTL_SECONDS });
    await recordJourney(env, 'callback');
    const headers = new Headers({ Location: safeReturnPath(flow.returnTo), 'Cache-Control': 'no-store', Vary: 'Cookie' });
    headers.append('Set-Cookie', cookie(config.cookieName, await signedValue(sessionId, env)));
    headers.append('Set-Cookie', cookie(config.flowCookieName, '', { clear: true }));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('Obelisk callback failed', { code: error?.message || 'unknown', plane });
    await recordLinkFailure(env, error, plane);
    return redirect(errorReturnPath(flow, 'bridge_failed', linkFailureCode(error)), {
      'Set-Cookie': cookie(config.flowCookieName, '', { clear: true }),
    });
  }
}

async function loadSession(request, env) {
  const config = authConfig(env);
  if (!env.RATE_LIMIT) return null;
  const signed = parseCookies(request)[config.cookieName];
  const sessionId = await verifySignedValue(signed, env);
  if (!sessionId || !/^[A-Za-z0-9_-]{40,64}$/.test(sessionId)) return null;
  const raw = await env.RATE_LIMIT.get(`auth:session:${sessionId}`);
  if (!raw) return null;
  try { return { sessionId, record: JSON.parse(raw), config }; } catch (_) { return null; }
}

/**
 * Is the Supabase pair still usable BY THE BROWSER?
 *
 * The bug this exists to close: we bookkept freshness from `expires_at`, but
 * supabase-js reads the access token's own `exp` claim and refreshes on its own
 * initiative when that has passed. Trusting our field while the browser trusts
 * the token is exactly how a member ended up signed out in the UI while signed
 * in at the edge — so the token is authoritative here, and where the two
 * disagree the EARLIER one wins. An unreadable or absent expiry is not fresh.
 */
export function supabaseSessionFresh(session, now = Date.now(), skewMs = REFRESH_SKEW_MS) {
  const bookkept = Number(session?.expires_at || 0) * 1000;
  let claimed = 0;
  try {
    const part = String(session?.access_token || '').split('.')[1];
    if (part) claimed = Number(decodeJwtPart(part)?.exp || 0) * 1000;
  } catch (_) {
    claimed = 0;
  }
  const candidates = [bookkept, claimed].filter((value) => Number.isFinite(value) && value > 0);
  if (!candidates.length) return false;
  return Math.min(...candidates) > now + skewMs;
}

async function refreshSessionIfNeeded(loaded, env, fetchImpl) {
  const { sessionId, record, config } = loaded;
  const now = Date.now();
  if (!record?.obelisk?.sub || !record?.supabase?.user?.id) return null;
  if (record.link?.userId !== record.supabase.user.id) return null;

  if (Number(record.obelisk.idTokenExpiresAt || 0) <= now + REFRESH_SKEW_MS) {
    if (!record.obelisk.refreshToken) return null;
    const discovery = await getDiscovery(config, fetchImpl);
    const response = await fetchImpl(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', refresh_token: record.obelisk.refreshToken, client_id: config.clientId,
      }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    const tokens = await readJson(response, 'oidc_refresh_failed');
    if (!tokens.id_token) return null;
    const claims = await verifyObeliskIdToken(tokens.id_token, {
      config, expectedSubject: record.obelisk.sub, fetchImpl,
    });
    record.obelisk = {
      ...record.obelisk,
      email: claims.email,
      name: claims.name || claims.preferred_username || record.obelisk.name,
      assurance: claims.acr || claims.amr || record.obelisk.assurance,
      accessToken: tokens.access_token || record.obelisk.accessToken,
      refreshToken: tokens.refresh_token || record.obelisk.refreshToken,
      idTokenExpiresAt: claims.exp * 1000,
    };
  }

  if (!supabaseSessionFresh(record.supabase, now)) {
    // A refresh token that was already rotated away is NOT a dead session — the
    // Obelisk identity verified above is still valid. Handing the browser a
    // consumed pair made supabase-js call GoTrue itself, get 400 invalid_grant,
    // and render a signed-out portal for a member who is signed in at the edge.
    // Mint a new compatibility session instead of shipping a pair the browser
    // has to repair and cannot.
    let renewed = null;
    try {
      renewed = await refreshSupabaseSession(record.supabase.refresh_token, { config, fetchImpl });
    } catch (_) {
      renewed = null;
    }
    if (!renewed?.access_token || renewed.user?.id !== record.link.userId) {
      renewed = await issueSupabaseCompatibilitySession(record.link.compatibilityEmail, {
        config, serviceRole: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl,
      });
    }
    if (renewed?.user?.id !== record.link.userId) return null;
    record.supabase = renewed;
  }
  record.lastSeenAt = now;
  await env.RATE_LIMIT.put(`auth:session:${sessionId}`, JSON.stringify(record), { expirationTtl: SESSION_TTL_SECONDS });
  return loaded;
}

export async function authenticateObeliskRequest(request, env, { fetchImpl = fetch } = {}) {
  const loaded = await loadSession(request, env);
  if (!loaded) return null;
  try {
    const refreshed = await refreshSessionIfNeeded(loaded, env, fetchImpl);
    if (refreshed) return refreshed;
  } catch (error) {
    console.error('Obelisk session refresh failed', { code: error?.message || 'unknown' });
  }
  await env.RATE_LIMIT?.delete(`auth:session:${loaded.sessionId}`);
  return null;
}

/**
 * RFC 7009 token revocation at Obelisk.
 *
 * Deleting our KV record only ends OUR session — it leaves the provider grant
 * and its refresh token alive, so "sign out" did not sign the user out of
 * anything durable. This revokes at the source.
 *
 * Deliberately non-fatal: a provider that is down, slow, or has no revocation
 * endpoint must never be able to trap a user in a signed-in state. Every failure
 * mode returns a report; none throw. The caller signs the user out locally
 * regardless, and the report is what makes the difference observable instead of
 * silent.
 *
 * Tokens are sent in the request BODY, never a URL — a revoked credential in a
 * query string would be logged by every hop it passes through.
 */
export async function revokeObeliskTokens(record, { config, fetchImpl = fetch } = {}) {
  let discovery = null;
  try {
    discovery = await getDiscovery(config, fetchImpl);
  } catch (_) {
    return { attempted: false, reason: 'discovery_unavailable', revoked: [], failed: [] };
  }
  const endpoint = discovery?.revocation_endpoint;
  if (!endpoint) return { attempted: false, reason: 'no_revocation_endpoint', revoked: [], failed: [] };

  // Refresh token first: revoking it invalidates the whole grant at most
  // providers, so if the second call never lands the durable credential is
  // already dead.
  const targets = [
    ['refresh_token', record?.obelisk?.refreshToken],
    ['access_token', record?.obelisk?.accessToken],
  ].filter(([, token]) => typeof token === 'string' && token.length > 0);

  // Obelisk ADVERTISES revocation_endpoint in discovery but does not implement
  // the route — verified live 2026-08-01: GET is 404 `not found` and POST is 404
  // `{"ok":false,"reason":"unknown-auth-route"}`, while genuinely implemented
  // endpoints answer with protocol errors (`invalid_request`,
  // `unsupported_grant_type`, `invalid_token`). Discovery is describing a
  // producer that was never built.
  //
  // So a 404 is NOT a revocation failure — it is the provider telling us the
  // capability is absent, and the two must not share a verdict: `failed` invites
  // a retry, `not_implemented` is a cross-repo finding. It is also cached per
  // issuer so every subsequent sign-out stops paying for a doomed round trip.
  if (unsupportedRevocation.has(config.issuer)) {
    return { attempted: false, reason: 'not_implemented', revoked: [], failed: [] };
  }

  const revoked = [];
  const failed = [];
  for (const [hint, token] of targets) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ token, token_type_hint: hint, client_id: config.clientId }).toString(),
        signal: AbortSignal.timeout(5000),
      });
      await response.body?.cancel().catch(() => {});
      if (response.status === 404) {
        unsupportedRevocation.add(config.issuer);
        return { attempted: false, reason: 'not_implemented', revoked, failed };
      }
      // RFC 7009 §2.2: a token that is already invalid is still a 200. Only a
      // transport or server failure counts as "not revoked".
      if (response.ok) revoked.push(hint); else failed.push(hint);
    } catch (_) {
      failed.push(hint);
    }
  }
  return { attempted: targets.length > 0, revoked, failed };
}

/**
 * RP-initiated logout URL, returned to the browser rather than redirected to —
 * `/api/auth/logout` is a JSON endpoint called by script, so a 302 would be
 * swallowed by fetch. The caller may navigate to it to end the Obelisk session
 * itself; skipping it still leaves the grant revoked by the call above.
 *
 * No `id_token_hint`: we deliberately do not persist the id token, and holding
 * one purely to decorate a logout URL would widen the stored credential surface
 * for no security gain.
 */
export function endSessionUrl(discovery, { config } = {}) {
  if (!discovery?.end_session_endpoint) return null;
  try {
    const url = new URL(discovery.end_session_endpoint);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('post_logout_redirect_uri', new URL(config.redirectUri).origin + '/');
    return url.toString();
  } catch (_) {
    return null;
  }
}

function publicIdentity(record) {
  return {
    provider: 'obelisk',
    sub: record.obelisk.sub,
    email: record.obelisk.email,
    name: record.obelisk.name,
    assurance: record.obelisk.assurance,
    supabaseUserId: record.link.userId,
  };
}

function sameOriginMutation(request) {
  const origin = request.headers.get('Origin');
  return !!origin && origin === new URL(request.url).origin;
}

export async function handleObeliskAuthRequest(request, env, _ctx, { fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/login' || url.pathname === '/login/') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ ok: false, code: 'method_not_allowed' }, 405);
    return startLogin(request, env, fetchImpl);
  }
  if (url.pathname === '/auth/callback' || url.pathname === '/auth/callback/') {
    if (request.method !== 'GET') return json({ ok: false, code: 'method_not_allowed' }, 405);
    return finishLogin(request, env, fetchImpl);
  }
  if (url.pathname === '/api/auth/account' && request.method === 'GET') {
    return redirect(`${authConfig(env).issuer}/account`);
  }
  if (!['/api/auth/session', '/api/auth/me', '/api/auth/logout'].includes(url.pathname)) return null;

  if (url.pathname === '/api/auth/logout') {
    if (request.method !== 'POST' || !sameOriginMutation(request)) return json({ ok: false, code: 'invalid_logout_request' }, 403);
    const config = authConfig(env);
    const loaded = await loadSession(request, env);
    let providerLogout = { attempted: false, reason: 'no_session', revoked: [], failed: [] };
    let endSession = null;
    let storeCleared = true;
    if (loaded) {
      // Revoke BEFORE dropping the record. The record is the only place the
      // tokens exist, so deleting first would strand a live provider grant we
      // can no longer revoke. Revocation is non-fatal by construction, so this
      // ordering costs nothing when the provider is unreachable.
      providerLogout = await revokeObeliskTokens(loaded.record, { config, fetchImpl });
      try {
        endSession = endSessionUrl(await getDiscovery(config, fetchImpl), { config });
      } catch (_) {
        endSession = null;
      }
      // S321 — third instance of the S319 KV-write crash class. This one cannot
      // simply 503: the browser-side logout (clearing the signed cookie below)
      // is the part that actually ends the member's session, and it succeeds
      // regardless of KV. Failing the whole request would leave the credential
      // sitting in the browser — strictly worse than a degraded store delete.
      //
      // So it degrades instead of throwing, and REPORTS the degradation rather
      // than claiming a clean logout (CANON-031). The orphaned record is
      // unreachable once the cookie is gone — no one holds its session id — and
      // it expires on its own TTL.
      try {
        await env.RATE_LIMIT?.delete(`auth:session:${loaded.sessionId}`);
      } catch (error) {
        console.error('Obelisk logout: session record delete failed', {
          code: String(error?.message || error).slice(0, 120),
        });
        storeCleared = false;
      }
      await recordJourney(env, 'logout', providerLogout);
    }
    return json({ ok: true, providerLogout, endSession, storeCleared }, 200, {
      'Set-Cookie': cookie(config.cookieName, '', { clear: true }),
    });
  }
  if (request.method !== 'GET') return json({ ok: false, code: 'method_not_allowed' }, 405);
  const loaded = await authenticateObeliskRequest(request, env, { fetchImpl });
  // Ambient identity is a public projection, so anonymous is a successful
  // null identity (avoids noisy browser 401s). The credential-bearing session
  // endpoint remains a strict 401 when the signed edge session is absent.
  if (!loaded) {
    if (url.pathname === '/api/auth/me') return json({ ok: true, identity: null });
    return json({ ok: false, code: 'not_authenticated' }, 401);
  }
  if (url.pathname === '/api/auth/me') return json({ ok: true, identity: publicIdentity(loaded.record) });
  await recordJourney(env, 'compat');
  return json({
    ok: true,
    identity: publicIdentity(loaded.record),
    supabase: {
      access_token: loaded.record.supabase.access_token,
      refresh_token: loaded.record.supabase.refresh_token,
      expires_at: loaded.record.supabase.expires_at,
      expires_in: loaded.record.supabase.expires_in,
      token_type: loaded.record.supabase.token_type,
      user: loaded.record.supabase.user,
    },
  });
}

export const __test = {
  authConfig,
  bytesToBase64Url,
  parseCookies,
  signedValue,
  verifySignedValue,
  publicIdentity,
};
