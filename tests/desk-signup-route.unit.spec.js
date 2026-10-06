import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/security-headers-worker.js';
import { issueCsrfToken } from '../cloudflare/worker-lib.mjs';
const origin='https://vaultsparkstudios.com';
const env={CSRF_SIGNING_KEY:'test-key',TURNSTILE_SECRET_KEY:'test-turnstile-key'};
async function submit(body, options={}) {
 const config={...env,...options.env};
 const token=options.csrf===false?'':await issueCsrfToken(config);
 return worker.fetch(new Request(`${origin}/desk/dispatch/subscribe`,{
  method:'POST',headers:{'Content-Type':'application/json','Origin':origin,'X-CSRF-Token':token,'User-Agent':'Mozilla/5.0'},
  body:typeof body==='string'?body:JSON.stringify(body)
 }),config,{waitUntil(){}});
}
async function expectError(response,status,error) {
 assert.equal(response.status,status);
 assert.equal(response.headers.get('content-type'),'application/json');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal((await response.json()).error,error);
}
test('signup rejects malformed JSON with a structured 400 instead of crashing',async()=>{
 await expectError(await submit('{'),400,'invalid_form_body');
});
test('signup welcomes human and agent clients without Turnstile but preserves CSRF',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({ok:true,state:'pending-confirmation'});});
 assert.equal((await submit({email:'reader@example.com'},{env:{TURNSTILE_SECRET_KEY:undefined}})).status,200);
 assert.equal((await submit({email:'reader@example.com'},{csrf:false})).status,403);assert.equal(calls,1);
});
test('signup rejects invalid email after successful challenge validation',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({success:true}));
 await expectError(await submit({email:'invalid',turnstileToken:'valid-token'}),400,'invalid_email');
});
test('signup passes a verified request to the pinned function and preserves its result',async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  calls.push(String(url));
  if(String(url).includes('/siteverify')) return Response.json({success:true});
  assert.equal(String(url),'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/subscribe-desk-dispatch');
  assert.deepEqual(JSON.parse(init.body),{email:'reader@example.com'});
  return Response.json({ok:true,state:'pending-confirmation'});
 });
 const result=await submit({email:' reader@example.com ',turnstileToken:'valid-token'});
 assert.equal(result.status,200);assert.equal((await result.json()).state,'pending-confirmation');assert.equal(calls.length,1);
});
test('signup preserves email-service failure instead of reporting success',async(t)=>{
 t.mock.method(globalThis,'fetch',async(url)=>String(url).includes('/siteverify')?Response.json({success:true}):Response.json({error:'mail unavailable'},{status:502}));
 await expectError(await submit({email:'reader@example.com',turnstileToken:'valid-token'}),502,'mail unavailable');
});
