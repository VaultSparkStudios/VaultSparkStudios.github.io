// S357 scratch — reproduce the exact REST call cloudflare/desk-comments.mjs makes,
// to name why it 503s. Never prints the key.
import { getSecret, redact } from '../scripts/lib/secrets.mjs';

const key = await getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
if (!key) { console.log('no service-role key from the gateway'); process.exit(1); }
const base = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const PUBLIC_FIELDS = 'id,parent_id,display_name,body,created_at,is_member,member_rank';
const slug = '2026-09-16/theres-a-100-chance-ai-agents-are-ruining-the';
const query = `/rest/v1/desk_comments?story_slug=eq.${encodeURIComponent(slug)}`
  + `&status=eq.published&select=${PUBLIC_FIELDS}&order=created_at.desc&limit=50`;

const r = await fetch(base + query, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
});
const text = await r.text();
console.log('HTTP', r.status, r.statusText);
console.log('body:', redact(text.slice(0, 500)));
