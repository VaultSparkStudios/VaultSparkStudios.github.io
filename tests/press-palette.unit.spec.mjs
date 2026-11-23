import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchBrowser, openFixture, waitFor } from './fixtures/browser-harness.mjs';

const canonical = fs.readFileSync('press/index.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('brand/assets.json', 'utf8'));
const themes = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function fixture(run, { theme = 'dark', width = 1366, data = manifest } = {}) {
  const f = await openFixture(browser, {
    pages: { '/press/': canonical },
    contextOptions: { viewport: { width, height: 900 }, reducedMotion: 'reduce' },
    handlers: [{ match: u => u.pathname === '/brand/assets.json', handle: route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }) }],
    initScripts: [{ fn: ({ theme }) => {
      localStorage.setItem('vs_theme', theme);
      window.__paletteCopies = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__paletteCopies.push(text); } } });
    }, arg: { theme } }],
  });
  try { await f.goto('/press/'); await waitFor(() => f.page.locator('#palette-grid .swatch').count().then(n => n === Object.values(data.colors).filter(v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)).length));await run(f); } finally { await f.close(); }
}

test('canonical Press page renders all six actual brand colors in every theme and desktop/mobile viewport', async () => {
  assert.equal(Object.keys(manifest.colors).length, 6);
  for (const theme of themes) for (const width of [1366, 390]) {
    await fixture(async f => {
      await waitFor(() => f.page.getAttribute('html', 'data-theme').then(v => v === theme));
      const actual = await f.page.locator('#palette-grid .swatch').evaluateAll(nodes => nodes.map(node => {
        const color = node.querySelector('.swatch-chip'), box = color.getBoundingClientRect();
        return { name: node.querySelector('.swatch-name').textContent, hex: node.querySelector('.swatch-hex').textContent, copy: node.dataset.copy, background: getComputedStyle(color).backgroundColor, width: box.width, height: box.height, role: node.getAttribute('role'), tabindex: node.tabIndex };
      }));
      assert.deepEqual(actual.map(({ name, hex, copy, background }) => ({ name, hex, copy, background })), Object.entries(manifest.colors).map(([name, hex]) => ({ name, hex, copy: hex, background: rgb(hex) })), `${theme}/${width}`);
      for (const color of actual) { assert.ok(color.width > 100 && color.height > 40);assert.equal(color.role, 'button');assert.equal(color.tabindex, 0); }
      assert.equal(await f.page.locator('#palette-grid [class*="vsx-"]').count(), 0);
      assert.ok(f.log.requests.every(r => r.method === 'GET'), 'No submission/provider mutations requested');
      if (process.env.VS_PRESS_PALETTE_CAPTURE === '1') {
        const dir = '.cache/logs/S418-press-palette/after-stable';fs.mkdirSync(dir, { recursive: true });
        // Diagnostic-only behavior override: smooth scroll can move the page
        // between locator geometry and screenshot, producing the wrong crop.
        await f.page.addStyleTag({ content: 'html,body{scroll-behavior:auto!important}' });
        await f.page.evaluate(async () => {
          await document.fonts.ready;
          window.scrollTo({ top: window.scrollY + document.getElementById('palette-grid').getBoundingClientRect().top - 150, behavior: 'instant' });
        });
        let prior = '', stable = 0;
        await waitFor(async () => {
          const box = await f.page.locator('#palette-grid').boundingBox();
          const next = JSON.stringify(box);
          stable = next === prior && box?.y >= 100 && box.y + box.height <= 900 ? stable + 1 : 0;
          prior = next;return stable >= 4;
        }, { interval: 100, timeout: 5000, message: 'stable palette screenshot bounds' });
        await f.page.locator('#palette-grid').screenshot({ path: `${dir}/${theme}--${width}.png`, animations: 'disabled' });
      }
    }, { theme, width });
  }
});

test('click and keyboard copy send the actual hex value and show the copy receipt', async () => {
  await fixture(async f => {
    for (const [i, hex] of Object.values(manifest.colors).entries()) {
      await f.page.locator('#palette-grid .swatch').nth(i).click();
      await waitFor(() => f.page.evaluate(() => window.__paletteCopies.length).then(n => n === i + 1));
      assert.equal(await f.page.locator('#toast').textContent(), 'Copied · ' + hex);
    }
    const first = f.page.locator('#palette-grid .swatch').first();await first.focus();await first.press('Enter');await first.press(' ');
    await waitFor(() => f.page.evaluate(() => window.__paletteCopies.length).then(n => n === 8));
    assert.deepEqual(await f.page.evaluate(() => window.__paletteCopies), [...Object.values(manifest.colors), manifest.colors.gold, manifest.colors.gold]);
  });
});

test('palette refuses invalid CSS colors and displays source names as text', async () => {
  const label = '<img src=x onerror="window.__paletteInjected=true">';
  await fixture(async f => {
    assert.equal(await f.page.locator('#palette-grid .swatch').count(), 1);
    assert.equal(await f.page.locator('#palette-grid .swatch-name').textContent(), label);
    assert.equal(await f.page.locator('#palette-grid img').count(), 0);
    assert.equal(await f.page.evaluate(() => window.__paletteInjected), undefined);
    assert.equal(await f.page.locator('#palette-grid .swatch-chip').evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(18, 52, 86)');
  }, { data: { ...manifest, colors: { [label]: '#123456', missingHash: '123456', declaration: '#123456;background:red', url: 'url(https://unowned.invalid/image)', valueObject: { hex: '#123456' } } } });
});
