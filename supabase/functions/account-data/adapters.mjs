import { providerSubscription, ownedMediaPath } from './core.mjs';
import { removeWebsiteKitMarketing } from './kit-marketing.mjs';
import { boundedBytes } from '../_shared/boundedBody.mjs';
// No SDK/runtime downloads: use the existing platform REST/Stripe contracts.
// Runtime credentials are provisioned by the deployment owner's secrets gateway.
export function createAdapters({ env, fetchImpl = globalThis.fetch, readTimeoutMs = 20000 }) {
  const required = key => { const value = env(key); if (!value) throw new Error('configuration_unavailable'); return value; };
  // Exact deployment authorities, admitted before any Auth, RPC or provider I/O.
  // Decorations must not normalize into an allowed authority.
  const appOrigin = required('APP_URL');
  const base = required('SUPABASE_URL');
  const productionApp = 'https://vaultsparkstudios.com';
  const stagingApp = 'https://website.staging.vaultsparkstudios.com';
  const productionData = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  const stagingData = 'https://website-data.staging.vaultsparkstudios.com';
  const internalData = 'http://gateway:8000';
  const configuredPublic = env('PUBLIC_SUPABASE_URL');
  const expectedPublic = appOrigin === productionApp ? productionData : stagingData;
  if (![productionApp, stagingApp].includes(appOrigin)
    || !(appOrigin === productionApp ? base === productionData : [stagingData, internalData].includes(base))
    || (configuredPublic !== undefined && configuredPublic !== null && configuredPublic !== expectedPublic)) {
    throw new Error('account_environment_unverified');
  }
  const publicBase = configuredPublic || (base === internalData ? null : base);
  const key = required('SUPABASE_SERVICE_ROLE_KEY');
  const bounded = async (url, options, max = 16 * 1024 * 1024) => {
    const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (response.status === 204) return { response, body: null };
    const bytes = await boundedBytes(response.body, max, readTimeoutMs);
    let body; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('provider_response_invalid'); }
    return { response, body };
  };
  const rpc = async (name, args = {}) => {
    const { response, body } = await bounded(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    if (!response.ok) throw new Error('database_unavailable');
    return body;
  };
  const data = {
    request: (uid, email) => rpc('website_account_request', { p_user_id: uid, p_email: email }),
    claim: uid => rpc('website_account_claim', { p_user_id: uid }),
    checkpoint: (job, step) => rpc('website_account_checkpoint', { p_user_id: job.user_id, p_lease: job.lease_token, p_step: step }),
    erase: job => rpc('website_account_erase', { p_user_id: job.user_id, p_lease: job.lease_token }),
    failed: (job, code) => rpc('website_account_fail', { p_user_id: job.user_id, p_lease: job.lease_token, p_code: code }),
    status: uid => rpc('website_account_status', { p_user_id: uid }),
    async export(uid,email) {
      const exported=await rpc('website_account_export',{p_user_id:uid});
      const waitlists=await rpc('website_waitlist_export_email',{p_email:email});
      if(!Array.isArray(waitlists)||!exported?.tables||!exported?.table_counts)throw new Error('export_incomplete');
      if(!Array.isArray(exported.media))throw new Error('export_incomplete');
      if(exported.media.length){
        if(!publicBase)throw new Error('media_origin_unavailable');
        exported.media=exported.media.map(item=>{
          if(item.bucket!=='fan-art'||!ownedMediaPath(uid,item.path))throw new Error('media_ownership_unverified');
          return {...item,download_url:publicBase+'/storage/v1/object/public/fan-art/'+item.path.split('/').map(encodeURIComponent).join('/')};
        });
      }
      exported.tables.website_project_waitlist=waitlists;
      exported.table_counts.website_project_waitlist=waitlists.length;
      return exported;
    },
    pending: limit => rpc('website_account_pending', { p_limit: limit }),
  };
  const stripe = async (id, method = 'GET', payload = null, requestId = '') => {
    const headers = { authorization: `Bearer ${required('STRIPE_SECRET_KEY')}`, 'stripe-version': '2023-10-16' };
    if (payload) headers['content-type'] = 'application/x-www-form-urlencoded';
    if (requestId) headers['idempotency-key'] = `website-deletion-${requestId}`;
    const result = await bounded(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, { method, headers, ...(payload ? { body: new URLSearchParams(payload).toString() } : {}) }, 256 * 1024);
    if (!result.response.ok) throw new Error('billing_unavailable');
    return result.body;
  };
  const brevo = async (url, method, payload) => {
    return bounded(`https://api.brevo.com/v3/${url}`, { method, headers: { 'api-key': required('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) }, 128 * 1024);
  };
  const providers = {
    async cancelWebsiteBilling(job) {
      const sub = providerSubscription(job, await stripe(job.billing.subscription_id));
      if (sub.status === 'canceled' || sub.cancel_at_period_end === true) return;
      const changed = providerSubscription(job, await stripe(sub.id, 'POST', { cancel_at_period_end: 'true' }, job.id));
      if (changed.cancel_at_period_end !== true && changed.status !== 'canceled') throw new Error('billing_cancellation_unverified');
    },
    async removeWebsiteMarketing(job) {
      const listId = Number(required('DISPATCH_LIST_ID'));
      if (!Number.isSafeInteger(listId) || listId <= 0 || !job.email) throw new Error('marketing_configuration_unavailable');
      const bytes = new TextEncoder().encode(job.email.trim().toLowerCase());
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      const revoked = await rpc('desk_dispatch_token_allowed', { p_hash: hash, p_revoke: true });
      if (revoked !== false && revoked !== true) throw new Error('marketing_revocation_unverified');
      const result = await brevo(`contacts/${encodeURIComponent(job.email)}`, 'PUT', { unlinkListIds: [listId] });
      if (!result.response.ok && result.response.status !== 404) throw new Error('marketing_unavailable');
      const waitlists=await rpc('website_waitlist_remove_email',{p_email:job.email});
      if(!Number.isSafeInteger(waitlists?.removed)||waitlists.removed<0)throw new Error('waitlist_removal_unverified');
      await removeWebsiteKitMarketing(job.email, { env, fetchImpl, readTimeoutMs });
    },
    async removeWebsiteMedia(job) {
      const paths = job.media_paths || [];
      if (!Array.isArray(paths) || paths.some(p => !ownedMediaPath(job.user_id, p))) throw new Error('media_ownership_unverified');
      for (let i = 0; i < paths.length; i += 100) {
        const { response } = await bounded(`${base}/storage/v1/object/fan-art`, { method: 'DELETE', headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }) });
        if (!response.ok) throw new Error('media_unavailable');
      }
      // The SQL transaction independently verifies no owned storage objects remain.
    },
    async confirmDeletion(job) {
      if (!job.email) throw new Error('confirmation_destination_unavailable');
      const from = required('ACCOUNT_DATA_FROM_EMAIL');
      const { response: result, body } = await brevo('smtp/email', 'POST', {
        sender: { email: from, name: 'VaultSpark Studios' }, to: [{ email: job.email }],
        subject: 'Your VaultSpark website membership data has been deleted',
        textContent: `Your website membership profile and scoped website activity have been deleted. Future renewals of your website membership subscription have been cancelled. Your shared Studio sign-in, other product accounts, investment records and legally retained payment records are separate and remain. Reference: ${job.id}.`,
        // Brevo's documented key is a UUID; the durable request id is one.
        headers: { idempotencyKey: job.id },
      });
      // Parse the acceptance body: HTTP success alone does not prove a send was accepted.
      // After an accepted send followed by a lost response/checkpoint, the same
      // durable UUID can return Brevo's documented duplicate acceptance instead
      // of a second message id. No generic duplicate/error is treated as success.
      if (!result.ok) {
        if (body?.code === 'duplicate_parameter' && /email for the idempotency key has already been processed/i.test(body.message || '')) return;
        throw new Error('confirmation_unavailable');
      }
      if (typeof body?.messageId !== 'string' || !body.messageId) throw new Error('confirmation_unverified');
    },
  };
  return {
    data, providers,
    origins: [appOrigin],
    async authenticate(token) {
      const { response, body } = await bounded(`${base}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${token}` } }, 128 * 1024);
      return response.ok ? body : null;
    },
    async processorAuthorized(token) {
      const expected = env('ACCOUNT_DATA_PROCESSOR_SECRET');
      if (!expected || expected.length < 32 || token.length !== expected.length) return false;
      let difference = 0; for (let i = 0; i < token.length; i++) difference |= token.charCodeAt(i) ^ expected.charCodeAt(i);
      return difference === 0;
    },
  };
}
