// S373: layout contract for the "More from The Desk" cards on a Desk article.
//
// Two defects were found by looking at rendered pixels during the S372 visual review:
//   - desktop: the "illustration pending" placeholder overflowed its fixed 1200/630
//     frame, so the last headline line was cut mid-glyph;
//   - mobile: the art was stretched to the card height and cover-cropped to a square,
//     cutting the caption that is baked into the banner.
// Neither is visible to a source check, so they are asserted in a real browser.
const { test, expect } = require('@playwright/test');

const ROUTE = '/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/';
// Layout states are explicit test fixtures, rendered by the production component.
// Daily related-story selection may legitimately contain only pending art.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let fixturePromise;
function layoutFixture() {
  return fixturePromise ||= (async () => {
    const root = path.resolve(__dirname, '..');
    const [{ EDITIONS }, { escapeNewsHtml }, { resolveStoryTime, deskTimeHtml }] = await Promise.all([
      import('../scripts/lib/news-desk.mjs'), import('../scripts/lib/news-html.mjs'), import('../scripts/lib/news-publish-time.mjs'),
    ]);
    const source = fs.readFileSync(path.join(root, 'scripts/generate-news-pages.mjs'), 'utf8');
    const exactBlock = (start, end) => {
      const first = source.indexOf(start), last = source.indexOf(end, first);
      if (first < 0 || last <= first || source.indexOf(start, first + start.length) >= 0) throw new Error('Native Desk component boundary changed; review the fixture extraction');
      return source.slice(first, last);
    };
    const day = JSON.parse(fs.readFileSync(path.join(root, 'data/news-desk/days/2026-10-06.json'), 'utf8'));
    const ready = day.stories.find(s => s.slug === 'anthropic-subscriptions-offer-5x-more-value-than-openai');
    if (ready?.visual?.pixelInspection?.kind !== 'source-raster') throw new Error('Committed ready-art fixture no longer has reviewed source raster');
    for (const suffix of ['--128.avif', '--640.avif', '--640.webp']) {
      if (!fs.existsSync(path.join(root, `assets/og/news/${day.date}--${ready.slug}--meme${suffix}`))) throw new Error('Committed responsive fixture asset missing: ' + suffix);
    }
    const pending = { ...ready, slug: 'test-layout-pending', headline: 'A deliberately long headline that needs more than two lines in a narrow card to prove nothing is cut off',
      visual: { generatedArt: false, pixelInspection: { kind: 'procedural-fallback' } } };
    const context = { days: [{ ...day, stories: [ready, pending] }], EDITIONS, escapeHtml: escapeNewsHtml,
      storyTimeHtml: (d, story) => deskTimeHtml(resolveStoryTime(d, story), { escape: escapeNewsHtml }) };
    // Execute only unchanged pure component declarations; never import/run the full publisher.
    vm.runInNewContext(exactBlock('function isFallbackArt(', 'function editorialImagePreload(') + '\n' +
      exactBlock('function moreFromDesk(', 'const heatBand =') + '\nglobalThis.renderFixture = moreFromDesk;', context, { timeout: 1000 });
    const html = context.renderFixture(day, { slug: 'test-layout-current' });
    if ((html.match(/<picture class="desk-more-art"/g) || []).length !== 1 || (html.match(/class="desk-more-art desk-art-pending"/g) || []).length !== 1) throw new Error('Native fixture must render one ready and one pending card');
    return html;
  })();
}

async function frames(page) {
  return page.evaluate(() => [...document.querySelectorAll('.desk-more-art')].map((el) => {
    const box = el.getBoundingClientRect();
    const headline = el.querySelector('.desk-art-pending-h');
    return {
      pending: el.classList.contains('desk-art-pending'),
      width: box.width,
      height: box.height,
      overflow: el.scrollHeight - el.clientHeight,
      headlineLines: headline ? Math.round(headline.getBoundingClientRect().height / parseFloat(getComputedStyle(headline).lineHeight)) : null,
    };
  }));
}

async function open(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.desk-more-grid .desk-more-art').first()).toBeAttached();
  // Replace only this component in the private browser DOM, retaining actual page CSS.
  await page.locator('section.desk-more').evaluate((section, html) => { section.outerHTML = html; }, await layoutFixture());
  await expect(page.locator('.desk-more-art.desk-art-pending')).toHaveCount(1);
  await expect(page.locator('picture.desk-more-art')).toHaveCount(1);
  await page.locator('section.desk-more').scrollIntoViewIfNeeded();
}

test('desktop cards: art and the pending placeholder both fit their frame', async ({ page }) => {
  for (const width of [1366, 900]) {
    await open(page, { width, height: 900 });
    const all = await frames(page);
    expect(all.length, `cards at ${width}px`).toBeGreaterThanOrEqual(2);
    for (const frame of all) expect(frame.overflow, `frame overflow at ${width}px`).toBeLessThanOrEqual(0);
    const pending = all.find((frame) => frame.pending);
    expect(pending.headlineLines, `placeholder headline lines at ${width}px`).toBeLessThanOrEqual(2);
  }
});

test('mobile cards: art is a whole 16:9 thumbnail, not a cover-cropped square', async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  const all = await frames(page);
  const art = all.filter((frame) => !frame.pending);
  expect(art.length).toBeGreaterThanOrEqual(1);
  for (const frame of art) {
    expect(frame.width / frame.height, 'thumbnail aspect ratio').toBeGreaterThan(1.7);
    expect(frame.width / frame.height, 'thumbnail aspect ratio').toBeLessThan(2.1);
  }
  const pending = all.find((frame) => frame.pending);
  expect(pending.overflow).toBeLessThanOrEqual(0);
  expect(pending.headlineLines).toBeLessThanOrEqual(3);
});

test('cards request sized art: 128 and 640 AVIF candidates, never the 1200px original', async ({ page }) => {
  await open(page, { width: 1366, height: 900 });
  const sources = await page.evaluate(() => [...document.querySelectorAll('.desk-more-art')].filter((el) => el.tagName === 'PICTURE').map((picture) => ({
    avif: picture.querySelector('source[type="image/avif"]')?.getAttribute('srcset') || '',
    img: picture.querySelector('img')?.getAttribute('src') || '',
  })));
  expect(sources.length).toBeGreaterThanOrEqual(1);
  // The native ready branch must load a real responsive image, not merely emit markup.
  await expect.poll(() => page.locator('picture.desk-more-art img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  for (const source of sources) {
    expect(source.avif).toMatch(/--meme--128\.avif 128w, .*--meme--640\.avif 640w/);
    expect(source.img).toMatch(/--meme--640\.webp$/);
  }
});
