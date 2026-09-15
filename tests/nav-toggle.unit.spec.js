// nav-toggle.unit.spec.js — assets/nav-toggle.js (every-page mobile drawer +
// desktop dropdown keyboard a11y). Minimal fixture markup mirrors the ids/classes
// the script binds to; CSS only provides the mobile/desktop breakpoint.
// Run: node --test tests/nav-toggle.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, ORIGIN } from './fixtures/browser-harness.mjs';

const FIXTURE = html({
  head: `<style>
    body { margin: 0; min-height: 3000px; }
    .site-header { position: fixed; top: 0; left: 0; right: 0; height: 50px; z-index: 20; background: #eee; }
    #hamburger { display: block; }
    @media (min-width: 900px) { #hamburger { display: none; } }
    #nav-backdrop { display: none; }
    #nav-backdrop.visible { display: block; position: fixed; inset: 0; z-index: 15; }
    #nav-menu.open { position: fixed; top: 50px; left: 0; right: 0; z-index: 30; background: #fff; }
    .nav-dropdown { display: none; }
    .nav-item.dropdown-open > .nav-dropdown, .nav-item:focus-within > .nav-dropdown { display: block; }
  </style>`,
  body: `<header class="site-header" id="site-header"><a href="#home" id="logo">VS</a>
<button id="hamburger" class="hamburger" type="button" aria-expanded="false">Menu</button>
<ul id="nav-menu">
  <li class="nav-item has-dropdown"><a href="/games/" id="games">Games</a>
    <ul class="nav-dropdown"><li><a href="#g1" id="g1">One</a></li><li><a href="#g2" id="g2">Two</a></li><li><a href="#g3" id="g3">Three</a></li></ul>
  </li>
  <li class="nav-item"><a href="#plain" id="plain">Plain</a></li>
</ul></header>
<main><p>© <span class="copyright-year">1999</span></p></main>
<script src="/assets/nav-toggle.js"></script>`,
});

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function setup(viewport) {
  const f = await openFixture(browser, { pages: { '/': FIXTURE }, contextOptions: { viewport } });
  await f.goto('/');
  return f;
}
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const snap = (page) => page.evaluate(() => {
  const menu = document.getElementById('nav-menu');
  return {
    open: menu.classList.contains('open'),
    expanded: document.getElementById('hamburger').getAttribute('aria-expanded'),
    parent: menu.parentElement.id || menu.parentElement.tagName,
    backdrop: document.getElementById('nav-backdrop').classList.contains('visible'),
    bodyPosition: document.body.style.position,
  };
});

test('mobile: hamburger opens the drawer (portaled + scroll-locked) and closes it back home', async () => {
  const f = await setup(MOBILE);
  try {
    assert.deepEqual(await snap(f.page), { open: false, expanded: 'false', parent: 'site-header', backdrop: false, bodyPosition: '' });
    await f.page.click('#hamburger');
    assert.deepEqual(await snap(f.page), { open: true, expanded: 'true', parent: 'BODY', backdrop: true, bodyPosition: 'fixed' });
    await f.page.click('#hamburger');
    assert.deepEqual(await snap(f.page), { open: false, expanded: 'false', parent: 'site-header', backdrop: false, bodyPosition: '' });
  } finally { await f.close(); }
});

test('mobile: Escape closes, returns focus to the hamburger, and restores scroll position', async () => {
  const f = await setup(MOBILE);
  try {
    await f.page.evaluate(() => window.scrollTo(0, 500));
    await f.page.click('#hamburger');
    assert.equal(await f.page.evaluate(() => document.body.style.top), '-500px');
    await f.page.keyboard.press('Escape');
    const after = await f.page.evaluate(() => ({ focus: document.activeElement.id, y: window.scrollY }));
    assert.deepEqual(after, { focus: 'hamburger', y: 500 });
    assert.equal((await snap(f.page)).open, false);
  } finally { await f.close(); }
});

test('mobile: tapping the backdrop or a plain link closes the drawer', async () => {
  const f = await setup(MOBILE);
  try {
    await f.page.click('#hamburger');
    await f.page.mouse.click(200, 800); // backdrop area below the drawer
    assert.equal((await snap(f.page)).open, false, 'backdrop tap closes');

    await f.page.click('#hamburger');
    await f.page.click('#plain');
    assert.equal((await snap(f.page)).open, false, 'plain link closes');
  } finally { await f.close(); }
});

test('mobile: a dropdown trigger toggles its submenu instead of navigating; closing resets it', async () => {
  const f = await setup(MOBILE);
  try {
    await f.page.click('#hamburger');
    await f.page.click('#games');
    assert.equal(f.page.url(), `${ORIGIN}/`, 'trigger tap must not navigate on mobile');
    const state = () => f.page.evaluate(() => [document.querySelector('.has-dropdown').classList.contains('dropdown-open'), document.getElementById('games').getAttribute('aria-expanded')]);
    assert.deepEqual(await state(), [true, 'true']);
    assert.equal((await snap(f.page)).open, true, 'drawer stays open while expanding a section');
    await f.page.click('#games');
    assert.deepEqual(await state(), [false, 'false']);

    await f.page.click('#games');
    await f.page.keyboard.press('Escape');
    assert.deepEqual(await state(), [false, 'false'], 'closing the drawer collapses open sections');
  } finally { await f.close(); }
});

test('desktop: dropdown ARIA wiring, arrow-key roving focus with wrap, Escape returns to trigger', async () => {
  const f = await setup(DESKTOP);
  try {
    const aria = await f.page.evaluate(() => {
      const t = document.getElementById('games');
      return { popup: t.getAttribute('aria-haspopup'), controls: t.getAttribute('aria-controls'), target: !!document.getElementById(t.getAttribute('aria-controls')) };
    });
    assert.equal(aria.popup, 'menu');
    assert.ok(aria.controls && aria.target, 'aria-controls points at the dropdown');

    await f.page.focus('#games');
    const active = () => f.page.evaluate(() => document.activeElement.id);
    await f.page.keyboard.press('ArrowDown');
    assert.equal(await active(), 'g1');
    assert.equal(await f.page.evaluate(() => document.querySelector('.has-dropdown').classList.contains('dropdown-open')), true);
    await f.page.keyboard.press('ArrowDown');
    assert.equal(await active(), 'g2');
    await f.page.keyboard.press('ArrowUp');
    await f.page.keyboard.press('ArrowUp');
    assert.equal(await active(), 'g3', 'ArrowUp from the first item wraps to the last');
    await f.page.keyboard.press('ArrowDown');
    assert.equal(await active(), 'g1', 'ArrowDown from the last item wraps to the first');

    await f.page.keyboard.press('Escape');
    assert.equal(await active(), 'games');
    assert.equal(await f.page.evaluate(() => document.querySelector('.has-dropdown').classList.contains('dropdown-open')), false);
  } finally { await f.close(); }
});

test('desktop: focus leaving the item collapses it; the drawer never opens on desktop', async () => {
  const f = await setup(DESKTOP);
  try {
    await f.page.focus('#games');
    await f.page.keyboard.press('ArrowDown');
    await f.page.focus('#logo');
    assert.deepEqual(await f.page.evaluate(() => [
      document.querySelector('.has-dropdown').classList.contains('dropdown-open'),
      document.getElementById('games').getAttribute('aria-expanded'),
    ]), [false, 'false']);
    assert.equal((await snap(f.page)).open, false);
  } finally { await f.close(); }
});

test('footer copyright year is rendered from the clock', async () => {
  const f = await setup(DESKTOP);
  try {
    const year = await f.page.evaluate(() => [document.querySelector('.copyright-year').textContent, String(new Date().getFullYear())]);
    assert.equal(year[0], year[1]);
    assert.notEqual(year[0], '1999');
  } finally { await f.close(); }
});
