import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdapters} from '../supabase/functions/account-data/adapters.mjs';
const UID='11111111-1111-4111-8111-111111111111';
const defaults={SUPABASE_URL:'http://gateway:8000',SUPABASE_SERVICE_ROLE_KEY:'test-only',APP_URL:'https://website.staging.vaultsparkstudios.com',PUBLIC_SUPABASE_URL:'https://website-data.staging.vaultsparkstudios.com'};
function adapter(media,overrides={}){
 return createAdapters({env:key=>({...defaults,...overrides})[key],fetchImpl:async url=>Response.json(url.endsWith('/website_account_export')?{complete:true,user_id:UID,tables:{},table_counts:{},media}:[])});
}
test('media references use the configured isolated authority and encoded owned object path',async()=>{
 const path=UID+'/folder/cover #1?.png',metadata={size:123};
 const data=await adapter([{bucket:'fan-art',path,metadata}]).data.export(UID,'member@example.test');
 assert.equal(data.media[0].download_url,defaults.PUBLIC_SUPABASE_URL+'/storage/v1/object/public/fan-art/'+UID+'/folder/cover%20%231%3F.png');
 assert.deepEqual(data.media[0].metadata,metadata);
});
test('staging cannot emit production or internal-only media links',async()=>{
 const media=[{bucket:'fan-art',path:UID+'/art.png'}];
 assert.throws(()=>adapter(media,{PUBLIC_SUPABASE_URL:'https://fjnpzjjyhnpmunfoycrp.supabase.co'}),/account_environment_unverified/);
 await assert.rejects(adapter(media,{PUBLIC_SUPABASE_URL:undefined}).data.export(UID,'member@example.test'),/media_origin_unavailable/);
});
test('foreign ownership and foreign buckets cannot become export download links',async()=>{
 for(const item of [{bucket:'fan-art',path:'22222222-2222-4222-8222-222222222222/art.png'},{bucket:'another-product',path:UID+'/art.png'}]){
  await assert.rejects(adapter([item]).data.export(UID,'member@example.test'),/media_ownership_unverified/);
 }
});
test('empty-media export works on the isolated internal authority without invented download links',async()=>{
 const data=await adapter([],{PUBLIC_SUPABASE_URL:undefined}).data.export(UID,'member@example.test');
 assert.deepEqual(data.media,[]);
});

test('mixed or decorated authorities refuse before Auth, status or media deletion can fetch',async()=>{
 const production='https://fjnpzjjyhnpmunfoycrp.supabase.co',stage=defaults.PUBLIC_SUPABASE_URL;
 const invalid=[
  {APP_URL:undefined},{APP_URL:'https://www.vaultsparkstudios.com'},{APP_URL:'https://unrelated.example.test'},
  {SUPABASE_URL:production},{PUBLIC_SUPABASE_URL:production},{PUBLIC_SUPABASE_URL:'https://unrelated.example.test'},
  {APP_URL:'https://vaultsparkstudios.com',SUPABASE_URL:stage,PUBLIC_SUPABASE_URL:production},
  {APP_URL:'https://vaultsparkstudios.com',SUPABASE_URL:production,PUBLIC_SUPABASE_URL:stage},
  {APP_URL:'https://vaultsparkstudios.com',SUPABASE_URL:'http://gateway:8000',PUBLIC_SUPABASE_URL:production},
 ];
 for(const name of ['APP_URL','SUPABASE_URL','PUBLIC_SUPABASE_URL']){
  const exact=defaults[name];
  for(const value of [exact+'/',exact+'?debug=1',exact+'#fragment',exact+'/path',exact.replace('://','://user:password@'),exact.replace(/(?::8000)?$/,'.'),name==='SUPABASE_URL'?'http://gateway:8001':exact+':443'])invalid.push({[name]:value});
 }
 for(const override of invalid){
  let calls=0;
  for(const operation of ['authenticate','status','removeWebsiteMedia']){
   await assert.rejects(async()=>{
    const value=createAdapters({env:key=>({...defaults,...override})[key],fetchImpl:async()=>{calls++;throw Error('unexpected fetch');}});
    if(operation==='authenticate')await value.authenticate('token');
    if(operation==='status')await value.data.status(UID);
    if(operation==='removeWebsiteMedia')await value.providers.removeWebsiteMedia({user_id:UID,media_paths:[UID+'/art.png']});
   },/configuration_unavailable|account_environment_unverified/,JSON.stringify({operation,override}));
  }
  assert.equal(calls,0,JSON.stringify(override));
 }
});

test('production, public staging and internal staging use only their admitted backend and media authority',async()=>{
 const production='https://fjnpzjjyhnpmunfoycrp.supabase.co',stage=defaults.PUBLIC_SUPABASE_URL;
 for(const settings of [
  {APP_URL:'https://vaultsparkstudios.com',SUPABASE_URL:production},
  {APP_URL:'https://vaultsparkstudios.com',SUPABASE_URL:production,PUBLIC_SUPABASE_URL:production},
  {APP_URL:defaults.APP_URL,SUPABASE_URL:stage},
  defaults,
 ]){
  const calls=[];const value=createAdapters({env:key=>({...settings,SUPABASE_SERVICE_ROLE_KEY:'test-only'})[key],fetchImpl:async(url,options)=>{
   calls.push({url,options});
   if(url.endsWith('/website_account_export'))return Response.json({tables:{},table_counts:{},media:[{bucket:'fan-art',path:UID+'/art.png'}]});
   if(url.endsWith('/website_waitlist_export_email'))return Response.json([]);
   return Response.json({});
  }});
  await value.authenticate('provider-token');await value.data.status(UID);
  const data=await value.data.export(UID,'member@example.test');
  await value.providers.removeWebsiteMedia({user_id:UID,media_paths:[UID+'/art.png']});
  assert.ok(calls.every(call=>call.url.startsWith(settings.SUPABASE_URL+'/')));
  assert.equal(data.media[0].download_url,(settings.PUBLIC_SUPABASE_URL||settings.SUPABASE_URL)+'/storage/v1/object/public/fan-art/'+UID+'/art.png');
  assert.equal(calls.at(-1).options.method,'DELETE');
  assert.deepEqual(JSON.parse(calls.at(-1).options.body),{prefixes:[UID+'/art.png']});
 }
});

test('internal staging without public authority admits status and empty media, but never invents a nonempty link',async()=>{
 const value=adapter([],{PUBLIC_SUPABASE_URL:undefined});await value.data.status(UID);
 await value.providers.removeWebsiteMedia({user_id:UID,media_paths:[]});
 await assert.rejects(adapter([{bucket:'fan-art',path:UID+'/art.png'}],{PUBLIC_SUPABASE_URL:undefined}).data.export(UID,'member@example.test'),/media_origin_unavailable/);
});
