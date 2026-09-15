// VaultSpark Studios — Monthly Member Newsletter unsubscribe endpoint.
//
// Linked from every send-member-newsletter email, both as the visible footer link
// and as the RFC 2369 List-Unsubscribe header with RFC 8058 List-Unsubscribe-Post.
//
//   GET  ?token=<32 hex>   → confirmation page with a POST button. NEVER mutates:
//                            mail security scanners pre-fetch every link.
//   POST ?token=<32 hex>   body List-Unsubscribe=One-Click → unsubscribe, 200 text/plain (RFC 8058)
//   POST ?token=<32 hex>   body confirm=yes                → unsubscribe, "You're unsubscribed" page
//
// Unknown tokens get the same success response as known ones, so the endpoint
// cannot be used to test whether a token exists. Malformed tokens are 400 before
// any database access.
//
// HOSTING NOTE: on the default *.supabase.co domain the platform rewrites
// text/html GET responses to text/plain (Supabase Edge Functions limits), so a
// human would see page source. One-click POST works there; the human-facing link
// must be served from a custom domain / site proxy, configured via
// NEWSLETTER_UNSUBSCRIBE_BASE on send-member-newsletter. The form action is a
// relative URL so it posts back to whichever origin served the page.
//
// Deploy: node scripts/deploy-member-newsletter.mjs --deploy (self-contained file,
// no relative imports; verify_jwt=false pinned in supabase/config.toml — the caller
// is an email client or a mailbox provider, never a Supabase user).
//
// Function env (names only): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (platform),
//   APP_URL (optional, default https://vaultsparkstudios.com).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_APP_URL = 'https://vaultsparkstudios.com';
const MAX_BODY_BYTES = 2048;
export const TOKEN_RE = /^[0-9a-f]{32}$/;

export type UnsubscribeOutcome = 'unsubscribed' | 'unknown';

/** Data boundary — Supabase in production, a fake in tests. Throws on infrastructure failure. */
export interface UnsubscribeData {
  unsubscribe(token: string): Promise<UnsubscribeOutcome>;
}

export interface Deps {
  env(name: string): string | undefined;
  data(): UnsubscribeData;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Exactly one `token` query parameter, 32 hex characters (the DB default shape). */
export function parseToken(url: URL): string | null {
  const values = url.searchParams.getAll('token');
  if (values.length !== 1) return null;
  const token = values[0].trim().toLowerCase();
  return TOKEN_RE.test(token) ? token : null;
}

export const PAGE_STYLE = `
:root{color-scheme:dark light;--bg:#080c18;--card:#0d1220;--text:#e2e8f0;--muted:#a3b1c6;--accent:#FFC400;--on-accent:#000;--line:rgba(255,255,255,.12)}
@media (prefers-color-scheme: light){:root{--bg:#f6f4ee;--card:#fff;--text:#111827;--muted:#4b5563;--accent:#8a5a00;--on-accent:#fff;--line:rgba(0,0,0,.14)}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;padding:24px 16px}
main{width:100%;max-width:520px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:32px 24px}
.brand{font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.brand a{color:var(--accent);text-decoration:none}
h1{font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.25;margin:16px 0 12px}
p{color:var(--muted);margin:0 0 20px}
.after{margin-top:20px;margin-bottom:0}
a{color:var(--accent)}
button{font:inherit;font-weight:800;font-size:16px;min-height:48px;padding:12px 20px;border:0;border-radius:10px;background:var(--accent);color:var(--on-accent);cursor:pointer;width:100%}
button:focus-visible,a:focus-visible{outline:3px solid var(--text);outline-offset:3px}
footer{margin-top:28px;border-top:1px solid var(--line);padding-top:16px;font-size:13px;color:var(--muted)}
footer a{color:var(--muted)}
`;

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

export const STYLE_HASH = `sha256-${await sha256Base64(PAGE_STYLE)}`;

export const PAGE_CSP = [
  "default-src 'none'",
  `style-src '${STYLE_HASH}'`,
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': PAGE_CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};

const TEXT_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

export function renderPage(opts: { title: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(opts.title)} — VaultSpark Studios</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
<div class="brand"><a href="https://vaultsparkstudios.com/">VaultSpark Studios</a></div>
${opts.bodyHtml}
<footer>© ${new Date().getUTCFullYear()} VaultSpark Studios LLC. All rights reserved. · <a href="https://vaultsparkstudios.com/privacy/">Privacy Policy</a></footer>
</main>
</body>
</html>`;
}

export function confirmPage(token: string, appUrl: string): string {
  return renderPage({
    title: 'Unsubscribe',
    bodyHtml: `
<h1>Unsubscribe from the VaultSpark monthly member newsletter?</h1>
<p>You will stop receiving the monthly member dispatch. Your Vault Member account is not affected.</p>
<form method="post" action="?token=${escapeHtml(token)}">
<input type="hidden" name="confirm" value="yes">
<button type="submit">Unsubscribe me</button>
</form>
<p class="after"><a href="${escapeHtml(appUrl)}/vault-member/">Keep receiving it — back to the Vault</a></p>`,
  });
}

export function donePage(appUrl: string): string {
  return renderPage({
    title: "You're unsubscribed",
    bodyHtml: `
<h1>You're unsubscribed</h1>
<p>You will no longer receive the VaultSpark monthly member newsletter at this address.</p>
<p>Changed your mind? Sign in to the <a href="${escapeHtml(appUrl)}/vault-member/">Vault Member portal</a> to turn the newsletter back on.</p>`,
  });
}

export function invalidPage(appUrl: string): string {
  return renderPage({
    title: 'Link not valid',
    bodyHtml: `
<h1>This unsubscribe link is incomplete</h1>
<p>The link may have been cut off by your email app. Use the full link from the email, or manage newsletter settings in the <a href="${escapeHtml(appUrl)}/vault-member/">Vault Member portal</a>.</p>`,
  });
}

export function unavailablePage(appUrl: string): string {
  return renderPage({
    title: 'Try again',
    bodyHtml: `
<h1>We couldn't process that just now</h1>
<p>Nothing went wrong on your side. Please try again in a few minutes, or turn the newsletter off in the <a href="${escapeHtml(appUrl)}/vault-member/">Vault Member portal</a>.</p>`,
  });
}

type BodyIntent = 'one-click' | 'confirm' | 'unrecognised' | 'too-large' | 'unsupported-type';

async function readIntent(req: Request): Promise<BodyIntent> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return 'too-large';
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return 'too-large';
  const contentType = (req.headers.get('content-type') ?? '').toLowerCase();
  let params: URLSearchParams | FormData;
  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    params = new URLSearchParams(raw);
  } else if (contentType.startsWith('multipart/form-data')) {
    // RFC 8058 permits multipart/form-data for the one-click POST.
    try {
      params = await new Response(raw, { headers: { 'content-type': contentType } }).formData();
    } catch {
      return 'unrecognised';
    }
  } else {
    return 'unsupported-type';
  }
  if (params.get('List-Unsubscribe') === 'One-Click') return 'one-click';
  if (params.get('confirm') === 'yes') return 'confirm';
  return 'unrecognised';
}

// ── Handler ─────────────────────────────────────────────────────────────────

export function createHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    const appUrl = (deps.env('APP_URL') || DEFAULT_APP_URL).replace(/\/+$/, '');
    const method = req.method.toUpperCase();

    if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { ...TEXT_HEADERS, allow: 'GET, HEAD, POST' } });
    }

    const token = parseToken(new URL(req.url));

    if (method === 'GET' || method === 'HEAD') {
      const html = token ? confirmPage(token, appUrl) : invalidPage(appUrl);
      return new Response(method === 'HEAD' ? null : html, { status: token ? 200 : 400, headers: HTML_HEADERS });
    }

    // POST
    if (!token) return new Response('Invalid unsubscribe token.', { status: 400, headers: TEXT_HEADERS });
    const intent = await readIntent(req);
    if (intent === 'too-large') return new Response('Payload Too Large', { status: 413, headers: TEXT_HEADERS });
    if (intent === 'unsupported-type') return new Response('Unsupported Media Type', { status: 415, headers: TEXT_HEADERS });
    if (intent === 'unrecognised') return new Response('Bad Request', { status: 400, headers: TEXT_HEADERS });

    try {
      // Known and unknown tokens both reach the database and get the same answer.
      await deps.data().unsubscribe(token);
    } catch (err) {
      console.error('newsletter-unsubscribe: unsubscribe failed', String(err).slice(0, 160));
      return intent === 'one-click'
        ? new Response('Temporarily unavailable. Please retry.', { status: 503, headers: { ...TEXT_HEADERS, 'retry-after': '300' } })
        : new Response(unavailablePage(appUrl), { status: 503, headers: HTML_HEADERS });
    }

    return intent === 'one-click'
      ? new Response('Unsubscribed.', { status: 200, headers: TEXT_HEADERS })
      : new Response(donePage(appUrl), { status: 200, headers: HTML_HEADERS });
  };
}

// ── Supabase data implementation ────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type Client = any;

/**
 * Uses the existing SECURITY DEFINER RPC unsubscribe_newsletter(p_token)
 * (supabase/migrations/supabase-phase45-newsletter.sql): looks the token up and
 * sets opted_out=true. Returns {ok:false, reason:'invalid_token'} for unknown tokens.
 */
export function supabaseData(client: Client): UnsubscribeData {
  return {
    async unsubscribe(token) {
      const { data, error } = await client.rpc('unsubscribe_newsletter', { p_token: token });
      if (error) throw new Error(String(error.message ?? 'rpc failed'));
      return data && (data as { ok?: boolean }).ok === true ? 'unsubscribed' : 'unknown';
    },
  };
}

// ── Entrypoint ──────────────────────────────────────────────────────────────

if (!(globalThis as { __UNSUBSCRIBE_NO_SERVE__?: boolean }).__UNSUBSCRIBE_NO_SERVE__) {
  Deno.serve(createHandler({
    env: (name) => Deno.env.get(name),
    data: () => supabaseData(createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )),
  }));
}
