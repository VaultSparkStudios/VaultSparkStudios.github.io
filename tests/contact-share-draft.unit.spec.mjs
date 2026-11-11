import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchBrowser,openFixture} from './fixtures/browser-harness.mjs';
let browser;
before(async()=>{browser=await launchBrowser();});
after(async()=>{await browser?.close();});
async function fixture(run,{restored=false}={}){
 const source=fs.readFileSync('contact/index.html','utf8');
 const contact=restored?source.replace('id="contact-subject"','value="Existing subject" id="contact-subject"').replace('required></textarea>','required>Existing message</textarea>'):source;
 const f=await openFixture(browser,{pages:{'/contact/':contact,'/share/':fs.readFileSync('share/index.html','utf8')}});
 try{await run(f);}finally{await f.close();}
}
test('real share handoff preserves an editable Unicode title, text and URL without submitting',async()=>{
 await fixture(async f=>{
  const title='Research — 星 ✨',text='A reference\nwith context',url='https://example.com/a?b=1&c=2';
  await f.goto('/share/?'+new URLSearchParams({title,text,url}));
  await f.page.locator('#forward-btn').click();
  await f.page.waitForURL('**/contact/**');
  assert.equal(await f.page.inputValue('#contact-subject'),title);
  assert.equal(await f.page.inputValue('#contact-message'),text+'\n\n'+url);
  await f.page.fill('#contact-message','My edited message');
  assert.equal(await f.page.inputValue('#contact-message'),'My edited message');
  assert.equal(f.log.requests.filter(x=>x.method==='POST' && new URL(x.url).pathname==='/contact/submit').length,0);
 });
});
test('query text is literal, bounded by code points, and cannot create markup',async()=>{
 await fixture(async f=>{
  const text='<img src=x onerror="window.__injected=1">';
  await f.goto('/contact/?'+new URLSearchParams({subject:'😀'.repeat(205),body:text}));
  assert.equal(await f.page.inputValue('#contact-subject'),'😀'.repeat(200));
  assert.equal(await f.page.inputValue('#contact-message'),text);
  assert.equal(await f.page.evaluate(()=>window.__injected),undefined);
  await f.goto('/contact/?'+new URLSearchParams({body:'星'.repeat(10010)}));
  assert.equal((await f.page.inputValue('#contact-message')).length,10000);
 });
});
test('topic presets remain useful and a shared subject takes precedence without changing routing',async()=>{
 await fixture(async f=>{
  for(const [topic,subject] of [['invite','Vault account help'],['collaborate','Collaboration — playtesting, art or audio']]){
   await f.goto('/contact/?topic='+topic);
   assert.equal(await f.page.inputValue('#contact-subject'),subject);
   assert.equal(await f.page.inputValue('#contact-message'),'');
   assert.equal(await f.page.locator('#invite-request-note').count(),1);
  }
  await f.goto('/contact/?topic=invite&subject=Shared%20title&body=Shared%20body');
  assert.equal(await f.page.inputValue('#contact-subject'),'Shared title');
  assert.equal(await f.page.inputValue('#contact-message'),'Shared body');
  assert.equal(await f.page.locator('input[name="subject"]').inputValue(),'VaultSpark Studios — Vault account help');
 });
});
test('normal and unknown topic contacts stay blank; restored drafts are preserved',async()=>{
 await fixture(async f=>{
  for(const q of ['', '?topic=unknown','?subject=%20%20&body=%20%20']){
   await f.goto('/contact/'+q);
   assert.equal(await f.page.inputValue('#contact-subject'),'');
   assert.equal(await f.page.inputValue('#contact-message'),'');
  }
 });
 await fixture(async f=>{
  await f.goto('/contact/?subject=Incoming&body=Incoming');
  assert.equal(await f.page.inputValue('#contact-subject'),'Existing subject');
  assert.equal(await f.page.inputValue('#contact-message'),'Existing message');
 },{restored:true});
});
