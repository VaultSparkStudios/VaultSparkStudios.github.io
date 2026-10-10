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
// The generator's exact placeholder markup (pendingArt in scripts/generate-news-pages.mjs).
const PENDING = '<span class="desk-more-art desk-art-pending" aria-hidden="true"><span class="desk-art-pending-k">The Desk · illustration pending</span><span class="desk-art-pending-h">A deliberately long headline that needs more than two lines in a narrow card to prove nothing is cut off</span></span>';

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

async function open(page, viewport, { withPlaceholder }) {
  await page.setViewportSize(viewport);
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.desk-more-grid .desk-more-art').first()).toBeAttached();
  if (withPlaceholder) {
    await page.evaluate((html) => { document.querySelector('.desk-more-grid li:nth-child(2) .desk-more-art').outerHTML = html; }, PENDING);
  }
  await page.locator('section.desk-more').scrollIntoViewIfNeeded();
}

test('desktop cards: art and the pending placeholder both fit their frame', async ({ page }) => {
  for (const width of [1366, 900]) {
    await open(page, { width, height: 900 }, { withPlaceholder: true });
    const all = await frames(page);
    expect(all.length, `cards at ${width}px`).toBeGreaterThanOrEqual(2);
    for (const frame of all) expect(frame.overflow, `frame overflow at ${width}px`).toBeLessThanOrEqual(0);
    const pending = all.find((frame) => frame.pending);
    expect(pending.headlineLines, `placeholder headline lines at ${width}px`).toBeLessThanOrEqual(2);
  }
});

test('mobile cards: art is a whole 16:9 thumbnail, not a cover-cropped square', async ({ page }) => {
  await open(page, { width: 390, height: 844 }, { withPlaceholder: true });
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
  await open(page, { width: 1366, height: 900 }, { withPlaceholder: false });
  const sources = await page.evaluate(() => [...document.querySelectorAll('.desk-more-art')].filter((el) => el.tagName === 'PICTURE').map((picture) => ({
    avif: picture.querySelector('source[type="image/avif"]')?.getAttribute('srcset') || '',
    img: picture.querySelector('img')?.getAttribute('src') || '',
  })));
  expect(sources.length).toBeGreaterThanOrEqual(1);
  for (const source of sources) {
    expect(source.avif).toMatch(/--meme--128\.avif 128w, .*--meme--640\.avif 640w/);
    expect(source.img).toMatch(/--meme--640\.webp$/);
  }
});
