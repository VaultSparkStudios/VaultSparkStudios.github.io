import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectWebsiteProbeCredential, WEBSITE_SUPABASE_URL as OWN, WEBSITE_PROJECT_REF as REF } from '../scripts/lib/website-supabase-probe-credential.mjs';
const jwt = (ref = REF, role = 'service_role') => 'e30.' + Buffer.from(JSON.stringify({ ref, role })).toString('base64url') + '.signature';
const keys = (rows, status = 200) => new Response(JSON.stringify(rows), { status, headers: { 'content-type': 'application/json' } });
const own = key => ({ WEBSITE_SUPABASE_URL: OWN, WEBSITE_SUPABASE_SERVICE_ROLE_KEY: key });
const shared = key => ({ SUPABASE_URL: OWN, SUPABASE_SERVICE_ROLE_KEY: key });
async function select(values, fetchImpl = () => { assert.fail('unexpected network'); }) {
  const lookups = [];
  const result = await selectWebsiteProbeCredential({ getSecret: (name, capability) => { lookups.push({ name, capability }); return values[name] || null; }, fetchImpl });
  return { result, lookups };
}
test('own paired credential wins, correct capability, no shared lookup or fetch', async () => {
  const { result, lookups } = await select({ ...shared(jwt('foreign')), ...own('sb_secret_own') });
  assert.equal(result.serviceRole, 'sb_secret_own');
  assert.deepEqual(lookups.map(r => r.capability), ['website.supabase-admin', 'website.supabase-admin']);
});
for (const [name, value] of Object.entries({ urlOnly: { WEBSITE_SUPABASE_URL: OWN }, keyOnly: { WEBSITE_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_own' }, foreignUrl: { ...own(jwt()), WEBSITE_SUPABASE_URL: 'https://foreign.supabase.co' }, foreignJwt: own(jwt('foreign')), anon: own(jwt(REF, 'anon')), arbitrary: own('opaque'), malformed: own('a.!!!.c'), noncanonicalUrl: { ...own(jwt()), WEBSITE_SUPABASE_URL: OWN + '/' } })) {
  test('own ' + name + ' refuses without silent shared/PAT fallback', async () => {
    const { result, lookups } = await select({ ...shared(jwt()), SUPABASE_ACCESS_TOKEN: 'pat', ...value });
    assert.deepEqual(result, { status: 'credential-project-mismatch' });
    assert.equal(lookups.length, 2);
  });
}
test('shared exact project JWT and new-style pair can be selected', async () => {
  for (const key of [jwt(), 'sb_secret_shared']) assert.equal((await select(shared(key))).result.serviceRole, key);
});
test('sibling shared credential never reaches REST: fixed read-only management lookup prefers existing new secret', async () => {
  let count = 0;
  const { result } = await select({ SUPABASE_URL: 'https://foreign.supabase.co', SUPABASE_SERVICE_ROLE_KEY: jwt('foreign'), SUPABASE_ACCESS_TOKEN: 'pat' }, async (url, options) => {
    count++;
    assert.equal(url, 'https://api.supabase.com/v1/projects/' + REF + '/api-keys?reveal=true');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Authorization, 'Bearer pat'); assert.ok(options.signal instanceof AbortSignal); assert.equal(options.body, undefined);
    return keys([{ name: 'service_role', api_key: jwt() }, { type: 'secret', api_key: 'sb_secret_existing' }]);
  });
  assert.equal(count, 1); assert.equal(result.serviceRole, 'sb_secret_existing'); assert.equal(result.supabaseUrl, OWN);
});
test('management PAT alias supported and only matching service-role legacy fallback accepted', async () => {
  const { result, lookups } = await select({ SUPABASE_PAT: 'pat' }, async () => keys([{ type: 'secret', api_key: 'bad' }, { name: 'service_role', api_key: jwt('foreign') }, { name: 'service_role', api_key: jwt() }]));
  assert.equal(result.serviceRole, jwt()); assert.ok(lookups.some(r => r.name === 'SUPABASE_PAT' && r.capability === 'supabase.management'));
});
for (const [name, reply] of Object.entries({ foreignLegacy: () => keys([{ name: 'service_role', api_key: jwt('foreign') }]), anon: () => keys([{ name: 'service_role', api_key: jwt(REF, 'anon') }]), noKeys: () => keys([]), wrongShape: () => keys({ api_key: 'sb_secret_private' }), tooMany: () => keys(Array.from({ length: 65 }, () => ({ type: 'secret', api_key: 'sb_secret_private' }))), oversized: () => keys([{ type: 'secret', api_key: 'sb_secret_' + 'x'.repeat(66000) }]), malformed: () => new Response('{bad', { headers: { 'content-type': 'application/json' } }), redirect: () => new Response('', { status: 302, headers: { location: 'https://foreign.example' } }), forbidden: () => keys([], 403), wrongMime: () => new Response('[]', { headers: { 'content-type': 'text/html' } }), transport: () => { throw Error('private-pat-and-token'); } })) {
  test('management ' + name + ' fails closed without leaking material', async () => {
    const { result } = await select({ SUPABASE_ACCESS_TOKEN: 'pat' }, reply);
    assert.notEqual(result.status, 'selected');
    assert.equal(result.serviceRole, undefined);
    assert.ok(!JSON.stringify(result).includes('private'));
  });
}
test('absent and foreign shared credentials remain distinct without PAT', async () => {
  assert.deepEqual((await select({})).result, { status: 'not-run' });
  assert.deepEqual((await select(shared(jwt('foreign')))).result, { status: 'credential-project-mismatch' });
});
test('canonical probe consumes selection before real REST authority check', () => {
  const source = fs.readFileSync(new URL('../scripts/probe-supabase-control-plane.mjs', import.meta.url), 'utf8');
  assert.match(source, /await selectWebsiteProbeCredential\(\{ getSecret \}\)/);
  assert.match(source, /if \(selectionStatus === 'selected'\) \{\s*observations.dataRest = await readOnlyFetch/);
  assert.match(source, /const inventory = await credentialInventory\(\)/);
});
