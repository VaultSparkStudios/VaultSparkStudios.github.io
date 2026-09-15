// desk-presence.unit.spec.js — assets/desk-presence.js (The Desk reader presence +
// engaged time). Public numbers + a privacy promise: only {kind, slug, session}
// on presence, a bounded summary on pagehide, and SSR-owned aggregates are never
// overwritten client-side. Fixture origin; /v/desk-presence + feed are mocked.
// Run: node --test tests/desk-presence.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, waitFor, settle, beaconStub, ORIGIN } from './fixtures/browser-harness.mjs';

const SLUG = '2026-09-14/fixture-story';

function storyPage({ ssr }) {
  return html({
    body: `<section data-desk-engagement="${SLUG}" data-estimated-minutes="3"${ssr ? ' data-ssr="1"' : ''}>
<strong data-reader-presence>Checking…</strong>
<strong data-engaged-time>SERVER-RENDERED</strong>
<p data-engagement-note>SERVER NOTE</p>
</section><script src="/assets/desk-presence.js"></script>`,
  });
}

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

const focused = () => { document.hasFocus = () => true; };

async function setup({ ssr = false, clock = false } = {}) {
  const state = { get: { status: 200, body: { ok: true, state: 'observed', activeBand: 'none', activeReaders: null } }, feed: { status: 200, body: { stories: [] } }, posts: [], gets: [], feedServed: 0 };
  const f = await openFixture(browser, {
    clock,
    pages: { '/news/story/': storyPage({ ssr }) },
    initScripts: [focused, beaconStub],
    handlers: [
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/v/desk-presence',
        handle: async (route, req) => {
          if (req.method() === 'GET') {
            state.gets.push(req.url());
            await route.fulfill({ status: state.get.status, contentType: 'application/json', body: JSON.stringify(state.get.body) });
          } else {
            state.posts.push(JSON.parse(req.postData()));
            await route.fulfill({ status: 202, contentType: 'application/json', body: '{"ok":true}' });
          }
        },
      },
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/api/news-desk-engagement.json',
        handle: async (route) => {
          state.feedServed += 1;
          await route.fulfill({ status: state.feed.status, contentType: 'application/json', body: JSON.stringify(state.feed.body) });
        },
      },
    ],
  });
  return { f, state };
}

const text = (page, sel) => page.textContent(sel);

test('presence POST carries only {kind, slug, session} and bands render honestly', async () => {
  const { f, state } = await setup();
  try {
    const cases = [
      [{ status: 200, body: { ok: true, state: 'observed', activeBand: 'none' } }, 'Quiet right now'],
      [{ status: 200, body: { ok: true, state: 'observed', activeBand: 'one-or-two', activeReaders: null } }, 'A reader or two'],
      [{ status: 200, body: { ok: true, state: 'observed', activeBand: 'three-plus', activeReaders: 5 } }, '5 readers'],
      [{ status: 200, body: { ok: true, state: 'observed', activeBand: 'many', activeReaders: null } }, 'Readers are here'],
      [{ status: 200, body: { ok: true, state: 'withheld' } }, 'Unavailable'],
      [{ status: 500, body: { ok: false } }, 'Unavailable'],
    ];
    for (const [response, expected] of cases) {
      state.get = response;
      state.posts.length = 0;
      await f.goto('/news/story/');
      await waitFor(async () => (await text(f.page, '[data-reader-presence]')) !== 'Checking…', { message: `render for ${expected}` });
      assert.equal(await text(f.page, '[data-reader-presence]'), expected);
      assert.equal(state.posts.length, 1);
      assert.deepEqual(Object.keys(state.posts[0]).sort(), ['kind', 'session', 'slug']);
      assert.equal(state.posts[0].kind, 'presence');
      assert.equal(state.posts[0].slug, SLUG);
      assert.match(state.posts[0].session, /^[0-9a-f]{32}$/);
    }
    assert.equal(new URL(state.gets.at(-1)).searchParams.get('slug'), SLUG);
    assert.notEqual(state.posts[0].session, undefined);
  } finally { await f.close(); }
});

test('SSR pages keep the server-rendered aggregate even when the feed says otherwise', async () => {
  const { f, state } = await setup({ ssr: true });
  try {
    state.feed.body = { stories: [{ slug: SLUG, state: 'sufficient', observations: 8, averageEngagedSeconds: 134, windowDays: 30 }] };
    await f.goto('/news/story/');
    await waitFor(() => state.feedServed === 1, { message: 'feed fetched' });
    await settle(250);
    assert.equal(await text(f.page, '[data-engaged-time]'), 'SERVER-RENDERED');
    assert.equal(await text(f.page, '[data-engagement-note]'), 'SERVER NOTE');
  } finally { await f.close(); }
});

test('non-SSR pages fall back to the estimate below the sample gate or when the feed fails', async () => {
  const { f, state } = await setup();
  try {
    state.feed.body = { stories: [{ slug: SLUG, state: 'insufficient', observations: 2 }] };
    await f.goto('/news/story/');
    await waitFor(async () => (await text(f.page, '[data-engaged-time]')) !== 'SERVER-RENDERED', { message: 'estimate render' });
    assert.equal(await text(f.page, '[data-engaged-time]'), '~3 min estimated');

    state.feed = { status: 404, body: {} };
    await f.goto('/news/story/');
    await waitFor(async () => (await text(f.page, '[data-engaged-time]')) !== 'SERVER-RENDERED', { message: 'estimate on 404' });
    assert.equal(await text(f.page, '[data-engaged-time]'), '~3 min estimated');
  } finally { await f.close(); }
});

test('non-SSR sufficient sample renders the observation note', async () => {
  const { f, state } = await setup();
  try {
    state.feed.body = { stories: [{ slug: SLUG, state: 'sufficient', observations: 8, averageEngagedSeconds: 134, windowDays: 30 }] };
    await f.goto('/news/story/');
    await waitFor(async () => (await text(f.page, '[data-engagement-note]')) !== 'SERVER NOTE', { message: 'note render' });
    assert.match(await text(f.page, '[data-engagement-note]'), /^8 completed, visible-and-focused reading observations · ~3-minute estimated read · 30-day window\./);
  } finally { await f.close(); }
});

// renderAggregate builds `label = '2m 14s avg'` and then writes `label + ' avg'`.
test('non-SSR sufficient sample renders "2m 14s avg" / "45s avg" exactly once', {
  todo: 'BUG assets/desk-presence.js renderAggregate appends " avg" twice ("2m 14s avg avg")',
}, async () => {
  const { f, state } = await setup();
  try {
    for (const [seconds, expected] of [[134, '2m 14s avg'], [45, '45s avg']]) {
      state.feed.body = { stories: [{ slug: SLUG, state: 'sufficient', observations: 8, averageEngagedSeconds: seconds, windowDays: 30 }] };
      await f.goto('/news/story/');
      await waitFor(async () => (await text(f.page, '[data-engaged-time]')) !== 'SERVER-RENDERED');
      assert.equal(await text(f.page, '[data-engaged-time]'), expected);
    }
  } finally { await f.close(); }
});

test('pagehide sends ONE bounded engaged-time summary with the same tab session', async () => {
  const { f, state } = await setup({ clock: true });
  try {
    await f.goto('/news/story/');
    await waitFor(() => state.posts.length === 1, { message: 'presence post' });
    await f.context.clock.runFor(3_000);
    await f.page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide')); window.dispatchEvent(new PageTransitionEvent('pagehide')); });
    await waitFor(() => f.page.evaluate(() => window.__beacons.length >= 1), { message: 'summary beacon' });
    await settle(100);
    const beacons = await f.page.evaluate(() => window.__beacons);
    assert.equal(beacons.length, 1, 'summary is sent once per page');
    assert.equal(beacons[0].url, '/v/desk-presence');
    const body = JSON.parse(beacons[0].body);
    assert.deepEqual(Object.keys(body).sort(), ['engagedSeconds', 'idleBand', 'kind', 'session', 'slug']);
    assert.equal(body.kind, 'summary');
    assert.equal(body.slug, SLUG);
    assert.equal(body.session, state.posts[0].session);
    assert.ok(body.engagedSeconds >= 2 && body.engagedSeconds <= 8, `engagedSeconds ${body.engagedSeconds}`);
    assert.ok(['under30', '30to119', '120to599', '600plus'].includes(body.idleBand));
  } finally { await f.close(); }
});
