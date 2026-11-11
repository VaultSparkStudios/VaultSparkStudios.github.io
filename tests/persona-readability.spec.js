const { test, expect } = require('@playwright/test');
const sharp = require('sharp');

const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

for (const theme of ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast']) {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    test(`editorial roster labels meet AA in ${theme} at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(theme => { localStorage.setItem('vs_theme', theme); localStorage.setItem('vs_cookie_consent', 'declined'); }, theme);
      await page.goto('/news/', { waitUntil: 'load' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.evaluate(() => document.fonts.ready);
      const cards = page.locator('.desk-cast > article,.desk-roles > .desk-role-card');
      expect(await cards.count()).toBeGreaterThan(0);
      const measurements = [];
      for (let i = 0; i < await cards.count(); i++) {
        const card = cards.nth(i);
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        // Measure the panel's own background, keeping fixed chrome at the
        // document origin rather than compositing it over the sampled label.
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await page.waitForFunction(() => window.scrollY === 0 && window.scrollX === 0);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
        const unmasked = await page.screenshot({ fullPage: true, clip, animations: 'disabled' });
        const labels = await card.evaluate(card => {
          const box = card.getBoundingClientRect();
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d');
          return [...card.querySelectorAll('.desk-role,.desk-record,.desk-bit-label,.desk-ai-tag,.desk-profile-cta a')].map(node => {
            const rect = node.getBoundingClientRect();
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(node).color; ctx.fillRect(0, 0, 1, 1);
            const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
            const previousVisibility = node.style.visibility;
            node.style.visibility = 'hidden';
            return { persona: card.dataset.persona || 'newsroom-role', text: node.textContent, rgb, previousVisibility, x: rect.left - Math.floor(box.left), y: rect.top - Math.floor(box.top), width: rect.width, height: rect.height };
          });
        });
        expect(labels.length).toBeGreaterThan(0);
        try {
          const masked = await page.screenshot({ fullPage: true, clip, animations: 'disabled' });
          const { data, info } = await sharp(masked).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          expect(info.width).toBe(clip.width);
          expect(info.height).toBe(clip.height);
          let failedCard = false;
          for (const label of labels) {
            const samples = [[.1,.25],[.5,.25],[.9,.25],[.1,.75],[.5,.75],[.9,.75]].map(([dx, dy]) => {
              const x = Math.max(0, Math.min(info.width - 1, Math.floor(label.x + label.width * dx)));
              const y = Math.max(0, Math.min(info.height - 1, Math.floor(label.y + label.height * dy)));
              const at = (y * info.width + x) * info.channels;
              const background = [...data.subarray(at, at + 3)];
              return { x, y, background, ratio: contrast(label.rgb, background) };
            });
            const minimumSampledContrast = Math.min(...samples.map(sample => sample.ratio));
            failedCard ||= minimumSampledContrast < 4.5;
            measurements.push({ persona: label.persona, text: label.text, foreground: label.rgb, minimumSampledContrast, samples });
          }
          if (failedCard) {
            await testInfo.attach(`card-${i}-unmasked`, { body: unmasked, contentType: 'image/png' });
            await testInfo.attach(`card-${i}-background`, { body: masked, contentType: 'image/png' });
          }
        } finally {
          await card.evaluate((card, labels) => [...card.querySelectorAll('.desk-role,.desk-record,.desk-bit-label,.desk-ai-tag,.desk-profile-cta a')].forEach((node, i) => node.style.visibility = labels[i].previousVisibility), labels);
        }
      }
      await testInfo.attach('rendered-roster-contrast', { body: JSON.stringify(measurements), contentType: 'application/json' });
      for (const row of measurements) expect(row.minimumSampledContrast, `${row.text}: sampled rendered-background contrast`).toBeGreaterThanOrEqual(4.5);
    });
  }
}

for (const persona of ['dot', 'echo', 'juno', 'mara', 'rex', 'vera', 'mica', 'nib']) {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    test(`${persona} light persona labels meet AA on the rendered panel at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => { localStorage.setItem('vs_theme', 'light'); localStorage.setItem('vs_cookie_consent', 'declined'); });
      await page.goto(`/news/personas/${persona}/`, { waitUntil: 'load' });
      const hero = page.locator('.desk-profile-hero');
      await expect(hero).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const labels = await hero.evaluate(hero => {
        const box = hero.getBoundingClientRect();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        return [...hero.querySelectorAll('.desk-profile-eyebrow,.desk-profile-stat-k')].map(node => {
          const rect = node.getBoundingClientRect();
          ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(node).color; ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
          // Hide only the glyphs to measure the actual gradient below them,
          // rather than assuming the declared panel color is opaque/solid.
          node.style.visibility = 'hidden';
          return { text: node.textContent, rgb, x: rect.left - box.left, y: rect.top - box.top, width: rect.width, height: rect.height, heroWidth: box.width, heroHeight: box.height };
        });
      });
      // Unpublished personas legitimately have an empty record instead of
      // fabricated statistics; their eyebrow remains real reading content.
      expect(labels.length).toBeGreaterThanOrEqual(1);
      const { data, info } = await sharp(await hero.screenshot({ animations: 'disabled' })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const measurements = labels.map(label => {
        const samples = [[.1,.25],[.5,.25],[.9,.25],[.1,.75],[.5,.75],[.9,.75]].map(([dx,dy]) => {
          const x = Math.max(0, Math.min(info.width - 1, Math.floor((label.x + label.width * dx) * info.width / label.heroWidth)));
          const y = Math.max(0, Math.min(info.height - 1, Math.floor((label.y + label.height * dy) * info.height / label.heroHeight)));
          return contrast(label.rgb, [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)]);
        });
        return { text: label.text, foreground: label.rgb, minimumSampledContrast: Math.min(...samples) };
      });
      await testInfo.attach('rendered-panel-contrast', { body: JSON.stringify(measurements), contentType: 'application/json' });
      for (const row of measurements) expect(row.minimumSampledContrast, `${row.text}: sampled rendered-background contrast`).toBeGreaterThanOrEqual(4.5);
    });
  }
}
