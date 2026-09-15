// Unit tests for send-member-newsletter. No network, no Supabase, no mail.
// Run: deno test --no-lock supabase/functions/send-member-newsletter/index.test.ts
(globalThis as { __NEWSLETTER_NO_SERVE__?: boolean }).__NEWSLETTER_NO_SERVE__ = true;

const mod = await import('./index.ts');
const {
  createHandler, escapeHtml, secretMatches, parseMode, unsubscribeUrl, renderIssue, displayName, BREVO_SEND_URL, DEFAULT_FROM,
} = mod;
type Member = import('./index.ts').Member;
type NewsletterData = import('./index.ts').NewsletterData;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}
function eq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const SECRET = 'test-secret-not-real';
const NOW = new Date('2026-10-02T10:00:00Z');

function member(id: string, extra: Partial<Member> = {}): Member {
  return { id, username: `user_${id}`, points: 500, created_at: '2025-01-01T00:00:00Z', opted_out: false, unsubscribe_token: `tok_${id}`, ...extra };
}

interface Harness {
  handler: (req: Request) => Promise<Response>;
  calls: { url: string; body: Record<string, unknown>; signal: AbortSignal | null }[];
  log: Map<string, string>;
  /** Fake newsletter_preferences: user id → row. */
  prefs: Map<string, { opted_out: boolean; unsubscribe_token: string }>;
  ensureCalls: string[];
  sweeps: { period: string; olderThanIso: string }[];
}

/** A scripted Brevo reply. `error: true` rejects the fetch (transport failure / timeout). */
type BrevoReply = { status?: number; body?: string; headers?: Record<string, string>; error?: boolean };

// A browser-renderable (custom-domain) unsubscribe base; the default supabase.co host blocks real sends.
const UNSUB_BASE = 'https://vaultsparkstudios.com/api/newsletter/unsubscribe';
const HEX = /^[0-9a-f]{32}$/;

function harness(opts: {
  members?: Member[];
  emails?: Record<string, string>;
  env?: Record<string, string>;
  brevo?: (n: number) => BrevoReply;
  preLogged?: string[];
  /** Ids seeded as stranded 'sending' claims; the sweep releases exactly these. */
  preSending?: string[];
  prefs?: Record<string, { opted_out: boolean; unsubscribe_token: string }>;
  ensureFails?: boolean;
  listTruncated?: boolean;
} = {}): Harness {
  const members = opts.members ?? [member('a'), member('b', { opted_out: true }), member('c'), member('d')];
  const emails = new Map(Object.entries(opts.emails ?? { a: 'a@example.com', b: 'b@example.com', c: 'c@example.com' }));
  const log = new Map<string, string>((opts.preLogged ?? []).map((id) => [id, 'sent']));
  const stranded = new Set(opts.preSending ?? []);
  for (const id of stranded) log.set(id, 'sending');
  const calls: Harness['calls'] = [];
  const prefs = new Map(Object.entries(opts.prefs ?? {}));
  const ensureCalls: string[] = [];
  const sweeps: Harness['sweeps'] = [];
  const env: Record<string, string> = {
    NEWSLETTER_SECRET: SECRET, BREVO_API_KEY: 'brevo-test-key', NEWSLETTER_UNSUBSCRIBE_BASE: UNSUB_BASE, ...(opts.env ?? {}),
  };
  const data: NewsletterData = {
    listMembers: () => Promise.resolve({ rows: members, truncated: Boolean(opts.listTruncated) }),
    loadAuthEmails: () => Promise.resolve({ emails, truncated: false }),
    loadLoggedUserIds: () => Promise.resolve(new Set(log.keys())),
    loadStudioStats: () => Promise.resolve({ totalMembers: 4, activeMembers: 2, activeMembersAtLeast: false, topMembers: [{ username: '<b>top</b>', points: 9000 }] }),
    loadActivity: () => Promise.resolve({ recentXp: 120, games: ['vault<script>'], truncated: false }),
    claim: (id) => Promise.resolve(log.has(id) ? 'exists' : (log.set(id, 'sending'), 'claimed')),
    markSent: (id) => { log.set(id, 'sent'); return Promise.resolve(); },
    release: (id) => { if (log.get(id) === 'sending') log.delete(id); return Promise.resolve(); },
    markUncertain: (id) => { if (log.get(id) === 'sending') log.set(id, 'uncertain'); return Promise.resolve(); },
    sweepStaleClaims: (period, olderThanIso) => {
      sweeps.push({ period, olderThanIso });
      let n = 0;
      for (const id of stranded) if (log.get(id) === 'sending') { log.delete(id); n++; }
      return Promise.resolve(n);
    },
    ensureUnsubscribeToken: (id) => {
      ensureCalls.push(id);
      if (opts.ensureFails) return Promise.reject(new Error('prefs write failed'));
      const existing = prefs.get(id);
      if (existing && HEX.test(existing.unsubscribe_token)) {
        return Promise.resolve({ token: existing.unsubscribe_token, optedOut: existing.opted_out });
      }
      const row = { opted_out: existing?.opted_out ?? false, unsubscribe_token: mod.generateUnsubscribeToken() };
      prefs.set(id, row);
      return Promise.resolve({ token: row.unsubscribe_token, optedOut: row.opted_out });
    },
  };
  const fetchFn = ((input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)), signal: init?.signal ?? null });
    const r: BrevoReply = opts.brevo ? opts.brevo(calls.length) : { status: 201, body: '{"messageId":"<m@brevo>"}' };
    if (r.error) return Promise.reject(new Error('socket hang up'));
    return Promise.resolve(new Response(r.body ?? '', { status: r.status ?? 201, headers: r.headers ?? {} }));
  }) as typeof fetch;
  const handler = createHandler({
    env: (k) => env[k],
    data: () => data,
    fetch: fetchFn,
    sleep: () => Promise.resolve(),
    now: () => NOW,
  });
  return { handler, calls, log, prefs, ensureCalls, sweeps };
}

const post = (body: unknown, auth = `Bearer ${SECRET}`) =>
  new Request('https://fn.test/send-member-newsletter', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

Deno.test('escapeHtml neutralises markup and quotes', () => {
  eq(escapeHtml(`<img src=x onerror="a">'&`), '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&amp;', 'escaped');
});

Deno.test('secretMatches is fail-closed on empty expected', async () => {
  eq(await secretMatches('', ''), false, 'empty/empty');
  eq(await secretMatches('x', ''), false, 'x/empty');
  eq(await secretMatches('abc', 'abc'), true, 'match');
  eq(await secretMatches('abd', 'abc'), false, 'mismatch');
});

Deno.test('parseMode requires exactly one explicit mode', () => {
  const d = ['vaultsparkstudios.com'];
  eq(parseMode(null, d).ok, false, 'no body');
  eq(parseMode({}, d).ok, false, 'empty object');
  eq(parseMode({ dryRun: true, send: true }, d).ok, false, 'conflict');
  eq(parseMode({ dryRun: 'yes' }, d).ok, false, 'non-boolean dryRun');
  eq(parseMode({ previewTo: 'someone@gmail.com' }, d).ok, false, 'foreign preview domain');
  const p = parseMode({ previewTo: 'Founder@VaultSparkStudios.com' }, d);
  assert(p.ok && p.mode.kind === 'preview' && p.mode.to === 'founder@vaultsparkstudios.com', 'preview normalised');
});

Deno.test('unsubscribeUrl only uses a token route when one is configured', () => {
  eq(unsubscribeUrl('https://x.test', 'tok', ''), 'https://x.test/vault-member/', 'no base → portal');
  eq(unsubscribeUrl('https://x.test', 'a b', 'https://x.test/u'), 'https://x.test/u?token=a%20b', 'base + encoded token');
  eq(unsubscribeUrl('https://x.test', null, 'https://x.test/u'), 'https://x.test/vault-member/', 'no token → portal');
});

Deno.test('displayName strips header-breaking characters', () => {
  eq(displayName('evil\r\nBcc: x<y>'), 'evil Bcc: x y', 'sanitised');
});

Deno.test('renderIssue escapes member-provided strings', () => {
  const { html } = renderIssue({
    member: member('z', { username: '<script>alert(1)</script>' }),
    activity: { recentXp: 5, games: ['<i>slug</i>'], truncated: false },
    stats: { totalMembers: 1, activeMembers: 1, activeMembersAtLeast: false, topMembers: [{ username: '"><svg onload=x>', points: 1 }] },
    appUrl: 'https://vaultsparkstudios.com', unsubUrl: 'https://vaultsparkstudios.com/vault-member/?a=1&b=2', now: NOW,
  });
  assert(!html.includes('<script>alert'), 'username escaped');
  assert(!html.includes('<i>slug'), 'slug escaped');
  assert(!html.includes('<svg onload'), 'top member escaped');
  assert(html.includes('a=1&amp;b=2'), 'href escaped');
});

Deno.test('rejects missing/wrong secret with exact Unauthorized body', async () => {
  const h = harness();
  const r1 = await h.handler(post({ dryRun: true }, 'Bearer '));
  eq(r1.status, 401, 'empty bearer');
  eq(await r1.text(), 'Unauthorized', 'body');
  eq((await h.handler(post({ dryRun: true }, 'Bearer wrong'))).status, 401, 'wrong bearer');
  const h2 = harness({ env: { NEWSLETTER_SECRET: '' } });
  eq((await h2.handler(post({ dryRun: true }, 'Bearer '))).status, 401, 'unset secret fails closed');
  eq(h.calls.length + h2.calls.length, 0, 'no sends');
});

Deno.test('bodyless authorised POST does not send', async () => {
  const h = harness();
  const r = await h.handler(post(undefined));
  eq(r.status, 400, 'mode required');
  eq(h.calls.length, 0, 'no sends');
});

Deno.test('dry run returns counts only and sends nothing', async () => {
  const h = harness({ preLogged: ['c'] });
  const r = await h.handler(post({ dryRun: true }));
  eq(r.status, 200, 'status');
  const text = await r.text();
  const j = JSON.parse(text);
  eq(j.eligible, 2, 'eligible (a, c; b opted out; d no email)');
  eq(j.alreadySent, 1, 'alreadySent');
  eq(j.wouldSend, 1, 'wouldSend');
  eq(j.optedOut, 1, 'optedOut');
  eq(j.noEmail, 1, 'noEmail');
  assert(!/@example\.com|user_/.test(text), 'no PII in response');
  eq(h.calls.length, 0, 'no sends');
});

Deno.test('preview sends one mail to previewTo only and writes no log', async () => {
  // Member "a" joined recently, so the greeting names them — proves the preview renders real member data.
  const h = harness({ members: [member('a', { created_at: '2026-09-25T00:00:00Z' }), member('c')] });
  const r = await h.handler(post({ previewTo: 'founder@vaultsparkstudios.com' }));
  eq(r.status, 200, 'status');
  const j = await r.json();
  eq(j.sent, 1, 'sent');
  eq(h.calls.length, 1, 'one call');
  const b = h.calls[0].body as { to: { email: string }[]; subject: string; sender: { email: string }; headers: Record<string, string>; htmlContent: string };
  eq(h.calls[0].url, BREVO_SEND_URL, 'brevo url');
  eq(b.to.length, 1, 'one recipient');
  eq(b.to[0].email, 'founder@vaultsparkstudios.com', 'recipient');
  assert(b.subject.startsWith('[PREVIEW] '), 'subject prefix');
  eq(b.sender.email, DEFAULT_FROM, 'sender');
  assert(b.headers['List-Unsubscribe'].startsWith('<https://'), 'list-unsubscribe');
  assert(b.htmlContent.includes('demo_vault_runner'), 'renders the synthetic preview member');
  assert(!b.htmlContent.includes('user_a'), 'no real member is rendered');
  eq(h.log.size, 0, 'no log writes');
});

Deno.test('preview without BREVO_API_KEY is 503 and sends nothing', async () => {
  const h = harness({ env: { BREVO_API_KEY: '' } });
  eq((await h.handler(post({ previewTo: 'founder@vaultsparkstudios.com' }))).status, 503, 'status');
  eq(h.calls.length, 0, 'no sends');
});

Deno.test('send is idempotent, continues past failures, and summarises', async () => {
  const members = [member('a'), member('b'), member('c'), member('d')];
  const emails = { a: 'a@example.com', b: 'b@example.com', c: 'c@example.com', d: 'd@example.com' };
  const h = harness({
    members, emails, preLogged: ['a'],
    brevo: (n) => (n === 1 ? { status: 400, body: '{"code":"invalid_parameter"}' } : { status: 201, body: '{"messageId":"<x>"}' }),
  });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.sent, 2, 'sent (c, d)');
  eq(j.skipped, 1, 'skipped (a already logged)');
  eq(j.failed, 1, 'failed (b)');
  eq(j.complete, true, 'complete');
  eq(h.log.has('b'), false, 'failed claim released for retry');
  eq(h.log.get('c'), 'sent', 'c logged sent');

  const again = await (await h.handler(post({ send: true }))).json();
  eq(again.sent, 1, 'rerun sends only the previously failed member');
  eq(again.skipped, 3, 'rerun skips the rest');
});

Deno.test('send aborts on provider auth rejection', async () => {
  const members = [member('a'), member('c')];
  const h = harness({ members, emails: { a: 'a@example.com', c: 'c@example.com' }, brevo: () => ({ status: 401, body: '{}' }) });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.aborted, 'provider_auth_rejected', 'aborted');
  eq(h.calls.length, 1, 'stopped after first rejection');
  eq(j.remaining, 1, 'remaining');
  eq(j.complete, false, 'incomplete');
});

// ── Unsubscribe token + headers ─────────────────────────────────────────────

type BrevoBody = { to: { email: string }[]; headers: Record<string, string>; htmlContent: string };

Deno.test('generateUnsubscribeToken matches the DB default shape and is unique', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const t = mod.generateUnsubscribeToken();
    assert(HEX.test(t), `shape ${t}`);
    seen.add(t);
  }
  eq(seen.size, 200, 'unique');
  eq(mod.isUnsubscribeToken('tok_a'), false, 'fixture token is not a real token');
});

Deno.test('resolveUnsubscribeBase validates and flags the supabase.co host', () => {
  const d = mod.resolveUnsubscribeBase(undefined);
  assert(d.ok && d.base === mod.DEFAULT_UNSUBSCRIBE_BASE && d.browserReady === false, 'default is supabase.co, not browser-ready');
  const c = mod.resolveUnsubscribeBase(UNSUB_BASE);
  assert(c.ok && c.browserReady === true, 'custom domain ready');
  eq(mod.resolveUnsubscribeBase('http://vaultsparkstudios.com/u').ok, false, 'http rejected');
  eq(mod.resolveUnsubscribeBase('not a url').ok, false, 'garbage rejected');
  const evil = mod.resolveUnsubscribeBase('https://evil.supabase.co.example.com/u');
  assert(evil.ok && evil.browserReady === true, 'suffix match is exact-host based');
});

Deno.test('send creates a token for a member without one and sets RFC 8058 headers + footer link', async () => {
  const h = harness({ members: [member('a', { unsubscribe_token: null })], emails: { a: 'a@example.com' } });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.sent, 1, 'sent');
  eq(h.ensureCalls.length, 1, 'ensure called');
  const token = h.prefs.get('a')?.unsubscribe_token ?? '';
  assert(HEX.test(token), 'row created with a real token');
  eq(h.prefs.get('a')?.opted_out, false, 'created opted-in');
  const b = h.calls[0].body as BrevoBody;
  const url = `${UNSUB_BASE}?token=${token}`;
  eq(b.headers['List-Unsubscribe'], `<${url}>`, 'List-Unsubscribe');
  eq(b.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click', 'List-Unsubscribe-Post');
  assert(b.htmlContent.includes(`href="${url}"`), 'visible footer link uses the same URL');
  assert(!b.htmlContent.includes('placeholder token'), 'no preview note on real mail');
});

Deno.test('send reuses an existing well-formed token without touching preferences', async () => {
  const tok = 'abcdefabcdefabcdefabcdefabcdef12';
  const h = harness({ members: [member('a', { unsubscribe_token: tok })], emails: { a: 'a@example.com' } });
  await h.handler(post({ send: true }));
  eq(h.ensureCalls.length, 0, 'no ensure');
  eq((h.calls[0].body as BrevoBody).headers['List-Unsubscribe'], `<${UNSUB_BASE}?token=${tok}>`, 'existing token used');
});

Deno.test('send honours an opt-out discovered while ensuring the token', async () => {
  const h = harness({
    members: [member('a', { unsubscribe_token: null })], emails: { a: 'a@example.com' },
    prefs: { a: { opted_out: true, unsubscribe_token: '' } },
  });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(h.calls.length, 0, 'not mailed');
  eq(j.sent, 0, 'sent');
  eq(j.skipped, 1, 'skipped');
  eq(j.failed, 0, 'not a failure');
  eq(h.log.has('a'), false, 'claim released');
  eq(h.prefs.get('a')?.opted_out, true, 'opt-out preserved');
});

Deno.test('send never mails when a token cannot be ensured', async () => {
  const h = harness({ members: [member('a', { unsubscribe_token: null })], emails: { a: 'a@example.com' }, ensureFails: true });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(h.calls.length, 0, 'no mail without unsubscribe');
  eq(j.failed, 1, 'failed');
  eq(h.log.has('a'), false, 'claim released for retry');
});

Deno.test('real send refuses the default supabase.co unsubscribe host before claiming anyone', async () => {
  const h = harness({ env: { NEWSLETTER_UNSUBSCRIBE_BASE: '' } });
  const r = await h.handler(post({ send: true }));
  eq(r.status, 503, 'status');
  eq((await r.json()).error, 'unsubscribe_route_not_browser_ready', 'error');
  eq(h.calls.length + h.log.size + h.ensureCalls.length, 0, 'no sends, claims, or preference writes');
  const dry = await (await h.handler(post({ dryRun: true }))).json();
  eq(dry.unsubscribeRouteBrowserReady, false, 'dry run reports readiness');
});

Deno.test('invalid NEWSLETTER_UNSUBSCRIBE_BASE is a config error', async () => {
  const h = harness({ env: { NEWSLETTER_UNSUBSCRIBE_BASE: 'http://insecure.example/u' } });
  eq((await h.handler(post({ send: true }))).status, 500, 'status');
  eq(h.calls.length, 0, 'no sends');
});

// ── Rate limiting, delivery ambiguity, timeouts, caps ───────────────────────

Deno.test('parseRetryAfter reads delta-seconds and HTTP-dates, clamped', () => {
  const { parseRetryAfter, MAX_RETRY_AFTER_SECONDS } = mod;
  eq(parseRetryAfter('120', NOW), 120, 'seconds');
  eq(parseRetryAfter(' 45 ', NOW), 45, 'trimmed');
  eq(parseRetryAfter('0', NOW), 0, 'zero');
  eq(parseRetryAfter(null, NOW), null, 'absent');
  eq(parseRetryAfter('', NOW), null, 'empty');
  eq(parseRetryAfter('soon', NOW), null, 'unparseable');
  eq(parseRetryAfter('999999', NOW), MAX_RETRY_AFTER_SECONDS, 'clamped to the cap');
  eq(parseRetryAfter(new Date(NOW.getTime() + 60_000).toUTCString(), NOW), 60, 'http-date ahead');
  eq(parseRetryAfter(new Date(NOW.getTime() - 60_000).toUTCString(), NOW), 0, 'http-date in the past floors at 0');
});

Deno.test('dispositionFor releases only what proves non-delivery', () => {
  const { dispositionFor } = mod;
  // A rejection: the provider understood the request and refused it. Nothing was queued.
  for (const s of [400, 401, 403, 404, 413, 422, 429]) eq(dispositionFor(s), 'release', `release ${s}`);
  // Ambiguous: the message may have been accepted before the failure surfaced.
  for (const s of [0, 408, 500, 502, 503, 504, 302]) eq(dispositionFor(s), 'uncertain', `uncertain ${s}`);
});

Deno.test('a provider rate limit aborts the run instead of burning the rest of the list', async () => {
  const members = [member('a'), member('c'), member('d')];
  const emails = { a: 'a@example.com', c: 'c@example.com', d: 'd@example.com' };
  const h = harness({
    members, emails,
    brevo: () => ({ status: 429, body: '{"code":"too_many_requests"}', headers: { 'retry-after': '120' } }),
  });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.aborted, 'provider_rate_limited', 'aborted');
  eq(j.retryAfterSeconds, 120, 'provider Retry-After surfaced for the next invocation');
  eq(h.calls.length, 1, 'stopped after the first rate-limit — the other members were never attempted');
  eq(j.remaining, 2, 'remaining');
  eq(j.complete, false, 'incomplete');
  eq(j.ok, false, 'not ok');
  // Every unsent member — the rate-limited one included — is still claimable next run.
  eq(h.log.size, 0, 'no claims left behind');

  const later = harness({ members, emails });
  const done = await (await later.handler(post({ send: true }))).json();
  eq(done.sent, 3, 'a later invocation mails all three');
});

Deno.test('a 5xx keeps the claim as uncertain and cannot re-mail on the next invocation', async () => {
  const h = harness({
    members: [member('a')], emails: { a: 'a@example.com' },
    brevo: () => ({ status: 503, body: '{"code":"internal"}' }),
  });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.sent, 0, 'sent');
  eq(j.uncertain, 1, 'uncertain');
  eq(j.failedPermanent, 0, 'not a proven failure');
  eq(j.failed, 1, 'failed total still non-zero so the workflow fails visibly');
  eq(j.ok, false, 'not ok');
  eq(h.log.get('a'), 'uncertain', 'claim KEPT and flagged for operator review');

  const again = await (await h.handler(post({ send: true }))).json();
  eq(h.calls.length, 1, 'no second attempt — an ambiguous send is never repeated');
  eq(again.skipped, 1, 'skipped by the surviving claim');
});

Deno.test('a transport failure/timeout keeps the claim as uncertain', async () => {
  const h = harness({ members: [member('a')], emails: { a: 'a@example.com' }, brevo: () => ({ error: true }) });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.uncertain, 1, 'uncertain');
  eq(h.log.get('a'), 'uncertain', 'claim kept');
});

Deno.test('a 4xx rejection is released while an ambiguous failure is not', async () => {
  const h = harness({
    members: [member('a'), member('c')], emails: { a: 'a@example.com', c: 'c@example.com' },
    brevo: (n) => (n === 1 ? { status: 400, body: '{"code":"invalid_parameter"}' } : { status: 500, body: '{}' }),
  });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.failedPermanent, 1, 'the 400 is a proven non-delivery');
  eq(j.uncertain, 1, 'the 500 is not');
  eq(h.log.has('a'), false, 'rejected member released for retry');
  eq(h.log.get('c'), 'uncertain', 'ambiguous member held');
});

Deno.test('every Brevo send carries an abort signal so a hung request cannot outlive the isolate', async () => {
  const h = harness({ members: [member('a')], emails: { a: 'a@example.com' } });
  await h.handler(post({ send: true }));
  eq(h.calls.length, 1, 'one send');
  assert(h.calls[0].signal instanceof AbortSignal, 'timeout signal attached');
  eq(mod.SEND_TIMEOUT_MS, 20_000, 'timeout budget');
  // The sweep cutoff must outlive any invocation that could still hold a claim.
  assert(mod.STALE_CLAIM_MS > mod.MAX_TIME_BUDGET_MS + mod.SEND_TIMEOUT_MS, 'sweep cutoff cannot steal a live claim');
});

Deno.test('stranded sending claims are swept before the run so the member is not lost for the period', async () => {
  const h = harness({ members: [member('a')], emails: { a: 'a@example.com' }, preSending: ['a'] });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.swept, 1, 'one stale claim released');
  eq(j.sent, 1, 'the previously stranded member was mailed');
  eq(h.sweeps.length, 1, 'sweep ran once');
  eq(h.sweeps[0].period, '2026-10', 'scoped to this period');
  eq(h.sweeps[0].olderThanIso, new Date(NOW.getTime() - mod.STALE_CLAIM_MS).toISOString(), 'cutoff is now − STALE_CLAIM_MS');
});

Deno.test('a truncated audience is reported and can never claim completeness', async () => {
  const h = harness({ members: [member('a'), member('c')], emails: { a: 'a@example.com', c: 'c@example.com' }, listTruncated: true });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.sent, 2, 'sent what it could see');
  eq(j.listTruncated, true, 'truncation reported, not swallowed');
  eq(j.complete, false, 'never complete on a partial audience');
  eq(j.ok, false, 'not ok');
  const dry = await (await h.handler(post({ dryRun: true }))).json();
  eq(dry.listTruncated, true, 'dry run reports it too');
});

Deno.test('preview never renders a real member, whatever their points or profile', async () => {
  const h = harness({
    members: [member('a', { username: 'real_top_member', points: 999_999 })],
    emails: { a: 'a@example.com' },
  });
  const j = await (await h.handler(post({ previewTo: 'founder@vaultsparkstudios.com' }))).json();
  eq(j.sent, 1, 'sent');
  eq(j.synthetic, true, 'flagged synthetic');
  const html = String((h.calls[0].body as { htmlContent: string }).htmlContent);
  assert(!html.includes('real_top_member'), 'no real username');
  assert(!html.includes('999,999'), 'no real points');
  assert(html.includes('demo_vault_runner'), 'synthetic username');
  assert(html.includes('placeholder token and changes no subscription'), 'preview footer note kept');
  eq(h.log.size, 0, 'no log writes');
  eq(h.ensureCalls.length, 0, 'no preference writes');
});

Deno.test('preview works with no eligible members at all', async () => {
  const h = harness({ members: [], emails: {} });
  const j = await (await h.handler(post({ previewTo: 'founder@vaultsparkstudios.com' }))).json();
  eq(j.sent, 1, 'a synthetic preview needs no member');
  eq(j.eligible, 0, 'reported');
});

// ── supabaseData query shape (fake client — no network, no Supabase) ────────

// deno-lint-ignore-file no-explicit-any
function fakeClient(rows: Record<string, unknown[]>) {
  const queries: { table: string; op: string; ops: string[] }[] = [];
  const from = (table: string) => {
    const state = { table, op: 'select', ops: [] as string[] };
    // deno-lint-ignore no-explicit-any
    const self: any = {
      select: (cols: string) => { state.ops.push(`select:${cols}`); return self; },
      order: (c: string, o?: { ascending?: boolean }) => { state.ops.push(`order:${c}:${o?.ascending}`); return self; },
      eq: (c: string, v: unknown) => { state.ops.push(`eq:${c}:${v}`); return self; },
      lt: (c: string, v: unknown) => { state.ops.push(`lt:${c}:${v}`); return self; },
      gte: (c: string, v: unknown) => { state.ops.push(`gte:${c}:${v}`); return self; },
      range: (a: number, b: number) => { state.ops.push(`range:${a}:${b}`); return self; },
      delete: () => { state.op = 'delete'; return self; },
      update: (v: unknown) => { state.op = 'update'; state.ops.push(`set:${JSON.stringify(v)}`); return self; },
      // deno-lint-ignore no-explicit-any
      then: (resolve: any, reject: any) => {
        queries.push(state);
        const data = rows[table] ?? [];
        return Promise.resolve({ data, error: null, count: data.length }).then(resolve, reject);
      },
    };
    return self;
  };
  // deno-lint-ignore no-explicit-any
  return { client: { from } as any, queries };
}

Deno.test('supabaseData pages vault_members by id only, never by mutable points', async () => {
  const { client, queries } = fakeClient({ vault_members: [] });
  const page = await mod.supabaseData(client).listMembers();
  eq(page.rows.length, 0, 'rows');
  eq(page.truncated, false, 'short page is not truncated');
  const q = queries[0];
  assert(q.ops.includes('order:id:true'), 'ordered by the immutable id');
  assert(!q.ops.some((o) => o.startsWith('order:points')), 'points is never a pagination key — it can change mid-run and skip a member');
});

Deno.test('supabaseData sweep is scoped to this period, sending status, and the age cutoff', async () => {
  const { client, queries } = fakeClient({ member_newsletter_log: [{ user_id: 'x' }, { user_id: 'y' }] });
  const n = await mod.supabaseData(client).sweepStaleClaims('2026-10', '2026-10-02T09:45:00.000Z');
  eq(n, 2, 'released count');
  const q = queries[0];
  eq(q.op, 'delete', 'delete');
  assert(q.ops.includes('eq:period:2026-10'), 'this period only');
  assert(q.ops.includes('eq:status:sending'), "only 'sending' — a 'sent' or 'uncertain' row is never touched");
  assert(q.ops.includes('lt:sent_at:2026-10-02T09:45:00.000Z'), 'age cutoff applied');
});

Deno.test('supabaseData markUncertain updates status without deleting the claim', async () => {
  const { client, queries } = fakeClient({ member_newsletter_log: [] });
  await mod.supabaseData(client).markUncertain('u1', '2026-10');
  const q = queries[0];
  eq(q.op, 'update', 'update, not delete');
  assert(q.ops.some((o) => o.startsWith('set:') && o.includes('"uncertain"')), 'status uncertain');
  assert(q.ops.includes('eq:status:sending'), 'only promotes a live claim');
});

// ── CAN-SPAM postal address ─────────────────────────────────────────────────
//
// 15 U.S.C. §7704(a)(5)(A)(iii): the sender's valid physical postal address must
// appear in EVERY commercial message. An issue that renders without it is not
// merely untidy — it is unlawful to send, so this fails the suite rather than
// warning. Asserted on the actual Brevo payload for BOTH paths that mail a
// human (real send + preview), not only on renderIssue() in isolation.

const POSTAL = mod.POSTAL_ADDRESS_LINES as readonly string[];

/** Every address line present, in order, as its own line of the address block. */
function assertPostalBlock(html: string, where: string) {
  assert(POSTAL.length >= 3, `${where}: postal address must be a real multi-line block`);
  let cursor = -1;
  for (const line of POSTAL) {
    assert(line.trim().length > 0, `${where}: blank postal line`);
    const at = html.indexOf(line, cursor + 1);
    assert(at > cursor, `${where}: postal line missing or out of order: ${line}`);
    cursor = at;
  }
  // A real US address block, not a run-on sentence: lines are <br>-separated.
  const first = html.indexOf(POSTAL[0]);
  const last = html.indexOf(POSTAL[POSTAL.length - 1]);
  assert(/<br>/.test(html.slice(first, last)), `${where}: address lines are not line-broken`);
}

Deno.test('the founder postal address is exactly the CAN-SPAM block we intend', () => {
  eq(POSTAL.join(' | '), 'VaultSpark Studios LLC | 2807 N Parham Rd, Ste 320 #7389 | Henrico, VA 23294', 'address');
});

Deno.test('every rendered issue carries the postal address beside the unsubscribe link', () => {
  const { html } = renderIssue({
    member: member('z'),
    activity: { recentXp: 5, games: [], truncated: false },
    stats: { totalMembers: 1, activeMembers: 1, activeMembersAtLeast: false, topMembers: [] },
    appUrl: 'https://vaultsparkstudios.com', unsubUrl: 'https://vaultsparkstudios.com/u?token=x', now: NOW,
  });
  assertPostalBlock(html, 'renderIssue');
  // "Near the unsubscribe link" is the legal expectation: same footer block.
  const unsubAt = html.indexOf('Unsubscribe</a>');
  assert(unsubAt !== -1, 'unsubscribe link present');
  assert(html.indexOf(POSTAL[0]) > unsubAt, 'address sits in the footer after the unsubscribe link');
  // The rest of the footer is untouched.
  assert(html.includes('/privacy/'), 'privacy link kept');
  assert(html.includes(`© ${NOW.getUTCFullYear()} VaultSpark Studios LLC. All rights reserved.`), 'auto-updating copyright kept');
});

Deno.test('the postal address is in the mail a real send hands to the provider', async () => {
  const h = harness({ members: [member('a')], emails: { a: 'a@example.com' } });
  const j = await (await h.handler(post({ send: true }))).json();
  eq(j.sent, 1, 'sent');
  assertPostalBlock(String((h.calls[0].body as BrevoBody).htmlContent), 'real send');
});

Deno.test('the postal address is in the preview render too', async () => {
  const h = harness();
  const j = await (await h.handler(post({ previewTo: 'founder@vaultsparkstudios.com' }))).json();
  eq(j.sent, 1, 'sent');
  assertPostalBlock(String((h.calls[0].body as BrevoBody).htmlContent), 'preview');
});

Deno.test('a footer that drops the address is caught, not silently accepted', () => {
  // Negative control: proves assertPostalBlock is load-bearing. Without it a
  // future refactor could delete the block and every assertion above would
  // still be vacuously "green".
  const { html } = renderIssue({
    member: member('z'),
    activity: { recentXp: 0, games: [], truncated: false },
    stats: { totalMembers: 1, activeMembers: 0, activeMembersAtLeast: false, topMembers: [] },
    appUrl: 'https://vaultsparkstudios.com', unsubUrl: 'https://vaultsparkstudios.com/u?token=x', now: NOW,
  });
  const stripped = html.replace(POSTAL[1], '');
  let threw = false;
  try { assertPostalBlock(stripped, 'stripped'); } catch { threw = true; }
  assert(threw, 'removing an address line must fail the assertion');
});

Deno.test('preview uses a placeholder token, creates no preference row, and notes it', async () => {
  const h = harness({ members: [member('a', { unsubscribe_token: null })], env: { NEWSLETTER_UNSUBSCRIBE_BASE: '' } });
  const j = await (await h.handler(post({ previewTo: 'founder@vaultsparkstudios.com' }))).json();
  eq(j.sent, 1, 'preview sent even on default host');
  eq(j.unsubscribeRouteBrowserReady, false, 'readiness reported');
  eq(h.ensureCalls.length, 0, 'no ensure for real member');
  eq(h.prefs.size, 0, 'no rows');
  const b = h.calls[0].body as BrevoBody;
  const url = `${mod.DEFAULT_UNSUBSCRIBE_BASE}?token=${mod.PREVIEW_UNSUBSCRIBE_TOKEN}`;
  eq(b.headers['List-Unsubscribe'], `<${url}>`, 'placeholder URL');
  eq(b.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click', 'one-click header');
  assert(b.htmlContent.includes('placeholder token and changes no subscription'), 'preview note');
});
