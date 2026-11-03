import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchBrowser,openFixture,waitFor} from './fixtures/browser-harness.mjs';
let browser;before(async()=>{browser=await launchBrowser();});after(async()=>{await browser?.close();});
function fixtureSupabase(){
 function q(){const x={};for(const k of ['select','eq','gte','lt','lte','order','limit','in','is'])x[k]=()=>x;x.then=(a,b)=>Promise.resolve({data:[],error:null}).then(a,b);x.single=x.maybeSingle=()=>Promise.resolve({data:null,error:null});return x;}
 window.VSSupabase={from:()=>q(),rpc:()=>Promise.resolve({data:null,error:null}),auth:{getSession:()=>Promise.resolve({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
 window.VSGate={getNextAppName:()=>null,redirect:()=>false};
}
const stub='('+fixtureSupabase.toString()+')();';
// Mirrors the loader's destructive mount and one-time login URL snapshot.
// The provider-origin iframe is locally fulfilled, not a placement/auth verdict.
function fixtureSealLoader(){
 function scan(){document.querySelectorAll('[data-obelisk-seal]').forEach(el=>{
  if(el.hasAttribute('data-obelisk-mounted'))return;
  el.setAttribute('data-obelisk-mounted','1');
  const target=new URL(el.getAttribute('data-login-url'),location.href).href;
  const frame=document.createElement('iframe');frame.title='Local Obelisk mount fixture';
  frame.src='https://obeliskgate.com/embed/v1/seal?'+new URLSearchParams({rp:el.getAttribute('data-rp'),mode:el.getAttribute('data-mode')||'login',theme:el.getAttribute('data-theme')||'auto',size:'md'});
  frame.dataset.fixtureLoginTarget=target;frame.style.height='208px';frame.style.width='100%';
  el.innerHTML='';el.appendChild(frame);
 });}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
 window.addEventListener('load',scan);
}
const sealStub='('+fixtureSealLoader.toString()+')();';
async function fixture(run,{denied=false,seal=false,slowEntry=false}={}){
 const f=await openFixture(browser,{
  pages:{'/vault-member/':fs.readFileSync('vault-member/index.html','utf8'),'/sign-in/':fs.readFileSync('sign-in/index.html','utf8'),'/investor-portal/login/':fs.readFileSync('investor-portal/login/index.html','utf8')},
  handlers:[
   {match:u=>seal&&u.origin==='https://obeliskgate.com'&&u.pathname==='/embed/seal.js',handle:r=>r.fulfill({contentType:'application/javascript',body:sealStub})},
   {match:u=>seal&&u.origin==='https://obeliskgate.com'&&u.pathname==='/embed/v1/seal',handle:r=>r.fulfill({contentType:'text/html',body:'<!doctype html><p>Local loader fixture; no authentication or placement verdict.</p>'})},
   {match:u=>/^\/assets\/(?:account-entry|investor-experience)(?:\.shell-[^/]+)?\.js$/.test(u.pathname),handle:async(r,req)=>{if(slowEntry)await new Promise(resolve=>setTimeout(resolve,250));const name=new URL(req.url()).pathname.includes('account-entry')?'account-entry':'investor-experience';return r.fulfill({contentType:'application/javascript',body:fs.readFileSync('assets/'+name+'.js','utf8')});}},
   {match:u=>u.pathname.startsWith('/assets/supabase-client'),handle:r=>r.fulfill({contentType:'application/javascript',body:stub})},
   {match:u=>/^\/vault-member\/[a-zA-Z0-9.-]+\.(?:js|css)$/.test(u.pathname),handle:(r,req)=>{const p=new URL(req.url()).pathname.slice(1);return r.fulfill({contentType:p.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(p)});}}
  ],initScripts:denied?[()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Denied','SecurityError')}});}]:[]});
 try{await run(f);}finally{await f.close();}
}
test('member entrance defaults to returning members; open creation is a separate editable journey',async()=>{
 await fixture(async f=>{
  await f.goto('/vault-member/');
  assert.equal(await f.page.locator('#panel-login').isVisible(),true);
  assert.equal(await f.page.locator('#panel-register').isVisible(),false);
  await f.page.click('#tab-register');
  assert.equal(await f.page.locator('#panel-register').isVisible(),true);
  assert.match(await f.page.locator('#panel-register').innerText(),/open to everyone/i);
  assert.match(await f.page.locator('#panel-register').innerText(),/No membership invite/);
  assert.equal(await f.page.locator('#auth-view input[type="password"]').count(),0);
  assert.equal(new URL(await f.page.locator('#obelisk-create-account').getAttribute('href'),'https://unit.fixture.test').searchParams.get('intent'),'signup');
 });
});

test('destructive seal mount preserves member controls and snapshots the same deep-link destination',async()=>{
 for(const slowEntry of [false,true])await fixture(async f=>{
  const query=new URLSearchParams({next:'/vault-member/passport/?view=progress#achievements',ref:'VaultFriend',auth_error:'bridge_failed',auth_intent:'signin'});
  await f.goto('/vault-member/?'+query+'#login');
  const mount=f.page.locator('#panel-login [data-obelisk-seal]');
  assert.equal(await mount.count(),1,'seal owns a dedicated child mount');
  await mount.locator('iframe').waitFor();
  assert.equal(await mount.locator('iframe').count(),1,'local loader actually replaces mount content');
  assert.equal(await f.page.locator('#obelisk-sign-in').isVisible(),true);
  assert.equal(await f.page.locator('#login-error').isVisible(),true);
  assert.match(await f.page.locator('#login-error').innerText(),/could not attach/);
  const href=await f.page.locator('#obelisk-sign-in').getAttribute('href');
  assert.equal(await mount.getAttribute('data-login-url'),href,'metadata tracks the provider link');
  assert.equal(await mount.locator('iframe').getAttribute('data-fixture-login-target'),new URL(href,'https://unit.fixture.test').href,'loader snapshots the current deep link rather than stale default');
  await f.page.locator('#tab-register').click();assert.equal(await f.page.locator('#panel-register').isVisible(),true);
  await f.page.locator('#tab-login').click();assert.equal(await f.page.locator('#obelisk-sign-in').isVisible(),true);
  assert.equal(await f.page.locator('#panel-login .access-support a').count(),2);
  const frame=mount.locator('iframe');
  let src=new URL(await frame.getAttribute('src'));
  assert.equal(src.origin,'https://obeliskgate.com');assert.equal(src.pathname,'/embed/v1/seal');
  assert.equal(src.searchParams.get('theme'),'dark');
  await f.page.evaluate(()=>window.VSTheme.set('light'));
  await waitFor(async()=>new URL(await frame.getAttribute('src')).searchParams.get('theme')==='light');
  assert.equal(await mount.getAttribute('data-theme'),'light');
 },{seal:true,slowEntry});
});

test('investor seal snapshots its prepared private destination even when entry script arrives late',async()=>{
 await fixture(async f=>{
  const next='/investor-portal/documents/?type=legal#record';
  await f.goto('/investor-portal/login/?'+new URLSearchParams({next}));
  const mount=f.page.locator('[data-obelisk-seal]');await mount.locator('iframe').waitFor();
  const href=await f.page.locator('#investorObeliskSignIn').getAttribute('href');
  assert.equal(new URL(href,'https://unit.fixture.test').searchParams.get('return'),next);
  assert.equal(await mount.getAttribute('data-login-url'),href);
  assert.equal(await mount.locator('iframe').getAttribute('data-fixture-login-target'),new URL(href,'https://unit.fixture.test').href);
  assert.equal(await f.page.locator('#investorObeliskSignIn').isVisible(),true);
  assert.equal(await f.page.locator('#investorApplyLink').isVisible(),true);
  assert.equal(new URL(await mount.locator('iframe').getAttribute('src')).origin,'https://obeliskgate.com');
 },{seal:true,slowEntry:true});
});
test('tabs support arrow, Home and End navigation with correct focus semantics',async()=>{
 await fixture(async f=>{
  await f.goto('/vault-member/#login');await f.page.locator('#tab-login').focus();await f.page.keyboard.press('ArrowRight');
  assert.equal(await f.page.locator('#tab-register').getAttribute('aria-selected'),'true');
  assert.equal(await f.page.locator('#tab-register').evaluate(x=>document.activeElement===x),true);
  assert.equal(await f.page.locator('#tab-login').getAttribute('tabindex'),'-1');
  await f.page.keyboard.press('Home');assert.equal(await f.page.locator('#tab-login').getAttribute('aria-selected'),'true');
  await f.page.keyboard.press('End');assert.equal(await f.page.locator('#tab-register').getAttribute('aria-selected'),'true');
 });
});
test('member deep links and referral context survive both provider actions',async()=>{
 await fixture(async f=>{
  await f.goto('/vault-member/?'+new URLSearchParams({return:'/vault-member/passport/?view=progress#achievements',ref:'VaultFriend'})+'#register');
  for(const id of ['obelisk-sign-in','obelisk-create-account']){
   const u=new URL(await f.page.locator('#'+id).getAttribute('href'),'https://unit.fixture.test');
   assert.equal(u.pathname,'/login');const target=new URL(u.searchParams.get('return'),'https://unit.fixture.test');
   assert.equal(target.pathname,'/vault-member/');assert.equal(target.searchParams.get('return'),'/vault-member/passport/?view=progress#achievements');assert.equal(target.searchParams.get('ref'),'VaultFriend');assert.equal(target.hash,id==='obelisk-create-account'?'#register':'#login');
  }
 });
});
test('unsafe member return destinations are rejected before forming identity links',async()=>{
 await fixture(async f=>{
  for(const value of ['https://evil.example/','//evil.example/','/\\evil.example/','/investor-portal/','/vault-member/\r\nlocation:evil','/vault-member/?return=/vault-member/passport/','/vault-member/#register','/vault-member/passport/?next=/vault-member/']){
   await f.goto('/vault-member/?'+new URLSearchParams({next:value}));
   const u=new URL(await f.page.locator('#obelisk-sign-in').getAttribute('href'),'https://unit.fixture.test');
   assert.equal(u.searchParams.get('return'),'/vault-member/#login',value);
  }
 });
});

test('encoded member handoff stays within the edge return bound',async()=>{
 await fixture(async f=>{
  await f.goto('/vault-member/?'+new URLSearchParams({next:'/vault-member/passport/?view='+('星'.repeat(200)),ref:'VaultFriend'})+'#register');
  const link=new URL(await f.page.locator('#obelisk-create-account').getAttribute('href'),'https://unit.fixture.test');
  const callback=link.searchParams.get('return');
  assert.ok(callback.length<=1024);
  const root=new URL(callback,'https://unit.fixture.test');
  assert.equal(root.pathname,'/vault-member/');assert.equal(root.searchParams.get('return'),null);
  assert.equal(root.searchParams.get('ref'),'VaultFriend');assert.equal(root.hash,'#register');
 });
});
test('sign-in errors stay in sign-in; creation errors stay in creation without clearing recovery copy',async()=>{
 await fixture(async f=>{
  for(const [intent,panel,error] of [['signin','login','login-error'],['signup','register','reg-error']]){
   await f.goto('/vault-member/?auth_error=bridge_failed&auth_intent='+intent+'#'+(intent==='signup'?'register':'login'));
   assert.equal(await f.page.locator('#panel-'+panel).isVisible(),true);
   assert.match(await f.page.locator('#'+error).innerText(),/could not attach/,JSON.stringify(f.log.errors));
   assert.equal(await f.page.locator('#'+error).isVisible(),true);
  }
 });
});
test('denied session storage preserves visible referral and functioning identity links',async()=>{
 await fixture(async f=>{
  await f.goto('/vault-member/?ref=VaultFriend#register');
  assert.match(await f.page.locator('#referral-banner').innerText(),/VaultFriend/,JSON.stringify(f.log.errors));
  assert.equal(await f.page.locator('#referral-banner').isVisible(),true);
  assert.match(await f.page.locator('#obelisk-create-account').getAttribute('href'),/intent=signup/);
 },{denied:true});
});
test('shared entrance presents distinct spaces and carries safe member context; unsigned errors remain neutral',async()=>{
 await fixture(async f=>{
  await f.goto('/sign-in/?'+new URLSearchParams({return:'/vault-member/passport/',ref:'VaultFriend',auth_error:'state_invalid'}));
  assert.equal(await f.page.locator('.account-door').count(),2);
  await f.page.selectOption('#account-theme','light');
  assert.equal(await f.page.locator('html').getAttribute('data-theme'),'light');
  const member=new URL(await f.page.locator('[data-member-create]').getAttribute('href'),'https://unit.fixture.test');
  assert.equal(member.hash,'#register');assert.equal(member.searchParams.get('return'),'/vault-member/passport/');assert.equal(member.searchParams.get('ref'),'VaultFriend');
  assert.equal(await f.page.locator('[data-investor-signin]').getAttribute('href'),'/investor-portal/login/');
  assert.match(await f.page.locator('#account-recovery-notice').innerText(),/could not be verified/);
  assert.equal(await f.page.locator('#account-recovery-notice').isVisible(),true);
  assert.match(await f.page.locator('.account-door--investor').innerText(),/reviewed separately/);
 });
});
