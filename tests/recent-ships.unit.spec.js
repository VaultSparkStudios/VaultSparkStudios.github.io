import test from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, waitFor } from './fixtures/browser-harness.mjs';

for (const timing of ['early', 'late']) {
  test(`Recent Ships renders once when loaded ${timing}`, async () => {
    const browser = await launchBrowser();
    const fixture = await openFixture(browser, {
      pages: { '/': html({ head: timing === 'early' ? '<script defer src="/assets/recent-ships.js"></script>' : '', body: '<div data-recent-ships></div>' }) },
      initScripts: [() => { window.__reads = 0; window.VSPublicIntel = { get() { window.__reads++; return Promise.resolve({ consumerChangelog: [{ date: '2026-10-12', title: 'Reader controls', highlights: ['Reactions work after a jump.'] }] }); } }; }],
    });
    try {
      await fixture.goto('/');
      if (timing === 'late') await fixture.page.addScriptTag({ url: '/assets/recent-ships.js' });
      await waitFor(async () => await fixture.page.locator('.recent-ship-card').count() === 1);
      await fixture.page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));
      assert.equal(await fixture.page.evaluate(() => window.__reads), 1);
      assert.equal(await fixture.page.locator('.recent-ship-title').textContent(), 'Reader controls');
      assert.deepEqual(fixture.log.errors, []);
    } finally { await fixture.close(); await browser.close(); }
  });
}
test('Late-loaded Recent Ships falls back to the changelog, then honest unavailable copy', async () => {
  const browser = await launchBrowser();
  for (const available of [true, false]) {
    const fixture = await openFixture(browser, {
      pages: { '/': html({ body: '<div data-recent-ships></div>' }), ...(available ? { '/changelog/': '<div class="cl-phase"><span class="cl-phase-date">October 2026</span><h2 class="cl-phase-title">A real release</h2><ul class="cl-items"><li>Verified change</li></ul></div>' } : {}) },
    });
    try {
      await fixture.goto('/'); await fixture.page.addScriptTag({ url: '/assets/recent-ships.js' });
      await waitFor(async () => await fixture.page.locator('.recent-ship-card').count() === 1);
      assert.equal(await fixture.page.locator('.recent-ship-title').textContent(), available ? 'A real release' : 'The studio is shipping');
      assert.deepEqual(fixture.log.errors, []);
    } finally { await fixture.close(); }
  }
  await browser.close();
});
