// contract-files: assets/vault-oracle.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const source = fs.readFileSync(new URL('../assets/vault-oracle.js', import.meta.url), 'utf8');
const endpoint = source.match(/var FN_URL = '([^']+)'/)[1];
const answer = text => `data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`;
const tail = 'event: vs-ignis-tail\ndata: {"suggestions":[],"meter":{"pct_of_cap":12}}\n\n';
const jsonReply = { reply: 'Fallback answer', suggestions: [] };
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function withOracle(responses, inspect, script = source, { light = false } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const unexpected = [], pageErrors = [];
  // No request is allowed to reach auth, inference, DNS or another service.
  await context.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().url() === 'http://oracle-stream.test/games/') {
      const css = light ? '<style>' + fs.readFileSync(new URL('../assets/style.css', import.meta.url), 'utf8') + '</style>' : '';
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html' + (light ? ' class="light-mode" data-theme="light"' : '') + '><head>'
        + '<title>Games fixture</title>' + css + '</head><body' + (light ? ' class="light-mode" data-theme="light"' : '') + '><h1>Current games</h1><div data-vault-oracle></div></body></html>' });
    }
    unexpected.push(route.request().url());
    return route.abort();
  });
  await context.addInitScript(({ endpoint, responses }) => {
    const nativeFetch = window.fetch.bind(window);
    window.requests = [];
    window.analytics = [];
    window.gtag = (...args) => window.analytics.push(args);
    window.VSSupabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-token' } } }) } };
    window.VSSignedInState = { isResolved: () => true, getSession: () => ({ tier: 'sparked' }) };
    window.fetch = async (url, options) => {
      if (url === '/api/oracle-queries.json') return new Response(JSON.stringify({ sparked: [] }), { headers: { 'Content-Type': 'application/json' } });
      if (url !== endpoint) return nativeFetch(url, options);
      const payload = JSON.parse(options.body);
      if (payload.probe) return new Response(JSON.stringify({ access: {
        authenticated: true, unlimited: false, monthlyRemaining: 40, monthlyLimit: 40, monthlyUsed: 0,
      } }), { headers: { 'Content-Type': 'application/json' } });
      window.requests.push({ payload, headers: options.headers });
      const spec = responses[window.requests.length - 1];
      if (!spec) throw new Error('Unexpected fixture request');
      if (spec.reject) throw new Error(spec.reject);
      const isJson = Object.hasOwn(spec, 'json');
      const headers = { 'Content-Type': spec.contentType || (isJson ? 'application/json' : 'text/event-stream') };
      if (isJson) return new Response(JSON.stringify(spec.json), { status: spec.status || 200, headers });
      const bytes = new TextEncoder().encode(spec.body || '');
      const stream = new ReadableStream({ start(controller) {
        const size = spec.chunkBytes || Math.max(1, bytes.length);
        for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
        controller.close();
      } });
      return new Response(stream, { status: spec.status || 200, headers });
    };
  }, { endpoint, responses });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto('http://oracle-stream.test/games/');
    await page.addScriptTag({ content: script });
    const input = page.getByRole('textbox', { name: 'Your question for IGNIS' });
    await input.waitFor();
    const submit = async (question = 'Which game should I explore?') => {
      await input.fill(question);
      await page.getByRole('button', { name: 'Ask', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('.vs-oracle__send').disabled);
    };
    await inspect(page, submit);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(unexpected, []);
  } finally { await context.close(); }
}

test('cached JSON returned to a streaming request is used once with access, suggestions and cache analytics intact', async () => {
  const envelope = { reply: 'Cached studio answer', model: 'fixture-haiku', cached: false, semanticCache: true,
    suggestions: [{ label: 'Browse games', href: '/games/' }], meter: { pct_of_cap: 12 },
    access: { authenticated: true, unlimited: false, monthlyRemaining: 39, monthlyLimit: 40, monthlyUsed: 1 } };
  await withOracle([{ json: envelope, contentType: 'application/json; charset=utf-8' }], async (page, submit) => {
    await submit();
    assert.equal(await page.locator('.vs-oracle__msg--ignis').last().textContent(), envelope.reply);
    assert.match(await page.locator('.vs-oracle__hint').last().textContent(), /39 left.*1\/40/);
    assert.equal(await page.getByRole('link', { name: 'Browse games' }).getAttribute('href'), '/games/');
    const { requests, analytics } = await page.evaluate(() => ({ requests, analytics }));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].payload.stream, true);
    assert.equal(analytics.length, 1);
    assert.equal(analytics[0][2].semantic_cache, 1);
    assert.equal(analytics[0][2].streamed, 0);
  });
});

test('complete SSE with CRLF and one-byte UTF-8 chunks preserves the rendered answer and records one stream success', async () => {
  const text = 'Explore the vault ⚡';
  await withOracle([{ body: (answer(text) + tail).replaceAll('\n', '\r\n'), chunkBytes: 1 }], async (page, submit) => {
    await submit();
    assert.equal(await page.locator('.vs-oracle__msg--ignis').last().textContent(), text);
    const { requests, analytics } = await page.evaluate(() => ({ requests, analytics }));
    assert.equal(requests.length, 1);
    assert.equal(analytics[0][2].streamed, 1);
  });
});

for (const [name, body] of [
  ['empty stream', ''],
  ['answer cut off before service tail', answer('Unfinished answer')],
  ['provider DONE without service completion', answer('Unfinished answer') + 'data: [DONE]\n\n'],
  ['tail without answer', tail],
  ['whitespace answer', answer('   ') + tail],
  ['malformed terminal event', answer('Unfinished answer') + 'event: vs-ignis-tail\ndata: []\n\n'],
  ['unterminated terminal event', answer('Unfinished answer') + tail.trimEnd()],
]) {
  test(`${name} uses the existing non-stream fallback without recording partial success`, async () => {
    await withOracle([{ body }, { json: jsonReply }], async (page, submit) => {
      await submit();
      assert.equal(await page.locator('.vs-oracle__msg--ignis').last().textContent(), jsonReply.reply);
      assert.doesNotMatch(await page.locator('.vs-oracle__log').textContent(), /\(no reply\)/);
      const { requests, analytics } = await page.evaluate(() => ({ requests, analytics }));
      assert.equal(requests.length, 2);
      assert.equal(requests[0].payload.stream, true);
      assert.equal(requests[1].payload.stream, undefined);
      assert.equal(requests[1].payload.message, requests[0].payload.message);
      assert.equal(requests[1].payload.context, requests[0].payload.context);
      assert.equal(requests[1].headers.Authorization, requests[0].headers.Authorization);
      assert.equal(analytics.length, 1);
      assert.equal(analytics[0][2].streamed, 0);
    });
  });
}

test('failed stream and failed fallback show an error and do not add success analytics or failed assistant history', async () => {
  await withOracle([{ body: answer('Unfinished answer') },
    { status: 503, json: { error: 'Fixture unavailable', code: 'upstream_unavailable' } },
    { json: { reply: 'Fresh answer', suggestions: [] } }], async (page, submit) => {
    await submit('First question');
    assert.equal(await page.locator('.vs-oracle__msg--err').count(), 1);
    assert.equal(await page.locator('.vs-oracle__msg--ignis').filter({ hasText: 'Unfinished answer' }).count(), 0);
    assert.equal(await page.evaluate(() => analytics.length), 0);
    await submit('Second question');
    const { requests, analytics } = await page.evaluate(() => ({ requests, analytics }));
    assert.equal(requests.length, 3);
    assert.equal(requests[2].payload.history, undefined);
    assert.equal(analytics.length, 1);
    assert.equal(await page.locator('.vs-oracle__msg--ignis').last().textContent(), 'Fresh answer');
  });
});

test('membership error envelopes retain the existing fallback, access message and sign-in link', async () => {
  const response = { status: 403, json: { error: 'Membership required', code: 'membership_required', access: { authenticated: false } } };
  await withOracle([response, response], async (page, submit) => {
    await submit();
    assert.match(await page.locator('.vs-oracle__msg--err').textContent(), /VaultSparked members/);
    assert.equal(await page.getByRole('link', { name: 'Sign In →' }).getAttribute('href'), '/vault-member/#login');
    assert.equal(await page.evaluate(() => requests.length), 2);
    assert.equal(await page.evaluate(() => analytics.length), 0);
  });
});

for (const [name, response] of [
  ['missing reply', { json: {} }],
  ['null envelope', { json: null }],
  ['empty reply', { json: { reply: '' } }],
  ['whitespace reply', { json: { reply: ' \t\n ' } }],
  ['nonstring reply', { json: { reply: 42 } }],
  ['malformed JSON', { body: '{"reply":', contentType: 'application/json' }],
]) {
  test(`HTTP200 ${name} uses fallback and records only its valid answer`, async () => {
    await withOracle([response, { json: jsonReply }], async (page, submit) => {
      await submit();
      assert.equal(await page.locator('.vs-oracle__msg--ignis').last().textContent(), jsonReply.reply);
      assert.doesNotMatch(await page.locator('.vs-oracle__log').textContent(), /\(no reply\)/);
      const { requests, analytics } = await page.evaluate(() => ({ requests, analytics }));
      assert.equal(requests.length, 2);
      assert.equal(requests[1].payload.stream, undefined);
      assert.equal(analytics.length, 1);
      assert.equal(analytics[0][2].streamed, 0);
    });
  });
}

test('empty nonstream fallback shows an honest error without success analytics or failed history', async () => {
  await withOracle([{ body: '' }, { json: { reply: '  ' } },
    { json: { reply: 'Next valid answer', suggestions: [] } }], async (page, submit) => {
    await submit('First question');
    assert.match(await page.locator('.vs-oracle__msg--err').textContent(), /empty answer/);
    assert.equal(await page.evaluate(() => analytics.length), 0);
    assert.doesNotMatch(await page.locator('.vs-oracle__log').textContent(), /\(no reply\)/);
    await submit('Second question');
    const { requests, analytics } = await page.evaluate(() => ({ requests, analytics }));
    assert.equal(requests.length, 3);
    assert.equal(requests[2].payload.history, undefined);
    assert.equal(analytics.length, 1);
  });
});

test('regression witness detects the original empty-EOF success and JSON-cache decoding failure', async () => {
  const jsonStart = source.indexOf("      if (contentType === 'application/json'");
  const jsonEnd = source.indexOf("      if (contentType !== 'text/event-stream')", jsonStart);
  assert.ok(jsonStart > 0 && jsonEnd > jsonStart, 'actual current JSON branch located');
  const successGuard = "        if (!body || typeof body.reply !== 'string' || !body.reply.trim()) {\n"
    + "          throw new Error('IGNIS returned an empty answer. Please try again.');\n        }";
  // Fixture-only removal reconstructs the original defects. Production source
  // remains untouched; the same actual mounted-widget assertions observe them.
  const old = (source.slice(0, jsonStart) + source.slice(jsonEnd))
    .replace("if (contentType !== 'text/event-stream') throw new Error('IGNIS returned an unreadable response.');", '')
    .replace("if (!assembled.trim() || !tail) throw new Error('IGNIS stream ended before the answer was complete.');", '')
    .replace(successGuard, '');
  assert.notEqual(old, source);
  assert.ok(!old.includes(successGuard), 'mounted-success guard removed only in fixture mutation');
  for (const response of [{ body: '' }, { json: { reply: 'Cached answer' } }]) {
    await withOracle([response], async (page, submit) => {
      await submit();
      assert.equal(await page.locator('.vs-oracle__msg--ignis').last().textContent(), '(no reply)');
      assert.equal(await page.evaluate(() => analytics.length), 1);
    }, old);
  }
});

test('light-theme fallback error has at least 4.5:1 computed contrast over its actual translucent ancestors', async () => {
  async function contrastFor(script) {
    let result;
    await withOracle([{ body: '' }, { status: 503, json: { error: 'Fixture unavailable' } }], async (page, submit) => {
      await submit();
      result = await page.locator('.vs-oracle__msg--err').evaluate(error => {
        const rgba = value => { const values = value.match(/[\d.]+/g).map(Number);return { rgb: values.slice(0, 3), a: values[3] ?? 1 }; };
        const blend = (front, back) => front.rgb.map((channel, i) => channel * front.a + back[i] * (1 - front.a));
        const luminance = rgb => rgb.map(channel => { const s = channel / 255;return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
        const chain = [];for (let el = error; el; el = el.parentElement) chain.unshift(el);
        // Bound every possible underlying gradient pixel by black and white.
        // The actual near-opaque Oracle panel then narrows that bound; this is
        // conservative and does not substitute white for a translucent surface.
        let low = [0, 0, 0], high = [255, 255, 255];
        const backgrounds = [];
        for (const el of chain) {
          const style = getComputedStyle(el), color = rgba(style.backgroundColor);
          low = blend(color, low);high = blend(color, high);
          if (style.backgroundImage !== 'none') { low = [0, 0, 0];high = [255, 255, 255]; }
          backgrounds.push({ element: el.className || el.tagName, color: style.backgroundColor, image: style.backgroundImage });
        }
        const foreground = rgba(getComputedStyle(error).color);
        const fgLow = luminance(blend(foreground, low)), fgHigh = luminance(blend(foreground, high));
        const bgLow = luminance(low), bgHigh = luminance(high);
        const minimum = bgLow > fgHigh ? (bgLow + 0.05) / (fgHigh + 0.05)
          : fgLow > bgHigh ? (fgLow + 0.05) / (bgHigh + 0.05) : 1;
        return { minimum, foreground: getComputedStyle(error).color, backgrounds, low, high };
      });
    }, script, { light: true });
    return result;
  }
  const actual = await contrastFor(source);
  assert.ok(actual.minimum >= 4.5, JSON.stringify(actual));
  const beforeFix = source.replace("    'body.light-mode .vs-oracle__msg--err{color:#8b1e2d;}',\n", '');
  assert.notEqual(beforeFix, source, 'actual light error repair located for negative fixture');
  const negative = await contrastFor(beforeFix);
  assert.ok(negative.minimum < 4.5, 'removing the light-theme error repair must fail contrast');
});
