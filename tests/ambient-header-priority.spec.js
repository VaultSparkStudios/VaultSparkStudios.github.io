const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const contract = import('../scripts/lib/visual-scene-contract.mjs');

test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
test.beforeEach(async ({ context, baseURL, browserName }) => {
  const origin = new URL(process.env.BASE_URL || baseURL);
  test.skip(browserName !== 'chromium' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname),
    'Controlled scheduler checks require a local Chromium preview.');
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
});

async function prepare(page, delayed = false) {
  await page.addInitScript(({ delayed }) => {
    try { localStorage.setItem('vs_theme', 'light'); } catch (_) {}
    const records = []; window.__headerPriorityRecords = records;
    const record = (event, data = {}) => records.push({ event, at: performance.now(), ...data });
    const add = window.addEventListener.bind(window);
    window.addEventListener = function(type, callback, options) {
      if (callback?.name === 'scheduleIdle' && ['keydown', 'pointerdown', 'scroll'].includes(type)) {
        record('listener', { type }); const original = callback;
        callback = function(event) { record('engagement', { type: event.type, trusted: event.isTrusted }); return original.call(this, event); };
      }
      return add(type, callback, options);
    };
    new MutationObserver(changes => {
      for (const change of changes) for (const node of change.addedNodes) {
        if (node.nodeName === 'SCRIPT' && node.dataset.vsAmbientLoaded === 'true') {
          const file = new URL(node.src).pathname;
          if (/\/assets\/(?:desk-wire(?:\.shell-[a-f0-9]+)?|rank-orb)\.js$/.test(file)) record('header-request', { file });
        }
      }
    }).observe(document, { childList: true, subtree: true });
    if (delayed && window.requestIdleCallback) window.requestIdleCallback = callback =>
      setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 1500);
  }, { delayed });
}
async function records(page) { return page.evaluate(() => window.__headerPriorityRecords); }
async function actualReadiness(page, name) {
  const source = fs.readFileSync(path.join(__dirname, 'visual-regression.spec.js'), 'utf8');
  const start = source.indexOf('async function waitForVisualReadiness('), end = source.indexOf('\n}\n', start);
  if (start < 0 || end <= start) throw Error('Actual readiness function unavailable.');
  const { VISUAL_SCENES, visualSceneState } = await contract;
  const samples = [];
  const observation = { poll: (callback, options) => expect.poll(async () => {
    const sample = await callback(); samples.push(sample); return sample;
  }, options) };
  const settle = new Function('expect', 'VISUAL_SCENES', 'visualSceneState',
    'return (' + source.slice(start, end + 2) + ');')(observation, VISUAL_SCENES, visualSceneState);
  await settle(page, { name });
  return samples;
}
async function snapshotStyles(page) {
  await page.mouse.move(-100, -100);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}.vs-genome-strip,.vs-sigil-ring,.vs-tour-offer{opacity:1!important}' });
}
async function report(page, testInfo, samples = []) {
  const data = { title: testInfo.title, records: await records(page), samples };
  await testInfo.attach('header-priority-timing', { body: Buffer.from(JSON.stringify(data)), contentType: 'application/json' });
}

for (const delayed of [false, true]) test(`shipped Journal header meets unchanged readiness with ${delayed ? 'deliberately delayed 1500ms' : 'native'} idle delivery`, async ({ page, baseURL }, testInfo) => {
  await prepare(page, delayed);
  await page.goto((process.env.BASE_URL || baseURL) + '/journal/', { waitUntil: 'load' });
  await snapshotStyles(page);
  const samples = await actualReadiness(page, 'journal'), observed = await records(page);
  expect(samples.at(-1)).toMatchObject({ ready: true, layoutStable: true, scene: { sceneReady: true } });
  const engagement = observed.find(row => row.event === 'engagement');
  expect(engagement?.trusted).toBe(true);
  const requests = observed.filter(row => row.event === 'header-request');
  expect(requests).toHaveLength(2);
  for (const request of requests) expect(request.at - engagement.at).toBeGreaterThanOrEqual(1190);
  await report(page, testInfo, samples);
});

test('cold visit retains no early header fetch and the 12000ms quiet fallback', async ({ page, baseURL }, testInfo) => {
  await prepare(page);
  await page.goto((process.env.BASE_URL || baseURL) + '/games/', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  expect((await records(page)).filter(row => row.event === 'header-request')).toHaveLength(0);
  await expect.poll(async () => (await records(page)).filter(row => row.event === 'header-request').length,
    { timeout: 16000 }).toBe(2);
  const observed = await records(page);
  expect(observed.filter(row => row.event === 'engagement')).toHaveLength(0);
  const registered = observed.find(row => row.event === 'listener');
  for (const row of observed.filter(row => row.event === 'header-request')) expect(row.at - registered.at).toBeGreaterThanOrEqual(13190);
  await report(page, testInfo);
});

test.describe('mobile header eligibility', () => {
  test.use({ viewport: { width: 393, height: 727 } });
  test('mobile Games mounts rank without fetching hidden Desk wire', async ({ page, baseURL }, testInfo) => {
    await prepare(page, true);
    await page.goto((process.env.BASE_URL || baseURL) + '/games/', { waitUntil: 'load' });
    await snapshotStyles(page);
    const samples = await actualReadiness(page, 'games'), requests = (await records(page)).filter(row => row.event === 'header-request');
    expect(requests.map(row => row.file)).toEqual(['/assets/rank-orb.js']);
    await expect(page.locator('.nav-right .vs-rank-orb')).toHaveCount(1);
    await report(page, testInfo, samples);
  });
});
for (const route of ['/vault-member/', '/api/']) test(`excluded ${route} keeps both header modules unfetched`, async ({ page, baseURL }, testInfo) => {
  await prepare(page);
  await page.goto((process.env.BASE_URL || baseURL) + route, { waitUntil: 'load' });
  await page.keyboard.press('Shift');
  await page.waitForTimeout(2000);
  expect((await records(page)).filter(row => row.event === 'header-request')).toHaveLength(0);
  await expect(page.locator('.nav-right .vs-rank-orb')).toHaveCount(0);
  await report(page, testInfo);
});
