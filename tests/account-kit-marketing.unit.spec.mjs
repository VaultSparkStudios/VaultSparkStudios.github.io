import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { removeWebsiteKitMarketing, WEBSITE_KIT_TAG_IDS, WEBSITE_KIT_WELCOME_SEQUENCE } from '../supabase/functions/account-data/kit-marketing.mjs';
const email='member@example.test';
function fixture({foreignAccount=false,missingKey=false,sequenceMember=false,foreignSubscriber=false,keptTag=false}={}){
  const calls=[];let deleted=false;
  return {calls,options:{env:key=>({KIT_API_KEY:missingKey?'':'private-test-key',KIT_ACCOUNT_ID:'10'})[key],fetchImpl:async(url,options)=>{
    calls.push({url,method:options.method});const p=new URL(url);let data;
    if(options.method==='DELETE'){deleted=true;return new Response(null,{status:204});}
    if(p.pathname==='/v4/account')data={account:{id:foreignAccount?11:10}};
    else if(p.pathname==='/v4/subscribers')data={subscribers:[{id:4,email_address:foreignSubscriber?'other@example.test':email,state:'active'}],pagination:{has_next_page:false}};
    else if(p.pathname==='/v4/subscribers/4/tags')data={tags:[{id:9999},...(!deleted||keptTag?WEBSITE_KIT_TAG_IDS.map(id=>({id})):[])],pagination:{has_next_page:false}};
    else if(p.pathname===`/v4/sequences/${WEBSITE_KIT_WELCOME_SEQUENCE}/subscribers`)data={subscribers:sequenceMember?[{id:4,email_address:email}]:[],pagination:{has_next_page:false}};
    else throw Error('unexpected request');
    return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
  }}};
}
test('legacy Kit erasure removes only owned tags, retains foreign associations/contact, and verifies readback',async()=>{
  const f=fixture();assert.equal((await removeWebsiteKitMarketing(email,f.options)).state,'website_kit_associations_removed');
  const writes=f.calls.filter(c=>c.method==='DELETE');assert.equal(writes.length,3);
  assert.deepEqual(writes.map(c=>Number(new URL(c.url).pathname.split('/')[3])),WEBSITE_KIT_TAG_IDS);
  assert.ok(writes.every(c=>new URL(c.url).searchParams.get('email_address')===email));
  assert.ok(!f.calls.some(c=>/unsubscribe/.test(c.url)||c.url.endsWith('/subscribers/4')));
});
test('missing authority, foreign account/subscriber and lingering owned tag remain nonpassing',async()=>{
  for(const options of [{missingKey:true},{foreignAccount:true},{foreignSubscriber:true},{keptTag:true}]){
    const f=fixture(options);await assert.rejects(removeWebsiteKitMarketing(email,f.options));
    if(!options.keptTag)assert.equal(f.calls.filter(c=>c.method==='DELETE').length,0);
  }
});
test('active welcome-sequence membership is not silently mistaken for complete marketing removal',async()=>{
  const f=fixture({sequenceMember:true});await assert.rejects(removeWebsiteKitMarketing(email,f.options),/kit_sequence_removal_unverified/);
  assert.ok(!f.calls.some(c=>c.method==='POST'||c.method==='PUT'));
});
test('scoped provider associations remain bound to the actual website capture sources',()=>{
  const source=fs.readFileSync(new URL('../assets/kit.js',import.meta.url),'utf8');
  const ids=[...source.match(/const TAG_IDS = \{([\s\S]*?)\};/)[1].matchAll(/:\s*(\d+)/g)].map(match=>Number(match[1]));
  assert.deepEqual(WEBSITE_KIT_TAG_IDS,ids);
  assert.equal(WEBSITE_KIT_WELCOME_SEQUENCE,Number(source.match(/^\s*let WELCOME_SEQUENCE_ID = (\d+)/m)[1]));
});
