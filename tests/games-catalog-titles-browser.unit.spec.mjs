import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchBrowser, openFixture } from './fixtures/browser-harness.mjs';
let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => browser?.close());
for (const width of [1366, 390]) {
  for (const theme of ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast']) {
    test(`Games cover titles remain visible with real styles at ${width}px in ${theme}`, async () => {
      const fixture = await openFixture(browser, {
        contextOptions: { viewport: { width, height: 900 } },
        pages: { '/games/': fs.readFileSync('games/index.html', 'utf8') },
        initScripts: [{ fn: value => { localStorage.setItem('vs_theme', value); localStorage.setItem('vs_cookie_consent', 'declined'); }, arg: theme }],
      });
      try {
        await fixture.goto('/games/');
        await fixture.page.evaluate(() => document.fonts.ready);
        assert.deepEqual(await fixture.page.locator('link[rel=stylesheet]').evaluateAll(nodes => nodes.filter(n => !n.sheet).map(n => n.href)), []);
        const headings = await fixture.page.locator('.game-card-hero h2,.card-hero h3').evaluateAll(nodes => nodes.map(node => {
          const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
          return { text: node.textContent.trim(), width: rect.width, height: rect.height, clip: style.clip, color: style.color };
        }));
        assert.equal(headings.length, 10);
        for (const heading of headings) {
          assert.ok(heading.text && heading.width > 20 && heading.height > 15, JSON.stringify(heading));
          assert.equal(heading.clip, 'auto', heading.text);
        }
        assert.equal(await fixture.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.deepEqual(fixture.log.requests.filter(request => request.method !== 'GET'), []);
        console.log(JSON.stringify({ width, theme, titleColors: [...new Set(headings.map(h => h.color))] }));
      } finally {
        await fixture.close();
      }
    });
  }
}
