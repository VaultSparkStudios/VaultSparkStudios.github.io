// desk-wire.unit.spec.js — S356. Pure-logic + zero-shift DOM contract for
// assets/desk-wire.js (The Desk wire strip). Run: node --test tests/desk-wire.unit.spec.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SOURCE = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'desk-wire.js'), 'utf8');

function loadApi() {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(SOURCE, sandbox, { filename: 'desk-wire.js' });
  return sandbox.module.exports;
}

const { selectLatest, deskWireLabel, truncateHeadline, isDeskHref, MAX_HEADLINE, LIVE_LABEL, LATEST_LABEL } = loadApi();

test('truncateHeadline leaves short headlines alone and collapses whitespace', () => {
  assert.equal(truncateHeadline('  Short   headline \n here '), 'Short headline here');
  assert.equal(truncateHeadline(null), '');
});

test('truncateHeadline cuts at a word boundary within budget and appends an ellipsis', () => {
  const long = 'Anthropic blocks AI bioweapon misuse via a Moonshot relay that routed three hundred thousand requests in ten days';
  const out = truncateHeadline(long, 60);
  assert.ok(out.length <= 60, `length ${out.length}`);
  assert.ok(out.endsWith('…'));
  assert.ok(long.startsWith(out.slice(0, -1)), 'prefix of the original');
  assert.notEqual(out.at(-2), ' ');
});

test('truncateHeadline hard-cuts a single unbroken token instead of collapsing it', () => {
  const out = truncateHeadline('x'.repeat(300), 40);
  assert.equal(out.length, 40);
  assert.ok(out.endsWith('…'));
});

test('truncateHeadline strips dangling punctuation before the ellipsis', () => {
  assert.equal(truncateHeadline('alpha beta gamma, delta epsilon zeta', 18), 'alpha beta gamma…');
});

test('isDeskHref accepts only same-origin /news/ paths', () => {
  assert.equal(isDeskHref('/news/2026-09-12/story/'), true);
  for (const bad of ['//evil.example/news/', 'https://evil.example/news/', 'javascript:alert(1)', '/games/', '/news/../admin/', '/news/"onmouseover=x', null]) {
    assert.equal(isDeskHref(bad), false, String(bad));
  }
});

test('selectLatest picks the newest dated, well-formed card', () => {
  const feed = {
    state: 'live',
    cards: [
      { date: '2026-09-10', href: '/news/2026-09-10/b/', headline: 'Older' },
      { date: '2026-09-12', href: '/news/2026-09-12/a/', headline: '  Newest   story ' },
      { date: '2026-09-13', href: 'https://evil.example/', headline: 'Hostile newest' },
      { date: '2026-09-14', href: '/news/2026-09-14/c/', headline: '   ' },
    ],
  };
  const item = selectLatest(feed);
  assert.equal(item.href, '/news/2026-09-12/a/');
  assert.equal(item.date, '2026-09-12');
  assert.equal(item.fullHeadline, 'Newest story');
  assert.equal(item.headline, 'Newest story');
  // The label is NOT a property of the headline any more: a loaded headline is
  // not evidence of cadence. See deskWireLabel.
  assert.equal(item.label, undefined);
});

/* S357 — the strip used to say "Live" with a pulsing dot whenever a headline
   loaded, which would pulse over a days-old edition while the homepage module
   said the cadence was periodic. The claim is now bound to the measured
   freshness feed. */
// Field-by-field, not deepEqual: the api object is built inside the vm realm, so
// a structural compare would fail on the foreign prototype rather than the data.
test('deskWireLabel only claims "Live" when the freshness feed measures daily', () => {
  const daily = deskWireLabel({ state: 'daily' });
  assert.equal(daily.label, LIVE_LABEL);
  assert.equal(daily.state, 'live');
  assert.equal(daily.pulse, true);
  assert.equal(LIVE_LABEL, 'Live on The Desk');
});

test('deskWireLabel downgrades to "Latest" with no pulse for every non-daily state', () => {
  for (const feed of [
    { state: 'periodic' },
    { state: 'paused' },
    { state: 'unknown-future-state' },
    { cadenceLabel: 'Daily' }, // a label is not the measured state
    {},
    null,
    undefined,
  ]) {
    const badge = deskWireLabel(feed);
    const where = JSON.stringify(feed) || String(feed);
    assert.equal(badge.label, LATEST_LABEL, where);
    assert.equal(badge.state, 'latest', where);
    assert.equal(badge.pulse, false, where);
  }
  assert.equal(LATEST_LABEL, 'Latest · The Desk');
});

test('selectLatest keeps feed order on ties and truncates to the budget', () => {
  const long = 'word '.repeat(60).trim();
  const item = selectLatest({ state: 'live', cards: [
    { date: '2026-09-12', href: '/news/a/', headline: long },
    { date: '2026-09-12', href: '/news/b/', headline: 'Second' },
  ] });
  assert.equal(item.href, '/news/a/');
  assert.ok(item.headline.length <= MAX_HEADLINE);
  assert.equal(item.fullHeadline, long);
});

test('selectLatest refuses non-live or malformed feeds (static fallback stays)', () => {
  assert.equal(selectLatest(null), null);
  assert.equal(selectLatest({ state: 'empty', cards: [{ date: '2026-09-12', href: '/news/a/', headline: 'A' }] }), null);
  assert.equal(selectLatest({ state: 'live', cards: 'nope' }), null);
  assert.equal(selectLatest({ state: 'live', cards: [{ href: '//x', headline: 'A' }] }), null);
});

test('browser mount swaps text only, via textContent/setAttribute, and marks the strip live', async () => {
  const attrs = new Map();
  const el = (name) => ({
    name,
    textContent: '',
    attributes: new Map(),
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; },
    set innerHTML(_) { throw new Error('innerHTML must never be used (Trusted Types)'); },
  });
  const link = el('link');
  const label = el('label');
  const headline = el('headline');
  const root = {
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, v),
    querySelector: (sel) => ({ '[data-desk-wire-link]': link, '[data-desk-wire-label]': label, '[data-desk-wire-headline]': headline })[sel] || null,
  };
  const requested = [];
  const sandbox = {
    window: {},
    document: { readyState: 'complete', querySelector: (sel) => (sel === '.site-header [data-desk-wire]' ? root : null) },
    fetch: (url) => {
      requested.push(url);
      const body = url === '/api/news-desk-freshness.json'
        ? { state: 'daily', cadenceLabel: 'Daily' }
        : { state: 'live', cards: [{ date: '2026-09-12', href: '/news/2026-09-12/a/', headline: 'The newest headline' }] };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    },
  };
  vm.runInNewContext(SOURCE, sandbox, { filename: 'desk-wire.js' });
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(requested.sort(), ['/api/news-desk-freshness.json', '/api/news-desk.json']);
  assert.equal(link.getAttribute('href'), '/news/2026-09-12/a/');
  assert.equal(headline.textContent, 'The newest headline');
  assert.equal(label.textContent, 'Live on The Desk');
  assert.equal(attrs.get('data-desk-wire-state'), 'live');
});

test('a periodic desk shows the headline but neither claims "Live" nor pulses', async () => {
  const attrs = new Map();
  const el = () => ({
    textContent: '',
    attributes: new Map(),
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; },
    set innerHTML(_) { throw new Error('innerHTML must never be used (Trusted Types)'); },
  });
  const link = el(); const label = el(); const headline = el();
  const root = {
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, v),
    querySelector: (sel) => ({ '[data-desk-wire-link]': link, '[data-desk-wire-label]': label, '[data-desk-wire-headline]': headline })[sel] || null,
  };
  const sandbox = {
    window: {},
    document: { readyState: 'complete', querySelector: () => root },
    fetch: (url) => Promise.resolve(url === '/api/news-desk-freshness.json'
      // The real feed on 2026-09-14: a 2026-09-12 edition, two days old.
      ? { ok: true, json: () => Promise.resolve({ state: 'periodic', cadenceLabel: 'Periodic', latestEditionDate: '2026-09-12', ageDays: 2 }) }
      : { ok: true, json: () => Promise.resolve({ state: 'live', cards: [{ date: '2026-09-12', href: '/news/2026-09-12/a/', headline: 'Two days old' }] }) }),
  };
  vm.runInNewContext(SOURCE, sandbox, { filename: 'desk-wire.js' });
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(headline.textContent, 'Two days old', 'the headline still ships');
  assert.equal(label.textContent, 'Latest · The Desk');
  assert.equal(attrs.get('data-desk-wire-state'), 'latest', 'only "live" pulses in CSS');
});

test('an unreadable freshness feed is not evidence of a daily desk', async () => {
  const attrs = new Map();
  const el = () => ({
    textContent: '',
    attributes: new Map(),
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; },
  });
  const link = el(); const label = el(); const headline = el();
  const root = {
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, v),
    querySelector: (sel) => ({ '[data-desk-wire-link]': link, '[data-desk-wire-label]': label, '[data-desk-wire-headline]': headline })[sel] || null,
  };
  const sandbox = {
    window: {},
    document: { readyState: 'complete', querySelector: () => root },
    fetch: (url) => (url === '/api/news-desk-freshness.json'
      ? Promise.reject(new Error('offline'))
      : Promise.resolve({ ok: true, json: () => Promise.resolve({ state: 'live', cards: [{ date: '2026-09-12', href: '/news/2026-09-12/a/', headline: 'Headline without cadence evidence' }] }) })),
  };
  vm.runInNewContext(SOURCE, sandbox, { filename: 'desk-wire.js' });
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(headline.textContent, 'Headline without cadence evidence');
  assert.equal(label.textContent, 'Latest · The Desk');
  assert.equal(attrs.get('data-desk-wire-state'), 'latest');
});

test('browser mount leaves the fallback untouched when the feed fails', async () => {
  const attrs = new Map();
  const untouched = { textContent: 'fallback', setAttribute() { throw new Error('must not write'); } };
  const root = {
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, v),
    querySelector: () => untouched,
  };
  const sandbox = {
    window: {},
    document: { readyState: 'complete', querySelector: () => root },
    fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve(null) }),
  };
  vm.runInNewContext(SOURCE, sandbox, { filename: 'desk-wire.js' });
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(untouched.textContent, 'fallback');
  assert.equal(attrs.has('data-desk-wire-state'), false);
});
