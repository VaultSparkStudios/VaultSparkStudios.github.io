import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHandler, processJob, providerSubscription, ownedMediaPath, DELETE_CONFIRMATION } from '../supabase/functions/account-data/core.mjs';
import { createAdapters } from '../supabase/functions/account-data/adapters.mjs';

const UID='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const EMAIL='member@example.test';
function fixture() {
  let job=null, locked=false; const calls=[];
  const deps={origins:['https://vaultsparkstudios.com'],
    authenticate:async token=>token==='member-token'?{id:UID,email:EMAIL,email_confirmed_at:'2026-01-01',is_anonymous:false}:null,
    processorAuthorized:async token=>token==='processor-token',
    data:{
      async request(uid,email){ calls.push('request'); assert.equal(uid,UID); if(!job)job={id:'request-owned',user_id:uid,email,state:'requested',requested_at:'2026-11-23',billing:{plan:'vault_sparked',subscription_id:'sub_owned',customer_id:'cus_owned'},media_paths:[`${uid}/art.png`],billing_done:false,marketing_done:false,media_done:false}; return job; },
      async claim(uid){calls.push('claim');assert.equal(uid,UID);if(locked)return null;locked=true;if(job.state!=='completed'){job.lease_token='lease';job.state=job.erased_at?'erased':'processing';}return {...job};},
      async checkpoint(j,step){calls.push(step);assert.equal(j.lease_token,job.lease_token);if(step==='confirmation'){assert.ok(job.erased_at);job.state='completed';job.completed_at='now';job.email=null;job.media_paths=[];locked=false;}else job[`${step}_done`]=true;return {...job};},
      async erase(){calls.push('erase');assert.ok(job.billing_done&&job.marketing_done&&job.media_done);job.state='erased';job.erased_at='now';return {...job};},
      async failed(j,code){calls.push('failed');job.last_error_code=code;locked=false;},
      async status(uid){assert.equal(uid,UID);return job?{...job}:null;},
      async pending(){return job&&job.state!=='completed'?[UID]:[];},
      async export(uid){return {complete:true,user_id:uid,tables:{point_events:Array.from({length:1201},(_,id)=>({id,points:1}))}};},
    },
    providers:Object.fromEntries(['cancelWebsiteBilling','removeWebsiteMarketing','removeWebsiteMedia','confirmDeletion'].map(name=>[name,async()=>{calls.push(name);}])),
  };
  const request=async(body,{token='member-token',origin='https://vaultsparkstudios.com',method='POST'}={})=>createHandler(deps)(new Request('https://functions.test/account-data',{method,headers:{authorization:`Bearer ${token}`,...(origin?{origin}:{}),'content-type':'application/json'},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
  return {deps,calls,request,job:()=>job,unlock:()=>{locked=false;}};
}
test('export returns every scoped row beyond old 500 and PostgREST 1000 limits, never secret job fields',async()=>{
  const f=fixture(),r=await f.request({action:'export'}),b=await r.json();
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(b.tables.point_events.length,1201);
  assert.equal(b.email,EMAIL);assert.ok(b.retained_scope.some(s=>s.includes('shared Studio')));assert.equal(b.lease_token,undefined);
});
test('database errors and partial/wrong-owner exports never download as successful empty data',async()=>{
  for(const result of [null,{complete:false,user_id:UID},{complete:true,user_id:OTHER}]){const f=fixture();f.deps.data.export=async()=>result;assert.equal((await f.request({action:'export'})).status,503);}
  const f=fixture();f.deps.data.export=async()=>{throw Error('database unavailable');};assert.equal((await f.request({action:'export'})).status,503);
});
test('human actions reject invalid identity, anonymous identity, cross-origin and caller-chosen user IDs',async()=>{
  const f=fixture();assert.equal((await f.request({action:'delete',confirmation:DELETE_CONFIRMATION},{token:'foreign'})).status,401);
  assert.equal((await f.request({action:'export'},{origin:'https://evil.example'})).status,403);
  assert.equal((await f.request({action:'export',user_id:OTHER})).status,400);
  for(const user of [{id:UID,email:EMAIL},{id:UID,email:EMAIL,email_confirmed_at:'now',is_anonymous:true}]){f.deps.authenticate=async()=>user;assert.equal((await f.request({action:'export'})).status,401);}
  assert.deepEqual(f.calls,[]);
});
test('delete needs exact scope confirmation and only signs completion after providers, erasure and confirmation',async()=>{
  const f=fixture();assert.equal((await f.request({action:'delete',confirmation:'yes'})).status,400);
  const r=await f.request({action:'delete',confirmation:DELETE_CONFIRMATION}),b=await r.json();assert.equal(r.status,200);assert.equal(b.job.state,'completed');
  assert.deepEqual(f.calls,['request','claim','cancelWebsiteBilling','billing','removeWebsiteMarketing','marketing','removeWebsiteMedia','media','erase','confirmDeletion','confirmation']);
  assert.equal(f.job().email,null);assert.deepEqual(f.job().media_paths,[]);assert.equal(b.job.billing,undefined);assert.equal(b.job.user_id,undefined);
});
test('billing/marketing/media failures hold erasure and are resumable from completed provider checkpoints',async()=>{
  for(const failed of ['cancelWebsiteBilling','removeWebsiteMarketing','removeWebsiteMedia']){
    const f=fixture();const original=f.deps.providers[failed];f.deps.providers[failed]=async()=>{throw Error('provider_unavailable');};
    assert.equal((await f.request({action:'delete',confirmation:DELETE_CONFIRMATION})).status,202);assert.ok(!f.calls.includes('erase'));assert.ok(!f.calls.includes('confirmDeletion'));
    f.deps.providers[failed]=original;const n=f.calls.length;
    const retry=await f.request({action:'delete',confirmation:DELETE_CONFIRMATION});assert.equal(retry.status,200);
    if(failed!=='cancelWebsiteBilling')assert.ok(!f.calls.slice(n).includes('cancelWebsiteBilling'));
  }
});
test('confirmation failure retains private email in the job, retries without repeated provider mutation, then clears it',async()=>{
  const f=fixture();f.deps.providers.confirmDeletion=async()=>{throw Error('confirmation_unavailable');};
  const first=await f.request({action:'delete',confirmation:DELETE_CONFIRMATION});assert.equal(first.status,202);assert.equal(f.job().state,'erased');assert.equal(f.job().email,EMAIL);
  const n=f.calls.length;f.deps.providers.confirmDeletion=async()=>{};
  assert.equal((await f.request({action:'delete',confirmation:DELETE_CONFIRMATION})).status,200);
  assert.ok(!f.calls.slice(n).includes('cancelWebsiteBilling'));assert.equal(f.job().email,null);
});
test('concurrent claim is busy and replay of completed request performs no provider work',async()=>{
  const f=fixture();await f.deps.data.request(UID,EMAIL);await f.deps.data.claim(UID);
  assert.deepEqual(await processJob(UID,f.deps),{state:'busy'});f.unlock();
  await processJob(UID,f.deps);const n=f.calls.length;await processJob(UID,f.deps);assert.deepEqual(f.calls.slice(n),['claim']);
});
test('processor secret is separate from member tokens, refuses chosen targets and batches bounded jobs',async()=>{
  const f=fixture();await f.deps.data.request(UID,EMAIL);
  assert.equal((await f.request({action:'process'},{origin:null})).status,401);
  assert.equal((await f.request({action:'process'},{token:'processor-token'})).status,401);
  assert.equal((await f.request({action:'process',user_id:OTHER},{origin:null,token:'processor-token'})).status,400);
  assert.equal((await f.request({action:'process'},{origin:null,token:'processor-token'})).status,200);
});
test('oversized/malformed request bodies and invalid methods never reach account mutations',async()=>{
  const f=fixture();assert.equal((await f.request('x'.repeat(3000))).status,413);assert.equal((await f.request('{')).status,400);
  assert.equal((await f.request({}, {method:'GET'})).status,405);assert.deepEqual(f.calls,[]);
});
test('Stripe ownership check rejects legacy/foreign/unknown references and does not broaden to customer deletion',()=>{
  const job={user_id:UID,billing:{plan:'vault_sparked',subscription_id:'sub_owned',customer_id:'cus_owned'}};
  const sub={id:'sub_owned',customer:'cus_owned',metadata:{vault_user_id:UID,plan:'vault_sparked'}};
  assert.equal(providerSubscription(job,sub),sub);
  for(const bad of [{...sub,customer:'cus_foreign'},{...sub,metadata:{vault_user_id:OTHER,plan:'vault_sparked'}},{...sub,metadata:{vault_user_id:UID,plan:'promogrind_pro'}},{...sub,metadata:{}}])assert.throws(()=>providerSubscription(job,bad),/ownership/);
});
test('owned file boundaries reject other accounts, traversal, backslashes and missing filenames',()=>{
  assert.ok(ownedMediaPath(UID,`${UID}/art.png`));
  for(const path of [`${OTHER}/art.png`,`${UID}/../art.png`,`${UID}/`,`${UID}/a\\b`,`${UID}//art.png`])assert.equal(ownedMediaPath(UID,path),false);
});
const settings={APP_URL:'https://vaultsparkstudios.com',SUPABASE_URL:'https://fjnpzjjyhnpmunfoycrp.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-test',STRIPE_SECRET_KEY:'stripe-test',BREVO_API_KEY:'brevo-test',DISPATCH_LIST_ID:'42',ACCOUNT_DATA_FROM_EMAIL:'founder@example.test',ACCOUNT_DATA_PROCESSOR_SECRET:'s'.repeat(40),KIT_API_KEY:'kit-test-key',KIT_ACCOUNT_ID:'10'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
test('real Stripe adapter reads exact subscription, schedules cancellation and verifies returned ownership without deleting customer',async()=>{
  const calls=[];const job={id:'job-owned',user_id:UID,billing:{plan:'vault_sparked',subscription_id:'sub_owned',customer_id:'cus_owned'}};
  const deps=createAdapters({env:k=>settings[k],fetchImpl:async(url,options)=>{calls.push([url,options]);return json({id:'sub_owned',customer:'cus_owned',metadata:{vault_user_id:UID,plan:'vault_sparked'},cancel_at_period_end:options.method==='POST'});}});
  await deps.providers.cancelWebsiteBilling(job);assert.equal(calls.length,2);assert.ok(calls.every(([url])=>url==='https://api.stripe.com/v1/subscriptions/sub_owned'));
  assert.equal(calls[1][1].body,'cancel_at_period_end=true');assert.equal(calls[1][1].headers['idempotency-key'],'website-deletion-job-owned');
});
test('marketing adapter revokes old confirmation tokens and unlinks exact owned list without deleting global Brevo contact',async()=>{
  const calls=[];const deps=createAdapters({env:k=>settings[k],fetchImpl:async(url,options)=>{calls.push([url,options]);if(url==='https://api.kit.com/v4/account')return json({account:{id:10}});if(url.startsWith('https://api.kit.com/v4/subscribers?'))return json({subscribers:[],pagination:{has_next_page:false}});if(url.endsWith('/website_waitlist_remove_email'))return json({removed:2});return url.includes('/rpc/')?json(false):new Response(null,{status:204});}});
  await deps.providers.removeWebsiteMarketing({email:EMAIL});assert.match(calls[0][0],/desk_dispatch_token_allowed$/);assert.equal(JSON.parse(calls[0][1].body).p_revoke,true);
  assert.equal(calls[1][1].method,'PUT');assert.deepEqual(JSON.parse(calls[1][1].body),{unlinkListIds:[42]});
  assert.equal(JSON.parse(calls.find(([url])=>url.endsWith('/website_waitlist_remove_email'))[1].body).p_email,EMAIL);
});
test('project-list export uses provider-confirmed email, and an unavailable email-owned section fails the whole export',async()=>{
  const f=fixture();let received;
  f.deps.data.export=async(uid,email)=>{received={uid,email};return {complete:true,user_id:uid,tables:{}};};
  assert.equal((await f.request({action:'export'})).status,200);assert.deepEqual(received,{uid:UID,email:EMAIL});
  assert.equal((await f.request({action:'export',email:'other@example.test'})).status,400);
  const calls=[];const deps=createAdapters({env:k=>settings[k],fetchImpl:async(url,options)=>{calls.push([url,options]);return url.endsWith('/website_account_export')?json({complete:true,tables:{},table_counts:{},media:[]}):json([{project:'game:solara',state:'confirmed'}]);}});
  const result=await deps.data.export(UID,EMAIL);assert.equal(result.tables.website_project_waitlist.length,1);assert.equal(result.table_counts.website_project_waitlist,1);
  assert.equal(JSON.parse(calls[1][1].body).p_email,EMAIL);
  const failed=createAdapters({env:k=>settings[k],fetchImpl:async url=>url.endsWith('/website_account_export')?json({complete:true,tables:{},table_counts:{},media:[]}):json({error:'unavailable'},500)});
  await assert.rejects(failed.data.export(UID,EMAIL));
});
test('missing provider configuration and unaccepted email never become successful no-ops',async()=>{
  const deps=createAdapters({env:k=>({...settings,DISPATCH_LIST_ID:'0'})[k],fetchImpl:async()=>{throw Error('must not call');}});
  await assert.rejects(deps.providers.removeWebsiteMarketing({email:EMAIL}),/configuration/);
  const bad=createAdapters({env:k=>settings[k],fetchImpl:async()=>json({})});
  await assert.rejects(bad.providers.confirmDeletion({email:EMAIL,id:'job'}),/confirmation_unverified/);
});
test('confirmation retries reuse UUID idempotency and accept only the provider-specific already-processed receipt',async()=>{
  const id='33333333-3333-4333-8333-333333333333';let sent;
  const deps=createAdapters({env:k=>settings[k],fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return json({code:'duplicate_parameter',message:'Email for the idempotency key has already been processed'},400);}});
  await deps.providers.confirmDeletion({id,email:EMAIL});assert.equal(sent.headers.idempotencyKey,id);
  const failed=createAdapters({env:k=>settings[k],fetchImpl:async()=>json({code:'duplicate_parameter',message:'Another parameter is duplicated'},400)});
  await assert.rejects(failed.providers.confirmDeletion({id,email:EMAIL}),/confirmation_unavailable/);
});
test('SQL manifest matches observed website columns, preserves shared identities and no longer relies on missing delete_requested',()=>{
  const migration=fs.readFileSync(new URL('../supabase/migrations/20261123042000_website_account_data.sql',import.meta.url),'utf8');
  assert.ok(!/delete\s+from\s+(?:auth\.users|public\.(?:obelisk_identity_link|promogrind_data|investors|game_sessions|vault_events))/i.test(migration));
  assert.ok(!migration.includes('delete_requested'));assert.match(migration,/pg_try_advisory_xact_lock/);assert.ok(!/perform\s+pg_catalog\.pg_advisory_xact_lock/.test(migration));assert.match(migration,/from public, anon, authenticated/);
  assert.match(migration,/update public\.desk_comments set user_id=null/);assert.ok(!/delete from public\.(desk_comments|teams|gift_subscriptions)/i.test(migration));
  assert.match(migration,/media_paths=case when p_step='confirmation' then '\[\]'::jsonb/);
  // When the captured production catalogue is available, ensure none of the
  // static manifest columns were guessed from outdated migration comments.
  const metadata=new URL('../.cache/logs/S418-owned-columns.json',import.meta.url);
  if(fs.existsSync(metadata)){const columns=JSON.parse(fs.readFileSync(metadata,'utf8'));for(const block of migration.matchAll(/for row in select \* from \(values([\s\S]*?)\) manifest/g))for(const match of block[1].matchAll(/\('([a-z_]+)','([a-z_]+)'/g))assert.ok(columns.some(r=>r.table_name===match[1]&&r.column_name===match[2]),`${match[1]}.${match[2]}`);}
});
