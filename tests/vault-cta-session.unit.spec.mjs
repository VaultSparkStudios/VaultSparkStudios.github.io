import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchBrowser,openFixture,waitFor} from './fixtures/browser-harness.mjs';

// Actual browser modules with local identity contract fixtures; never native Auth proof.
const cta=fs.readFileSync(new URL('../assets/vault-cta.js',import.meta.url),'utf8');
let browser;
test.before(async()=>{browser=await launchBrowser();});
test.after(async()=>{await browser?.close();});

for(const order of ['identity-first','cta-first'])for(const state of ['signed-in','signed-out','unavailable']){
  test(`actual CTA ${order} ${state} normalizes the authoritative identity contract`,async()=>{
    const scripts=order==='identity-first'?['signed-in-state.js','vault-cta.js']:['vault-cta.js','signed-in-state.js'];
    const body='<!doctype html><html><head>'+scripts.map(s=>`<script defer src="/assets/${s}"></script>`).join('')+'</head><body><main>Public CTA contract fixture</main></body></html>';
    const fixture=await openFixture(browser,{clock:true,pages:{'/':body},handlers:[
      {match:u=>u.pathname==='/assets/vault-cta.js',handle:route=>route.fulfill({status:200,contentType:'application/javascript',body:cta})},
      {match:u=>u.pathname==='/api/auth/me',handle:route=>route.fulfill({status:state==='unavailable'?503:200,contentType:'application/json',body:JSON.stringify({ok:true,identity:state==='signed-in'?{provider:'obelisk',sub:'fixture:verified',supabaseUserId:'41800000-0000-4000-8000-000000000001',email:'fixture@example.invalid',name:'Fixture'}:null})})},
    ]});
    try{
      await fixture.goto('/');
      await waitFor(()=>fixture.page.evaluate(expected=>document.documentElement.dataset.vsSignedIn===expected,state==='signed-in'?'true':'false'),{message:'actual signed-in-state completion'});
      await fixture.page.clock.runFor(4100);
      assert.equal(await fixture.page.locator('#vs-cta-bar').count(),state==='signed-in'?0:1);
      assert.equal(await fixture.page.locator('#vs-cta-spacer').count(),state==='signed-in'?0:1);
      if(state!=='signed-in')assert.equal(await fixture.page.locator('#vs-cta-bar a').first().getAttribute('href'),'/membership/');
      assert(!fixture.log.requests.some(r=>r.method!=='GET'));
    }finally{await fixture.close();}
  });
}

test('actual CTA unavailable identity bridge timeout renders anonymous CTA',async()=>{
  const fixture=await openFixture(browser,{clock:true,pages:{'/':'<!doctype html><script defer src="/assets/vault-cta.js"></script><main>Public fixture</main>'},handlers:[{match:u=>u.pathname==='/assets/vault-cta.js',handle:r=>r.fulfill({status:200,contentType:'application/javascript',body:cta})}]});
  try{await fixture.goto('/');await fixture.page.clock.runFor(14100);assert.equal(await fixture.page.locator('#vs-cta-bar').count(),1);}finally{await fixture.close();}
});

test('actual CTA rejected whenReady treats failure as anonymous',async()=>{
  const fixture=await openFixture(browser,{clock:true,initScripts:[()=>{window.VSSignedInState={whenReady:()=>Promise.reject(Error('fixture unavailable'))};}],pages:{'/':'<!doctype html><script defer src="/assets/vault-cta.js"></script><main>Public fixture</main>'},handlers:[{match:u=>u.pathname==='/assets/vault-cta.js',handle:r=>r.fulfill({status:200,contentType:'application/javascript',body:cta})}]});
  try{await fixture.goto('/');await fixture.page.clock.runFor(4100);assert.equal(await fixture.page.locator('#vs-cta-bar').count(),1);}finally{await fixture.close();}
});
