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
 * unconfirmed address receives at most one confirmation invitation per day.
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

/**
 * The PUBLIC URL of this function, for the confirmation link.
 *
 * It was previously rebuilt from `req.url`. Inside the Supabase edge runtime
 * that is the request URL as forwarded by the gateway, which is not guaranteed
 * to be the public `https://<ref>.supabase.co/functions/v1/<name>` address, so
 * a link minted from it may not resolve from a reader's mail client. The link
 * is now pinned: an explicit DISPATCH_CONFIRM_ENDPOINT wins, otherwise it is
 * built from the runtime-provided SUPABASE_URL plus the fixed function path.
 */
export function confirmEndpoint(env: (name: string) => string | undefined): string | null {
  const explicit = (env('DISPATCH_CONFIRM_ENDPOINT') || '').trim();
  if (/^https:\/\/[^\s?#]+$/.test(explicit)) return explicit;
  const base = (env('SUPABASE_URL') || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)) return null;
  return `${base}/functions/v1/subscribe-desk-dispatch`;
}

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
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return null;
  const [payload, mac] = parts;
  if (await sign(payload, secret) !== mac) return null;
  let decoded = '';
  try {
    decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  } catch { return null; }
  const fields = decoded.split('|');
  if (fields.length !== 2) return null;
  const [email, expRaw] = fields;
  const exp = Number(expRaw);
  if (normalizeEmail(email) !== email || !Number.isSafeInteger(exp) || String(exp)!==expRaw || Date.now() > exp) return null;
  return email;
}
function issuedAt(token: string): string {
  const decoded = atob(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/'));
  return new Date(Number(decoded.split('|')[1]) - CONFIRM_TTL_MS).toISOString();
}

async function hash(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2,'0')).join('');
}
async function rpc(name: string, body: unknown): Promise<unknown> {
  const base = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) throw new Error('Dispatch limiter unavailable');
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if (!res.ok) throw new Error('Dispatch limiter unavailable');
  return res.json();
}

export function confirmationEmail(confirmUrl: string, unsubscribeUrl: string): string {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your signal starts here — The Desk</title></head><body style="margin:0;background:#eeece6;font-family:Arial,sans-serif;color:#171b29"><div style="display:none;max-height:0;overflow:hidden">One click to confirm. Facts first. Eight perspectives. Your own judgement.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:20px;overflow:hidden"><tr><td style="background:#101323;padding:34px 28px;color:#fff;border-top:4px solid #ffcc00"><a href="https://vaultsparkstudios.com/news/" style="color:#ffdb4d;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:2px">VAULTSPARK STUDIOS · THE DESK</a><p style="font-size:12px;letter-spacing:2px;color:#c6cce1;margin:32px 0 12px">YOUR SIGNAL STARTS HERE</p><h1 style="font-family:Georgia,serif;font-size:42px;line-height:1.08;margin:0">A sharper view.<br>A seat at The Desk.</h1><p style="color:#c6cce1;font-size:16px;line-height:1.7;margin:20px 0 0">AI news with the sources in sight.<br>Independent perspectives. Room for your judgement.</p></td></tr><tr><td style="padding:28px"><p style="font-size:17px;line-height:1.7;margin:0 0 24px">Confirm your email to receive The Desk Dispatch. Humans and AI agents are welcome. Your address joins the list only after you confirm.</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ffcc00" style="border-radius:30px"><a href="${esc(confirmUrl)}" style="display:inline-block;padding:17px 26px;color:#171b29;text-decoration:none;font-size:16px;font-weight:bold">Confirm my subscription →</a></td></tr></table><p style="font-size:12px;color:#606775;line-height:1.7;margin:16px 0 28px">This confirmation link expires in seven days.</p><table role="presentation" width="100%" style="border-top:1px solid #dddfe6"><tr><td style="padding:20px 0"><strong>01 · The facts</strong><p style="color:#606775;line-height:1.6">The news, its sources, and what the evidence supports.</p><strong>02 · The perspectives</strong><p style="color:#606775;line-height:1.6">Eight AI personas examine the stakes, disagreements and implications.</p><strong>03 · Your judgement</strong><p style="color:#606775;line-height:1.6">Explore the full reporting. Challenge a take. Follow the story.</p></td></tr></table><p style="font-size:13px;line-height:1.7;color:#606775">At most one issue a day, on publishing days. No account required. Unsubscribe in every issue.</p><p style="font-size:13px;line-height:1.7"><a href="${esc(unsubscribeUrl)}" style="color:#434b60;text-decoration:underline">Cancel this request / unsubscribe</a> · <a href="https://vaultsparkstudios.com/privacy/" style="color:#434b60">Privacy</a></p><p style="font-size:12px;line-height:1.8;color:#606775">If you did not request this invitation, you can ignore it. No subscription is created.<br>Reply to news@vaultsparkstudios.com to reach the studio.<br><br>VaultSpark Studios LLC<br>2807 N Parham Rd, Ste 320 #7389<br>Henrico, VA 23294<br>© 2026 VaultSpark Studios LLC. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;
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
    if (new URL(req.url).searchParams.get('action') === 'unsubscribe') {
      return new Response(null, {status:302,headers:{Location:`${confirmBase}?state=unsubscribe&token=${encodeURIComponent(token)}`}});
    }
    const email = secret ? await readToken(token, secret) : null;
    if (!email) {
      return new Response(null, { status: 302, headers: { Location: `${confirmBase}?state=invalid` } });
    }
    const apiKey = Deno.env.get('BREVO_API_KEY');
    const listId = Number(Deno.env.get('DISPATCH_LIST_ID') || '0');
    try {
      if (await rpc('desk_dispatch_token_allowed',{p_hash:await hash(email),p_issued:issuedAt(token)}) !== true) return new Response(null,{status:302,headers:{Location:`${confirmBase}?state=invalid`}});
      const res = await fetch(`${BREVO_API}/contacts`, {
        method: 'POST',
        headers: { 'api-key': apiKey || '', 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
      });
      if (!res.ok && res.status !== 204) {
        console.error('dispatch confirm: brevo rejected', res.status, (await res.text()).slice(0, 200));
        return new Response(null, { status: 302, headers: { Location: `${confirmBase}?state=error` } });
      }
      // An unsubscribe may race the provider's contact write. Compensate before
      // reporting success so an in-flight old invitation cannot restore list 3.
      if (await rpc('desk_dispatch_token_allowed',{p_hash:await hash(email),p_issued:issuedAt(token)}) !== true) {
        const removed = await fetch(`${BREVO_API}/contacts/${encodeURIComponent(email)}`,{method:'PUT',headers:{'api-key':apiKey||'','Content-Type':'application/json'},body:JSON.stringify({unlinkListIds:[listId]})});
        if (!removed.ok && removed.status!==404) throw new Error('Confirmation cancellation incomplete');
        return new Response(null,{status:302,headers:{Location:`${confirmBase}?state=invalid`}});
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

  if (new URL(req.url).searchParams.get('action') === 'unsubscribe') {
    const token = new URL(req.url).searchParams.get('token') || '';
    const email = secret ? await readToken(token,secret) : null;
    if (!email) return json({error:'This link has expired. Use the unsubscribe link in your latest issue.'},400,cors);
    try {
      await rpc('desk_dispatch_token_allowed',{p_hash:await hash(email),p_revoke:true});
      const res = await fetch(`${BREVO_API}/contacts/${encodeURIComponent(email)}`,{method:'PUT',headers:{'api-key':Deno.env.get('BREVO_API_KEY')||'','Content-Type':'application/json'},body:JSON.stringify({unlinkListIds:[Number(Deno.env.get('DISPATCH_LIST_ID')||'0')]})});
      if (!res.ok && res.status!==404) throw new Error('Unsubscribe unavailable');
      return json({ok:true,state:'unsubscribed'},200,cors);
    } catch { return json({error:'Could not unsubscribe just now. Please try again.'},503,cors); }
  }

  const apiKey = Deno.env.get('BREVO_API_KEY');
  const listId = Number(Deno.env.get('DISPATCH_LIST_ID') || '0');
  const redirectionUrl = Deno.env.get('DISPATCH_CONFIRM_URL')
    || 'https://vaultsparkstudios.com/news/subscribed/';

  // A misconfigured newsletter must fail loudly to the operator and honestly
  // to the reader — never a cheerful "you're subscribed!" into a void.
  // The signing secret and the public confirm endpoint are config too: without
  // either, the email would carry a link that can never confirm anyone.
  const endpoint = confirmEndpoint((name) => Deno.env.get(name));
  if (!apiKey || !listId || !secret || !endpoint) {
    console.error('subscribe-desk-dispatch: missing config', {
      hasKey: Boolean(apiKey), listId, hasSecret: Boolean(secret), hasEndpoint: Boolean(endpoint),
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
    const claim = await rpc('desk_dispatch_claim',{p_hash:await hash(email)});
    if (claim === 'duplicate') return json({ok:true,state:'pending-confirmation'},200,cors);
    if (claim === 'limited') return json({error:'Signup is temporarily rate limited. Please try again later.'},429,cors);
    if (claim !== 'allowed') throw new Error('Invalid dispatch limiter response');
  } catch { return json({error:'Subscriptions are temporarily unavailable.'},503,cors); }

  try {
    // Transactional send, NOT /contacts/doubleOptinConfirmation. That endpoint
    // needs a dashboard-designated DOI template and answers 400 without one;
    // this path is proven to deliver. The confirm link carries a signed token,
    // so no contact exists until the reader clicks it.
    const signedToken = await mintToken(email, secret);
    const confirmUrl = `${endpoint}?token=${encodeURIComponent(signedToken)}`;
    const unsubscribeUrl = `${endpoint}?action=unsubscribe&token=${encodeURIComponent(signedToken)}`;
    const res = await fetch(`${BREVO_API}/smtp/email`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        to: [{ email }],
        sender: {name:'The Desk Dispatch',email:'news@vaultsparkstudios.com'},
        replyTo: {email:'news@vaultsparkstudios.com'},
        subject: 'Your signal starts here — confirm The Desk Dispatch',
        htmlContent: confirmationEmail(confirmUrl,unsubscribeUrl),
        textContent: `Confirm The Desk Dispatch: ${confirmUrl}\nAt most one issue a day. No account required.\nCancel / unsubscribe: ${unsubscribeUrl}\nIf you did not request this, ignore it; you are not subscribed.\nVaultSpark Studios LLC, 2807 N Parham Rd, Ste 320 #7389, Henrico, VA 23294`,
        headers: {'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},
        tags: ['desk-confirmation'],
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
