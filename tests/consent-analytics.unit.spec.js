// consent-analytics.unit.spec.js — assets/cookie-consent.js + assets/analytics.js.
// Every-page, privacy-bearing: analytics must stay default-deny until the visitor
// accepts, persist the choice, honour DoNotTrack + excluded paths, and never read
// a bearer token for identity. Fixture origin only; Supabase is mocked.
// Run: node --test tests/consent-analytics.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, waitFor, settle, beaconStub } from './fixtures/browser-harness.mjs';

const PAGE_VIEWS = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/rest/v1/page_views';
const FIXTURE = html({
  body: '<main><h1>Consent fixture</h1></main><script src="/assets/analytics.js"></script><script src="/assets/cookie-consent.js"></script>',
});
const PAGES = { '/games/': FIXTURE, '/studio-hub/': FIXTURE, '/investor-portal/': FIXTURE };

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

function pageViewsSink() {
  const posts = [];
  return {
    posts,
    handler: {
      match: (u) => u.href.startsWith(PAGE_VIEWS),
      handle: async (route, req) => {
        posts.push({ body: JSON.parse(req.postData() || 'null'), headers: req.headers() });
        await route.fulfill({ status: 201, body: '' });
      },
    },
  };
}

const setConsent = { fn: (v) => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('vs_cookie_consent', v); sessionStorage.setItem('__seeded', '1'); } } catch (_) {} }, arg: 'accepted' };

async function withFixture(opts, fn) {
  const f = await openFixture(browser, { pages: PAGES, ...opts });
  try { await fn(f); } finally { await f.close(); }
}

test('first visit: banner shown, NOTHING tracked until Accept, then exactly one page_views insert', async () => {
  const sink = pageViewsSink();
  await withFixture({ handlers: [sink.handler], initScripts: [beaconStub] }, async (f) => {
    await f.goto('/games/');
    await f.page.waitForSelector('#cookieConsent #cookieAccept', { timeout: 2000 });
    assert.equal(await f.page.evaluate(() => sessionStorage.getItem('vs_attention_surface_v1')), 'cookie-consent');
    await settle(300);
    assert.equal(sink.posts.length, 0, 'default-deny: no page view before consent');
    assert.equal(await f.page.evaluate(() => window.__beacons.length), 0, 'no source beacon before consent');

    await f.page.click('#cookieAccept');
    await waitFor(() => sink.posts.length === 1, { message: 'page_views insert after accept' });
    assert.equal(await f.page.evaluate(() => localStorage.getItem('vs_cookie_consent')), 'accepted');
    assert.equal(await f.page.locator('#cookieConsent').count(), 0, 'banner removed');

    const { body, headers } = sink.posts[0];
    assert.deepEqual(Object.keys(body).sort(), ['page_path', 'page_title', 'referrer', 'session_id', 'user_id']);
    assert.equal(body.page_path, '/games/');
    assert.equal(body.referrer, null);
    assert.equal(body.user_id, null);
    assert.match(body.session_id, /^[a-z0-9]{8,}$/);
    assert.equal(headers.prefer, 'return=minimal');

    await waitFor(() => f.page.evaluate(() => window.__beacons.length === 1), { message: 'source beacon' });
    const beacons = await f.page.evaluate(() => window.__beacons);
    assert.equal(beacons[0].url, '/v/rum');
    assert.deepEqual(JSON.parse(beacons[0].body), { route: '/games/', ux: 'source:direct' });
    await settle(200);
    assert.equal(sink.posts.length, 1, 'exactly one insert per page load');
    assert.deepEqual(f.log.blocked, [], 'no unexpected third-party requests');
  });
});

test('Decline persists: no tracking now, no banner and no tracking on the next visit', async () => {
  const sink = pageViewsSink();
  await withFixture({ handlers: [sink.handler], initScripts: [beaconStub] }, async (f) => {
    await f.goto('/games/');
    await f.page.click('#cookieDecline');
    assert.equal(await f.page.evaluate(() => localStorage.getItem('vs_cookie_consent')), 'declined');
    assert.equal(await f.page.locator('#cookieConsent').count(), 0);
    await settle(400);
    assert.equal(sink.posts.length, 0, 'decline must not track');

    await f.page.reload({ waitUntil: 'load' });
    await settle(300);
    assert.equal(await f.page.locator('#cookieConsent').count(), 0, 'choice remembered: banner not re-shown');
    assert.equal(sink.posts.length, 0, 'declined visitor is never tracked on return');
    assert.equal(await f.page.evaluate(() => window.__beacons.length), 0);
  });
});

test('returning accepted visitor: no banner, one insert per load, source beacon once per session', async () => {
  const sink = pageViewsSink();
  await withFixture({ handlers: [sink.handler], initScripts: [setConsent, beaconStub] }, async (f) => {
    await f.goto('/games/');
    await waitFor(() => sink.posts.length === 1, { message: 'insert on load' });
    assert.equal(await f.page.locator('#cookieConsent').count(), 0);
    await waitFor(() => f.page.evaluate(() => window.__beacons.length === 1), { message: 'first beacon' });

    await f.page.reload({ waitUntil: 'load' });
    await waitFor(() => sink.posts.length === 2, { message: 'insert on reload' });
    await settle(200);
    assert.equal(await f.page.evaluate(() => window.__beacons.length), 0, 'source channel is sent once per tab session');
    assert.equal(sink.posts[0].body.session_id, sink.posts[1].body.session_id, 'session id is stable within the tab');
  });
});

test('DoNotTrack wins over an accepted consent', async () => {
  const sink = pageViewsSink();
  const dnt = () => { Object.defineProperty(Navigator.prototype, 'doNotTrack', { configurable: true, get: () => '1' }); };
  await withFixture({ handlers: [sink.handler], initScripts: [setConsent, dnt] }, async (f) => {
    await f.goto('/games/');
    await settle(400);
    assert.equal(sink.posts.length, 0);
  });
});

test('operator/portal paths are never tracked even with consent', async () => {
  const sink = pageViewsSink();
  await withFixture({ handlers: [sink.handler], initScripts: [setConsent] }, async (f) => {
    await f.goto('/studio-hub/');
    await f.goto('/investor-portal/');
    await settle(400);
    assert.equal(sink.posts.length, 0);
    await f.goto('/games/');
    await waitFor(() => sink.posts.length === 1, { message: 'control: public path tracks' });
  });
});

test('user_id comes only from verified VSSignedInState, never from a stored bearer token', async () => {
  const token = () => {
    localStorage.setItem('sb-fjnpzjjyhnpmunfoycrp-auth-token', JSON.stringify({ access_token: 'x', user: { id: 'from-storage' } }));
  };
  const sinkA = pageViewsSink();
  await withFixture({ handlers: [sinkA.handler], initScripts: [setConsent, token] }, async (f) => {
    await f.goto('/games/');
    await waitFor(() => sinkA.posts.length === 1);
    assert.equal(sinkA.posts[0].body.user_id, null);
  });

  const verified = () => { window.VSSignedInState = { getSession: () => ({ userId: 'verified-user' }) }; };
  const sinkB = pageViewsSink();
  await withFixture({ handlers: [sinkB.handler], initScripts: [setConsent, token, verified] }, async (f) => {
    await f.goto('/games/');
    await waitFor(() => sinkB.posts.length === 1);
    assert.equal(sinkB.posts[0].body.user_id, 'verified-user');
  });
});
