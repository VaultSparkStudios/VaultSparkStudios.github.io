import { boundedBytes } from '../_shared/boundedBody.mjs';
// Website membership data only. Shared Studio identity, other products and
// investment/billing-retention records are deliberately outside erasure scope.
export const WEBSITE_PLANS = Object.freeze(['vault_sparked', 'vault_sparked_pro', 'vault_sparked_annual', 'vault_sparked_pro_annual']);
export const DELETE_CONFIRMATION = 'DELETE WEBSITE MEMBERSHIP';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const RETAINED = Object.freeze([
  'Your shared Studio sign-in and other product accounts are retained.',
  'Investment relationships and shared game/product records are retained separately.',
  'Payment-provider invoices and minimal cancellation/deletion receipts are retained; no Stripe customer is deleted.',
]);
const JOB_FIELDS = ['id', 'state', 'requested_at', 'erased_at', 'completed_at', 'last_error_code'];
export function publicJob(job) { return job ? Object.fromEntries(JOB_FIELDS.map(k => [k, job[k] ?? null])) : null; }
export function providerSubscription(job, sub) {
  const b = job.billing;
  if (!b || !WEBSITE_PLANS.includes(b.plan) || !/^sub_[A-Za-z0-9]+$/.test(b.subscription_id || '')
    || !/^cus_[A-Za-z0-9]+$/.test(b.customer_id || '')
    || sub.id !== b.subscription_id || (typeof sub.customer === 'object' ? sub.customer.id : sub.customer) !== b.customer_id
    || sub.metadata?.vault_user_id !== job.user_id || !WEBSITE_PLANS.includes(sub.metadata?.plan)
    || sub.metadata.plan !== b.plan) throw new Error('billing_ownership_unverified');
  return sub;
}
export function ownedMediaPath(uid, name) {
  return UUID.test(uid || '') && typeof name === 'string' && name.startsWith(`${uid}/`)
    && name.length <= 1024 && !name.split('/').some(p => !p || p === '.' || p === '..')
    && !/[\\\u0000-\u001f]/.test(name);
}
export async function processJob(userId, deps) {
  const job = await deps.data.claim(userId);
  if (!job) return { state: 'busy' };
  if (job.state === 'completed') return publicJob(job);
  try {
    if (!job.billing_done) {
      if (job.billing?.subscription_id) await deps.providers.cancelWebsiteBilling(job);
      await deps.data.checkpoint(job, 'billing');
    }
    if (!job.marketing_done) {
      await deps.providers.removeWebsiteMarketing(job);
      await deps.data.checkpoint(job, 'marketing');
    }
    if (!job.media_done) {
      for (const name of job.media_paths || []) if (!ownedMediaPath(job.user_id, name)) throw new Error('media_ownership_unverified');
      await deps.providers.removeWebsiteMedia(job);
      await deps.data.checkpoint(job, 'media');
    }
    const erased = await deps.data.erase(job);
    // Infrastructure failure or an unverified provider step cannot become a
    // completion claim. The email retry retains only its private destination.
    if (!['erased', 'completed'].includes(erased?.state)) throw new Error('erasure_not_verified');
    if (erased.state !== 'completed') {
      await deps.providers.confirmDeletion({ ...job, ...erased });
      await deps.data.checkpoint(job, 'confirmation');
    }
    return publicJob(await deps.data.status(userId));
  } catch (error) {
    // Never persist arbitrary provider bodies, email addresses, tokens or keys.
    const code = /^[a-z_]{1,64}$/.test(error?.message || '') ? error.message : 'processor_unavailable';
    await deps.data.failed(job, code);
    return { ...publicJob(await deps.data.status(userId)), retryable: true };
  }
}
export function createHandler(deps) {
  return async req => {
    const origin = req.headers.get('origin');
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff', vary: 'Origin',
      'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info' };
    if (origin && deps.origins.includes(origin)) headers['access-control-allow-origin'] = origin;
    const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !deps.origins.includes(origin)) return respond({ error: 'origin_not_allowed' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405);
    try {
      let raw;
      try { raw = await boundedBytes(req.body, 2048, deps.readTimeoutMs ?? 10000); }
      catch (error) {
        const oversized = error?.message === 'body_too_large';
        return respond({ error: oversized ? 'request_too_large' : 'invalid_request' }, oversized ? 413 : 400);
      }
      const bodyText = new TextDecoder().decode(raw);
      let body; try { body = JSON.parse(bodyText); } catch { return respond({ error: 'invalid_request' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') return respond({ error: 'invalid_request' }, 400);
      const token = req.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
      if (!token) return respond({ error: 'unauthorized' }, 401);
      if (body.action === 'process') {
        if (origin || !await deps.processorAuthorized(token)) return respond({ error: 'unauthorized' }, 401);
        if (Object.keys(body).some(k => k !== 'action')) return respond({ error: 'invalid_request' }, 400);
        const pending = await deps.data.pending(5);
        const results = [];
        for (const uid of pending) results.push(await processJob(uid, deps));
        return respond({ jobs: results, complete: results.every(j => j?.state === 'completed') });
      }
      const user = await deps.authenticate(token);
      if (!user || !UUID.test(user.id || '') || !user.email || !user.email_confirmed_at || user.is_anonymous) return respond({ error: 'unauthorized' }, 401);
      if (Object.keys(body).some(k => !['action', 'confirmation'].includes(k))) return respond({ error: 'invalid_request' }, 400);
      if (body.action === 'export') {
        const exported = await deps.data.export(user.id,user.email);
        if (!exported || exported.complete !== true || exported.user_id !== user.id) throw new Error('export_incomplete');
        return respond({ ...exported, exported_at: new Date().toISOString(), email: user.email, retained_scope: RETAINED });
      }
      if (body.action === 'status') return respond({ job: publicJob(await deps.data.status(user.id)), retained_scope: RETAINED });
      if (body.action !== 'delete' || body.confirmation !== DELETE_CONFIRMATION) return respond({ error: 'confirmation_required', confirmation: DELETE_CONFIRMATION }, 400);
      await deps.data.request(user.id, user.email);
      const job = await processJob(user.id, deps);
      return respond({ job, retained_scope: RETAINED }, job?.state === 'completed' ? 200 : 202);
    } catch { return respond({ error: 'account_data_unavailable', retryable: true }, 503); }
  };
}
