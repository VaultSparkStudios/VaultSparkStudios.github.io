// VaultSpark Studios — Response Header Verification
// Verifies Cloudflare security headers are present on production responses
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const EXPECTED_HEADERS = {
  'strict-transport-security': /max-age=\d+/,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': /same-origin|strict-origin-when-cross-origin/,
  'permissions-policy': /camera=\(\)/,
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

// CSP directives that must be present (checked as substrings)
const CSP_DIRECTIVES = [
  "default-src 'self'",
  'script-src',
  'style-src',
  'connect-src',
  'frame-src',
  "object-src 'none'",
  'upgrade-insecure-requests',
];

// Headers that should be stripped by the worker
const STRIPPED_HEADERS = ['x-powered-by'];

test.describe('Cloudflare security headers', () => {
  test('Homepage returns all expected security headers', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const headers = res.headers();

    for (const [name, expected] of Object.entries(EXPECTED_HEADERS)) {
      const value = headers[name];
      expect(value, `Missing header: ${name}`).toBeTruthy();
      if (expected instanceof RegExp) {
        expect(value).toMatch(expected);
      } else {
        expect(value).toBe(expected);
      }
    }
  });

  test('CSP contains required directives', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const csp = res.headers()['content-security-policy'] || '';

    for (const directive of CSP_DIRECTIVES) {
      expect(csp, `CSP missing directive: ${directive}`).toContain(directive);
    }
  });

  test('CSP allows Supabase and Sentry connect-src', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const csp = res.headers()['content-security-policy'] || '';

    expect(csp).toContain('fjnpzjjyhnpmunfoycrp.supabase.co');
    expect(csp).toContain('sentry.io');
  });

  test('CSP allows Turnstile in script-src and frame-src', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const csp = res.headers()['content-security-policy'] || '';

    expect(csp).toContain('challenges.cloudflare.com');
  });

  test('Stripped headers are not present', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const headers = res.headers();

    for (const name of STRIPPED_HEADERS) {
      expect(headers[name], `Header should be stripped: ${name}`).toBeFalsy();
    }
  });

  test('Security headers present on subpages', async ({ request }) => {
    const paths = ['/games/', '/community/', '/vault-member/', '/join/'];

    for (const path of paths) {
      const res = await request.get(BASE + path);
      const headers = res.headers();

      expect(headers['strict-transport-security'], `HSTS missing on ${path}`).toBeTruthy();
      expect(headers['x-content-type-options'], `X-Content-Type-Options missing on ${path}`).toBe('nosniff');
      expect(headers['cross-origin-opener-policy'], `COOP missing on ${path}`).toBe('same-origin');
    }
  });
});
