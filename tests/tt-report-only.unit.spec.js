/**
 * tt-report-only.unit.spec.js — the classifier that decides whether a console
 * error is a Trusted Types REPORT-ONLY observation or a real failure (S337).
 *
 * Runs under Node's built-in test runner with zero dependencies and zero
 * network — it is pure string classification, so it does not belong in the
 * browser matrix even though what it classifies comes from browsers.
 *
 *   node --test tests/tt-report-only.unit.spec.js
 *
 * Each engine's wording is pinned VERBATIM because the previous version of this
 * classifier recognised only Chromium's, which silently reclassified every
 * Firefox report-only notice as a hard console error. Those sinks render
 * asynchronously, so it fired on some runs and not others — Playwright calls
 * that flaky, a flaky result rejects the release ceremony, and the S337
 * production deploy was blocked by a test rather than by the site.
 *
 * The Firefox string is copied from the receipt of the run that blocked it
 * (api/staging-release-browser.json, run 33593559489), curly quotation marks
 * included: Gecko renders the directive with typographic quotes, which is
 * exactly the detail a hand-written pattern misses.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { isTrustedTypesReportOnly } = require('./lib/tt-report-only.js');

const CHROMIUM = '[Report Only] This requires a TrustedHTML value else it violates the following Content Security Policy directive: "require-trusted-types-for \'script\'".';
const FIREFOX = '[JavaScript Error: "Content-Security-Policy: (Report-Only policy) The page\u2019s settings would block assigning to an injection sink because it violates the following directive: \u201Crequire-trusted-types-for \u2019script\u2019\u201C" {file: "https://website.staging.vaultsparkstudios.com/assets/stats-surface.shell-c2aa7d689a.js" line: 14}]';
const WEBKIT = "Report-Only Content Security Policy: Refused to assign a string to a TrustedHTML sink because it violates the following directive: require-trusted-types-for 'script'";

test('every engine\'s report-only notice is classified as an observation', () => {
  assert.equal(isTrustedTypesReportOnly(CHROMIUM), true, 'chromium');
  assert.equal(isTrustedTypesReportOnly(FIREFOX), true, 'firefox');
  assert.equal(isTrustedTypesReportOnly(WEBKIT), true, 'webkit');
});

test('a genuine console error is never suppressed', () => {
  for (const real of [
    "Uncaught TypeError: Cannot read properties of null (reading 'textContent')",
    'Failed to load resource: the server responded with a status of 500 ()',
    'Uncaught (in promise) Error: supabase request failed',
    '[JavaScript Error: "x is not a function" {file: "https://example.test/a.js" line: 3}]',
  ]) {
    assert.equal(isTrustedTypesReportOnly(real), false, real.slice(0, 48));
  }
});

test('an ENFORCED trusted types violation still fails loudly', () => {
  // No report-only marker. This is the signal the founder-approved enforce flip
  // depends on; suppressing it would make the flip unverifiable.
  assert.equal(isTrustedTypesReportOnly(
    "Refused to assign a string to a TrustedHTML sink because it violates the following Content Security Policy directive: require-trusted-types-for 'script'",
  ), false);
});

test('a report-only marker alone is not enough', () => {
  // Conjunctive matching: without a Trusted Types marker this is some other
  // report-only CSP notice and must not be swallowed by this classifier.
  assert.equal(isTrustedTypesReportOnly(
    "[Report Only] Refused to load the image 'https://x.test/a.png' because it violates the following Content Security Policy directive: img-src 'self'",
  ), false);
});

test('empty and non-string input are safe', () => {
  for (const value of ['', null, undefined, 0, {}]) {
    assert.equal(isTrustedTypesReportOnly(value), false);
  }
});
