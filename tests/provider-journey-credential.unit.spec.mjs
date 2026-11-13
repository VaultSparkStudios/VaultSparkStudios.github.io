import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from '../scripts/lib/safe-spawn.mjs';
import {serviceRoleKey,expectedInvestorAllow} from '../scripts/verify-provider-journey.mjs';
import {WEBSITE_PROJECT_REF,WEBSITE_SUPABASE_URL} from '../scripts/lib/website-supabase-probe-credential.mjs';

const legacy = ref => 'fixture.'+Buffer.from(JSON.stringify({ref,role:'service_role'})).toString('base64url')+'.fixture';
const OWN='sb_secret_fixture_website_owned',FOREIGN=legacy('unrelated-project-fixture');
const getter = values => async name => values[name] ?? null;
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const wrongShared = {SUPABASE_URL:'https://unrelated-project-fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:FOREIGN};

test('import is inert even when caller argv includes a live flag',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',"process.argv.push('--live'); await import('./scripts/verify-provider-journey.mjs');"],
    {cwd:process.cwd(),encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(result.status,0);assert.equal(result.stdout,'');assert.equal(result.stderr,'');
});
test('known foreign generic credential never reaches owned REST',async()=>{
  let calls=0;const truth=await expectedInvestorAllow('fixture-actor',{getSecret:getter(wrongShared),fetchImpl:async()=>{calls++;throw Error('must not fetch');}});
  assert.deepEqual(truth,{expectedAllow:null,source:'service-role-unavailable'});assert.equal(calls,0);
});
test('correct owning namespace is selected, preserving the existing REST query and headers',async()=>{
  const calls=[];const truth=await expectedInvestorAllow('fixture actor',{getSecret:getter({...wrongShared,WEBSITE_SUPABASE_URL,WEBSITE_SUPABASE_SERVICE_ROLE_KEY:OWN}),
    fetchImpl:async(url,options)=>{calls.push({url,options});return json([{id:'fixture-row'}]);}});
  assert.deepEqual(truth,{expectedAllow:true,source:'service-role'});assert.equal(calls.length,1);
  assert.equal(calls[0].url,WEBSITE_SUPABASE_URL+'/rest/v1/investor_requests?select=id&user_id=eq.fixture%20actor&status=eq.approved&limit=1');
  assert.equal(calls[0].options.headers.apikey,OWN);assert.equal(calls[0].options.headers.Authorization,'Bearer '+OWN);
});
test('fixed-project management fallback never sends the foreign key to owned REST',async()=>{
  const calls=[];const truth=await expectedInvestorAllow('fixture-actor',{getSecret:getter({...wrongShared,SUPABASE_ACCESS_TOKEN:'fixture-management-authority'}),
    fetchImpl:async(url,options)=>{calls.push({url,options});
      if(calls.length===1){assert.equal(url,`https://api.supabase.com/v1/projects/${WEBSITE_PROJECT_REF}/api-keys?reveal=true`);assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');return json([{type:'secret',api_key:OWN}]);}
      assert.equal(options.headers.apikey,OWN);assert.notEqual(options.headers.apikey,FOREIGN);assert(url.startsWith(WEBSITE_SUPABASE_URL+'/rest/v1/'));return json([]);}});
  assert.deepEqual(truth,{expectedAllow:false,source:'service-role'});assert.equal(calls.length,2);
});
for(const [name,own] of [
  ['explicit wrong origin',{WEBSITE_SUPABASE_URL:'https://website-data.staging.vaultsparkstudios.com',WEBSITE_SUPABASE_SERVICE_ROLE_KEY:OWN}],
  ['explicit foreign legacy key',{WEBSITE_SUPABASE_URL,WEBSITE_SUPABASE_SERVICE_ROLE_KEY:FOREIGN}],
  ['partial explicit namespace',{WEBSITE_SUPABASE_URL}],
])test(`${name} fails closed without generic or management fallback`,async()=>{
  let calls=0;assert.equal(await serviceRoleKey({getSecret:getter({...wrongShared,...own,SUPABASE_ACCESS_TOKEN:'fixture-management-authority'}),
    fetchImpl:async()=>{calls++;throw Error('must not fetch');}}),null);assert.equal(calls,0);
});
test('matching legacy generic pair remains supported',async()=>{
  const own=legacy(WEBSITE_PROJECT_REF);let calls=0;
  assert.equal(await serviceRoleKey({getSecret:getter({SUPABASE_URL:WEBSITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:own}),fetchImpl:async()=>{calls++;throw Error('no management needed');}}),own);assert.equal(calls,0);
});
test('no authority remains unknown rather than denied or accepted',async()=>{
  let calls=0;assert.deepEqual(await expectedInvestorAllow('fixture-actor',{getSecret:getter({}),fetchImpl:async()=>{calls++;throw Error('must not fetch');}}),
    {expectedAllow:null,source:'service-role-unavailable'});assert.equal(calls,0);
});
test('unavailable management authority cannot trigger a REST truth read',async()=>{
  let calls=0;const truth=await expectedInvestorAllow('fixture-actor',{getSecret:getter({...wrongShared,SUPABASE_ACCESS_TOKEN:'fixture-management-authority'}),
    fetchImpl:async()=>{calls++;return json({},403);}});
  assert.deepEqual(truth,{expectedAllow:null,source:'service-role-unavailable'});assert.equal(calls,1);
});
test('management response with only a foreign legacy key remains unknown',async()=>{
  let calls=0;const truth=await expectedInvestorAllow('fixture-actor',{getSecret:getter({...wrongShared,SUPABASE_ACCESS_TOKEN:'fixture-management-authority'}),
    fetchImpl:async()=>{calls++;return json([{type:'service_role',api_key:FOREIGN}]);}});
  assert.deepEqual(truth,{expectedAllow:null,source:'service-role-unavailable'});assert.equal(calls,1);
});
test('owned REST refusal remains unknown, not a successful deny observation',async()=>{
  assert.deepEqual(await expectedInvestorAllow('fixture-actor',{getSecret:getter({WEBSITE_SUPABASE_URL,WEBSITE_SUPABASE_SERVICE_ROLE_KEY:OWN}),fetchImpl:async()=>json({},401)}),
    {expectedAllow:null,source:'truth-read-http-401'});
});
test('gateway failure remains unknown without a truth request',async()=>{
  let calls=0;assert.equal(await serviceRoleKey({getSecret:async()=>{throw Error('fixture unavailable');},fetchImpl:async()=>{calls++;throw Error('must not fetch');}}),null);assert.equal(calls,0);
});
