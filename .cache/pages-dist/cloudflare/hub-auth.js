/**
 * Cloudflare Worker module — Hub subdomain edge auth.
 *
 * Terminates hub.vaultsparkstudios.com, serves a dedicated internal login
 * surface, and proxies all authenticated traffic to the existing studio-hub
 * bundle on the main origin.
 *
 * Endpoints served on the hub host:
 *   GET  /auth/me      → 200 if session cookie valid, else 401
 *   POST /auth/login   → { password } → 200 + Set-Cookie on match
 *   POST /auth/logout  → clears cookie
 *   Any other path     → served after cookie check; fallback renders login HTML
 *
 * Secrets (wrangler secret put ... --env production):
 *   HUB_AUTH_USER            — canonical session user (e.g. "founder")
 *   HUB_AUTH_PASSWORD_HASH   — preferred PBKDF2-SHA256 password hash in the form
 *                              "pbkdf2$100000$<base64-salt>$<base64-hash>"
 *   HUB_AUTH_PASSWORD        — optional plaintext fallback secret for simple
 *                              founder-password rotation when hash tooling is
 *                              unavailable; use as a Cloudflare secret only
 *   HUB_SESSION_SECRET       — HMAC-SHA256 key for signing session tokens
 *
 * Optional env vars (wrangler.toml):
 *   HUB_SESSION_TTL_SEC      — default 2592000 (30d)
 *   HUB_ORIGIN               — origin to proxy to (default: https://vaultsparkstudios.com)
 *   HUB_ORIGIN_PATH          — path prefix on origin (default: /studio-hub)
 */

const HUB_HOST = 'hub.vaultsparkstudios.com';
const COOKIE_NAME = 'vs_hub_session';
const DEFAULT_TTL_SEC = 2592000; // 30 days
const DEFAULT_ORIGIN = 'https://vaultsparkstudios.github.io';
const DEFAULT_ORIGIN_PATH = '/studio-hub';

export function isHubRequest(url) {
  return url.hostname === HUB_HOST;
}

const encoder = new TextEncoder();

function b64encode(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64decode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmacSign(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return b64encode(sig);
}

async function hmacVerify(secret, payload, signature) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
  try {
    return await crypto.subtle.verify('HMAC', key, b64decode(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

async function pbkdf2Derive(password, salt, iter) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyPbkdf2Hash(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  if (!iter || iter < 1000) return false;
  const salt = b64decode(parts[2]);
  const expected = b64decode(parts[3]);
  const derived = await pbkdf2Derive(password, salt, iter);
  return timingSafeEqual(derived, expected);
}

async function issueSession(env, username) {
  const ttl = Number(env.HUB_SESSION_TTL_SEC) || DEFAULT_TTL_SEC;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${username}|${exp}`;
  const sig = await hmacSign(env.HUB_SESSION_SECRET, payload);
  const token = `${b64encode(encoder.encode(payload))}.${sig}`;
  return { token, ttl, exp };
}

async function verifySession(env, token) {
  if (!token || typeof token !== 'string') return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  let payload;
  try {
    payload = new TextDecoder().decode(b64decode(payloadB64));
  } catch { return null; }
  const ok = await hmacVerify(env.HUB_SESSION_SECRET, payload, sig);
  if (!ok) return null;
  const [username, expStr] = payload.split('|');
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return null;
  return { username, exp };
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
  }
  return out;
}

function makeSetCookie(name, value, { maxAge, clear = false } = {}) {
  const attrs = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  if (clear) {
    attrs.push('Max-Age=0');
  } else if (maxAge) {
    attrs.push(`Max-Age=${maxAge}`);
  }
  return attrs.join('; ');
}

function renderLoginHtml(err = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>VaultSpark Studios — Internal Sign In</title>
<meta name="robots" content="noindex,nofollow,noarchive" />
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;min-height:100%}
body{background:radial-gradient(ellipse at top,#0f1729 0%,#050810 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5ecff;display:flex;align-items:center;justify-content:center;padding:1.5rem}
.card{background:rgba(20,28,48,0.92);border:1px solid rgba(120,150,220,0.25);border-radius:16px;padding:40px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03);backdrop-filter:blur(20px)}
.title{font-size:22px;font-weight:600;margin:0 0 6px;letter-spacing:-0.01em}
.sub{color:#8a96b8;font-size:13px;margin:0 0 28px}
.field{margin-bottom:16px}
label{display:block;color:#a8b3d1;font-size:12px;font-weight:500;margin-bottom:6px;letter-spacing:0.02em;text-transform:uppercase}
input{width:100%;background:rgba(10,16,32,0.8);border:1px solid rgba(120,150,220,0.2);border-radius:8px;padding:10px 12px;color:#e5ecff;font-size:14px;outline:none;transition:border-color .15s}
input:focus{border-color:rgba(120,180,255,0.6)}
button{width:100%;background:linear-gradient(135deg,#4a7eff 0%,#6a4dff 100%);border:none;border-radius:8px;color:white;padding:12px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;transition:opacity .15s,transform .1s}
button:hover{opacity:.92}
button:active{transform:translateY(1px)}
button:disabled{opacity:.5;cursor:not-allowed}
.err{color:#ff7b7b;font-size:13px;margin-top:16px;min-height:18px}
.brand{color:#5a6b95;font-size:11px;text-align:center;margin-top:24px;letter-spacing:.08em;text-transform:uppercase}
</style>
</head>
<body>
<form class="card" method="POST" action="/auth/login" novalidate>
  <h1 class="title">VaultSpark Studios</h1>
  <p class="sub">Sign in to Studio Hub</p>
  <p class="sub" style="margin-top:-16px;margin-bottom:22px;font-size:12px;">Enter the founder password for the Hub subdomain.</p>
  <div class="field"><label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required autofocus />
  </div>
  <button type="submit">Sign in</button>
  <div class="err" role="alert" aria-live="polite">${err ? escapeHtml(err) : ''}</div>
  <div class="brand">Internal · Private</div>
</form>
<script>
(function(){
  var form=document.querySelector('form');
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    var btn=form.querySelector('button'); var err=form.querySelector('.err');
    btn.disabled=true; btn.textContent='Signing in…'; err.textContent='';
    var data=new FormData(form);
    try{
      var r=await fetch('/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:String(data.get('password')||'')})});
      if(r.ok){ location.replace('/'); return; }
      var b=await r.json().catch(function(){return{}});
      if(r.status===401) err.textContent='Invalid password.';
      else if(r.status===429) err.textContent=b.error||'Too many attempts. Try again later.';
      else err.textContent=b.error||('Login failed (HTTP '+r.status+').');
    }catch(ex){ err.textContent='Network error: '+(ex.message||'unknown'); }
    finally{ btn.disabled=false; btn.textContent='Sign in'; }
  });
})();
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const HUB_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, noai, noimageai',
  'Cache-Control': 'no-store',
};

function withHubHeaders(response) {
  const h = new Headers(response.headers);
  for (const [k, v] of Object.entries(HUB_SECURITY_HEADERS)) h.set(k, v);
  h.delete('x-powered-by');
  h.delete('server');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

async function readJsonBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function checkCredentials(env, password) {
  const plain = String(env.HUB_AUTH_PASSWORD || '');
  if (plain) return password === plain;
  const stored = String(env.HUB_AUTH_PASSWORD_HASH || '');
  if (!stored) return false;
  return verifyPbkdf2Hash(password, stored);
}

function clientIpOf(request) {
  return request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
      || '0.0.0.0';
}

const LOGIN_BUCKET_WINDOW_SEC = 900;
const LOGIN_BUCKET_MAX = 10;

async function loginRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return { allowed: true, remaining: LOGIN_BUCKET_MAX };
  const bucket = Math.floor(Date.now() / (LOGIN_BUCKET_WINDOW_SEC * 1000));
  const key = `rl:hub-login:${ip}:${bucket}`;
  const current = Number(await env.RATE_LIMIT.get(key)) || 0;
  if (current >= LOGIN_BUCKET_MAX) return { allowed: false, remaining: 0 };
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: LOGIN_BUCKET_WINDOW_SEC + 60 });
  return { allowed: true, remaining: LOGIN_BUCKET_MAX - current - 1 };
}

export async function handleHubRequest(request, env) {
  const url = new URL(request.url);
  if (!isHubRequest(url)) return null;

  if (!env.HUB_SESSION_SECRET || !env.HUB_AUTH_USER || (!env.HUB_AUTH_PASSWORD_HASH && !env.HUB_AUTH_PASSWORD)) {
    return withHubHeaders(new Response(
      'Hub auth not configured. Set HUB_AUTH_USER plus HUB_AUTH_PASSWORD_HASH or HUB_AUTH_PASSWORD, and HUB_SESSION_SECRET.',
      { status: 503, headers: { 'Content-Type': 'text/plain' } }
    ));
  }

  if (url.pathname === '/robots.txt') {
    return withHubHeaders(new Response('User-agent: *\nDisallow: /\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }));
  }
  if (url.pathname === '/favicon.ico') {
    return withHubHeaders(new Response(null, { status: 204 }));
  }

  const cookies = parseCookies(request.headers.get('Cookie'));
  const sessionToken = cookies[COOKIE_NAME];
  const session = sessionToken ? await verifySession(env, sessionToken) : null;

  if (url.pathname === '/auth/me') {
    if (session) return withHubHeaders(json({ authenticated: true, user: session.username, exp: session.exp }, 200));
    return withHubHeaders(json({ authenticated: false }, 401));
  }

  if (url.pathname === '/auth/login') {
    if (request.method !== 'POST') {
      return withHubHeaders(new Response('Method not allowed', { status: 405 }));
    }
    const ip = clientIpOf(request);
    const rl = await loginRateLimit(env, ip);
    if (!rl.allowed) {
      return withHubHeaders(new Response(JSON.stringify({ error: 'Too many attempts. Try again in 15 minutes.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(LOGIN_BUCKET_WINDOW_SEC) },
      }));
    }
    const body = await readJsonBody(request);
    const pass = String(body.password || '');
    if (!pass) return withHubHeaders(json({ error: 'Missing password.' }, 400));
    const ok = await checkCredentials(env, pass);
    if (!ok) return withHubHeaders(json({ error: 'Invalid password.' }, 401));
    const sessionUser = String(env.HUB_AUTH_USER || '').trim();
    const { token, ttl } = await issueSession(env, sessionUser);
    return withHubHeaders(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': makeSetCookie(COOKIE_NAME, token, { maxAge: ttl }) },
    }));
  }

  if (url.pathname === '/auth/logout') {
    return withHubHeaders(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': makeSetCookie(COOKIE_NAME, '', { clear: true }) },
    }));
  }

  if (!session) {
    return withHubHeaders(new Response(renderLoginHtml(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
  }

  const originBase = (env.HUB_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
  const originPath = (env.HUB_ORIGIN_PATH || DEFAULT_ORIGIN_PATH).replace(/\/+$/, '');
  const originUrl = new URL(`${originBase}${originPath}${url.pathname === '/' ? '/' : url.pathname}${url.search}`);

  const proxied = await fetch(new Request(originUrl.toString(), {
    method: request.method,
    headers: (() => {
      const h = new Headers(request.headers);
      h.delete('cookie');
      return h;
    })(),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  }));

  return withHubHeaders(proxied);
}
