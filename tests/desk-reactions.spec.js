const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const STORY_URL = '/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/';
const STORY_SLUG = '2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone';
const STORAGE_KEY = `vs_desk_react_${STORY_SLUG}`;

// Pages load the hash-named copy of assets/desk-reactions.js. Before the shell
// assets are re-hashed (and on a local tree), set DESK_REACTIONS_FROM_SOURCE=1
// to exercise the source file instead. Left off by default so a run against a
// deployed origin tests the bytes that origin actually serves.
async function maybeServeSource(page) {
  if (process.env.DESK_REACTIONS_FROM_SOURCE !== '1') return;
  const body = fs.readFileSync(path.join(__dirname, '..', 'assets', 'desk-reactions.js'), 'utf8');
  await page.route(/\/assets\/desk-reactions(\.shell-[0-9a-f]+)?\.js(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body }));
}

const groupOf = (id) => (id.startsWith('voice:') ? 'voice' : id.startsWith('panel-') ? 'panel' : 'story');

/**
 * A stateful stand-in for the Worker's single-choice contract. Never hits
 * production. `mode` lets a test force a failure shape on the next POST.
 */
async function mockReactions(page) {
  const state = { mode: 'ok', posts: [], counts: {}, mine: {}, hold: null };
  await page.route('**/v/desk-reaction*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      const slug = new URL(request.url()).searchParams.get('slug');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, counts: state.counts[slug] || {} }) });
      return;
    }
    const body = request.postDataJSON();
    state.posts.push(body);
    // Lets a test keep one request in flight while it taps again.
    if (state.hold) await state.hold;
    // A pre-toggle Worker: it ignores `on` and answers without `mine`/`action`,
    // so every POST it receives — including a "take back" — is another add.
    if (state.mode === 'legacy') {
      const counts = (state.counts[body.slug] = state.counts[body.slug] || {});
      counts[body.reaction] = (counts[body.reaction] || 0) + 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, slug: body.slug, counts }) });
      return;
    }
    if (state.mode === 'fail') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'storage_unavailable' }) });
      return;
    }
    // S317: the route absent from the DEPLOYED Worker — the static origin
    // answers HTML, not JSON, so the client must infer from the status.
    if (state.mode === 'missing') {
      await route.fulfill({ status: 404, contentType: 'text/html', body: '<!doctype html><title>404</title>' });
      return;
    }
    const counts = (state.counts[body.slug] = state.counts[body.slug] || {});
    const mine = (state.mine[body.slug] = state.mine[body.slug] || { story: null, voice: null, panel: null });
    const group = groupOf(body.reaction);
    const current = mine[group];
    const bump = (id, d) => { const n = Math.max(0, (counts[id] || 0) + d); if (n) counts[id] = n; else delete counts[id]; };
    let action = 'noop';
    if (body.on && current !== body.reaction) {
      if (current) bump(current, -1);
      bump(body.reaction, 1);
      action = current ? 'switch' : 'add';
      mine[group] = body.reaction;
    } else if (!body.on && current === body.reaction) {
      bump(body.reaction, -1);
      action = 'retract';
      mine[group] = null;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, slug: body.slug, counts, mine, action, alreadyCounted: action === 'noop' && mine[group] === body.reaction }),
    });
  });
  return state;
}

test.beforeEach(async ({ page }) => { await maybeServeSource(page); });

test('Desk reactions distinguish failed, accepted, and retracted delivery', async ({ page }) => {
  const api = await mockReactions(page);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const story = page.locator(`[data-desk-reactions="${STORY_SLUG}"]`);
  const button = story.locator('[data-reaction="made-me-laugh"]');
  const status = story.locator('[data-reaction-status]');

  // S317 — a site-side outage must NOT be reported as the reader's connection.
  api.mode = 'fail';
  await button.click();
  await expect(status).toContainText('aren’t available right now');
  await expect(status).toContainText('on our side, not yours');
  await expect(status).toHaveAttribute('data-state', 'unavailable');
  // The optimistic pressed state is rolled back on failure.
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).not.toHaveAttribute('data-mine', 'true');
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();

  api.mode = 'missing';
  await button.click();
  await expect(status).toContainText('aren’t available right now');
  await expect(status).toHaveAttribute('data-state', 'unavailable');
  await expect(button).toHaveAttribute('aria-pressed', 'false');

  api.mode = 'ok';
  await button.click();
  await expect(status).toContainText('Signal delivered');
  await expect(status).toHaveAttribute('data-state', 'submitted');
  await expect(button).toHaveAttribute('data-mine', 'true');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('clicking the lit reaction takes it back: unlit, count removed, local memory cleared', async ({ page }) => {
  const api = await mockReactions(page);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const story = page.locator(`[data-desk-reactions="${STORY_SLUG}"]`);
  const button = story.locator('[data-reaction="made-me-laugh"]');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button.locator('.desk-react-n')).toHaveText('1');
  expect(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY))).toEqual({ story: 'made-me-laugh' });

  await button.click();
  await expect(story.locator('[data-reaction-status]')).toContainText('taken back');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).not.toHaveAttribute('data-mine', 'true');
  await expect(button.locator('.desk-react-n')).toBeHidden();
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
  expect(api.posts.map((p) => p.on)).toEqual([true, false]);
});

test('switching reactions keeps exactly one lit per bar, and bars are independent', async ({ page }) => {
  const api = await mockReactions(page);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const story = page.locator(`[data-desk-reactions="${STORY_SLUG}"]`);
  const storyRow = story.locator('.desk-react-row').first();
  const panel = page.locator('.desk-panel-reactions');

  await story.locator('[data-reaction="knew-this"]').click();
  await expect(story.locator('[data-reaction="knew-this"]')).toHaveAttribute('aria-pressed', 'true');
  await story.locator('[data-reaction="changed-my-mind"]').click();
  await expect(story.locator('[data-reaction="changed-my-mind"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(story.locator('[data-reaction="knew-this"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(storyRow.locator('[data-reaction][aria-pressed="true"]')).toHaveCount(1);
  await expect(story.locator('[data-reaction="knew-this"] .desk-react-n')).toBeHidden();
  await expect(story.locator('[data-reaction="changed-my-mind"] .desk-react-n')).toHaveText('1');
  await expect(story.locator('[data-reaction-status]')).toContainText('switched');

  await panel.locator('[data-reaction="panel-fire"]').click();
  await expect(panel.locator('[data-reaction="panel-fire"]')).toHaveAttribute('aria-pressed', 'true');
  await panel.locator('[data-reaction="panel-like"]').click();
  await expect(panel.locator('[data-reaction="panel-like"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('[data-reaction][aria-pressed="true"]')).toHaveCount(1);
  // The panel pick did not disturb the story pick.
  await expect(story.locator('[data-reaction="changed-my-mind"]')).toHaveAttribute('aria-pressed', 'true');
  expect(api.posts.at(-1)).toMatchObject({ reaction: 'panel-like', on: true });
  expect(api.posts.at(-1).slug).toContain('/panel/editorial-illustration-1');

  // Share is an action, never a toggle.
  const share = story.locator('[data-desk-share]');
  await expect(share).not.toHaveAttribute('aria-pressed', /.*/);
});

/* S357 — the server writes the tally, the stored choice and the daily budget as
   three separate KV puts with no transaction around them, so two taps in flight
   against one bar could interleave and lose an update. */
test('one request per bar: a tap while a request is in flight is ignored, not lost', async ({ page }) => {
  const api = await mockReactions(page);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const story = page.locator(`[data-desk-reactions="${STORY_SLUG}"]`);
  const storyRow = story.locator('.desk-react-row').first();
  const status = story.locator('[data-reaction-status]');
  const first = story.locator('[data-reaction="knew-this"]');
  const second = story.locator('[data-reaction="want-receipts"]');

  let release;
  api.hold = new Promise((resolve) => { release = resolve; });
  await first.click();
  await expect(status).toHaveAttribute('data-state', 'sending');
  await second.click();
  await expect(status).toContainText('One moment');
  expect(api.posts).toHaveLength(1);

  release();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  api.hold = null;
  expect(api.posts).toHaveLength(1);
  // The second pick is never silently applied: exactly one is lit, and the
  // reader can now switch for real.
  await expect(storyRow.locator('[data-reaction][aria-pressed="true"]')).toHaveCount(1);
  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(storyRow.locator('[data-reaction][aria-pressed="true"]')).toHaveCount(1);
  expect(api.posts).toHaveLength(2);
  expect(api.posts.at(-1)).toMatchObject({ reaction: 'want-receipts', on: true });
});

/* Release ordering: the content lane can ship this page before the Worker that
   understands `on:false`. An older Worker reads a retract as another add, so the
   client must never send one until the contract is proven. */
test('a legacy-shaped response disables retracts, so a take-back can never add a vote', async ({ page }) => {
  const api = await mockReactions(page);
  api.mode = 'legacy';
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const story = page.locator(`[data-desk-reactions="${STORY_SLUG}"]`);
  const button = story.locator('[data-reaction="made-me-laugh"]');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button.locator('.desk-react-n')).toHaveText('1');
  expect(api.posts).toHaveLength(1);

  // Tapping the lit button is a "take back". Against this Worker it would be
  // counted as a second vote, so it is not sent at all.
  await button.click();
  await expect(story.locator('[data-reaction-status]')).toContainText('isn’t available just yet');
  await expect(button).toHaveAttribute('aria-pressed', 'true', 'the button stays lit');
  await expect(button.locator('.desk-react-n')).toHaveText('1', 'no vote was added by a take-back');
  expect(api.posts, 'no retract reached the legacy Worker').toHaveLength(1);
});

test('a failed switch rolls back to the previous pick', async ({ page }) => {
  const api = await mockReactions(page);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const story = page.locator(`[data-desk-reactions="${STORY_SLUG}"]`);
  await story.locator('[data-reaction="want-receipts"]').click();
  await expect(story.locator('[data-reaction="want-receipts"]')).toHaveAttribute('aria-pressed', 'true');

  api.mode = 'fail';
  await story.locator('[data-reaction="made-me-laugh"]').click();
  await expect(story.locator('[data-reaction-status]')).toHaveAttribute('data-state', 'unavailable');
  await expect(story.locator('[data-reaction="want-receipts"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(story.locator('[data-reaction="made-me-laugh"]')).toHaveAttribute('aria-pressed', 'false');
  expect(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY))).toEqual({ story: 'want-receipts' });
});

test('legacy multi-select memory collapses to one lit reaction per bar', async ({ page }) => {
  await mockReactions(page);
  await page.addInitScript(([key]) => {
    try { localStorage.setItem(key, JSON.stringify({ 'knew-this': 1, 'want-receipts': 1, 'made-me-laugh': 1 })); } catch (e) { /* ignore */ }
  }, [STORAGE_KEY]);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const storyRow = page.locator(`[data-desk-reactions="${STORY_SLUG}"] .desk-react-row`).first();
  await expect(storyRow.locator('[data-reaction][aria-pressed="true"]')).toHaveCount(1);
  await expect(storyRow.locator('[data-reaction="made-me-laugh"]')).toHaveAttribute('aria-pressed', 'true');
});

test('every generated panel offers eight emoji reactions with a pressed state', async ({ page }) => {
  await mockReactions(page);
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const panel = page.locator('.desk-panel-reactions');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('[data-reaction]')).toHaveCount(8);
  await expect(panel.locator('[data-reaction][aria-pressed]')).toHaveCount(8);
  for (const id of ['panel-like', 'panel-fire', 'panel-laugh', 'panel-wow', 'panel-think', 'panel-yikes', 'panel-eyes', 'panel-100']) {
    await expect(panel.locator(`[data-reaction="${id}"]`)).toHaveCount(1);
  }
});

test('reaction buttons wrap inside a 390px viewport with 44px tap targets', async ({ page }) => {
  await mockReactions(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  const boxes = await page.evaluate(() => [...document.querySelectorAll('[data-desk-reactions] [data-reaction], [data-desk-share]')]
    .map((el) => { const r = el.getBoundingClientRect(); return { id: el.getAttribute('data-reaction') || 'share', left: r.left, right: r.right, w: r.width, h: r.height }; }));
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.h, `${b.id} height`).toBeGreaterThanOrEqual(44);
    expect(b.w, `${b.id} width`).toBeGreaterThanOrEqual(44);
    expect(b.left, `${b.id} left edge`).toBeGreaterThanOrEqual(0);
    expect(b.right, `${b.id} right edge`).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('floating page widgets never sit on top of a visible reaction button', async ({ page }) => {
  await mockReactions(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(STORY_URL, { waitUntil: 'load' });
  // The real widget mounts through the ambient loader; mount a stand-in with the
  // same class if it has not appeared, so the geometry is always exercised.
  await page.evaluate(() => {
    if (document.querySelector('.vs-rate-page')) return;
    const box = document.createElement('div');
    box.className = 'vs-rate-page';
    box.textContent = 'How’s this page? 😍 😐 😢';
    document.body.appendChild(box);
  });

  const bars = page.locator('[data-desk-reactions]');
  const count = await bars.count();
  for (let i = 0; i < count; i++) {
    for (const block of ['end', 'center', 'start']) {
      await bars.nth(i).evaluate((el, b) => el.scrollIntoView({ block: b }), block);
      await page.waitForTimeout(120);
      const covered = await page.evaluate(() => {
        const widget = document.querySelector('.vs-rate-page');
        const w = widget.getBoundingClientRect();
        if (getComputedStyle(widget).visibility === 'hidden') return [];
        return [...document.querySelectorAll('[data-desk-reactions] [data-reaction], [data-desk-share]')]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.left < w.right && r.right > w.left && r.top < w.bottom && r.bottom > w.top; })
          .map((el) => el.getAttribute('data-reaction') || 'share');
      });
      expect(covered, `bar ${i} scrolled to ${block}`).toEqual([]);
    }
  }
  // And it comes back once the bars are out of the way.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.vs-rate-page')).visibility)).toBe('visible');
});

test('Desk reader activity separates live presence from sample-gated engaged time', async ({ page }) => {
  let summary = null;
  await page.route('**/v/desk-presence*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'observed', activeReaders: null, activeBand: 'one-or-two', windowSeconds: 90 }) });
      return;
    }
    const body = request.postDataJSON();
    if (body.kind === 'summary') summary = body;
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'accepted' }) });
  });
  await page.route('**/api/news-desk-engagement.json', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      stories: [{ slug: STORY_SLUG, state: 'sufficient', observations: 8, averageEngagedSeconds: 134, windowDays: 30 }],
    }) });
  });
  await page.goto(STORY_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-reader-presence]')).toHaveText('A reader or two');
  // S317 moved the durable aggregate to server-render (`data-ssr="1"`): the
  // committed feed is baked into the HTML and desk-presence.js deliberately
  // does NOT repaint it, so a client-side feed cannot disagree with the
  // gate-checked bytes or reintroduce the layout shift SSR removed. This test
  // predated that change and still expected the mocked feed ("2m 14s avg",
  // "8 completed") to overwrite the page; asserting the opposite is what now
  // protects the contract. Live presence above stays client-owned.
  await expect(page.locator('[data-desk-engagement]')).toHaveAttribute('data-ssr', '1');
  const engaged = page.locator('[data-engaged-time]');
  await expect(engaged).not.toHaveText('2m 14s avg');
  await expect(engaged).toHaveText(/^(?:~\d+ min estimated|\d+m \d+s avg|\d+s avg)$/);
  await expect(page.locator('[data-engagement-note]')).toContainText('Visible, focused reading time only');
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect.poll(() => summary).not.toBeNull();
  expect(summary.engagedSeconds).toBeGreaterThanOrEqual(1);
  expect(summary.slug).toContain('cloudflare-gave-the-agent');
});
