// Public-form counters have their own SQLite-backed namespace. Shared telemetry
// KV write exhaustion must not prevent visitors from subscribing or contacting us.
export const FORM_WINDOW_MS = 3600000;
export const FORM_MAX_ATTEMPTS = 3;

export class PublicFormRateLimiter {
  constructor(state) { this.state = state; }

  async fetch(request) {
    const { seed = 0 } = await request.json();
    const window = Math.floor(Date.now() / FORM_WINDOW_MS);
    const result = await this.state.storage.transaction(async storage => {
      const previous = await storage.get('counter');
      const count = Math.max(previous?.window === window ? previous.count : 0,
        Number.isInteger(seed) ? Math.max(0, Math.min(seed, FORM_MAX_ATTEMPTS)) : 0);
      if (count >= FORM_MAX_ATTEMPTS) return { allowed: false, remaining: 0 };
      await storage.put('counter', { window, count: count + 1 });
      return { allowed: true, remaining: FORM_MAX_ATTEMPTS - count - 1 };
    });
    return Response.json(result);
  }
}

export async function checkDurableFormRateLimit(env, ip, path) {
  // Hash the identifier before it reaches durable storage. No emails or form
  // contents are passed to this counter. Each object stores one bounded record.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${path}:${ip}`));
  const name = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  let seed = 0;
  // Preserve already-used attempts during the migration's current hourly window.
  // This is read-only; the exhausted shared KV write quota is never used.
  if (env.RATE_LIMIT) {
    try { seed = Number(await env.RATE_LIMIT.get(`rl:${path}:${ip}:${Math.floor(Date.now() / FORM_WINDOW_MS)}`)) || 0; }
    catch { /* Durable counter remains enforced when legacy KV reads fail. */ }
  }
  const stub = env.FORM_RATE_LIMIT.get(env.FORM_RATE_LIMIT.idFromName(name));
  const response = await stub.fetch('https://form-counter.internal/', {
    method: 'POST', body: JSON.stringify({ seed }),
  });
  if (!response.ok) throw new Error('Public form rate counter unavailable');
  const result = await response.json();
  if (typeof result.allowed !== 'boolean' || !Number.isInteger(result.remaining) || result.remaining < 0 || result.remaining > FORM_MAX_ATTEMPTS) {
    throw new Error('Invalid public form rate counter response');
  }
  return result;
}
