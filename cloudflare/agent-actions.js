const ALLOWED_ACTIONS = Object.freeze({
  'feedback.submit': {
    scope: 'vaultspark:feedback:write',
    answers: new Set(['useful', 'mixed', 'not_useful']),
  },
});

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

function scopesFrom(record) {
  const raw = record?.claims?.scope || record?.scope || record?.token?.scope || '';
  return new Set(Array.isArray(raw) ? raw : String(raw).split(/[ ,]+/).filter(Boolean));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function validateAgentAction(body, scopes) {
  const action = ALLOWED_ACTIONS[body?.action];
  if (!action) return { ok: false, status: 400, code: 'action_not_allowed' };
  if (!scopes.has(action.scope)) return { ok: false, status: 403, code: 'scope_required', requiredScope: action.scope };
  if (body.action === 'feedback.submit') {
    if (!action.answers.has(body?.input?.answer)) return { ok: false, status: 400, code: 'invalid_answer' };
    if (!/^\/[a-z0-9/_-]{0,180}$/i.test(body?.input?.pagePath || '')) return { ok: false, status: 400, code: 'invalid_page_path' };
  }
  return { ok: true, action };
}

export async function handleAgentActions(request, env, session) {
  if (request.method === 'GET') {
    return json({
      schemaVersion: '1.0',
      authority: 'Obelisk',
      endpoint: '/api/agent-actions/v1',
      actions: [{ id: 'feedback.submit', scope: 'vaultspark:feedback:write', idempotent: true, receipt: 'HMAC-SHA256' }],
    });
  }
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST' });
  if (!session?.record) return json({ error: 'obelisk_auth_required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const idempotencyKey = request.headers.get('Idempotency-Key') || '';
  if (!/^[a-zA-Z0-9._:-]{12,120}$/.test(idempotencyKey)) return json({ error: 'idempotency_key_required' }, 400);
  const validation = validateAgentAction(body, scopesFrom(session.record));
  if (!validation.ok) return json({ error: validation.code, requiredScope: validation.requiredScope || undefined }, validation.status);
  const receiptKey = env.AGENT_RECEIPT_SIGNING_KEY || env.CSRF_SIGNING_KEY;
  if (!env.RATE_LIMIT || !receiptKey) return json({ error: 'agent_action_service_unavailable' }, 503);

  const key = 'agent-action:' + idempotencyKey;
  const prior = await env.RATE_LIMIT.get(key);
  if (prior) return json(JSON.parse(prior), 200, { 'Idempotent-Replay': 'true' });

  if (body.action === 'feedback.submit') {
    const sbUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const sbKey = env.SUPABASE_ANON_KEY || '';
    if (!sbUrl || !sbKey) return json({ error: 'feedback_sink_unavailable' }, 503);
    const upstream = await fetch(sbUrl + '/rest/v1/page_feedback', {
      method: 'POST',
      headers: { apikey: sbKey, Authorization: 'Bearer ' + sbKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        page_path: body.input.pagePath,
        question: 'agent_page_usefulness',
        answer: body.input.answer,
        session_id: null,
      }),
    });
    if (!upstream.ok) return json({ error: 'feedback_sink_rejected' }, 502);
  }

  const receipt = {
    schemaVersion: '1.0',
    receiptId: crypto.randomUUID(),
    action: body.action,
    idempotencyKey,
    status: 'accepted',
    authority: 'Obelisk',
    completedAt: new Date().toISOString(),
  };
  receipt.signature = await hmac(JSON.stringify(receipt), receiptKey);
  await env.RATE_LIMIT.put(key, JSON.stringify(receipt), { expirationTtl: 86400 });
  return json(receipt, 200);
}
