import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html } from './fixtures/browser-harness.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });
const document = html({
  head: '<meta name="vs:last-touched" content="2026-11-06"><style>html{scroll-behavior:auto}body{margin:0;min-height:2600px}.site-header{position:fixed;top:0;left:0;right:0;height:78px;background:#111;z-index:201}main{padding-top:1200px}#reaction{display:block;width:100%;height:64px}</style>',
  body: '<header class="site-header"><button>Menu</button></header><main><button id="reaction">React to the illustration</button></main><script src="/assets/page-sigil.js"></script>',
});

test('freshness link stays available at the entrance and never intercepts scrolled controls', async () => {
  for (const width of [390, 1366]) {
    const f = await openFixture(browser, { pages: { '/news/sigil/': document }, contextOptions: { viewport: { width, height: 844 } } });
    try {
      await f.goto('/news/sigil/');
      const sigil = f.page.locator('[data-vs-page-sigil]');
      await sigil.waitFor({ state: 'visible' });
      const entrance = await sigil.boundingBox();
      assert.ok(entrance.width >= 44 && entrance.height >= 44);
      assert.ok(entrance.y >= 78, 'metadata link must clear the actual header');
      assert.equal(await sigil.getAttribute('href'), '/studio-pulse/');
      await f.page.evaluate(top => {
        window.__reactionClicks = 0;
        document.getElementById('reaction').addEventListener('click', () => window.__reactionClicks++);
        scrollTo(0, document.getElementById('reaction').offsetTop - top);
      }, entrance.y);
      await f.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await sigil.isVisible(), false, 'a floating metadata hit target must leave the reading viewport');
      await f.page.setViewportSize({ width: width + 20, height: 844 });
      await f.page.waitForTimeout(160);
      assert.equal(await sigil.isVisible(), false, 'scrolled resize must not restore interception');
      await f.page.locator('#reaction').click({ position: { x: width - 30, y: 20 } });
      assert.equal(await f.page.evaluate(() => window.__reactionClicks), 1);
      assert.equal(new URL(f.page.url()).pathname, '/news/sigil/');
      await f.page.evaluate(() => scrollTo(0, 0));
      await sigil.waitFor({ state: 'visible' });
      assert.ok((await sigil.boundingBox()).y >= 78);
      assert.deepEqual(f.log.errors, []);
    } finally { await f.close(); }
  }
});
