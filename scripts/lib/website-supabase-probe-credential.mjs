// Read-only credential selection for the website's fixed Supabase authority probe.
// Keys remain in memory. This module never writes secrets or changes provider state.
export const WEBSITE_PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
export const WEBSITE_SUPABASE_URL = `https://${WEBSITE_PROJECT_REF}.supabase.co`;
const KEY_ENDPOINT = `https://api.supabase.com/v1/projects/${WEBSITE_PROJECT_REF}/api-keys?reveal=true`;
function legacyMatches(key) {
  if (typeof key !== 'string' || key.length > 8192) return false;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return claims.ref === WEBSITE_PROJECT_REF && claims.role === 'service_role';
  } catch { return false; }
}
function newStyle(key) { return typeof key === 'string' && key.length <= 8192 && /^sb_secret_[A-Za-z0-9_-]+$/.test(key); }
function pairMatches(url, key) { return url === WEBSITE_SUPABASE_URL && (newStyle(key) || legacyMatches(key)); }

export async function selectWebsiteProbeCredential({ getSecret, fetchImpl = globalThis.fetch }) {
  const ownUrl = await getSecret('WEBSITE_SUPABASE_URL', 'website.supabase-admin');
  const ownKey = await getSecret('WEBSITE_SUPABASE_SERVICE_ROLE_KEY', 'website.supabase-admin');
  if (ownUrl || ownKey) {
    if (!pairMatches(ownUrl, ownKey)) return { status: 'credential-project-mismatch' };
    return { status: 'selected', supabaseUrl: ownUrl, serviceRole: ownKey };
  }
  const sharedUrl = await getSecret('SUPABASE_URL', 'supabase.admin');
  const sharedKey = await getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
  if (pairMatches(sharedUrl, sharedKey)) return { status: 'selected', supabaseUrl: sharedUrl, serviceRole: sharedKey };
  const pat = await getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management') || await getSecret('SUPABASE_PAT', 'supabase.management');
  if (!pat) return { status: sharedUrl || sharedKey ? 'credential-project-mismatch' : 'not-run' };
  let reader, response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    response = await fetchImpl(KEY_ENDPOINT, {
      method: 'GET', redirect: 'manual', credentials: 'omit',
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/json' }, signal: controller.signal,
    });
    if (response.status !== 200 || response.redirected || !response.headers.get('content-type')?.includes('application/json')) return { status: 'rejected' };
    reader = response.body?.getReader();
    if (!reader) return { status: 'rejected' };
    const chunks = []; let length = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) return { status: 'rejected' };
      chunks.push(Buffer.from(value));
    }
    const keys = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(keys) || keys.length > 64 || keys.some(k => !k || typeof k !== 'object' || Array.isArray(k))) return { status: 'rejected' };
    // Same existing-key preference as repair-desk-comments-credential.mjs.
    const selected = keys.find(k => k.type === 'secret' && newStyle(k.api_key))
      || keys.find(k => (k.name || k.type) === 'service_role' && legacyMatches(k.api_key));
    return selected ? { status: 'selected', supabaseUrl: WEBSITE_SUPABASE_URL, serviceRole: selected.api_key } : { status: 'credential-project-mismatch' };
  } catch { return { status: 'unreachable' }; }
  finally {
    clearTimeout(timer);
    if (reader) await reader.cancel().catch(() => {});
    else await response?.body?.cancel().catch(() => {});
  }
}
