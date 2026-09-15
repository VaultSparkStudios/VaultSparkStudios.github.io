/**
 * desk-comments.spec.js — browser behaviour for assets/desk-comments.js (S356).
 *
 * Runs entirely against tests/fixtures/desk-comments.html on a fake origin with
 * every /v/desk-comments call mocked, so it NEVER touches production, Supabase
 * or Turnstile. Anything not served from the fixture origin is aborted.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const ORIGIN = 'https://desk-comments.fixture.test';
const STORY_URL = `${ORIGIN}/news/2026-09-14/test-story/`;
const SLUG = '2026-09-14/test-story';
const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const NOW = Date.now();
const iso = (minutesAgo) => new Date(NOW - minutesAgo * 60000).toISOString();

const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const GUEST_ID = '22222222-2222-4222-8222-222222222222';
const REPLY_ID = '33333333-3333-4333-8333-333333333333';

const THREAD = [
  {
    id: MEMBER_ID,
    parent_id: null,
    body: 'The chaperone model is the part that matters.',
    author_kind: 'member',
    display_name: 'vera',
    featured: true,
    created_at: iso(90),
    replies: [],
  },
  {
    id: GUEST_ID,
    parent_id: null,
    body: 'Fair, though the rollout timeline still looks optimistic.',
    author_kind: 'guest',
    display_name: 'Jordan',
    featured: false,
    created_at: iso(20),
    replies: [
      {
        id: REPLY_ID,
        parent_id: GUEST_ID,
        body: 'Agreed — the pilot is tiny.',
        author_kind: 'guest',
        display_name: 'Sam',
        featured: false,
        created_at: iso(5),
      },
    ],
  },
];

const ASSETS = {
  '/assets/desk-comments.js': ['assets/desk-comments.js', 'application/javascript; charset=utf-8'],
  '/assets/desk-comments.css': ['assets/desk-comments.css', 'text/css; charset=utf-8'],
  '/assets/style.css': ['assets/style.css', 'text/css; charset=utf-8'],
  '/assets/news-desk.css': ['assets/news-desk.css', 'text/css; charset=utf-8'],
};

async function setup(page, options = {}) {
  const {
    comments = THREAD,
    member = false,
    getStatus = 200,
    getBody = null,
    postResponse = { status: 202, body: { ok: true, status: 'held', message: 'Thanks — your comment is waiting for a quick review.' } },
    reportResponse = { status: 200, body: { ok: true, message: 'Thanks — a moderator will take a look.' } },
  } = options;

  const api = { gets: 0, posts: [], reports: [] };

  await page.addInitScript((isMember) => {
    window.VSTurnstile = { getToken: () => Promise.resolve('turnstile-test-token') };
    window.VSCsrf = { getToken: () => Promise.resolve('csrf.test.token'), invalidate() {} };
    window.VSSignedInState = {
      whenReady: () => Promise.resolve(isMember ? { provider: 'obelisk', userId: 'member-1', displayName: 'vera' } : null),
      getSession: () => null,
    };
  }, member);

  // Nothing leaves the fixture origin (no fonts, no Turnstile, no production).
  await page.route((url) => !url.href.startsWith(ORIGIN), (route) => route.abort());

  await page.route(`${ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (ASSETS[url.pathname]) {
      const [rel, type] = ASSETS[url.pathname];
      return route.fulfill({ status: 200, contentType: type, body: read(rel) });
    }
    if (url.pathname === '/v/desk-comments' && request.method() === 'GET') {
      api.gets += 1;
      const body = getBody !== null ? getBody : { ok: true, slug: SLUG, count: comments.length, comments };
      return route.fulfill({
        status: getStatus,
        contentType: getStatus === 404 ? 'text/html' : 'application/json',
        body: getStatus === 404 ? '<!doctype html><title>404</title>' : JSON.stringify(body),
      });
    }
    if (url.pathname === '/v/desk-comments' && request.method() === 'POST') {
      api.posts.push({ payload: request.postDataJSON(), headers: request.headers() });
      return route.fulfill({ status: postResponse.status, contentType: 'application/json', body: JSON.stringify(postResponse.body) });
    }
    if (url.pathname === '/v/desk-comments/report' && request.method() === 'POST') {
      api.reports.push(request.postDataJSON());
      return route.fulfill({ status: reportResponse.status, contentType: 'application/json', body: JSON.stringify(reportResponse.body) });
    }
    if (url.pathname.startsWith('/news/')) {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: read('tests/fixtures/desk-comments.html') });
    }
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });

  return api;
}

const section = (page) => page.locator('[data-desk-comments]');

test('the thread renders badges, featured order, replies and relative time', async ({ page }) => {
  await setup(page);
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await expect(community.locator('h2#desk-comments-title')).toHaveText('Community');
  await expect(community.locator('.desk-comments-fallback')).toHaveCount(0);
  await expect(community.locator('.desk-comments-summary')).toHaveText('3 comments');

  const top = community.locator('.desk-comments-list > .desk-comment');
  await expect(top).toHaveCount(2);
  await expect(top.nth(0)).toHaveClass(/is-featured/);
  await expect(top.nth(0)).toHaveClass(/is-member/);
  await expect(top.nth(0).locator('.desk-comment-badge.is-member').first()).toHaveText('Vault member');
  // .first(): the reply nested under this comment carries a Guest badge too.
  await expect(top.nth(1).locator('.desk-comment-badge.is-guest').first()).toHaveText('Guest');
  await expect(top.nth(1).locator('.desk-comment-replies > .desk-comment')).toHaveCount(1);
  await expect(top.nth(1).locator('.desk-comment-time').first()).toContainText('ago');

  // Replies never offer another Reply control (one level only).
  await expect(top.nth(1).locator('.desk-comment-replies .desk-comment-card button', { hasText: 'Reply' })).toHaveCount(0);
});

test('an empty thread invites the first comment and shows the guest sign-in nudge', async ({ page }) => {
  await setup(page, { comments: [] });
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await expect(community.locator('.desk-comments-empty')).toHaveText('Be the first to weigh in.');
  await expect(community.locator('.desk-comments-list')).toBeHidden();
  const nudge = community.locator('.desk-comments-nudge a');
  await expect(nudge).toHaveAttribute('href', '/vault-member/');
  await expect(nudge).toContainText('Sign in to your Vault account');
  await expect(community.locator('#desk-comment-name-1')).toBeVisible();
});

test('a guest submission sends slug, display name and both tokens, and reports the held verdict', async ({ page }) => {
  const api = await setup(page);
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await community.locator('textarea').fill('This is a considered opinion about the story.');
  await community.locator('#desk-comment-name-1').fill('Jordan');
  await community.locator('button', { hasText: 'Post comment' }).click();

  await expect(community.locator('.desk-comments-form-status')).toHaveText(/waiting for a quick review/);
  await expect(community.locator('.desk-comments-form-status')).toHaveClass(/is-held/);
  await expect(community.locator('textarea')).toHaveValue('');

  expect(api.posts).toHaveLength(1);
  expect(api.posts[0].payload).toMatchObject({
    slug: SLUG,
    body: 'This is a considered opinion about the story.',
    displayName: 'Jordan',
    turnstileToken: 'turnstile-test-token',
  });
  expect(api.posts[0].payload.parentId).toBeUndefined();
  expect(api.posts[0].headers['x-csrf-token']).toBe('csrf.test.token');
});

test('a published comment appears immediately and a reply carries parentId', async ({ page }) => {
  const published = {
    id: '44444444-4444-4444-8444-444444444444',
    parent_id: null,
    body: 'Posted straight through.',
    author_kind: 'guest',
    display_name: 'Jordan',
    featured: false,
    created_at: new Date().toISOString(),
    replies: [],
  };
  const api = await setup(page, {
    postResponse: { status: 201, body: { ok: true, status: 'published', message: 'Your comment is live.', comment: published } },
  });
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await community.locator('textarea').fill('Posted straight through.');
  await community.locator('#desk-comment-name-1').fill('Jordan');
  await community.locator('button', { hasText: 'Post comment' }).click();

  await expect(community.locator('.desk-comments-form-status')).toHaveClass(/is-ok/);
  await expect(community.locator(`[data-comment-id="${published.id}"]`)).toBeVisible();
  await expect(community.locator('.desk-comments-summary')).toHaveText('4 comments');

  await community.locator(`[data-comment-id="${GUEST_ID}"] button[aria-label^="Reply to"]`).click();
  await expect(community.locator('.desk-comments-replying-text')).toHaveText('Replying to Jordan');
  await community.locator('textarea').fill('A reply to that point.');
  await community.locator('button', { hasText: 'Post reply' }).click();

  await expect.poll(() => api.posts.length).toBe(2);
  expect(api.posts[1].payload.parentId).toBe(GUEST_ID);
});

test('a rejected comment names a category and keeps the text for editing', async ({ page }) => {
  await setup(page, {
    postResponse: { status: 422, body: { ok: false, status: 'rejected', category: 'hate', message: "This comment can't be posted." } },
  });
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await community.locator('textarea').fill('Something the filter refuses.');
  await community.locator('#desk-comment-name-1').fill('Jordan');
  await community.locator('button', { hasText: 'Post comment' }).click();

  const status = community.locator('.desk-comments-form-status');
  await expect(status).toContainText("can't be posted");
  await expect(status).toContainText('hateful language');
  await expect(status).toHaveClass(/is-error/);
  await expect(community.locator('textarea')).toHaveValue('Something the filter refuses.');
});

test('a signed-in member posts without a display-name field or sign-in nudge', async ({ page }) => {
  const api = await setup(page, { member: true });
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await expect(community.locator('.desk-comments-identity')).toBeVisible();
  await expect(community.locator('#desk-comment-name-1')).toBeHidden();
  await expect(community.locator('.desk-comments-nudge')).toBeHidden();

  await community.locator('textarea').fill('Member take on the story.');
  await community.locator('button', { hasText: 'Post comment' }).click();
  await expect.poll(() => api.posts.length).toBe(1);
  expect(api.posts[0].payload.displayName).toBeUndefined();
});

test('reporting a comment posts its id and locks the control', async ({ page }) => {
  const api = await setup(page);
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  const target = community.locator(`[data-comment-id="${MEMBER_ID}"]`);
  await target.locator('button[aria-label^="Report comment by"]').click();
  await target.locator('.desk-comment-report-reason').selectOption('spam');
  await target.locator('button', { hasText: 'Send report' }).click();

  await expect(target.locator('.desk-comment-reported')).toContainText('moderator');
  await expect(target.locator('button[aria-label^="Report comment by"]')).toBeDisabled();
  expect(api.reports).toEqual([{ commentId: MEMBER_ID, reason: 'spam', turnstileToken: 'turnstile-test-token' }]);
});

test('an undeployed route degrades honestly and hides the composer', async ({ page }) => {
  await setup(page, { getStatus: 404, getBody: undefined });
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await expect(community.locator('.desk-comments-status')).toHaveText('Comments are not available yet.');
  await expect(community.locator('.desk-comments-form')).toBeHidden();
  await expect(community.locator('.desk-comments-fallback')).toHaveCount(0);
});

test('at 390px the block fits the viewport and every control clears 44px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto(STORY_URL, { waitUntil: 'load' });

  const community = section(page);
  await expect(community.locator('.desk-comments-form')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const targets = community.locator('button:visible, .desk-comments-nudge a:visible');
  const count = await targets.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await targets.nth(i).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(43.5);
  }
});
