import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { renderSvg, STATUS_COLORS, THEMES } from '../scripts/lib/og-template.mjs';
import previewWorker from '../cloudflare/og-image-worker.js';

test('preview deployment bypasses old URL-cache entries and HEAD cannot poison the GET body', async () => {
  const previous = globalThis.caches;
  const url = 'https://preview.example.test/_og/?title=November&theme=light';
  const entries = new Map([[url, new Response('old cached SVG')]]);
  const pending = [];
  const reads = [];
  globalThis.caches = { default: {
    async match(request) { reads.push(request.url); return entries.get(request.url)?.clone(); },
    async put(request, response) { assert.equal(request.method, 'GET'); entries.set(request.url, response); },
  } };
  const ctx = { waitUntil(promise) { pending.push(promise); } };
  try {
    const expected = renderSvg({ title: 'November', eyebrow: 'Vault · Sparked', theme: 'light', status: 'sparked' });
    const head = await previewWorker.fetch(new Request(url, { method: 'HEAD' }), {}, ctx);
    await Promise.all(pending);
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const get = await previewWorker.fetch(new Request(url), {}, ctx);
    assert.equal(await get.text(), expected);
    assert.ok(reads.every(key => key !== url && /__vs_og_render=[a-f0-9]{64}/.test(key)));
    assert.equal(reads[0], reads[1], 'HEAD and GET share the same rendered representation');
    assert.equal(await entries.get(url).text(), 'old cached SVG', 'Old cache is preserved but cannot shadow the new template');
    const rejected = await previewWorker.fetch(new Request(url, { method: 'POST' }), {}, ctx);
    assert.equal(rejected.status, 405);
  } finally {
    if (previous === undefined) delete globalThis.caches;
    else globalThis.caches = previous;
  }
});

test('actual SVG glyphs fit every status badge and leave a footer wordmark gap in both themes', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    for (const theme of Object.keys(THEMES)) for (const status of Object.keys(STATUS_COLORS)) {
      const svgText = renderSvg({ title: 'November 2026 · The Desk archive', eyebrow: 'VaultSpark Studios', status, theme });
      await page.setContent(svgText);
      await page.evaluate(() => document.fonts.ready);
      const bounds = await page.evaluate(() => {
        const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; };
        const svg = document.querySelector('svg');
        const words = [...svg.querySelectorAll(':scope > text')];
        return {
          badge: box(svg.querySelector('g rect')),
          label: box(svg.querySelector('g text')),
          ink: svg.querySelector('g text').getAttribute('fill'),
          first: box(words.find(n => n.textContent === 'VAULTSPARK')),
          second: box(words.find(n => n.textContent === 'STUDIOS')),
        };
      });
      assert.ok(bounds.label.left >= bounds.badge.left + 32, `${theme}/${status}: label clears dot`);
      assert.ok(bounds.label.right <= bounds.badge.right - 8, `${theme}/${status}: label fits badge ${JSON.stringify(bounds)}`);
      assert.ok(bounds.second.left >= bounds.first.right + 12, `${theme}/${status}: wordmark gap ${JSON.stringify(bounds)}`);
      // Sample actual rasterized badge backgrounds, away from text/dot/stroke.
      // This catches the pale dark-theme ink previously reused on light cards.
      const { data, info } = await sharp(Buffer.from(svgText)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const ink = bounds.ink.slice(1).match(/../g).map(v => parseInt(v, 16));
      for (const x of [125, 160, 190]) {
        const at = (148 * info.width + x) * info.channels;
        const a = luminance(ink), b = luminance([...data.subarray(at, at + 3)]);
        assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${theme}/${status}: badge text contrast`);
      }
    }
  } finally {
    await browser.close();
  }
});
