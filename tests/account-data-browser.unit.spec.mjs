import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchBrowser,openFixture,html,waitFor } from './fixtures/browser-harness.mjs';
let browser;before(async()=>{browser=await launchBrowser();});after(async()=>{await browser?.close();});
const source=fs.readFileSync('vault-member/index.html','utf8');
const state=source.match(/<section id="account-data-state"[\s\S]*?<\/section>/)[0];
const dialog=source.match(/<dialog id="account-delete-dialog"[\s\S]*?<\/dialog>/)[0];
const user={id:'11111111-1111-4111-8111-111111111111',email:'member@example.test'};
const job=state=>({id:'22222222-2222-4222-8222-222222222222',state,requested_at:'2026-11-23T00:00:00Z',...(['erased','completed'].includes(state)?{erased_at:'2026-11-23T00:00:01Z'}:{}),...(state==='completed'?{completed_at:'2026-11-23T00:00:02Z'}:{})});
const keys=['vault_members','point_events','challenge_completions','member_achievements','challenge_submissions','game_scores','season_xp','newsletter_preferences','member_newsletter_log','weekly_game_scores','journal_reactions','game_ratings','event_rsvps','poll_votes','fan_art_submissions','fan_art_votes','vault_member_milestones','push_subscriptions','ignis_usage_monthly','ignis_user_memory','treasury_purchases','team_members','teams','desk_comments','member_follows','website_subscriptions','gift_subscriptions','website_project_waitlist'];
const validExport=()=>{const tables=Object.fromEntries(keys.map(k=>[k,[]]));tables.point_events=Array.from({length:1201},(_,id)=>({id,points:1}));return {schema_version:'1.0',complete:true,user_id:user.id,exported_at:'2026-11-23T00:00:00Z',tables,table_counts:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length])),media:[]};};
async function fixture(options,run){
  let response=options.response??{job:null};const calls=[];
  const f=await openFixture(browser,{
    pages:{'/vault-member/':html({head:'<link rel="stylesheet" href="/vault-member/account-data.css">',body:`<div id="auth-view">${state}<div class="auth-panel"><form id="oauth-complete-form"><div id="oauth-complete-error"></div><input id="oauth-username" value="NewMember"><select id="oauth-birth-month"><option value="1">January</option></select><select id="oauth-birth-year"><option value="1990">1990</option></select><input id="oauth-invite"><input type="checkbox" id="oauth-subscribe"><button type="submit">Complete Registration</button></form></div></div><div id="dashboard-view"><button id="export-data-btn">Export website data</button><p id="account-data-message" hidden></p>${dialog}</div><script src="/vault-member/account-data.js"></script><script src="/vault-member/age-screen.js"></script><script src="/vault-member/portal-auth.js"></script>`})},
    handlers:[{match:u=>u.pathname==='/fixture/account-data',handle:(route,req)=>{calls.push(req.postDataJSON());return route.fulfill({json:response});}},
      {match:u=>u.pathname.startsWith('/vault-member/')&&/\.(?:js|css)$/.test(u.pathname),handle:r=>r.fulfill({contentType:r.request().url().endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(new URL(r.request().url()).pathname.slice(1),'utf8')})}],
    contextOptions:{acceptDownloads:true},
    initScripts:[{fn:({user,logoutError})=>{
      window._pulseChannel=null;window._notifRealtimeCh=null;window.__writes=0;window.__logouts=0;window.__privacySteps=[];
      window.VSMemberCache={clear:async uid=>{if(uid!==user.id)throw Error('foreign cache');window.__privacySteps.push('cache');}};
      window.VSSupabase={auth:{getSession:async()=>({data:{session:{user,access_token:'test-token'}},error:null}),signOut:async()=>{window.__privacySteps.push('delegated-signout');window.__logouts++;return {error:logoutError?{message:'bridge failed'}:null};}},functions:{invoke:async(name,{body})=>{if(name!=='account-data')throw Error('unexpected function');return fetch('/fixture/account-data',{method:'POST',body:JSON.stringify(body)}).then(r=>r.json());}},rpc:async()=>{window.__writes++;return {data:{},error:null};},from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{username:'NewMember',points:10},error:null})})};
    },arg:{user,logoutError:options.logoutError??false}}],
  });
  try{await f.goto('/vault-member/');await f.page.evaluate(()=>{window.showDashboard=member=>{window.__completed=member;};});await run(f,{calls,setResponse:value=>{response=value;}});}finally{await f.close();}
}
test('actual enrollment handler refuses pending/completed membership tombstones before profile writes',async()=>{
  for(const state of ['processing','completed'])await fixture({response:{data:{job:job(state)},error:null}},async f=>{
    await f.page.click('#oauth-complete-form button');await f.page.locator('#account-data-state').waitFor({state:'visible'});
    assert.equal(await f.page.evaluate(()=>window.__writes),0);assert.equal(await f.page.evaluate(()=>window.__completed),undefined);
    assert.equal(await f.page.locator('#account-data-state').getAttribute('data-state'),state);
  });
});
test('null authoritative status permits normal enrollment; unknown status is visible and can be retried',async()=>{
  await fixture({response:{data:{job:null},error:null}},async f=>{await f.page.click('#oauth-complete-form button');await waitFor(()=>f.page.evaluate(()=>!!window.__completed));assert.equal(await f.page.evaluate(()=>window.__writes),1);});
  await fixture({response:{data:null,error:{message:'unavailable'}}},async(f,s)=>{
    await f.page.click('#oauth-complete-form button');await f.page.locator('#account-data-state').waitFor({state:'visible'});
    assert.equal(await f.page.evaluate(()=>window.__writes),0);assert.equal(await f.page.locator('#account-data-state-message').getAttribute('role'),'alert');
    s.setResponse({data:{job:job('processing')},error:null});await f.page.click('#account-data-state-retry');await waitFor(()=>f.page.locator('#account-data-state').getAttribute('data-state').then(x=>x==='processing'));
    assert.equal(await f.page.evaluate(()=>window.__writes),0);
  });
});
test('complete export downloads all1201rows; partial/error exports produce visible errors and restore button',async()=>{
  await fixture({response:{data:validExport(),error:null}},async f=>{
    const downloaded=f.page.waitForEvent('download');await f.page.evaluate(()=>window.VSAccountData.exportData());const file=await downloaded;
    const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(data.tables.point_events.length,1201);assert.equal(await f.page.locator('#export-data-btn').isDisabled(),false);
  });
  for(const bad of [{...validExport(),complete:false},{...validExport(),table_counts:{}}])await fixture({response:{data:bad,error:null}},async f=>{
    let downloads=0;f.page.on('download',()=>downloads++);await f.page.evaluate(()=>window.VSAccountData.exportData());
    assert.equal(downloads,0);assert.equal(await f.page.locator('#account-data-message').getAttribute('role'),'alert');assert.equal(await f.page.locator('#export-data-btn').isDisabled(),false);
  });
});
test('semantic deletion dialog needs exact phrase, leaves session on failure, and logs out only after accepted job',async()=>{
  await fixture({response:{data:null,error:{message:'unavailable'}}},async(f,s)=>{
    await f.page.evaluate(()=>window.VSAccountData.openDeleteDialog());assert.equal(await f.page.locator('#account-delete-dialog').evaluate(el=>el.open),true);
    await f.page.locator('#account-delete-phrase').fill('delete');assert.equal(await f.page.locator('#account-delete-confirm').isDisabled(),true);
    await f.page.locator('#account-delete-phrase').fill('DELETE WEBSITE MEMBERSHIP');await f.page.click('#account-delete-confirm');
    await waitFor(()=>f.page.locator('#account-delete-error').isVisible());assert.equal(await f.page.evaluate(()=>window.__logouts),0);
    assert.deepEqual(await f.page.evaluate(()=>window.__privacySteps),[]);
    s.setResponse({data:{job:job('processing')},error:null});await f.page.click('#account-delete-confirm');await waitFor(()=>f.page.evaluate(()=>window.__logouts===1));
    assert.match(await f.page.locator('#account-data-state-message').textContent(),/pending|not yet confirmed/);assert.doesNotMatch(await f.page.locator('#account-data-state-message').textContent(),/deletion is complete/i);
    assert.equal(s.calls.at(-1).confirmation,'DELETE WEBSITE MEMBERSHIP');
    assert.deepEqual(await f.page.evaluate(()=>window.__privacySteps),['cache','delegated-signout']);
  });
});
test('accepted deletion does not hide an unconfirmed delegated sign-out',async()=>{
  await fixture({response:{data:{job:job('processing')},error:null},logoutError:true},async f=>{
    await f.page.evaluate(()=>window.VSAccountData.openDeleteDialog());await f.page.locator('#account-delete-phrase').fill('DELETE WEBSITE MEMBERSHIP');await f.page.click('#account-delete-confirm');
    await waitFor(()=>f.page.locator('#account-data-state-message').textContent().then(text=>text.includes('secure sign-out could not be confirmed')));
    assert.equal(await f.page.evaluate(()=>window.__logouts),1);assert.equal(await f.page.locator('#account-data-state-message').getAttribute('role'),'alert');
  });
});
test('an unproven completed receipt cannot trigger logout or a completion message',async()=>{
  await fixture({response:{data:{job:{...job('completed'),erased_at:null}},error:null}},async f=>{
    await f.page.evaluate(()=>window.VSAccountData.openDeleteDialog());await f.page.locator('#account-delete-phrase').fill('DELETE WEBSITE MEMBERSHIP');await f.page.click('#account-delete-confirm');
    await waitFor(()=>f.page.locator('#account-delete-error').isVisible());assert.equal(await f.page.evaluate(()=>window.__logouts),0);assert.equal(await f.page.locator('#account-delete-dialog').evaluate(el=>el.open),true);
  });
});
test('stalled session and status requests fail closed with visible retry instead of hanging portal startup',async()=>{
  for(const stalled of ['session','status'])await fixture({response:{data:{job:null},error:null}},async f=>{
    await f.page.clock.install();
    await f.page.evaluate(kind=>{
      window.__statusSettled=false;
      if(kind==='session')window.VSSupabase.auth.getSession=()=>new Promise(()=>{});
      else window.VSSupabase.functions.invoke=()=>new Promise(()=>{});
      window.VSAccountData.allowEnrollment().then(allowed=>{window.__statusSettled=true;window.__allowed=allowed;});
    },stalled);
    await f.page.clock.fastForward(20000);
    await waitFor(()=>f.page.evaluate(()=>window.__statusSettled));
    assert.equal(await f.page.evaluate(()=>window.__allowed),false);assert.equal(await f.page.evaluate(()=>window.__writes),0);
    assert.equal(await f.page.locator('#account-data-state-message').getAttribute('role'),'alert');assert.equal(await f.page.locator('#account-data-state-retry').isVisible(),true);
  });
});
test('stalled export and deletion restore controls without downloading or claiming logout',async()=>{
  await fixture({response:{data:{job:null},error:null}},async f=>{
    await f.page.clock.install();
    await f.page.evaluate(()=>{window.VSSupabase.functions.invoke=()=>new Promise(()=>{});window.VSAccountData.exportData();});
    await f.page.clock.fastForward(100000);await waitFor(()=>f.page.locator('#export-data-btn').isEnabled());assert.equal(await f.page.locator('#account-data-message').getAttribute('role'),'alert');
    await f.page.evaluate(()=>window.VSAccountData.openDeleteDialog());await f.page.locator('#account-delete-phrase').fill('DELETE WEBSITE MEMBERSHIP');await f.page.click('#account-delete-confirm');
    await f.page.clock.fastForward(100000);await waitFor(()=>f.page.locator('#account-delete-confirm').isEnabled());assert.equal(await f.page.evaluate(()=>window.__logouts),0);assert.equal(await f.page.locator('#account-delete-dialog').evaluate(dialog=>dialog.open),true);
    await f.page.evaluate(()=>{window.VSSupabase.functions.invoke=async()=>({data:{job:null},error:null});});
    await f.page.click('#account-delete-check');await waitFor(()=>f.page.locator('#account-data-message').textContent().then(text=>text.includes('No accepted website deletion request')));
    assert.equal(await f.page.evaluate(()=>window.__logouts),0);
  });
});
