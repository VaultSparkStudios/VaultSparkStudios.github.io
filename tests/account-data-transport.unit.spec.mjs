import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/account-data/core.mjs';
import { createAdapters } from '../supabase/functions/account-data/adapters.mjs';
import { removeWebsiteKitMarketing } from '../supabase/functions/account-data/kit-marketing.mjs';
const stall=()=>new ReadableStream({pull(){return new Promise(()=>{});},cancel(){return new Promise(()=>{});}});
const oversized=size=>new ReadableStream({start(c){c.enqueue(new Uint8Array(size));},cancel(){return new Promise(()=>{});}});
const env=name=>({APP_URL:'https://website.staging.vaultsparkstudios.com',SUPABASE_URL:'http://gateway:8000',SUPABASE_SERVICE_ROLE_KEY:'test-only',ACCOUNT_DATA_FROM_EMAIL:'studio@example.test',BREVO_API_KEY:'test-only',KIT_API_KEY:'test-only',KIT_ACCOUNT_ID:'42'}[name]);
test('stalled and oversized anonymous account requests terminate before any identity or provider operation',{timeout:2000},async()=>{
 const handler=createHandler({origins:['https://vaultsparkstudios.com'],readTimeoutMs:10,authenticate(){throw Error('must not authenticate');}});
 for(const[body,status]of [[stall(),400],[oversized(2049),413]]){
  const result=await handler(new Request('https://isolated.example.test/account-data',{method:'POST',body,duplex:'half'}));
  assert.equal(result.status,status);
 }
});
test('stalled provider Auth observation and Kit response terminate even if cancellation never settles',{timeout:2000},async()=>{
 const adapters=createAdapters({env,readTimeoutMs:10,fetchImpl:async()=>new Response(stall())});
 await assert.rejects(adapters.authenticate('untrusted-test-token'),/read_timeout/);
 await assert.rejects(removeWebsiteKitMarketing('member@example.test',{env,readTimeoutMs:10,fetchImpl:async()=>new Response(stall())}),/read_timeout/);
});
test('oversized or unacknowledged confirmation bodies cannot count as accepted deletion email',{timeout:2000},async()=>{
 const job={id:'11111111-1111-4111-8111-111111111111',email:'member@example.test'};
 const large=createAdapters({env,readTimeoutMs:10,fetchImpl:async()=>new Response(oversized(128*1024+1))});
 await assert.rejects(large.providers.confirmDeletion(job),/body_too_large/);
 const empty=createAdapters({env,readTimeoutMs:10,fetchImpl:async()=>new Response(null,{status:204})});
 await assert.rejects(empty.providers.confirmDeletion(job),/confirmation_unverified/);
});
