import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchBrowser, openFixture, html, waitFor } from './fixtures/browser-harness.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

// Exercise the real registration listener and member construction. Only the
// authenticated data provider and downstream dashboard rendering are fixtures.
const page = html({ body: `<form id="oauth-complete-form">
  <div id="oauth-complete-error"></div>
  <input id="oauth-username" value="NewMember">
  <input id="oauth-invite" value="">
  <input id="oauth-subscribe" type="checkbox">
  <button type="submit">Complete Registration →</button>
</form><script src="/assets/registration-under-test.js"></script>` });

async function fixture({ denied = false, stored = '', ref, rejection = false }, run) {
  const f = await openFixture(browser, {
    pages: { '/vault-member/': page },
    handlers: [{ match: url => url.pathname === '/assets/registration-under-test.js', handle: route =>
      route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('vault-member/portal-auth.js', 'utf8') }) }],
    initScripts: [{ fn: options => {
      if (options.denied) Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
      else sessionStorage.setItem('vs_ref', options.stored);
      window.__registrations = [];
      const user = { id: 'authenticated-fixture', email: 'fixture@example.test' };
      window.VSSupabase = {
        auth: { getSession: async () => ({ data: { session: { user } } }) },
        rpc: async (name, payload) => {
          window.__registrations.push({ name, payload });
          return { data: options.rejection ? { error: 'username_taken' } : {}, error: null };
        },
        from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: { username: 'NewMember', points: 10 } }) }),
      };
    }, arg: { denied, stored, rejection } }],
  });
  try {
    await f.goto('/vault-member/' + (ref === undefined ? '' : '?' + new URLSearchParams({ ref })));
    await f.page.evaluate(() => { window.showDashboard = member => { window.__completedMember = member; }; });
    await run(f);
  } finally { await f.close(); }
}

test('authenticated profile completion works with denied storage, with or without a referral', async () => {
  for (const ref of [undefined, 'VaultFriend_32']) await fixture({ denied: true, ref }, async f => {
    await f.page.click('button[type="submit"]');
    await waitFor(async () => f.page.evaluate(() => !!window.__completedMember));
    const result = await f.page.evaluate(() => ({ calls: window.__registrations, member: window.__completedMember }));
    assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].name, 'register_open');
    assert.equal(result.calls[0].payload.p_ref_by, ref || '');
    assert.equal(result.member._id, 'authenticated-fixture');
    assert.equal(result.member.username, 'NewMember');
    assert.equal(await f.page.locator('#oauth-complete-error').evaluate(el => el.classList.contains('show')), false);
    assert.deepEqual(f.log.errors, []);
  });
});

test('only bounded handle referrals reach registration; current valid query takes precedence', async () => {
  for (const [options, expected] of [
    [{ stored: 'StoredFriend' }, 'StoredFriend'],
    [{ stored: 'StoredFriend', ref: 'CurrentFriend' }, 'CurrentFriend'],
    [{ stored: 'x'.repeat(33) }, ''],
    [{ denied: true, ref: 'x'.repeat(33) }, ''],
    [{ denied: true, ref: '<invalid>' }, ''],
    [{ denied: true, ref: 'x'.repeat(32) }, 'x'.repeat(32)],
  ]) await fixture(options, async f => {
    await f.page.click('button[type="submit"]');
    await waitFor(async () => f.page.evaluate(() => !!window.__completedMember));
    assert.equal(await f.page.evaluate(() => window.__registrations[0].payload.p_ref_by), expected);
  });
});

test('denied storage does not mask a genuine registration rejection', async () => {
  await fixture({ denied: true, rejection: true }, async f => {
    await f.page.click('button[type="submit"]');
    await waitFor(async () => f.page.locator('#oauth-complete-error').evaluate(el => el.classList.contains('show')));
    assert.equal(await f.page.locator('#oauth-complete-error').textContent(), 'username_taken');
    assert.equal(await f.page.locator('button[type="submit"]').isDisabled(), false);
    assert.equal(await f.page.evaluate(() => window.__completedMember), undefined);
    assert.equal(await f.page.evaluate(() => window.__registrations.length), 1);
  });
});

// Real member/passport pages and real handoff, bootstrap and registration
// listeners. The local endpoints model identity + member-row state only.
async function journeyFixture({ existing = false, denied = false, rejection = false, missingRow = false } = {}, run) {
  let authenticated = false;
  let member = existing;
  const registrations = [];
  const memberRow = () => ({ username: 'NewMember', points: 10, created_at: '2026-01-01T00:00:00Z', achievements: [] });
  const dbScript = () => `(() => {
    const session = ${authenticated ? JSON.stringify({ user: { id: 'fixture-identity', email: 'fixture@example.test' } }) : 'null'};
    function query(table) {
      const q = {};
      for (const name of ['select','eq','gte','lt','lte','order','limit','in','is']) q[name] = () => q;
      q.then = (yes,no) => Promise.resolve({data:[],error:null}).then(yes,no);
      q.single = q.maybeSingle = () => fetch('/fixture/member?table='+table).then(r=>r.json());
      return q;
    }
    window.VSSupabase = { from:query, rpc:(name,payload)=>fetch('/fixture/rpc',{method:'POST',body:JSON.stringify({name,payload})}).then(r=>r.json()),
      auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})} };
    window.VSGate = {getNextAppName:()=>null,redirect:()=>false};
  })();`;
  const f = await openFixture(browser, {
    pages: { '/vault-member/': fs.readFileSync('vault-member/index.html','utf8'), '/vault-member/passport/': fs.readFileSync('vault-member/passport/index.html','utf8') },
    handlers: [
      { match:u=>u.pathname.startsWith('/assets/supabase-client'), handle:r=>r.fulfill({contentType:'application/javascript',body:dbScript()}) },
      { match:u=>u.pathname.startsWith('/assets/account-entry'), handle:r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('assets/account-entry.js','utf8')}) },
      { match:u=>u.pathname==='/fixture/member', handle:r=>r.fulfill({json:{data:member?memberRow():null,error:null}}) },
      { match:u=>u.pathname==='/fixture/rpc', handle:(r,req)=>{
        const {name,payload}=req.postDataJSON();
        if(name==='register_open'){
          registrations.push(payload);
          if(!rejection&&!missingRow)member=true;
          return r.fulfill({json:{data:rejection?{error:'username_taken'}:{},error:null}});
        }
        return r.fulfill({json:{data:name==='get_member_bootstrap'?{member:member?memberRow():null}:null,error:null}});
      } },
      { match:u=>/^\/vault-member\/[a-zA-Z0-9.-]+\.(?:js|css)$/.test(u.pathname), handle:(r,req)=>{
        let name=new URL(req.url()).pathname.slice(1).replace(/\.shell-[a-f0-9]+(?=\.js$)/,'');
        let body=fs.readFileSync(name,'utf8');
        // Exclude unrelated downstream dashboard rendering from this fixture.
        if(name==='vault-member/portal-auth.js')body+='\nshowDashboard = function(member) { window.__dashboardMember = member; };';
        return r.fulfill({contentType:name.endsWith('.css')?'text/css':'application/javascript',body});
      } },
    ],
    initScripts: denied ? [()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Denied','SecurityError');}});}] : [],
  });
  try { await run(f,{setAuthenticated:()=>{authenticated=true;},registrations}); } finally { await f.close(); }
}

test('new identity returns through profile completion before its passport, including denied storage', async () => {
  for(const denied of [false,true])await journeyFixture({denied},async(f,state)=>{
    const next='/vault-member/passport/?view=progress#achievements';
    await f.goto('/vault-member/?'+new URLSearchParams({next,ref:'VaultFriend'})+'#register');
    const provider=new URL(await f.page.locator('#obelisk-create-account').getAttribute('href'),'https://unit.fixture.test');
    const callback=new URL(provider.searchParams.get('return'),'https://unit.fixture.test');
    assert.equal(callback.pathname,'/vault-member/');assert.equal(callback.searchParams.get('return'),next);assert.equal(callback.hash,'#register');
    state.setAuthenticated();await f.goto(callback.pathname+callback.search+callback.hash);
    await f.page.locator('#panel-oauth-complete').waitFor({state:'visible'});
    assert.equal(new URL(f.page.url()).pathname,'/vault-member/','identity alone does not resume');
    await f.page.locator('#oauth-username').fill('NewMember');
    await f.page.locator('#oauth-subscribe').uncheck();
    await f.page.locator('#oauth-complete-form button[type="submit"]').click();
    await f.page.waitForURL('**/vault-member/passport/**');
    await f.page.locator('#vp-card-wrap').waitFor({state:'visible'});
    const arrived=new URL(f.page.url());assert.equal(arrived.searchParams.get('view'),'progress');assert.equal(arrived.searchParams.get('ref'),'VaultFriend');assert.equal(arrived.hash,'#achievements');
    assert.equal(state.registrations.length,1);assert.equal(state.registrations[0].p_ref_by,'VaultFriend');
    assert.doesNotMatch(await f.page.locator('#vp-loading').textContent(),/Unable/);
  });
});

test('existing member resumes its passport only after the root bootstrap confirms its row', async () => {
  await journeyFixture({existing:true},async(f,state)=>{
    await f.goto('/vault-member/?'+new URLSearchParams({next:'/vault-member/passport/?view=progress#achievements'})+'#login');
    const provider=new URL(await f.page.locator('#obelisk-sign-in').getAttribute('href'),'https://unit.fixture.test');
    const callback=new URL(provider.searchParams.get('return'),'https://unit.fixture.test');
    assert.equal(callback.pathname,'/vault-member/');state.setAuthenticated();
    await f.goto(callback.pathname+callback.search+callback.hash);await f.page.waitForURL('**/vault-member/passport/**');
    assert.equal(state.registrations.length,0);assert.equal(new URL(f.page.url()).hash,'#achievements');
  });
});

test('rejected registration or absent confirmed member row never resumes the destination', async () => {
  for(const options of [{rejection:true},{missingRow:true}])await journeyFixture(options,async(f,state)=>{
    state.setAuthenticated();await f.goto('/vault-member/?'+new URLSearchParams({return:'/vault-member/passport/'}));
    await f.page.locator('#panel-oauth-complete').waitFor({state:'visible'});
    await f.page.locator('#oauth-username').fill('NewMember');await f.page.locator('#oauth-subscribe').uncheck();
    await f.page.locator('#oauth-complete-form button[type="submit"]').click();
    await waitFor(async()=>f.page.locator('#oauth-complete-error').evaluate(el=>el.classList.contains('show')));
    assert.equal(new URL(f.page.url()).pathname,'/vault-member/');
    assert.match(await f.page.locator('#oauth-complete-error').textContent(),options.rejection?/username_taken/:/could not be loaded/);
    assert.equal(state.registrations.length,1);
  });
});

test('confirmed members ignore unsafe or nested self-loop destinations and default root adds no handoff', async () => {
  await journeyFixture({existing:true,denied:true},async(f,state)=>{
    state.setAuthenticated();
    for(const target of [undefined,'https://evil.example/','//evil.example/','/\\evil.example/','/investor-portal/','/vault-member/?return=/vault-member/passport/','/vault-member/passport/?next=/vault-member/','/vault-member/#register']){
      await f.goto('/vault-member/'+(target===undefined?'':'?'+new URLSearchParams({return:target})));
      await waitFor(async()=>f.page.evaluate(()=>!!window.__dashboardMember));
      assert.equal(new URL(f.page.url()).pathname,'/vault-member/');
      assert.equal(await f.page.evaluate(()=>window.VSMemberEntry.resumeAfterProfile()),false);
      assert.equal(state.registrations.length,0);
    }
  });
});
