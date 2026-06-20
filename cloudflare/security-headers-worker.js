/**
 * Cloudflare Worker — Security Headers + Cache + Bot Shield + Edge Gate + Nonce CSP + Rate Limit + CSRF
 * for vaultsparkstudios.com
 *
 * Layers:
 *   1. Scanner / probe blocking (returns 403 immediately, no origin hit)
 *   2. Edge gate for private portals (401/redirect on missing session cookie)
 *   3. Rate-limit + CSRF check on POST to public forms (KV-backed)
 *   4. Worker-level cache (serves warm requests without hitting GitHub Pages)
 *   5. CSP nonce injection on HTML responses (when env.NONCE_CSP_ENABLED = "1")
 *   6. Security headers on every response
 *   7. Cache-Control headers on cacheable content types
 *
 * Env (wrangler secret put / vars):
 *   NONCE_CSP_ENABLED       — "1" to enable nonce-based CSP injection (default: off, hashes still apply)
 *   PORTAL_GATE_ENABLED     — "1" to enable edge gate on private portals (default: off)
 *   PORTAL_GATE_COOKIE      — name of httpOnly auth cookie to require (default: "vs_portal_session")
 *   RATE_LIMIT_ENABLED      — "1" to enable POST rate limiting (default: off; needs RATE_LIMIT KV binding)
 *   CSRF_SIGNING_KEY        — HMAC key for signed CSRF nonces (required if rate-limit on)
 *   RATE_LIMIT (KV)         — KV namespace binding for IP buckets
 *   TT_REPORT_SAMPLE_RATE   — optional Trusted Types report sample rate, default 0.005
 *
 * Deploy: `wrangler deploy --env production`
 */

import { WORKER_CSP } from '../config/csp-policy.mjs';
import { handleHubRequest, isHubRequest } from './hub-auth.js';
import {
  drKeyFor,
  createOriginFetch,
  issueCsrfToken,
  verifyCsrfToken,
  CSRF_TTL_MS,
  prefixAllowlist,
  makeRumUxCleaner,
} from './worker-lib.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-Robots-Tag': 'noai, noimageai',
};

const REMOVE_HEADERS = ['x-powered-by', 'server'];

// S156 audit #29 — JSON hot-path SWR. Worker serves these instant from edge,
// background-fetches origin to refresh. Aggressive SWR keeps the many-visitor
// hot path warm while origin updates land within ~5min.
const JSON_SWR_PATHS = [
  /^\/api\/public-intelligence\.json$/i,
  /^\/api\/heartbeat\.json$/i,
  /^\/api\/founder-presence\.json$/i,
  /^\/api\/vault-narrative\.json$/i,
  /^\/api\/ci-status\.json$/i,
];
const JSON_SWR_MAX_AGE = 60;        // 1min fresh
const JSON_SWR_GRACE = 300;          // 5min stale-while-revalidate window

const CACHE_RULES = [
  { pattern: /\.(js|css)(\?.*)?$/i,                ttl: 604800   },
  { pattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i, ttl: 2592000 },
  { pattern: /\.(woff2?|ttf|eot)$/i,                ttl: 2592000 },
  { pattern: /robots\.txt$/i,                       ttl: 3600    },
  { pattern: /sitemap.*\.xml$/i,                    ttl: 3600    },
  { pattern: /feed\.xml$/i,                         ttl: 3600    },
  { pattern: /manifest\.json$/i,                    ttl: 86400   },
  { pattern: /\.html$|\/$|\/[^.]+$/i,               ttl: 7200    },
];

const BLOCKED_UA_PATTERNS = [
  /zgrab/i, /masscan/i, /nuclei/i, /sqlmap/i, /nmap/i, /nikto/i, /dirbuster/i,
  /gobuster/i, /wfuzz/i, /acunetix/i, /nessus/i, /openvas/i, /burpsuite/i,
  /python-requests\/[0-9]/i, /go-http-client\/[0-9]/i, /libwww-perl/i,
  /curl\/[0-9]/i, /wget\//i,
];

const BLOCKED_PATH_PATTERNS = [
  /\/wp-(?:admin|login|content|includes)/i, /\/\.env(\b|$)/,
  /\/config\.(php|yml|yaml|json)(\b|$)/i, /\/phpinfo/i, /\/administrator\//i,
  /\/xmlrpc\.php/i, /\/_profiler/i, /\/actuator\//i, /\/\.git\//, /\/\.ssh\//,
  /\/etc\/passwd/,
];

// Private surfaces. Edge gate redirects to public sign-in if no session cookie.
const GATED_PATH_PATTERNS = [
  /^\/investor-portal(\/|$)/i,
  /^\/studio-hub(\/|$)/i,
  /^\/vault-member\/admin(\/|$)/i,
];

// Public forms protected by rate-limit + CSRF (POST only).
const RATE_LIMITED_FORM_PATHS = [
  '/contact/submit',
  '/ask-founders/submit',
];

const RATE_LIMIT_WINDOW_SEC = 3600;
const RATE_LIMIT_MAX = 3;
const RUM_MAX_BODY_BYTES = 4096;
const TT_REPORT_MAX_BODY_BYTES = 8192;
const TT_REPORT_SAMPLE_RATE = 0.005;
// S172 tt-soak-kv-probe: 1-day TTL + 0.5% sampling + low traffic meant the
// soak could never accumulate evidence (KV probe found zero tt:* keys while
// the header was live). TTL is now env-tunable so the soak window can hold
// reports long enough to be read; see TT_REPORT_TTL_SEC var in wrangler.toml.
const TT_REPORT_TTL_SEC = 86400;
function resolveTtReportTtl(env) {
  const n = Number(env?.TT_REPORT_TTL_SEC);
  // KV minimum TTL is 60s; cap at 90 days to bound storage.
  if (!Number.isFinite(n) || n < 60) return TT_REPORT_TTL_SEC;
  return Math.min(n, 90 * 86400);
}
const TT_REPORT_BUCKET_SIZE = 1000;
const TT_REPORT_CSP = "require-trusted-types-for 'script'; report-to vs-tt";
const TT_REPORTING_ENDPOINTS = 'vs-tt="/v/tt-report"';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBlockedRequest(request) {
  const ua = request.headers.get('User-Agent') || '';
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);
  if (!ua && !accept) return true;
  for (const pat of BLOCKED_UA_PATTERNS) if (pat.test(ua)) return true;
  for (const pat of BLOCKED_PATH_PATTERNS) if (pat.test(url.pathname)) return true;
  return false;
}

function isGatedPath(pathname) {
  return GATED_PATH_PATTERNS.some((p) => p.test(pathname));
}

function getCacheTTL(url) {
  const path = new URL(url).pathname;
  for (const rule of CACHE_RULES) if (rule.pattern.test(path)) return rule.ttl;
  return 0;
}

function isJsonSwrPath(url) {
  const path = new URL(url).pathname;
  return JSON_SWR_PATHS.some((p) => p.test(path));
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

function clampSampleRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return TT_REPORT_SAMPLE_RATE;
  return Math.min(Math.max(n, 0), 1);
}

// S161: time-bucketed nonce — shared within 60s windows so HTML responses can
// be edge-cached. Protects against injected inline scripts; a short window is
// too brief for a practical attack on a static site. Avoids per-request origin
// fetches.
// S175 edge-html-cache: widened 60s → 300s. Deploys now purge the zone cache
// (pages-deploy.yml), so HTML staleness is bounded by deploys, not the window;
// the wider window means 5× fewer origin round-trips per edge colo. The nonce
// security argument is unchanged in kind — the site is static and Trusted
// Types reporting watches injection sinks.
const HTML_NONCE_WINDOW_SEC = 300;
function generateWindowNonce() {
  const windowId = Math.floor(Date.now() / (HTML_NONCE_WINDOW_SEC * 1000));
  const raw = `vs_${windowId}_nonce`;
  return btoa(raw).slice(0, 24).replace(/[/+=]/g, '_');
}

// CSRF nonce stack (issue + verify, HMAC sign/verify) is the single source of
// truth in worker-lib.mjs — imported above so it can be unit-tested in isolation
// (audit #14, S183). No inline copy here to prevent drift.

// ---------------------------------------------------------------------------
// Rate limit (KV-backed sliding window via fixed bucket)
// ---------------------------------------------------------------------------

async function checkRateLimit(env, ip, path) {
  if (!env.RATE_LIMIT) return { allowed: true, remaining: RATE_LIMIT_MAX };
  const key = `rl:${path}:${ip}:${Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SEC * 1000))}`;
  const current = Number(await env.RATE_LIMIT.get(key)) || 0;
  if (current >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_SEC + 60 });
  return { allowed: true, remaining: RATE_LIMIT_MAX - current - 1 };
}

// Dedicated limiter for the unauthenticated /v/rum beacon (S182 audit). Generous
// enough for real multi-page browsing (~1 beacon/route), tight enough to stop a
// flood from inflating R2 write/storage cost OR poisoning the field dataset that
// drives the perf-budget gates. Per IP. Fails OPEN if KV is unavailable so a KV
// blip never silently drops real vitals.
const RUM_RL_WINDOW_SEC = 60;
const RUM_RL_MAX = 60;
async function checkRumRateLimit(env, ip) {
  if (!env.RATE_LIMIT || !ip) return true;
  const key = `rl:rum:${ip}:${Math.floor(Date.now() / (RUM_RL_WINDOW_SEC * 1000))}`;
  const current = Number(await env.RATE_LIMIT.get(key)) || 0;
  if (current >= RUM_RL_MAX) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RUM_RL_WINDOW_SEC + 60 });
  return true;
}

// ---------------------------------------------------------------------------
// Real-user vitals ingestion (R2-backed, no personal identifiers)
// ---------------------------------------------------------------------------

function corsRumResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Cache-Control', 'no-store');
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return new Response(body, { ...init, headers });
}

function cleanRumRoute(route) {
  const value = typeof route === 'string' ? route : '/';
  const path = value.split('?')[0].slice(0, 120);
  return path.startsWith('/') ? path : '/';
}

// S163 (audit #8): optional UX event tag on a RUM beacon. Allowlisted so only
// known interaction events are ever stored — never free text. Additive: vitals
// beacons that omit `ux` store null and behave exactly as before.
const RUM_UX_EVENTS = new Set([
  'nav-sheet:open', 'nav-sheet:close', 'nav-sheet:drag-close', 'nav-sheet:backdrop-close',
  // S186: Oracle funnel instrumentation — proactive-hint lifecycle + seeded
  // empty-state chips. Names only, no IDs/free text (same privacy model).
  'ignis-hint:shown', 'ignis-hint:dismissed', 'ignis-hint:click',
  'oracle-chip:shown', 'oracle-chip:click',
  // S187: cross-game "play next" funnel — routing impressions + clicks. Names
  // only, no IDs/free text (same privacy model).
  'play-next:shown', 'play-next:click',
  // S187: studio dispatch — non-gated email-list subscribe event (no email/PII
  // in the beacon; the address goes only to the Web3Forms transport).
  'studio-dispatch:subscribe',
  // S188: proof-to-conversion microline — impression + click-through on the
  // register-card trust line (names only, no IDs/free text; same privacy model).
  'proof-line:shown', 'proof-line:click',
  // S189: Ask IGNIS answer feedback — 1-tap helpful/unhelpful on a delivered
  // answer. Names only (no query text, no IDs); feeds api/funnel-summary.json.
  'oracle-answer:helpful', 'oracle-answer:unhelpful',
  // S195: conversational IGNIS follow-ups — ask (a typed/bare follow-up resolved
  // against the prior turn), more ("tell me more" deepener), sibling (a follow-up
  // chip from the last answer's sibling docs). Names only; client-side retrieval,
  // no query text. Measures whether the new multi-turn thread gets used.
  'oracle-followup:ask', 'oracle-followup:more', 'oracle-followup:sibling', 'oracle-followup:history',
  // S190: progressive membership unlock — fires when membership-unlock.js sets
  // body[data-vs-unlock-stage=N] based on visit/proof/dispatch signals. Names
  // only; no PII; feeds funnel-summary stage-distribution bucket.
  'membership-unlock:stage-2', 'membership-unlock:stage-3', 'membership-unlock:stage-4',
  // S190: proof embed card — fires on third-party embeds of proof-card.js to
  // measure trust-distribution reach outside the main site.
  'proof-card:embed',
  // S198: visit-streak.js — daily streak events. streak:break is static; streak:day-N
  // is emitted as a dynamic prefix (covered by RUM_UX_DYNAMIC streak family below).
  'streak:break',
  // S200: these are emitted as STATIC literals (not concatenated) and are already
  // admitted at runtime by the engagement/pwa/streak RUM_UX_DYNAMIC prefixes below,
  // but check-rum-allowlist only validates the static Set for emitted names — list
  // them here so the integrity gate stays green without loosening runtime behavior.
  'engagement:ignis_lens_opened', 'engagement:visit_depth_upsell_shown', 'engagement:ignis_synthesis_opened',
  'pwa:banner_shown', 'pwa:install_accepted', 'pwa:install_dismissed', 'pwa:already_installed',
  'streak:badge-shown',
  // S205 #8: IGNIS deep-dive link — fires when a user clicks "Explore in IGNIS" after
  // an inline oracle answer, escalating their thread to /oracle/?q=. Names only; no
  // query text committed to RUM (URL carries it; beacon carries only the intent event).
  'oracle:deepdive_click',
  'oracle:related_click',
  // S207: related chip expanded an in-place mini-catalog sub-panel (graph traversal).
  'oracle:graph_traverse',
  // S206 #3: vault-momentum social proof strip impression on /membership/.
  // Honest-dark: only emitted when api/vault-momentum.json has real data.
  'membership:momentum_strip_shown',
  // S206 #1: adaptive oracle intro — fires when returning-visitor personalization
  // is applied on /ignis/ (≥1 history entry found in localStorage vs_ignis_history).
  'oracle:personalized_intro_shown',
  // S206 #7: smart trial offer — high-intent visitor conversion nudge.
  // Gate: vs_trial_offered; fires exactly once per device.
  'funnel:trial_offer_shown',
  'funnel:trial_offer_clicked',
  'funnel:trial_offer_dismissed',
  // S206 #13: oracle feedback close — text captured on thumbs-down; no text
  // stored in RUM, just the submission event for volume tracking.
  'oracle:feedback_submitted',
  // S211 Wave 3: entity-derived follow-up chips ("Dig deeper:" row below oracle answers).
  'oracle:followup_shown', 'oracle:followup_click',
  // S206 #11: vault passport — member card impression + share action.
  'passport:viewed',
  'passport:shared',
  // S207: anonymous viewer opened a shared passport → inbound join surface.
  'passport:inbound',
  // S210 #1: page-aware context chip clicked (oracle suggestion pre-populated for this pathname).
  'oracle:suggestion_click',
  // S210 #5: IGNIS offline fallback shown — network failure surfaced cached prefix entries.
  'oracle:offline_cache_shown',
  // S210 #2: returning-visitor signal strip — "What sparked since your last visit".
  'strip:signal_shown',
  'strip:dismissed',
  'strip:changelog_click',
  // S211 Wave 1: web-push subscription events from push-subscribe.js.
  'push:subscribed', 'push:unsubscribed', 'push:error', 'push:prompt_shown',
]);
// S192: bounded dynamic families. The exact Set above stays authoritative for
// static names; these admit `${family}:${suffix}` (single bounded token) so
// dynamic instrumentation ships without loosening the global allowlist.
//   - oracle-answer:helpful:<clusterId> / :unhelpful:<clusterId> (S192 #5) —
//     per-cluster Ask IGNIS feedback; clusterId is [a-z0-9-], <=24 chars.
//   - funnel:<name> (S194) — named-event conversion funnel (home_hero_play_click,
//     interview_start_click, membership CTAs, *_engaged/*_submit_started forms).
//     funnel-tracking.js was a dead gtag no-op until S194; rewired to /v/rum under
//     this one bounded family so homepage-CTA + interview-funnel data finally lands
//     without a 30-entry exact-Set. suffix is [a-z0-9_], <=48 chars.
//   - source:<bucket> (S194) — acquisition channel (search/social/direct/referral),
//     domain-classified client-side. Never a full URL; one bounded lowercase token.
const RUM_UX_DYNAMIC = [
  prefixAllowlist('oracle-answer:helpful', { maxLen: 24 }),
  prefixAllowlist('oracle-answer:unhelpful', { maxLen: 24 }),
  // S207: oracle-feedback:<clusterId> — topic attribution of "tell us more" submissions.
  prefixAllowlist('oracle-feedback', { charset: /^[a-z0-9-]+$/, maxLen: 24 }),
  prefixAllowlist('funnel', { charset: /^[a-z0-9_]+$/, maxLen: 48 }),
  prefixAllowlist('source', { charset: /^[a-z]+$/, maxLen: 16 }),
  // S194: share:<gameSlug>:<outcome> — per-game share button (native|copy|cancel|
  // error). Two bounded tokens: slug is [a-z0-9-], outcome is [a-z]. Names only.
  prefixAllowlist('share', { charset: /^[a-z0-9-]+:[a-z]+$/, maxLen: 40 }),
  // S198: streak:day-N (N 1-30) + streak:break — daily visit streak from visit-streak.js.
  // S199: streak:badge-shown — fires when badge renders (uptake signal, no trailing day/N).
  prefixAllowlist('streak', { charset: /^[a-z0-9-]+$/, maxLen: 12 }),
  // S198: engagement:scroll_N (25/50/75/100) + engagement:exit_intent_shown/answered —
  // primary in-page engagement signals, previously dead gtag sinks, now land in /v/rum.
  // S199: + engagement:visit_depth_upsell_shown + engagement:ignis_lens_opened (funnel L3)
  prefixAllowlist('engagement', { charset: /^[a-z0-9_]+$/, maxLen: 48 }),
  // S199: pwa:banner_shown / install_accepted / install_dismissed / already_installed —
  // PWA install funnel from pwa-install.js. Bounded; no session/user data.
  prefixAllowlist('pwa', { charset: /^[a-z_]+$/, maxLen: 24 }),
  // S205 #15: constellation:unlock:<id> — fires when a 3-page sequence completes.
  // id is [a-z0-9-], max 24 chars. Names only; no path/user data in beacon.
  prefixAllowlist('constellation', { charset: /^[a-z0-9:-]+$/, maxLen: 36 }),
  // S207: cta:variant:<id>:<n> — dead-cta-rotation-loop variant attribution.
  prefixAllowlist('cta', { charset: /^[a-z0-9:-]+$/, maxLen: 36 }),
];
const cleanRumUxEvent = makeRumUxCleaner(RUM_UX_EVENTS, RUM_UX_DYNAMIC);

function cleanRumNumber(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n), max);
}

async function handleRumIngest(request, env, ctx) {
  if (request.method === 'OPTIONS') return corsRumResponse(null, { status: 204 });
  if (request.method !== 'POST') return corsRumResponse(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405 });
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > RUM_MAX_BODY_BYTES) return corsRumResponse(JSON.stringify({ ok: false, error: 'payload_too_large' }), { status: 413 });
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await checkRumRateLimit(env, ip))) {
    return corsRumResponse(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429 });
  }
  let raw;
  try { raw = await request.json(); } catch { return corsRumResponse(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400 }); }
  const vitals = raw && typeof raw.vitals === 'object' ? raw.vitals : {};
  const context = raw && typeof raw.context === 'object' ? raw.context : {};
  const now = new Date();
  const row = {
    schemaVersion: '1.0',
    ts: now.toISOString(),
    route: cleanRumRoute(raw?.route),
    ux: cleanRumUxEvent(raw?.ux),
    vitals: {
      lcp: cleanRumNumber(vitals.lcp, 60000),
      fcp: cleanRumNumber(vitals.fcp, 60000),
      cls: typeof vitals.cls === 'number' ? Math.min(Math.max(vitals.cls, 0), 5) : null,
      inp: cleanRumNumber(vitals.inp, 10000),
      ttfb: cleanRumNumber(vitals.ttfb, 60000),
    },
    context: {
      connection: String(context.connection || 'unknown').slice(0, 24),
      saveData: !!context.saveData,
      viewport: String(context.viewport || 'unknown').slice(0, 24),
      theme: String(context.theme || 'default').slice(0, 32),
    },
    cf: {
      colo: request.cf?.colo || null,
      country: request.cf?.country || null,
    },
  };
  if (env.RUM_BUCKET) {
    const day = row.ts.slice(0, 10);
    const key = `rum/raw/dt=${day}/${crypto.randomUUID()}.json`;
    ctx.waitUntil(env.RUM_BUCKET.put(key, JSON.stringify(row), {
      httpMetadata: { contentType: 'application/json' },
    }));
  }
  return corsRumResponse(JSON.stringify({ ok: true }), { status: 202 });
}

// ---------------------------------------------------------------------------
// Trusted Types report-only intake (KV-backed, sampled, privacy-minimized)
// ---------------------------------------------------------------------------

function stripQuery(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, 'https://vaultsparkstudios.com');
    return `${url.origin}${url.pathname}`.slice(0, 240);
  } catch {
    return value.split('?')[0].slice(0, 240);
  }
}

function cleanReportText(value, max = 160) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : null;
}

function normalizeOneTrustedTypesReport(entry, request) {
  // S174 tt-intake-forensics-fix: handle all three wire shapes —
  //   1. Reporting API entry: { type: 'csp-violation', url, body: {...} }  (modern Chrome via report-to)
  //   2. Legacy wrapper:      { 'csp-report': {...} }                       (report-uri)
  //   3. Bare report object:  { documentURL, blockedURL, ... }
  // Before this fix, shape 1 fell through to the bare branch with the OUTER
  // envelope, so every field read null and forensics was blind (80/81 rows).
  const body = entry?.body && typeof entry.body === 'object' ? entry.body : entry;
  const report = body?.['csp-report'] || body?.['content-security-policy-report'] || body || {};
  return {
    schemaVersion: '1.1',
    ts: new Date().toISOString(),
    type: 'trusted-types-report-only',
    documentUri: stripQuery(report['document-uri'] || report.documentURL || report.url || entry?.url),
    referrer: stripQuery(report.referrer),
    blockedUri: stripQuery(report['blocked-uri'] || report.blockedURL),
    sourceFile: stripQuery(report['source-file'] || report.sourceFile),
    lineNumber: Number.isFinite(Number(report['line-number'] || report.lineNumber)) ? Number(report['line-number'] || report.lineNumber) : null,
    columnNumber: Number.isFinite(Number(report['column-number'] || report.columnNumber)) ? Number(report['column-number'] || report.columnNumber) : null,
    violatedDirective: cleanReportText(report['violated-directive'] || report.violatedDirective, 120),
    effectiveDirective: cleanReportText(report['effective-directive'] || report.effectiveDirective, 120),
    disposition: cleanReportText(report.disposition, 40),
    originalPolicy: cleanReportText(report['original-policy'] || report.originalPolicy, 240),
    // The sink sample is the single most useful forensic field — a truncated
    // snippet of what was passed to the sink. Privacy-minimized to 120 chars.
    sample: cleanReportText(report.sample, 120),
    cf: {
      colo: request.cf?.colo || null,
      country: request.cf?.country || null,
    },
  };
}

function normalizeTrustedTypesReports(raw, request) {
  // Reporting API batches reports as an array; legacy report-uri posts one
  // object. Normalize to a bounded list either way.
  const entries = Array.isArray(raw) ? raw.slice(0, 5) : [raw];
  return entries
    .filter((e) => e && typeof e === 'object')
    .map((e) => normalizeOneTrustedTypesReport(e, request));
}

async function handleTrustedTypesReport(request, env, ctx) {
  if (request.method !== 'POST') return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > TT_REPORT_MAX_BODY_BYTES) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  const sampleRate = clampSampleRate(env.TT_REPORT_SAMPLE_RATE);
  if (sampleRate <= 0 || Math.random() > sampleRate) {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }

  let raw;
  try { raw = await request.json(); } catch { return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }); }
  if (!env.RATE_LIMIT) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  const reports = normalizeTrustedTypesReports(raw, request);
  if (!reports.length) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  const day = reports[0].ts.slice(0, 10);
  const counterKey = `tt:${day}:counter`;
  const current = Number(await env.RATE_LIMIT.get(counterKey)) || 0;
  const ttlSec = resolveTtReportTtl(env);
  const puts = [];
  let next = current;
  for (const normalized of reports) {
    next = (next + 1) % TT_REPORT_BUCKET_SIZE;
    const key = `tt:${day}:${String(next).padStart(4, '0')}`;
    puts.push(env.RATE_LIMIT.put(key, JSON.stringify(normalized), { expirationTtl: ttlSec }));
  }
  puts.push(env.RATE_LIMIT.put(counterKey, String(next), { expirationTtl: ttlSec + 3600 }));
  ctx.waitUntil(Promise.all(puts));
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

// ---------------------------------------------------------------------------
// Web-push subscription storage (S211)
// Stores/removes PushSubscription JSON in RATE_LIMIT KV under vs:push:sub:<hash>.
// Key is the first 32 hex chars of SHA-256(endpoint) — identifies the subscription
// without persisting the raw endpoint URL as a KV key.
// ---------------------------------------------------------------------------
async function handlePushSubscribe(request, env, ctx) {
  const NO_STORE = { 'Cache-Control': 'no-store' };
  const JSON_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };

  if (!env.RATE_LIMIT) {
    return new Response(JSON.stringify({ ok: false, error: 'storage_unavailable' }), { status: 503, headers: JSON_HEADERS });
  }

  async function hashEndpoint(endpoint) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  if (request.method === 'POST') {
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > 4096) return new Response(null, { status: 413, headers: NO_STORE });
    let sub;
    try { sub = await request.json(); } catch {
      return new Response(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400, headers: JSON_HEADERS });
    }
    const ep = sub?.endpoint;
    if (!ep || typeof ep !== 'string' || ep.length > 512) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_endpoint' }), { status: 400, headers: JSON_HEADERS });
    }
    const hash = await hashEndpoint(ep);
    const payload = JSON.stringify({ endpoint: ep, keys: sub.keys || null, registeredAt: new Date().toISOString() });
    ctx.waitUntil(env.RATE_LIMIT.put(`vs:push:sub:${hash}`, payload, { expirationTtl: 7776000 }));
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers: JSON_HEADERS });
  }

  if (request.method === 'DELETE') {
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > 2048) return new Response(null, { status: 413, headers: NO_STORE });
    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400, headers: JSON_HEADERS });
    }
    const ep = body?.endpoint;
    if (!ep || typeof ep !== 'string' || ep.length > 512) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_endpoint' }), { status: 400, headers: JSON_HEADERS });
    }
    const hash = await hashEndpoint(ep);
    ctx.waitUntil(env.RATE_LIMIT.delete(`vs:push:sub:${hash}`));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: JSON_HEADERS });
}

// ---------------------------------------------------------------------------
// CSP — hash mode (default) vs nonce mode (env-flagged migration)
// ---------------------------------------------------------------------------

function buildCspWithNonce(nonce) {
  // Add nonce + strict-dynamic to the existing hash list. Hashes are NOT removed
  // because about:srcdoc frames (e.g. Cloudflare Turnstile) inherit the parent CSP
  // but cannot receive a nonce injection — they rely on hashes even in nonce mode.
  return WORKER_CSP.replace(/script-src ([^;]+);/, (_match, srcs) => {
    const merged = srcs
      .split(/\s+/)
      .concat([`'nonce-${nonce}'`, "'strict-dynamic'"])
      .join(' ');
    return `script-src ${merged};`;
  });
}

class NonceInjector {
  constructor(nonce) {
    this.nonce = nonce;
  }
  element(el) {
    if (el.tagName === 'script' || el.tagName === 'style') {
      if (!el.getAttribute('nonce')) el.setAttribute('nonce', this.nonce);
    }
    if (el.tagName === 'head') {
      el.append(`<meta name="csp-nonce" content="${this.nonce}">`, { html: true });
    }
  }
}

// Removes <meta http-equiv="Content-Security-Policy"> so the HTTP-header
// nonce-based policy is the sole enforcer (browser applies both if both exist).
class MetaCspStripper {
  element(el) {
    const httpEquiv = el.getAttribute('http-equiv') || '';
    if (httpEquiv.toLowerCase() === 'content-security-policy') {
      el.remove();
    }
  }
}

// ---------------------------------------------------------------------------
// Response builder
// ---------------------------------------------------------------------------

function withSecurityHeaders(response, { ttl = 0, csp, extra, jsonSwr = false } = {}) {
  const newHeaders = new Headers(response.headers);
  for (const h of REMOVE_HEADERS) newHeaders.delete(h);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) newHeaders.set(key, value);
  if (csp) {
    newHeaders.set('Content-Security-Policy', csp);
    // S156 #32 — begin Trusted Types in report-only mode without waiting on R2.
    // Reports land in the existing RATE_LIMIT KV namespace through /v/tt-report.
    newHeaders.set('Content-Security-Policy-Report-Only', TT_REPORT_CSP);
    newHeaders.set('Reporting-Endpoints', TT_REPORTING_ENDPOINTS);
  }
  if (jsonSwr) {
    // S156 #29 — JSON hot path: short max-age + long SWR window so visitors
    // always get instant edge while origin refreshes in the background.
    newHeaders.set('Cache-Control', `public, max-age=${JSON_SWR_MAX_AGE}, s-maxage=${JSON_SWR_MAX_AGE}, stale-while-revalidate=${JSON_SWR_GRACE}`);
    newHeaders.set('Vary', 'Accept-Encoding');
  } else if (ttl > 0) {
    newHeaders.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=60`);
    newHeaders.set('Vary', 'Accept-Encoding');
  } else {
    newHeaders.set('Cache-Control', 'no-store');
  }
  if (extra) for (const [k, v] of Object.entries(extra)) newHeaders.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    // S175 origin-failover (and zero-downtime origin cutover): if the primary
    // origin 5xxs or the fetch throws, retry against the Cloudflare Pages
    // deployment directly. During a DNS/custom-domain transition window the
    // proxied origin can 522 while Pages validates — visitors never see it.
    // Permanent benefit: pages.dev keeps serving even if the custom-domain
    // layer breaks. GET/HEAD only (idempotent).
    const FALLBACK_ORIGIN = env.FALLBACK_ORIGIN || 'https://vaultsparkstudios-website.pages.dev';
    // S179 self-loop fix: this Worker owns the `vaultsparkstudios.com/*` route, so
    // `fetch(request)` re-enters the same route instead of hitting an origin. After
    // the S175 Pages migration the apex has no separate backing origin, so the
    // primary fetch hung with zero bytes (founder saw "site not loading" 2026-06-08
    // — full outage, not a CF bot-challenge). The Worker must fetch the Pages origin
    // by hostname, never its own apex. PRIMARY_ORIGIN defaults to the Pages deploy;
    // override via env only if a non-looping proxied origin is ever reintroduced.
    const PRIMARY_ORIGIN = env.PRIMARY_ORIGIN || FALLBACK_ORIGIN;
    // S176 disaster-recovery + S177 origin-hang hardening: the origin-fetch
    // orchestration (time-bounded primary → pages.dev fallback → stale DR cache
    // for HTML navs; POSTs keep no-abort behavior) lives in worker-lib.mjs so it
    // is unit-tested in isolation (audit #14, S183). Behavior is unchanged —
    // this call wires the live globals (fetch, caches) into the same logic.
    const originFetch = createOriginFetch({ PRIMARY_ORIGIN, FALLBACK_ORIGIN });
    const url = new URL(request.url);
    const method = request.method;
    const isSolaraGameRoute = /^\/solara(\/|$)/i.test(url.pathname);

    // --- Layer 0: Real-user vitals beacon ingestion --------------------------
    if (url.pathname === '/v/rum') {
      return handleRumIngest(request, env, ctx);
    }

    // --- Layer 0: Trusted Types report-only intake --------------------------
    if (url.pathname === '/v/tt-report') {
      return handleTrustedTypesReport(request, env, ctx);
    }

    // --- Layer 0: CSP violation reporting (S199) ----------------------------
    // report-uri /v/csp-report in WORKER_CSP routes browser violations here.
    // Stores structured entries in KV under csp:date:sequence (same namespace
    // as TT reports). Sampled at 100% — full CSP violations are rare and high-signal.
    if (url.pathname === '/v/csp-report') {
      if (request.method !== 'POST') return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      const len = Number(request.headers.get('Content-Length') || 0);
      if (len > 16384) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      try {
        const raw = await request.json();
        if (env.RATE_LIMIT) {
          const report = raw?.['csp-report'] || raw?.['content-security-policy-report'] || raw || {};
          const day = new Date().toISOString().slice(0, 10);
          const counterKey = `csp:${day}:counter`;
          const current = Number(await env.RATE_LIMIT.get(counterKey)) || 0;
          const next = (current + 1) % 200;
          const entry = {
            ts: new Date().toISOString(),
            directive: String(report['violated-directive'] || report.violatedDirective || '').slice(0, 120),
            blockedUri: String(report['blocked-uri'] || report.blockedURL || '').slice(0, 200),
            documentUri: String(report['document-uri'] || report.documentURL || '').slice(0, 200),
          };
          ctx.waitUntil(Promise.all([
            env.RATE_LIMIT.put(`csp:${day}:${String(next).padStart(4, '0')}`, JSON.stringify(entry), { expirationTtl: 259200 }),
            env.RATE_LIMIT.put(counterKey, String(next), { expirationTtl: 262800 }),
          ]));
        }
      } catch (_) { /* absorb parse errors — always 204 */ }
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    // --- Layer 0: Web-push subscription management (S211) -------------------
    // POST stores subscription JSON in KV (vs:push:sub:<sha256-prefix>); TTL 90d.
    // DELETE removes by hashed endpoint. Same-origin; no CORS needed.
    if (url.pathname === '/v/push-subscribe') {
      return handlePushSubscribe(request, env, ctx);
    }

    // --- Layer 0a: hub subdomain terminates here, independent pipeline ---
    if (isHubRequest(url)) {
      const hubResponse = await handleHubRequest(request, env);
      if (hubResponse) return hubResponse;
    }

    // --- Layer 0b: 301 redirect legacy /studio-hub/* to hub subdomain ---
    if (env.HUB_SUBDOMAIN_ENABLED === '1' && /^\/studio-hub(\/|$)/i.test(url.pathname)) {
      const tail = url.pathname.replace(/^\/studio-hub/i, '') || '/';
      return Response.redirect(`https://hub.vaultsparkstudios.com${tail}${url.search}`, 301);
    }

    // --- Layer 0c: 301 redirects for legacy project/game paths ---------------
    // S127: Studio-wide landing-page consolidation. Old top-level paths and
    // duplicate /projects/ paths point at canonical /games/<slug>/ or external
    // canonical domains. Edge 301s preserve link equity and replace meta-refresh.
    // S147 (redirect-stub-purge): expanded to retire 38 meta-refresh stub files
    // (root legacy paths · /investor → /investor-portal · entire /products/ tree).
    const LEGACY_PATH_REDIRECTS = {
      // Root-level legacy slugs → canonical surfaces
      '/vaultfront': '/games/vaultfront/',
      '/gridiron-gm': '/games/gridiron-gm/',
      '/open-source': '/rights/',
      // Investor portal canonicalization
      '/investor': '/investor-portal/',
      '/investor/admin': '/investor-portal/admin/',
      '/investor/apply': '/investor-portal/apply/',
      '/investor/documents': '/investor-portal/documents/',
      '/investor/login': '/investor-portal/login/',
      '/investor/message': '/investor-portal/message/',
      '/investor/profile': '/investor-portal/profile/',
      '/investor/updates': '/investor-portal/updates/',
      // /products/ tree (S127 deprecated; S147 purged) — see PRODUCTS_PATH_REDIRECTS below
      '/products': '/projects/',
      // VaultFront moved from /projects/ to /games/ — canonical now /games/vaultfront/
      '/projects/vaultfront': '/games/vaultfront/',
      // S160 #20 (redundance-purge): /signal-log/ retired into /journal/ — every
      // public communications signal is now an entry inside the journal feed.
      '/signal-log': '/journal/',
    };
    // /products/<slug> tree → canonical per-project surfaces (S147)
    const PRODUCTS_PATH_REDIRECTS = {
      '/products/canon': '/projects/canon/',
      '/products/gridiron-gm': '/games/gridiron-gm/',
      '/products/gridiron-gm-play': '/games/gridiron-gm/',
      '/products/ideaforge': '/projects/ideaforge/',
      '/products/living-protocol': '/projects/the-living-protocol/',
      '/products/mindframe': '/games/mindframe/',
      '/products/orva-eon': '/studio/',
      '/products/promogrind': '/projects/promogrind/',
      '/products/scriptorium': '/studio/',
      '/products/seamline': '/projects/seamline/',
      '/products/solara': '/games/solara/',
      '/products/sparkfunnel': '/studio/',
      '/products/statvault': '/projects/statvault/',
      '/products/studio-ops': '/studio/',
      '/products/the-exodus': '/games/the-exodus/',
      '/products/vaultfront': '/games/vaultfront/',
      '/products/vaultspark-football-gm': '/games/vaultspark-football-gm/',
      '/products/vaultspark-forge': '/studio/',
      '/products/vaultspark-ignis': '/ignis/',
      '/products/vaultspark-studio-hub': '/studio/',
      '/products/vaultspark-studios-social-dashboard': '/studio/',
      '/products/vaultsparkstudios-website': '/',
      '/products/velaxis': '/projects/velaxis/',
      '/products/voidfall': '/universe/voidfall/',
      '/products/voidfall-companion': '/universe/voidfall/',
    };
    // S147 (leaderboards-collapse): retire 7 thin leaderboard sub-shells
    // that each shipped 238 lines of identical chrome around a CTA. The
    // main /leaderboards/ page already handles hash-anchor routing via
    // window.location.hash → .lb-game-tab click. Edge 301s preserve the
    // SEO URLs while the visitor lands directly on the correct tab.
    const LEADERBOARD_REDIRECTS = {
      '/leaderboards/call-of-doodie': '/leaderboards/#doodie',
      '/leaderboards/challenges':     '/leaderboards/#challenges',
      '/leaderboards/football-gm':    '/leaderboards/#football',
      '/leaderboards/global':         '/leaderboards/#global',
      '/leaderboards/teams':          '/leaderboards/#teams',
      '/leaderboards/weekly':         '/leaderboards/#weekly',
      '/leaderboards/recruiters':     '/leaderboards/#referrals',
    };
    for (const [from, to] of Object.entries(LEADERBOARD_REDIRECTS)) {
      const re = new RegExp(`^${from}(/|$)`, 'i');
      if (re.test(url.pathname)) {
        return Response.redirect(`${url.origin}${to}`, 301);
      }
    }

    // /products/<slug> evaluated first (more specific than the bare /products → /projects/ fallback)
    for (const [from, to] of Object.entries(PRODUCTS_PATH_REDIRECTS)) {
      const re = new RegExp(`^${from}(/|$)`, 'i');
      if (re.test(url.pathname)) {
        return Response.redirect(`${url.origin}${to}${url.search}`, 301);
      }
    }
    for (const [from, to] of Object.entries(LEGACY_PATH_REDIRECTS)) {
      const re = new RegExp(`^${from}(/|$)`, 'i');
      if (re.test(url.pathname)) {
        return Response.redirect(`${url.origin}${to}${url.search}`, 301);
      }
    }
    // External canonicals (full-domain handoffs)
    if (/^\/call-of-doodie(\/|$)/i.test(url.pathname)) {
      const tail = url.pathname.replace(/^\/call-of-doodie/i, '') || '/';
      return Response.redirect(`https://callofdoodie.wtf${tail}${url.search}`, 301);
    }
    if (/^\/products\/call-of-doodie(\/|$)/i.test(url.pathname)) {
      return Response.redirect('https://callofdoodie.wtf/', 301);
    }
    if (/^\/products\/vorn(\/|$)/i.test(url.pathname)) {
      return Response.redirect('https://joinvorn.com/', 301);
    }
    // S205 #10 L1: membership cluster consolidation — redirect old paths to unified hub
    if (/^\/membership-value(\/|$)/i.test(url.pathname)) {
      return Response.redirect(`${url.origin}/membership/#benefits`, 301);
    }
    if (/^\/vaultsparked(\/|$)/i.test(url.pathname)) {
      return Response.redirect(`${url.origin}/membership/#tiers`, 301);
    }

    // --- Layer 0: CSRF token endpoint (lightweight, public, no caching) ---
    if (method === 'GET' && url.pathname === '/_csrf') {
      const token = await issueCsrfToken(env);
      if (!token) return new Response('CSRF disabled', { status: 503 });
      return withSecurityHeaders(
        new Response(JSON.stringify({ token, ttlSec: Math.floor(CSRF_TTL_MS / 1000) }), {
          headers: { 'Content-Type': 'application/json' },
        }),
        { ttl: 0, csp: WORKER_CSP }
      );
    }

    // --- Layer 1: Scanner / probe blocking ---
    if (isBlockedRequest(request)) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
    }

    // --- Layer 2: Edge gate for private portals ---
    if (env.PORTAL_GATE_ENABLED === '1' && isGatedPath(url.pathname)) {
      const cookieName = env.PORTAL_GATE_COOKIE || 'vs_portal_session';
      const session = getCookie(request, cookieName);
      if (!session) {
        // Soft gate: redirect to /vault-member/?gate=1&return=... so JS can re-auth and set cookie.
        const back = encodeURIComponent(url.pathname + url.search);
        return Response.redirect(`${url.origin}/vault-member/?gate=1&return=${back}`, 302);
      }
    }

    // --- Layer 3: Rate-limit + CSRF on protected POST forms ---
    if (method === 'POST' && env.RATE_LIMIT_ENABLED === '1' && RATE_LIMITED_FORM_PATHS.includes(url.pathname)) {
      const ip = getClientIp(request);
      const csrf = request.headers.get('X-CSRF-Token') || '';
      if (!(await verifyCsrfToken(env, csrf))) {
        return new Response('Invalid or expired CSRF token', { status: 403 });
      }
      const { allowed, remaining } = await checkRateLimit(env, ip, url.pathname);
      if (!allowed) {
        return withSecurityHeaders(
          new Response('Too many requests. Try again in an hour.', { status: 429 }),
          { ttl: 0, csp: WORKER_CSP, extra: { 'Retry-After': String(RATE_LIMIT_WINDOW_SEC) } }
        );
      }
      // Attach remaining count for client visibility.
      const upstream = await originFetch(request);
      return withSecurityHeaders(upstream, { ttl: 0, csp: WORKER_CSP, extra: { 'X-RateLimit-Remaining': String(remaining) } });
    }

    // Pass non-GET/HEAD through with security headers only.
    if (method !== 'GET' && method !== 'HEAD') {
      const passthrough = await originFetch(request);
      return withSecurityHeaders(passthrough, { ttl: 0, csp: WORKER_CSP });
    }

    const ttl = getCacheTTL(request.url);
    const jsonSwr = isJsonSwrPath(request.url);
    const nonceModeOn = env.NONCE_CSP_ENABLED === '1';
    const cache = caches.default;

    // --- Layer 4: Worker cache lookup (TTL paths, JSON SWR, and nonce-mode HTML) ---
    // Nonce-mode HTML: use window-keyed cache request so each 60s bucket is a
    // separate cache entry. The window query param is stripped before origin fetch.
    const curWindow = Math.floor(Date.now() / (HTML_NONCE_WINDOW_SEC * 1000));
    const htmlCacheKey = nonceModeOn ? new Request(`${request.url}${request.url.includes('?') ? '&' : '?'}_vsw=${curWindow}`) : null;
    if (!isSolaraGameRoute && (ttl > 0 || jsonSwr || nonceModeOn)) {
      const cacheReq = htmlCacheKey || request;
      const cached = await cache.match(cacheReq);
      if (cached) return cached;
    }

    // --- Layer 5: Origin fetch + optional nonce injection on HTML ---
    const upstream = await originFetch(request);
    const contentType = upstream.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');

    let finalResponse;
    if (isHtml && nonceModeOn) {
      // S161: window nonce enables edge caching of HTML — eliminates GitHub Pages
      // slowness exposing visitors on every uncached request.
      const nonce = generateWindowNonce();
      const rewriter = new HTMLRewriter()
        .on('meta', new MetaCspStripper())
        .on('script,style', new NonceInjector(nonce))
        .on('head', new NonceInjector(nonce));
      const rewritten = rewriter.transform(upstream);
      finalResponse = withSecurityHeaders(rewritten, { ttl: HTML_NONCE_WINDOW_SEC, csp: buildCspWithNonce(nonce) });
    } else if (jsonSwr) {
      finalResponse = withSecurityHeaders(upstream, { jsonSwr: true, csp: WORKER_CSP });
    } else {
      finalResponse = withSecurityHeaders(upstream, { ttl, csp: WORKER_CSP });
    }

    // --- Layer 6: Cache successful 200 responses ---
    // HTML in nonce mode: cache under the window-keyed request for HTML_NONCE_WINDOW_SEC.
    if (upstream.status === 200) {
      if (isSolaraGameRoute) {
        // The Solara game bundle is published as a nested static app under
        // /solara/. Do not serve stale shell fallback HTML from Worker cache.
      } else if (isHtml && nonceModeOn && htmlCacheKey) {
        ctx.waitUntil(cache.put(htmlCacheKey, finalResponse.clone()));
      } else if ((ttl > 0 || jsonSwr) && !(isHtml && nonceModeOn)) {
        ctx.waitUntil(cache.put(request, finalResponse.clone()));
      }
      // S176: refresh the disaster-recovery copy on every healthy HTML pass.
      // Stored with 7-day retention under its own key so it outlives the
      // rotating nonce-window entries and stays servable through an outage.
      if (isHtml) {
        const drCopy = finalResponse.clone();
        const dr = new Response(drCopy.body, drCopy);
        dr.headers.set('Cache-Control', 'public, max-age=604800');
        ctx.waitUntil(cache.put(drKeyFor(request.url), dr));
      }
    }

    return finalResponse;
  },
};
