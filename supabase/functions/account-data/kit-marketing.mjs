import { boundedBytes } from '../_shared/boundedBody.mjs';
// Existing website-owned associations in assets/kit.js. Never unsubscribe a
// global/shared Kit contact or remove another project's tags/sequences.
export const WEBSITE_KIT_TAG_IDS = Object.freeze([17824260,17824261,17824263]);
export const WEBSITE_KIT_WELCOME_SEQUENCE = 2695661;
export async function removeWebsiteKitMarketing(email, { env, fetchImpl = globalThis.fetch, readTimeoutMs = 15000 }) {
  const key = env('KIT_API_KEY');
  const accountId = Number(env('KIT_ACCOUNT_ID'));
  if (!key || !Number.isSafeInteger(accountId) || accountId <= 0) throw new Error('kit_configuration_unavailable');
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || normalized.length > 254) throw new Error('kit_recipient_unverified');
  const request = async (relative, method = 'GET') => {
    const response = await fetchImpl(`https://api.kit.com/v4/${relative}`, {
      method, headers: { 'X-Kit-Api-Key': key, accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (method === 'DELETE' && response.status === 204) return { response, body: null };
    const bytes = await boundedBytes(response.body, 1024 * 1024, readTimeoutMs);
    let body; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('kit_observation_unavailable'); }
    if (!response.ok && !(method === 'DELETE' && response.status === 404)) throw new Error('kit_provider_unavailable');
    return { response, body };
  };
  const account = await request('account');
  if (account.body?.account?.id !== accountId) throw new Error('kit_account_ownership_unverified');
  const subscribers = await request('subscribers?' + new URLSearchParams({ email_address: normalized, status: 'all' }));
  if (!Array.isArray(subscribers.body?.subscribers) || subscribers.body.pagination?.has_next_page !== false
    || subscribers.body.subscribers.some(row => String(row?.email_address || '').trim().toLowerCase() !== normalized)
    || subscribers.body.subscribers.length > 1) throw new Error('kit_subscriber_ownership_unverified');
  if (!subscribers.body.subscribers.length) return { state: 'no_website_kit_contact' };
  const subscriber = subscribers.body.subscribers[0];
  if (!Number.isSafeInteger(subscriber.id) || subscriber.id <= 0) throw new Error('kit_subscriber_ownership_unverified');
  const collect = async (endpoint, field) => {
    const rows = []; let cursor = ''; const seen = new Set();
    for (let page = 0; page < 5; page++) {
      const query = new URLSearchParams({ per_page: '1000', ...(cursor ? { after: cursor } : {}) });
      const { body } = await request(endpoint + '?' + query);
      if (!Array.isArray(body?.[field]) || typeof body.pagination?.has_next_page !== 'boolean') throw new Error('kit_observation_incomplete');
      rows.push(...body[field]);
      if (!body.pagination.has_next_page) return rows;
      cursor = body.pagination.end_cursor;
      if (typeof cursor !== 'string' || !cursor || cursor.length > 512 || seen.has(cursor)) throw new Error('kit_observation_incomplete');
      seen.add(cursor);
    }
    throw new Error('kit_observation_incomplete');
  };
  const tags = await collect(`subscribers/${subscriber.id}/tags`, 'tags');
  for (const id of WEBSITE_KIT_TAG_IDS) {
    if (!tags.some(tag => tag.id === id)) continue;
    const query = new URLSearchParams({ email_address: normalized });
    await request(`tags/${id}/subscribers?${query}`, 'DELETE');
  }
  const after = await collect(`subscribers/${subscriber.id}/tags`, 'tags');
  if (after.some(tag => WEBSITE_KIT_TAG_IDS.includes(tag.id))) throw new Error('kit_tag_removal_unverified');
  // Current official REST docs expose sequence listing/addition, not individual
  // sequence removal. Do not guess a destructive endpoint or globally cancel
  // this shared contact. A still-associated welcome recipient needs the owned
  // Kit automation/dashboard path; it remains nonpassing until observed absent.
  if (!['cancelled','bounced','complained'].includes(subscriber.state)) {
    const sequence = await collect(`sequences/${WEBSITE_KIT_WELCOME_SEQUENCE}/subscribers`, 'subscribers');
    if (sequence.some(row => row.id === subscriber.id || String(row.email_address || '').trim().toLowerCase() === normalized)) throw new Error('kit_sequence_removal_unverified');
  }
  return { state: 'website_kit_associations_removed' };
}
