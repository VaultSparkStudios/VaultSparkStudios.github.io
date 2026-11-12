// contract-files: assets/vault-oracle.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const source = fs.readFileSync(new URL('../assets/vault-oracle.js', import.meta.url), 'utf8');
const endpoint = source.match(/var FN_URL = '([^']+)'/)[1];
const staleCatalogClaim = "User is browsing the VaultSpark Studios games catalog. Active projects: Call of Doodie (satire FPS), Gridiron GM (football simulator), Vaultfront, Solara, MindFrame, The Exodus. Help them find a game that fits their interest.";
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

const escape = text => String(text).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

async function outgoingContext({ path = '/games/', title = 'Games catalog',
  summary = 'Franchise Architect is Sparked. Gridiron GM is Vaulted.',
  explicit, script = source, streaming = true, signedIn = true } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const payloads = [], unexpected = [], pageErrors = [];
  let probes = 0;
  // Every page request is fulfilled or aborted locally. No route continues to
  // DNS, the provider, auth, paid inference, or another network service.
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,apikey,content-type,accept',
      'access-control-allow-methods': 'POST,OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.url() === endpoint) {
      const payload = request.postDataJSON();
      if (payload.probe) {
        probes++;
        return route.fulfill({ status: 200, headers, json: { access: {
          authenticated: true, unlimited: false, monthlyRemaining: 40, monthlyLimit: 40, monthlyUsed: 0,
        } } });
      }
      payloads.push(payload);
      if (payload.stream) return route.fulfill({ status: 200, headers,
        contentType: 'text/event-stream',
        body: 'data: {"type":"content_block_delta","delta":{"text":"Fixture answer"}}\n\n'
          + 'event: vs-ignis-tail\ndata: {"suggestions":[]}\n\n' });
      return route.fulfill({ status: 200, headers, json: { reply: 'Fixture answer', suggestions: [] } });
    }
    if (url.origin === 'http://oracle-context.test' && url.pathname === '/api/oracle-queries.json') {
      return route.fulfill({ json: { anonymous: [], member: [], sparked: [] } });
    }
    if (url.origin === 'http://oracle-context.test' && request.isNavigationRequest()) {
      const attribute = explicit === undefined ? '' : ` data-vault-oracle-context="${escape(explicit)}"`;
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head>'
        + `<meta name="description" content="${escape(summary)}"></head><body>`
        + `<h1>${escape(title)}</h1><h2>Current projects</h2>`
        + `<div data-vault-oracle${attribute}></div></body></html>` });
    }
    unexpected.push(request.url());
    return route.abort();
  });
  await context.addInitScript(({ streaming, signedIn }) => {
    window.VSSupabase = { auth: { getSession: async () => ({ data: {
      session: signedIn ? { access_token: 'fixture-token' } : null,
    } }) } };
    window.VSSignedInState = { isResolved: () => true, getSession: () => ({ tier: 'sparked' }) };
    if (!streaming) Object.defineProperty(window, 'ReadableStream', { value: undefined });
  }, { streaming, signedIn });
  try {
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://oracle-context.test' + path);
    await page.addScriptTag({ content: script });
    if (!signedIn) {
      await page.getByRole('link', { name: 'Sign In →' }).waitFor();
      assert.equal(await page.locator('.vs-oracle__input').count(), 0);
      assert.equal(probes, 0);
      assert.equal(payloads.length, 0);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(unexpected, []);
      return { payloads, probes };
    }
    await page.getByRole('textbox', { name: 'Your question for IGNIS' }).fill('Which game should I explore?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await page.getByText('Fixture answer', { exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(unexpected, []);
    assert.equal(probes, 1);
    assert.equal(payloads.length, 1);
    assert.equal(payloads[0].message, 'Which game should I explore?');
    return payloads[0];
  } finally { await context.close(); }
}

function assertCurrentCatalog(payload) {
  // A vaulted title must not be placed in an asserted active-project list.
  // Names remain page/snapshot data, rather than a replacement static list.
  assert.doesNotMatch(payload.context, /Active projects:[^\n]*Gridiron GM/);
  assert.match(payload.context, /Franchise Architect is Sparked/);
  assert.match(payload.context, /Gridiron GM is Vaulted/);
}

test('actual catalog widget sends current adaptive details without the stale active-project assertion', async () => {
  const payload = await outgoingContext();
  assertCurrentCatalog(payload);
  assert.equal(payload.stream, true);
});

test('future game details pass through the actual payload without a hardcoded catalog replacement', async () => {
  const payload = await outgoingContext({ path: '/games/quasar-fold/', title: 'Quasar Fold',
    summary: 'Quasar Fold is in the Forge. Ember Circuit is Sparked.' });
  assert.doesNotMatch(payload.context, /Active projects:/);
  assert.match(payload.context, /User is reading: "Quasar Fold"/);
  assert.match(payload.context, /Ember Circuit is Sparked/);
  assert.doesNotMatch(payload.context, /Franchise Architect|Gridiron GM/);
});

test('specific game prefix keeps its existing context and adaptive details', async () => {
  const payload = await outgoingContext({ path: '/games/call-of-doodie/', title: 'Call of Doodie' });
  assert.match(payload.context, /^User is on the Call of Doodie game page/);
  assert.match(payload.context, /User is reading: "Call of Doodie"/);
});

test('explicit host context overrides automatic game context unchanged', async () => {
  const explicit = 'Curated fixture context for this edition only.';
  const payload = await outgoingContext({ explicit });
  assert.equal(payload.context, explicit);
});

test('non-game prefix keeps its existing context and adaptive details', async () => {
  const payload = await outgoingContext({ path: '/contact/', title: 'Contact the studio' });
  assert.match(payload.context, /^User is on the contact page/);
  assert.match(payload.context, /User is reading: "Contact the studio"/);
});

test('non-streaming actual request carries the same current catalog context', async () => {
  const payload = await outgoingContext({ streaming: false });
  assertCurrentCatalog(payload);
  assert.equal(payload.stream, undefined);
});

test('the old active-project claim remains rejected through an actual outgoing-payload mutation', async () => {
  const mutated = source.replace(/\['\/games', '[^\r\n]*'\],/,
    `['/games', '${staleCatalogClaim}'],`);
  const payload = await outgoingContext({ script: mutated });
  assert.throws(() => assertCurrentCatalog(payload), assert.AssertionError);
});

test('anonymous fixture retains the existing membership gate without an inference request', async () => {
  await outgoingContext({ signedIn: false });
});

test('bounded arrival owner repairs uncompensated above-target growth and stops on intent or timeout', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const source = readFileSync(new URL('../assets/ignis-platform.js', import.meta.url), 'utf8');
  const start = source.indexOf('function initialOracleArrival() {');
  const end = source.indexOf('  var oracleArrival = initialOracleArrival();', start);
  assert(start >= 0);
  assert(end > start);
  const factory = source.slice(start, end);
  function fixture(hash = '#oracle') {
    const listeners = new Map(), frames = new Map(), observers = [];
    let position = 94, scrollCalls = 0, nextFrame = 0, timer;
    const above = { previousElementSibling: null };
    const header = {};
    const target = { parentElement: {}, previousElementSibling: above,
      getBoundingClientRect: () => ({ top: position }),
      scrollIntoView: () => { scrollCalls++; position = 94; } };
    const location = { pathname: '/ignis/', hash };
    const owner = runInNewContext(`(${factory})();`, {
      location,
      document: { getElementById: () => target, querySelector: () => header },
      getComputedStyle: () => ({ scrollMarginTop: '94px' }),
      window: {
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
      },
      ResizeObserver: class {
        constructor(callback) { this.callback = callback; this.observed = []; observers.push(this); }
        observe(el) { this.observed.push(el); }
        disconnect() { this.disconnected = true; }
      },
      requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
      cancelAnimationFrame: id => frames.delete(id),
      setTimeout: (callback, ms) => { assert.equal(ms, 10000); timer = callback; return 1; },
      clearTimeout: () => {},
    }, { timeout: 1000 });
    const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
    return { owner, observers, above, header, listeners, flush,
      position: value => { position = value; }, calls: () => scrollCalls,
      timeout: () => timer?.() };
  }
  const f = fixture();
  f.owner.settle(true); f.flush();
  assert.equal(f.observers.length, 1);
  assert.deepEqual(f.observers[0].observed, [f.header, f.above]);
  assert.equal(f.calls(), 0);
  f.position(127); // Same measured late33px growth, without browser compensation.
  f.observers[0].callback(); f.flush();
  assert.equal(f.calls(), 1);
  f.owner.settle(true); f.observers[0].callback(); f.flush();
  assert.equal(f.observers.length, 1);
  assert.equal(f.calls(), 1); // No duplicate repair while aligned.
  f.listeners.get('wheel')();
  assert.equal(f.observers[0].disconnected, true);
  f.position(160); f.observers[0].callback(); f.flush();
  assert.equal(f.calls(), 1);
  const expired = fixture();
  expired.owner.settle(true); expired.flush(); expired.timeout();
  assert.equal(expired.observers[0].disconnected, true);
  expired.position(127); expired.observers[0].callback(); expired.flush();
  assert.equal(expired.calls(), 0);
  const noHash = fixture('');
  noHash.owner.settle(true); noHash.flush();
  assert.equal(noHash.observers.length, 0);
  assert.equal(noHash.calls(), 0);
});
