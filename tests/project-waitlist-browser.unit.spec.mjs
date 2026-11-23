import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchBrowser,openFixture,html,waitFor} from './fixtures/browser-harness.mjs';
import {renderWaitlist} from '../scripts/build-project-waitlists.mjs';
let browser;before(async()=>{browser=await launchBrowser();});after(async()=>browser?.close());
test('project request uses one-use human token and never mistakes HTTP200 for confirmation',async()=>{
 for(const valid of [true,false]){const calls=[];const f=await openFixture(browser,{pages:{'/project/':html({body:renderWaitlist({key:'game:vaultfront',name:'VaultFront'})+'<script src="/assets/notify-me.js"></script>'})},initScripts:[()=>{window.__tokens=0;window.VSTurnstile={consumeToken:async()=>{window.__tokens++;return 'one-use';}};}],handlers:[{match:u=>u.pathname==='/api/project-waitlist',handle:(route,req)=>{calls.push(req.postDataJSON());return route.fulfill({json:valid?{ok:true,state:'pending-confirmation',project:'game:vaultfront'}:{ok:true,state:'confirmed',project:'other'}});}}]});
  try{await f.goto('/project/');await f.page.fill('[type=email]','member@example.test');await f.page.click('[type=submit]');await waitFor(()=>f.page.locator('.notify-me-feedback').textContent().then(t=>!t.includes('Checking')));assert.match(await f.page.locator('.notify-me-feedback').textContent(),valid?/Check your email/:/could not be verified/);assert.equal(calls[0].project,'game:vaultfront');assert.equal(calls[0].turnstileToken,'one-use');assert.equal(await f.page.locator('[type=submit]').isDisabled(),false);assert.equal(await f.page.evaluate(()=>window.__tokens),1);}finally{await f.close();}
 }
});
test('opening email fragment previews only; explicit button confirms and strips token from address',async()=>{
 const calls=[];const f=await openFixture(browser,{pages:{'/waitlist/confirm/':fs.readFileSync('waitlist/confirm/index.html','utf8')},handlers:[{match:u=>u.pathname==='/api/project-waitlist',handle:(route,req)=>{const body=req.postDataJSON();calls.push(body);return route.fulfill({json:{ok:true,state:body.action==='confirm'?'confirmed':'pending',project:'game:vaultfront',name:'VaultFront',path:'/games/vaultfront/'}});}}]});
 try{await f.goto('/waitlist/confirm/#token='+'a'.repeat(64));await f.page.locator('#waitlist-confirm').waitFor({state:'visible'});assert.deepEqual(calls.map(c=>c.action),['preview']);assert.equal(await f.page.evaluate(()=>location.hash),'');await f.page.click('#waitlist-confirm');await waitFor(()=>f.page.locator('#waitlist-status').textContent().then(t=>t.includes('is confirmed')));assert.deepEqual(calls.map(c=>c.action),['preview','confirm']);assert.equal(f.log.requests.some(r=>r.url.includes('token=')),false);}finally{await f.close();}
});
test('preview errors expose an in-place retry without losing fragment token',async()=>{
 let calls=0;const f=await openFixture(browser,{pages:{'/waitlist/confirm/':fs.readFileSync('waitlist/confirm/index.html','utf8')},handlers:[{match:u=>u.pathname==='/api/project-waitlist',handle:route=>{calls++;return route.fulfill({status:calls===1?503:200,json:calls===1?{ok:false}:{ok:true,state:'pending',project:'game:vaultfront',name:'VaultFront',path:'/games/vaultfront/'}});}}]});
 try{await f.goto('/waitlist/confirm/#token='+'a'.repeat(64));await f.page.getByRole('button',{name:'Retry link check'}).waitFor();await f.page.getByRole('button',{name:'Retry link check'}).click();await f.page.getByRole('button',{name:'Confirm project interest'}).waitFor();assert.equal(calls,2);}finally{await f.close();}
});
test('real linked styles preserve hidden confirmation controls through loading, success and invalid links at desktop and mobile widths',async()=>{
 for(const width of [1366,390]){
  let releasePreview,previewStarted=false;const held=new Promise(resolve=>{releasePreview=resolve;});
  const f=await openFixture(browser,{contextOptions:{viewport:{width,height:900}},pages:{'/waitlist/confirm/':fs.readFileSync('waitlist/confirm/index.html','utf8')},handlers:[{match:u=>u.pathname==='/api/project-waitlist',handle:async(route,req)=>{const body=req.postDataJSON();if(body.action==='preview'){previewStarted=true;await held;}return route.fulfill({json:{ok:true,state:body.action==='confirm'?'confirmed':'pending',project:'game:vaultfront',name:'VaultFront',path:'/games/vaultfront/'}});}}]});
  try{
   await f.goto('/waitlist/confirm/#token='+'a'.repeat(64));await waitFor(()=>previewStarted);
   assert.deepEqual(await f.page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.filter(n=>!n.sheet).map(n=>n.href)),[],'actual linked stylesheet must load');
   const button=f.page.locator('#waitlist-confirm');
   async function assertHidden(){assert.equal(await button.evaluate(el=>el.hidden),true);assert.equal(await button.evaluate(el=>getComputedStyle(el).display),'none',`hidden must survive real styles at${width}px`);assert.equal(await button.isVisible(),false);}
   await assertHidden();assert.equal(await button.isDisabled(),true);
   releasePreview();await button.waitFor({state:'visible'});assert.equal(await button.isDisabled(),false);await button.click();
   await waitFor(()=>f.page.locator('#waitlist-status').textContent().then(t=>t.includes('is confirmed')));await assertHidden();
   await f.goto('/waitlist/confirm/');await waitFor(()=>f.page.locator('#waitlist-status').textContent().then(t=>t.includes('missing or invalid')));await assertHidden();
  }finally{releasePreview();await f.close();}
 }
});
