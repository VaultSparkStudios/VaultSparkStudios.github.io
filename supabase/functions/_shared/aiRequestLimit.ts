/** Shared website AI request admission; separate from token/spending budgets.
 * Direct function callers get the same durable bound as browser callers.
 * Only a verified, explicitly non-anonymous Auth user may supply verifiedUserId. Anonymous
 * forwarding headers are hints, never identities: a shared anonymous/global
 * bucket bounds rotating/spoofed hints. No IP, UUID or token is stored/logged.
 */
export const AI_REQUEST_ENDPOINTS = ['ask-ignis', 'semantic-search', 'eternal-intelligence'] as const;
export type AiRequestEndpoint = typeof AI_REQUEST_ENDPOINTS[number];
type RateState = 'allowed' | 'limited' | 'unavailable';
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => any };

/** Call only with the user returned by Auth.getUser, never decoded JWT/body data.
 * An authenticated Supabase anonymous user is still anonymous for rate purposes.
 * Missing/unknown anonymous classification conservatively uses that same pool.
 * This classification does not grant, remove or otherwise change entitlements.
 */
export function nonAnonymousAiRateUserId(user: any): string | null {
  return user?.is_anonymous === false && typeof user?.id === 'string' ? user.id : null;
}

export async function verifiedAiUser(authClient: any, authorization: string | null): Promise<string | null> {
  if (!authorization || authorization.length > 8192 || !/^Bearer\s+\S+$/i.test(authorization)) return null;
  try {
    const { data, error } = await authClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    return !error ? nonAnonymousAiRateUserId(data?.user) : null;
  } catch { return null; }
}

export async function aiPrincipalHash(req: Request, verifiedUserId: string | null, serverKey: string): Promise<string> {
  if (!serverKey || serverKey.length < 24) throw Error('AI request admission key unavailable');
  if (verifiedUserId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verifiedUserId)) throw Error('Invalid verified AI principal');
  const hint = (req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For')?.split(',')[0] || 'unattributed').trim().slice(0, 256);
  const subject = verifiedUserId === null ? `anonymous\0${hint}` : `member\0${verifiedUserId.toLowerCase()}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(serverKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`website-ai-principal-v1\0${subject}`));
  return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function consumeAiRequestLimit(input: {
  req: Request; endpoint: AiRequestEndpoint; supabase: RpcClient;
  verifiedUserId: string | null; serverKey: string; timeoutMs?: number;
}): Promise<RateState> {
  const { req, endpoint, supabase, verifiedUserId, serverKey } = input;
  if (!AI_REQUEST_ENDPOINTS.includes(endpoint)) return 'unavailable';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    const principal = await aiPrincipalHash(req, verifiedUserId, serverKey);
    const timeoutMs = input.timeoutMs ?? 3000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 3000) return 'unavailable';
    let operation = supabase.rpc('claim_website_ai_request', {
      p_endpoint: endpoint, p_principal_hash: principal, p_anonymous: verifiedUserId === null,
    });
    if (typeof operation?.abortSignal === 'function') operation = operation.abortSignal(controller.signal);
    const result: any = await Promise.race([
      Promise.resolve(operation),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error('AI request admission timed out')); }, timeoutMs); }),
    ]);
    if (result?.error) return 'unavailable';
    return result?.data === 'allowed' || result?.data === 'limited' ? result.data : 'unavailable';
  } catch { return 'unavailable'; }
  finally { if (timer !== undefined) clearTimeout(timer); }
}

export async function enforceAiRequestLimit(input: Parameters<typeof consumeAiRequestLimit>[0], cors: Record<string, string>): Promise<Response | null> {
  const state = await consumeAiRequestLimit(input);
  if (state === 'allowed') return null;
  return new Response(JSON.stringify({
    error: state === 'limited' ? 'Please wait a minute before asking again.' : 'Intelligence is temporarily unavailable. Please try again shortly.',
    code: state === 'limited' ? 'ai_request_rate_limited' : 'ai_request_limit_unavailable',
  }), {
    status: state === 'limited' ? 429 : 503,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': state === 'limited' ? '60' : '5' },
  });
}
