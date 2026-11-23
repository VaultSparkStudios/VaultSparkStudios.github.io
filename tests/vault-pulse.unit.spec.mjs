// contract-files: assets/vault-pulse.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '@playwright/test';

test('live activity stays still while being read and continues rotating offscreen', async () => {
  const source = fs.readFileSync(new URL('../assets/vault-pulse.js', import.meta.url), 'utf8');
  const marker = '    function schedule() {';
  assert.ok(source.includes(marker), 'fixture must expose the actual rotation function');
  const browser = await chromium.launch();
  try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.setContent('<style>body{margin:0;font:16px/1.55 Arial}section{padding:20px}.spacer{height:1400px}</style><div class="spacer"></div><section><div data-vault-pulse></div></section><div class="spacer"></div>');
        await page.evaluate(() => {
          window.VSPublic = { from: () => ({
            select() { return this; }, order() { return this; }, limit() { return this; },
            get() { return Promise.resolve({ data: Array.from({ length: 12 }, (_, i) => ({
              created_at: new Date(Date.now() - i * 100000).toISOString(),
              played_at: new Date(Date.now() - i * 100000).toISOString(), game_slug: 'solara',
            })) }); },
          }) };
        });
        // The fixture exposes the existing function without replacing its
        // implementation, animation rules, geometry or browser scroll anchoring.
        await page.addScriptTag({ content: source.replace(marker, '    window.__rotateFixture = rotateNext;\n' + marker) });
        await page.waitForFunction(() => document.querySelectorAll('.vp-row').length === 6);
        await page.waitForTimeout(450);
        await page.evaluate(() => scrollTo(0, document.querySelector('.vp-ticker').getBoundingClientRect().top + scrollY + 50));
        await page.waitForTimeout(100);
        const state = () => page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight,
          rows: [...document.querySelectorAll('.vp-row')].map(row => row.textContent) }));
        const before = await state();
        await page.evaluate(() => window.__rotateFixture());
        await page.waitForTimeout(100);
        assert.deepEqual(await state(), before, 'visible activity must not move the reading position or replace rows');
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(100);
        const offscreen = await state();
        await page.evaluate(() => window.__rotateFixture());
        await page.waitForTimeout(450);
        const rotated = await state();
        assert.notDeepEqual(rotated.rows, offscreen.rows, 'offscreen rotation must still show real pool events');
        assert.equal(rotated.rows.length, 6);
        assert.equal(rotated.y, 0);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
});
