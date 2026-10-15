// after-paint.unit.spec.js — assets/after-paint.js.
// Guards the contract Desk articles and the homepage rely on: scripts parked in
// <template data-after-paint> are not requested while the page is loading, run in
// document order once it has loaded and a frame is on screen, start at once on a
// first interaction, and never include anything outside same-origin /assets/.
// Run: node --test tests/after-paint.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, waitFor, settle, ORIGIN } from './fixtures/browser-harness.mjs';

const probe = (name) => `<script src="/assets/__probe-${name}.js" defer></script>`;

function fixture(parked) {
  return html({
    body: `<p>Article text</p><img src="/slow.png" alt="" width="1" height="1">
<template data-after-paint>${parked}</template>
<script src="/assets/after-paint.js" defer></script>`,
  });
}

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function setup(parked) {
  let releaseImage;
  const imageHeld = new Promise((resolve) => { releaseImage = resolve; });
  const f = await openFixture(browser, {
    pages: { '/story/': fixture(parked) },
    handlers: [
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/slow.png',
        handle: async (route) => { await imageHeld; await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }); },
      },
      {
        match: (u) => u.origin === ORIGIN && u.pathname.startsWith('/assets/__probe-'),
        handle: async (route) => {
          const name = new URL(route.request().url()).pathname.replace('/assets/__probe-', '').replace('.js', '');
          // The first probe answers last: order must come from insertion, not arrival.
          if (name === 'a') await new Promise((done) => setTimeout(done, 150));
          await route.fulfill({ status: 200, contentType: 'application/javascript', body: `(window.__order = window.__order || []).push(${JSON.stringify(name)});` });
        },
      },
    ],
  });
  const probesRequested = () => f.log.requests.filter((r) => r.url.includes('/assets/__probe-')).map((r) => r.url.replace(/^.*__probe-/, '').replace('.js', ''));
  return { f, releaseImage, probesRequested };
}

test('parked scripts are not requested while the page is still loading', async () => {
  const { f, releaseImage, probesRequested } = await setup(probe('a') + probe('b'));
  try {
    const navigation = f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    await navigation;
    await settle(400);
    assert.deepEqual(probesRequested(), [], 'nothing parked is fetched before the load event');
    assert.deepEqual(await f.page.evaluate(() => ({ started: window.VSAfterPaint.started, done: window.VSAfterPaint.done })), { started: false, done: false });
    releaseImage();
    await waitFor(async () => (await f.page.evaluate(() => (window.__order || []).length)) === 2, { message: 'parked scripts to run after load' });
  } finally { releaseImage(); await f.close(); }
});

test('parked scripts run in document order and announce completion', async () => {
  const { f, releaseImage } = await setup(probe('a') + probe('b') + probe('c'));
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    await f.page.evaluate(() => { document.addEventListener('vs:after-paint', () => { window.__announced = true; }); });
    releaseImage();
    await waitFor(() => f.page.evaluate(() => window.__announced === true), { message: 'vs:after-paint' });
    assert.deepEqual(await f.page.evaluate(() => window.__order), ['a', 'b', 'c']);
    assert.equal(await f.page.evaluate(() => window.VSAfterPaint.done), true);
    assert.deepEqual(f.log.errors, []);
  } finally { releaseImage(); await f.close(); }
});

test('a first interaction starts the parked scripts without waiting for load', async () => {
  const { f, releaseImage, probesRequested } = await setup(probe('a') + probe('b'));
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    await settle(150);
    assert.deepEqual(probesRequested(), []);
    await f.page.keyboard.press('Tab');
    await waitFor(async () => (await f.page.evaluate(() => (window.__order || []).length)) === 2, { message: 'parked scripts to run on interaction' });
    assert.deepEqual(await f.page.evaluate(() => window.__order), ['a', 'b']);
  } finally { releaseImage(); await f.close(); }
});

test('anything outside same-origin /assets/ is ignored', async () => {
  const parked = `<script src="https://elsewhere.example/assets/x.js" defer></script><script src="/not-assets/y.js" defer></script>${probe('ok')}`;
  const { f, releaseImage } = await setup(parked);
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    releaseImage();
    await waitFor(() => f.page.evaluate(() => window.VSAfterPaint.done === true), { message: 'completion' });
    assert.deepEqual(await f.page.evaluate(() => window.__order), ['ok']);
    assert.deepEqual(f.log.blocked, [], 'no cross-origin request was attempted');
    assert.equal(f.log.requests.some((r) => r.url.includes('/not-assets/')), false);
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('script[data-after-paint]').length), 1);
  } finally { releaseImage(); await f.close(); }
});

test('a parked script that fails to load does not stop the ones after it', async () => {
  const parked = `${probe('a')}<script src="/assets/__missing-on-purpose.js" defer></script>${probe('b')}`;
  const { f, releaseImage } = await setup(parked);
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    releaseImage();
    await waitFor(() => f.page.evaluate(() => window.VSAfterPaint.done === true), { message: 'completion after a 404' });
    assert.deepEqual(await f.page.evaluate(() => window.__order), ['a', 'b']);
  } finally { releaseImage(); await f.close(); }
});

test('a template with nothing eligible still reports done', async () => {
  const { f, releaseImage } = await setup('<script src="/not-assets/y.js" defer></script>');
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    releaseImage();
    await waitFor(() => f.page.evaluate(() => window.VSAfterPaint.done === true), { message: 'completion with nothing eligible' });
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('script[data-after-paint]').length), 0);
  } finally { releaseImage(); await f.close(); }
});

test('a second activator on the page does not run parked scripts twice', async () => {
  const { f, releaseImage } = await setup(probe('a') + probe('b'));
  try {
    await f.page.route(`${ORIGIN}/story/`, (route) => route.fulfill({
      status: 200, contentType: 'text/html; charset=utf-8',
      body: fixture(probe('a') + probe('b')).replace('</body>', '<script src="/assets/after-paint.js?second" defer></script></body>'),
    }));
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    releaseImage();
    await waitFor(() => f.page.evaluate(() => window.VSAfterPaint.done === true), { message: 'completion' });
    await settle(300);
    assert.deepEqual(await f.page.evaluate(() => window.__order), ['a', 'b']);
  } finally { releaseImage(); await f.close(); }
});

test('an early interaction waits for the eager deferred scripts that follow', async () => {
  // The activator sits mid-way through a page's deferred list. A parked script
  // must not overtake an eager one that came after it in the document.
  let releaseEager;
  const eagerHeld = new Promise((resolve) => { releaseEager = resolve; });
  const f = await openFixture(browser, {
    pages: {
      '/story/': html({ body: `<template data-after-paint>${probe('parked')}</template>
<script src="/assets/after-paint.js" defer></script><script src="/assets/__probe-eager.js" defer></script>` }),
    },
    handlers: [{
      match: (u) => u.origin === ORIGIN && u.pathname.startsWith('/assets/__probe-'),
      handle: async (route) => {
        const name = new URL(route.request().url()).pathname.replace('/assets/__probe-', '').replace('.js', '');
        if (name === 'eager') await eagerHeld;
        await route.fulfill({ status: 200, contentType: 'application/javascript', body: `(window.__order = window.__order || []).push(${JSON.stringify(name)});` });
      },
    }],
  });
  try {
    const navigation = f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'load' });
    await waitFor(() => f.log.requests.some((r) => r.url.includes('__probe-eager')), { message: 'eager request' });
    await f.page.keyboard.press('Tab');
    await settle(250);
    assert.equal(f.log.requests.some((r) => r.url.includes('__probe-parked')), false, 'parked script is not requested ahead of a pending eager one');
    releaseEager();
    await navigation;
    await waitFor(() => f.page.evaluate(() => window.VSAfterPaint.done === true), { message: 'completion' });
    assert.deepEqual(await f.page.evaluate(() => window.__order), ['eager', 'parked']);
  } finally { releaseEager(); await f.close(); }
});

test('the homepage idle loader waits for the parked pass, and runs without an activator', async () => {
  let releaseParked;
  const parkedHeld = new Promise((resolve) => { releaseParked = resolve; });
  const idleStarted = (page) => page.evaluate(() => document.querySelectorAll('script[data-home-idle]').length > 0);
  const gated = await openFixture(browser, {
    pages: { '/': html({ body: `<template data-after-paint>${probe('slow')}</template><script src="/assets/after-paint.js" defer></script><script src="/assets/home-idle-loader.js" defer></script>` }) },
    handlers: [{
      match: (u) => u.origin === ORIGIN && u.pathname === '/assets/__probe-slow.js',
      handle: async (route) => { await parkedHeld; await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }); },
    }],
  });
  try {
    await gated.goto('/');
    await gated.page.keyboard.press('Tab');
    await settle(1800);
    assert.equal(await idleStarted(gated.page), false, 'idle queue holds while a parked script is outstanding');
    releaseParked();
    await waitFor(() => idleStarted(gated.page), { timeout: 4000, message: 'idle queue after the parked pass' });
  } finally { releaseParked(); await gated.close(); }

  const plain = await openFixture(browser, { pages: { '/': html({ body: '<script src="/assets/home-idle-loader.js" defer></script>' }) } });
  try {
    await plain.goto('/');
    await plain.page.keyboard.press('Tab');
    await waitFor(() => idleStarted(plain.page), { timeout: 4000, message: 'idle queue without an activator' });
  } finally { await plain.close(); }
});

test('a page with nothing parked reports done immediately', async () => {
  const f = await openFixture(browser, { pages: { '/plain/': html({ body: '<p>x</p><script src="/assets/after-paint.js" defer></script>' }) } });
  try {
    await f.goto('/plain/');
    assert.deepEqual(await f.page.evaluate(() => ({ started: window.VSAfterPaint.started, done: window.VSAfterPaint.done })), { started: false, done: true });
  } finally { await f.close(); }
});

test('a reaction tapped before its parked script has run is delivered once, the latest per bar', async () => {
  let releaseImage;
  const imageHeld = new Promise((resolve) => { releaseImage = resolve; });
  let releaseReactions;
  const reactionsHeld = new Promise((resolve) => { releaseReactions = resolve; });
  const body = `<div data-desk-reactions="one"><button data-reaction="a">A</button><button data-reaction="b">B</button></div>
<div data-desk-reactions="two"><button data-reaction="c">C</button></div>
<button id="other">Other</button>
<img src="/slow.png" alt="" width="1" height="1">
<template data-after-paint><script src="/assets/__reactions.js" defer></script></template>
<script src="/assets/after-paint.js" defer></script>`;
  const f = await openFixture(browser, {
    pages: { '/story/': html({ body }) },
    handlers: [
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/slow.png',
        handle: async (route) => { await imageHeld; await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }); },
      },
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/assets/__reactions.js',
        handle: async (route) => {
          // Keep every early tap ahead of the handler regardless of host load.
          await reactionsHeld;
          await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `window.__got = []; document.addEventListener('click', function (e) { var b = e.target.closest('[data-reaction]'); if (b) { e.preventDefault(); window.__got.push(b.getAttribute('data-reaction')); } });`,
          });
        },
      },
    ],
  });
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    await f.page.click('[data-reaction="a"]');
    await f.page.click('[data-reaction="b"]');
    await f.page.click('#other');
    await f.page.click('[data-reaction="c"]');
    assert.equal(await f.page.evaluate(() => typeof window.__got), 'undefined', 'the taps landed before the parked script ran');
    releaseReactions();
    await waitFor(async () => (await f.page.evaluate(() => (window.__got || []).length)) === 2, { message: 'early taps to be delivered' });
    await settle(200);
    assert.deepEqual(await f.page.evaluate(() => window.__got), ['b', 'c'], 'one tap per bar, the most recent, and nothing for other controls');
    await f.page.click('[data-reaction="a"]');
    assert.deepEqual(await f.page.evaluate(() => window.__got), ['b', 'c', 'a'], 'a later tap is handled once, not replayed');
  } finally { releaseReactions(); releaseImage(); await f.close(); }
});

test('a tap the reactions script already handled is not delivered again while a later parked script loads', async () => {
  let releaseLate;
  const lateHeld = new Promise((resolve) => { releaseLate = resolve; });
  const body = `<div data-desk-reactions="one"><button data-reaction="a">A</button><button data-reaction="b">B</button></div>
<template data-after-paint><script src="/assets/__reactions.js" defer></script><script src="/assets/__late.js" defer></script></template>
<script src="/assets/after-paint.js" defer></script>`;
  const f = await openFixture(browser, {
    pages: { '/story/': html({ body }) },
    handlers: [
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/assets/__reactions.js',
        handle: async (route) => {
          await new Promise((done) => setTimeout(done, 300));
          await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `window.__got = []; document.querySelector('[data-desk-reactions]').addEventListener('click', function (e) { var b = e.target.closest('[data-reaction]'); if (b) { e.preventDefault(); window.__got.push(b.getAttribute('data-reaction')); } });`,
          });
        },
      },
      {
        match: (u) => u.origin === ORIGIN && u.pathname === '/assets/__late.js',
        handle: async (route) => { await lateHeld; await route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.__late = true;' }); },
      },
    ],
  });
  try {
    await f.page.goto(`${ORIGIN}/story/`, { waitUntil: 'domcontentloaded' });
    // An early tap on A, before any handler exists.
    await f.page.click('[data-reaction="a"]');
    await waitFor(async () => (await f.page.evaluate(() => Array.isArray(window.__got))), { message: 'the reactions script to run' });
    // The reactions script is live, the second parked script is still loading:
    // this tap on B is handled at once and replaces the earlier tap on A.
    await f.page.click('[data-reaction="b"]');
    assert.deepEqual(await f.page.evaluate(() => ({ got: window.__got, done: window.VSAfterPaint.done })), { got: ['b'], done: false });
    releaseLate();
    await waitFor(async () => (await f.page.evaluate(() => window.VSAfterPaint.done)), { message: 'parked scripts to finish' });
    await settle(200);
    assert.deepEqual(await f.page.evaluate(() => window.__got), ['b'], 'nothing is delivered a second time');
  } finally { releaseLate(); await f.close(); }
});
