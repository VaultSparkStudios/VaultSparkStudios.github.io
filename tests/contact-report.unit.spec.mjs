import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { launchBrowser, openFixture, waitFor } from './fixtures/browser-harness.mjs';

const report = createRequire(import.meta.url)('../assets/report-content.js');
const own = 'https://vaultsparkstudios.com';
let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

test('only unambiguous own public page URLs are accepted; private link data is discarded', () => {
  assert.equal(report.publicPageUrl(`${own}/news/a-story/?tracking=private#access_token=private`), `${own}/news/a-story/`);
  assert.equal(report.publicPageUrl(own), `${own}/`);
  for (const url of [
    'https://foreign.example/', 'http://vaultsparkstudios.com/news/', 'https://vaultsparkstudios.com.evil.invalid/',
    'https://vaultsparkstudios.com:8443/news/', 'https://name:password@vaultsparkstudios.com/news/',
    'https://website.staging.vaultsparkstudios.com/news/', 'javascript:alert(1)', '//vaultsparkstudios.com/news/',
    `${own}/vault-member/`, `${own}/auth/callback`, `${own}/api/auth/me`, `${own}/studio-hub/`, `${own}/investor-portal/`,
    `${own}/context/private.json`, `${own}/%63ontext/private.json`, `${own}/%252fcontext/private.json`,
    `${own}/news/%2e%2e/vault-member/`, `${own}/news/%00`, `${own}/news/%255csecret`, `${own}/.git/config`, `${own}/news/\\private`,
  ]) assert.equal(report.publicPageUrl(url), null, url);
});

test('report payloads remain plain text, require an allowed concern and bound every field', () => {
  const values = { name: '', email: 'reader@example.invalid', url: `${own}/news/`, reason: 'accuracy', details: 'The source citation does not support the final paragraph.' };
  const result = report.buildReport(values);
  assert.equal(result.ok, true);
  assert.equal(result.name, 'Content reporter');
  assert.match(result.message, /Page: https:\/\/vaultsparkstudios.com\/news\//);
  for (const edit of [
    { reason: '__proto__' }, { name: 'n'.repeat(81) }, { name: 'bad\nheader' },
    { email: 'bad@example.invalid\nextra' }, { email: 'a'.repeat(250) + '@example.invalid' },
    { details: 'short' }, { details: 'x'.repeat(4001) }, { url: own + '/' + 'x'.repeat(2048) },
  ]) assert.equal(report.buildReport({ ...values, ...edit }).ok, false, JSON.stringify(edit).slice(0, 70));
  const markup = '<img src=x onerror="alert(1)"> is visible in this paragraph.';
  assert.ok(report.buildReport({ ...values, details: markup }).message.includes(markup));
});

async function fixture(run, { reply = async () => ({ status: 200, body: { success: true } }), tokens = true } = {}) {
  const submitted = [];
  const f = await openFixture(browser, {
    pages: { '/contact/': fs.readFileSync('contact/index.html', 'utf8'), '/dmca/': fs.readFileSync('dmca/index.html', 'utf8') },
    handlers: [
      { match: (url) => /\/assets\/turnstile(?:\.shell-[a-f0-9]+)?\.js$/.test(url.pathname), handle: (route) => route.fulfill({ contentType: 'application/javascript', body: tokens ? 'window.VSTurnstile={getToken:async()=>"turnstile-test-token"};' : 'window.VSTurnstile={getToken:async()=>{throw Error("test verification refusal")}};' }) },
      { match: (url) => url.pathname === '/assets/csrf-token.js', handle: (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.VSCsrf={getToken:async()=>"csrf-test-token"};' }) },
      { match: (url, request) => url.pathname === '/contact/submit' && request.method() === 'POST', handle: async (route, request) => {
        const body = await new Request(request.url(), { method: 'POST', headers: request.headers(), body: request.postDataBuffer() }).formData();
        submitted.push({ fields: Object.fromEntries(body.entries()), headers: request.headers() });
        const response = await reply();
        await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
      } },
    ],
  });
  try { await run({ ...f, submitted }); } finally { await f.close(); }
}

async function completeReport(f) {
  await f.goto('/contact/?topic=report');
  await f.page.fill('#contact-email', 'reader@example.invalid');
  await f.page.fill('#contact-report-url', `${own}/news/story/?private=discard-me#private-fragment`);
  await f.page.selectOption('#contact-report-reason', 'accuracy');
  await f.page.fill('#contact-message', 'The source citation does not support the final paragraph.');
}

test('report mode is accessible and distinct from the copyright notice process; it never auto-submits', async () => {
  await fixture(async (f) => {
    await f.goto('/contact/?topic=report');
    assert.equal(await f.page.locator('#contact-report-fields').isVisible(), true);
    assert.equal(await f.page.locator('#contact-name').getAttribute('required'), null);
    assert.equal(await f.page.locator('#contact-subject').isDisabled(), true);
    assert.equal(await f.page.getByRole('link', { name: 'copyright notice instructions' }).getAttribute('href'), '/dmca/');
    assert.equal(await f.page.getByRole('button', { name: 'Submit report' }).count(), 1);
    assert.equal(f.submitted.length, 0);
    await f.goto('/dmca/');
    assert.match(await f.page.getByRole('link', { name: 'public content report form' }).getAttribute('href'), /topic=report/);
    assert.equal(await f.page.getByRole('heading', { name: 'Send a Copyright Notice' }).count(), 1);
  });
});

test('actual report submission uses the protected contact payload and claims service acceptance only', async () => {
  await fixture(async (f) => {
    await completeReport(f);
    await f.page.getByRole('button', { name: 'Submit report' }).click();
    await f.page.locator('#contact-feedback.good').waitFor();
    assert.equal(f.submitted.length, 1);
    const sent = f.submitted[0];
    assert.equal(sent.headers['x-csrf-token'], 'csrf-test-token');
    assert.equal(sent.fields['cf-turnstile-response'], 'turnstile-test-token');
    assert.equal(sent.fields.subject, 'VaultSpark Studios — Public content report');
    assert.equal(sent.fields.email, 'reader@example.invalid');
    assert.match(sent.fields.message, /Page: https:\/\/vaultsparkstudios.com\/news\/story\//);
    assert.doesNotMatch(sent.fields.message, /discard-me|private-fragment/);
    assert.match(await f.page.locator('#contact-feedback').innerText(), /Email delivery and content review are not yet confirmed/);
    assert.equal(await f.page.inputValue('#contact-kind'), 'report');
    assert.equal(await f.page.inputValue('#contact-message'), '');
    assert.equal(await f.page.locator('#contact-form').getAttribute('aria-busy'), 'false');
  });
});

test('invalid/private report targets fail before verification and keep the visitor on the offending field', async () => {
  await fixture(async (f) => {
    await completeReport(f);
    await f.page.fill('#contact-report-url', `${own}/vault-member/?access_token=private`);
    await f.page.getByRole('button', { name: 'Submit report' }).click();
    await f.page.locator('#contact-feedback.bad').waitFor();
    assert.equal(await f.page.locator('#contact-report-url').getAttribute('aria-invalid'), 'true');
    assert.equal(await f.page.evaluate(() => document.activeElement.id), 'contact-report-url');
    assert.equal(f.submitted.length, 0);
    assert.ok((await f.page.inputValue('#contact-message')).length > 0);
  });
});

test('pending reports prevent duplicate sends, and HTTP failure cannot become a success claim', async () => {
  let finish;
  await fixture(async (f) => {
    await completeReport(f);
    await f.page.getByRole('button', { name: 'Submit report' }).click();
    await f.page.waitForFunction(() => document.querySelector('#contact-form').getAttribute('aria-busy') === 'true');
    assert.equal(await f.page.locator('#contact-form button[type=submit]').isDisabled(), true);
    await f.page.evaluate(() => document.getElementById('contact-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await f.page.waitForFunction(() => document.getElementById('contact-kind').disabled);
    // The route records its body before waiting for the explicit response.
    await waitFor(() => !!finish, { timeout: 3000, message: 'contact request reached the held response' });
    finish({ status: 403, body: { success: true } });
    await f.page.locator('#contact-feedback.bad').waitFor();
    assert.equal(f.submitted.length, 1);
    assert.match(await f.page.locator('#contact-feedback').innerText(), /Report not submitted/);
    assert.ok((await f.page.inputValue('#contact-message')).length > 0);
    assert.equal(await f.page.locator('#contact-form button[type=submit]').isEnabled(), true);
    assert.equal(await f.page.locator('#contact-form').getAttribute('aria-busy'), 'false');
  }, { reply: () => new Promise((resolve) => { finish = resolve; }) });
});

test('failed verification sends nothing and preserves the report for correction', async () => {
  await fixture(async (f) => {
    await completeReport(f);
    await f.page.getByRole('button', { name: 'Submit report' }).click();
    await f.page.locator('#contact-feedback.bad').waitFor();
    assert.equal(f.submitted.length, 0);
    assert.equal(await f.page.locator('#contact-form button[type=submit]').isEnabled(), true);
    assert.ok((await f.page.inputValue('#contact-report-url')).includes('/news/story/'));
  }, { tokens: false });
});

test('ordinary contact and account/collaboration drafts retain their original route and editable fields', async () => {
  await fixture(async (f) => {
    await f.goto('/contact/?topic=collaborate&subject=My%20project&body=An%20editable%20draft');
    assert.equal(await f.page.inputValue('#contact-kind'), 'message');
    assert.equal(await f.page.inputValue('#contact-subject'), 'My project');
    await f.page.selectOption('#contact-kind', 'report');
    await f.page.selectOption('#contact-kind', 'message');
    assert.equal(await f.page.inputValue('#contact-subject'), 'My project');
    assert.equal(await f.page.inputValue('#contact-message'), 'An editable draft');
    assert.equal(await f.page.locator('#contact-report-fields').isVisible(), false);
    assert.equal(await f.page.locator('input[name="subject"]').inputValue(), 'VaultSpark Studios — Collaboration enquiry');
  });
});
