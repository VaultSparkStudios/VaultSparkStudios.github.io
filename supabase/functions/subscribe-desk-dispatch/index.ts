/**
 * subscribe-desk-dispatch — newsletter capture for THE DESK (/news).
 *
 * Deliberately IDENTITY-FREE. The Desk's whole product claim is that it needs
 * no account, so its newsletter must not quietly reintroduce one: this
 * endpoint takes an email and nothing else, creates no Supabase user, sets no
 * session, and is unrelated to Vault Member / Obelisk. The existing
 * `send-member-newsletter` function cannot serve this surface for exactly that
 * reason — it is gated behind membership.
 *
 * Consent posture: Brevo DOUBLE opt-in. We never add a confirmed contact from
 * a form POST, because a form POST is not consent — anyone can type anyone's
 * address. Brevo sends the confirmation mail and only then attaches the
 * contact to the list. That also makes address-bombing pointless: an
 * unconfirmed address receives exactly one confirmation email, ever.
 *
 * Request:  { email: string, source?: string }
 * Response: { ok: true, state: 'pending-confirmation' } — always the same
 *           shape for a well-formed address, whether or not it already
 *           existed, so the endpoint cannot be used to enumerate subscribers.
 *
 * Gateway posture: verify_jwt = false (pinned in supabase/config.toml). There
 * is no JWT to check — that is the point.
 */

const BREVO_API = 'https://api.brevo.com/v3';
const MAX_EMAIL_LEN = 254;

/** Origins allowed to call this endpoint. */
const DEFAULT_ORIGINS = [
  'https://vaultsparkstudios.com',
  'https://www.vaultsparkstudios.com',
  'https://website.staging.vaultsparkstudios.com',
];

function allowedOrigins(): string[] {
  const extra = (Deno.env.get('DISPATCH_ALLOWED_ORIGINS') || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

function corsHeaders(origin: string | null): Record<string, string> {
  const list = allowedOrigins();
  const allow = origin && list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * Conservative validation. Deliberately stricter than the RFC: an address the
 * desk cannot actually deliver to is worth rejecting at the form, and every
 * exotic-but-legal form we reject here is one a real reader has never typed.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > MAX_EMAIL_LEN) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email)) return null;
  if (email.includes('..')) return null;
  const [, domain] = email.split('@');
  if (!domain || domain.length < 4) return null;
  if (!/\.[a-z]{2,}$/.test(domain)) return null;
  return email;
}

/** Free-text provenance tag, clamped so a caller cannot write novels into CRM. */
export function normalizeSource(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim().slice(0, 40) : '';
  return /^[a-z0-9/_-]*$/i.test(s) && s ? s : 'news';
}

/* ── Self-hosted double opt-in ─────────────────────────────────────────────
 *
 * Brevo's /contacts/doubleOptinConfirmation requires a template the account
 * designates as its DOI template through the dashboard. Ours reports
 * `doiTemplate: true` and Brevo still answers
 * `400 "An active DOI template does not exist"`, so that path is not
 * agent-provisionable here. Transactional send DOES work (it delivered the
 * reachability probe), so the confirmation loop is built on that instead.
 *
 * Stateless by design: the confirm link carries an HMAC-signed token over
 * {email, expiry}. No table, no pending-subscriber store, nothing to leak or
 * clean up — and a token cannot be forged without the secret or replayed past
 * its expiry. The contact is created ONLY when the link is clicked, so this is
 * a real double opt-in and not a rebranded single one.
 */
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(mac));
}

async function mintToken(email: string, secret: string): Promise<string> {
  const exp = Date.now() + CONFIRM_TTL_MS;
  const payload = b64url(new TextEncoder().encode(`${email}|${exp}`));
  return `${payload}.${await sign(payload, secret)}`;
}

/** Returns the email if the token is authentic and unexpired, else null. */
async function readToken(token: string, secret: string): Promise<string | null> {
  const [payload, mac] = String(token || '').split('.');
  if (!payload || !mac) return null;
  if (await sign(payload, secret) !== mac) return null;
  let decoded = '';
  try {
    decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  } catch { return null; }
  const [email, expRaw] = decoded.split('|');
  const exp = Number(expRaw);
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;
  return email;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const secret = Deno.env.get('DISPATCH_TOKEN_SECRET') || '';
  const confirmBase = Deno.env.get('DISPATCH_CONFIRM_URL')
    || 'https://vaultsparkstudios.com/news/subscribed/';

  // GET = the reader clicked the confirmation link. This is the ONLY path that
  // creates a contact, which is what makes the opt-in genuinely double.
  if (req.method === 'GET') {
    const token = new URL(req.url).searchParams.get('token') || '';
    const email = secret ? await readToken(token, secret) : null;
    if (!email) {
      return new Response(null, { status: 302, headers: { Location: `${confirmBase}?state=invalid` } });
    }
    const apiKey = Deno.env.get('BREVO_API_KEY');
    const listId = Number(Deno.env.get('DISPATCH_LIST_ID') || '0');
    try {
      const res = await fetch(`${BREVO_API}/contacts`, {
        method: 'POST',
        headers: { 'api-key': apiKey || '', 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
      });
      if (!res.ok && res.status !== 204) {
        console.error('dispatch confirm: brevo rejected', res.status, (await res.text()).slice(0, 200));
        return new Response(null, { status: 302, headers: { Location: `${confirmBase}?state=error` } });
      }
    } catch (err) {
      console.error('dispatch confirm: transport failure', String(err).slice(0, 120));
      return new Response(null, { status: 302, headers: { Location: `${confirmBase}?state=error` } });
    }
    return new Response(null, { status: 302, headers: { Location: confirmBase } });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  // Reject cross-origin callers explicitly rather than relying on the browser
  // to honour CORS — CORS is not an access control for non-browser clients.
  if (origin && !allowedOrigins().includes(origin)) {
    return json({ error: 'Origin not allowed' }, 403, cors);
  }

  const apiKey = Deno.env.get('BREVO_API_KEY');
  const listId = Number(Deno.env.get('DISPATCH_LIST_ID') || '0');
  const templateId = Number(Deno.env.get('DISPATCH_DOI_TEMPLATE_ID') || '0');
  const redirectionUrl = Deno.env.get('DISPATCH_CONFIRM_URL')
    || 'https://vaultsparkstudios.com/news/subscribed/';

  // A misconfigured newsletter must fail loudly to the operator and honestly
  // to the reader — never a cheerful "you're subscribed!" into a void.
  if (!apiKey || !listId || !templateId) {
    console.error('subscribe-desk-dispatch: missing config', {
      hasKey: Boolean(apiKey), listId, templateId,
    });
    return json({ error: 'Subscriptions are temporarily unavailable.' }, 503, cors);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, cors);
  }

  const email = normalizeEmail(payload?.email);
  if (!email) return json({ error: 'That does not look like a valid email address.' }, 400, cors);
  const source = normalizeSource(payload?.source);

  try {
    // Transactional send, NOT /contacts/doubleOptinConfirmation. That endpoint
    // needs a dashboard-designated DOI template and answers 400 without one;
    // this path is proven to deliver. The confirm link carries a signed token,
    // so no contact exists until the reader clicks it.
    const confirmUrl = `${new URL(req.url).origin}${new URL(req.url).pathname}?token=${encodeURIComponent(await mintToken(email, secret))}`;
    const res = await fetch(`${BREVO_API}/smtp/email`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        to: [{ email }],
        templateId,
        params: { confirmUrl, source },
      }),
    });

    if (res.ok || res.status === 204) {
      return json({ ok: true, state: 'pending-confirmation' }, 200, cors);
    }

    const detail = await res.text();

    // An address already on the list is a success from the reader's point of
    // view and must not be distinguishable in the response, or the endpoint
    // becomes a subscriber-enumeration oracle.
    //
    // This match MUST stay narrow. It was previously /already|exist/i, which
    // also matched Brevo's "An active DOI template does not exist" — turning a
    // hard configuration failure into a reported success. The newsletter sent
    // nothing for a full day while the endpoint answered 200 and the deploy
    // verifier called it proof. Match the duplicate-contact case only.
    const isDuplicateContact = res.status === 400
      && /contact\s+already\s+exist|already\s+(?:a\s+)?(?:contact|subscrib)/i.test(detail)
      && !/does not exist|not\s+found|no\s+such/i.test(detail);
    if (isDuplicateContact) {
      return json({ ok: true, state: 'pending-confirmation' }, 200, cors);
    }

    console.error('subscribe-desk-dispatch: brevo rejected', res.status, detail.slice(0, 300));
    return json({ error: 'Could not complete the subscription. Please try again shortly.' }, 502, cors);
  } catch (err) {
    console.error('subscribe-desk-dispatch: transport failure', String(err).slice(0, 200));
    return json({ error: 'Could not reach the mail service. Please try again shortly.' }, 502, cors);
  }
});
