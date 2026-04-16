import { WORKER_CSP } from '../config/csp-policy.mjs';

const baseUrl = process.env.VERIFY_BASE_URL || 'https://vaultsparkstudios.com';
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/vaultsparked/'];

const EXPECTED_HEADERS = {
  'strict-transport-security': /max-age=\d+/,
  'x-content-type-options': /^nosniff$/,
  'x-frame-options': /^SAMEORIGIN$/,
  'cross-origin-opener-policy': /^same-origin$/,
  'cross-origin-resource-policy': /^same-origin$/,
};

function normalize(value) {
  return String(value || '').trim();
}

async function verifyPath(route) {
  const url = new URL(route, baseUrl).toString();
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    }
  });

  const headers = response.headers;
  const failures = [];

  for (const [header, matcher] of Object.entries(EXPECTED_HEADERS)) {
    const value = normalize(headers.get(header));
    if (!value || !matcher.test(value)) {
      failures.push(`${route} missing or invalid ${header}: ${value || '(missing)'}`);
    }
  }

  const liveCsp = normalize(headers.get('content-security-policy'));
  if (!liveCsp) {
    failures.push(`${route} missing content-security-policy`);
  } else {
    const requiredSnippets = [
      "default-src 'self'",
      'script-src',
      'connect-src',
      'frame-src',
      "object-src 'none'"
    ];
    requiredSnippets.forEach((snippet) => {
      if (!liveCsp.includes(snippet)) {
        failures.push(`${route} CSP missing snippet: ${snippet}`);
      }
    });
    if (!liveCsp.includes('fjnpzjjyhnpmunfoycrp.supabase.co')) {
      failures.push(`${route} CSP missing Supabase domain`);
    }
    if (!WORKER_CSP.includes('challenges.cloudflare.com') || !liveCsp.includes('challenges.cloudflare.com')) {
      failures.push(`${route} CSP missing Cloudflare challenges domain`);
    }
  }

  return {
    route,
    ok: failures.length === 0,
    status: response.status,
    failures
  };
}

const results = await Promise.all(paths.map(verifyPath));
const failed = results.filter((result) => !result.ok);

results.forEach((result) => {
  console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.route} (${result.status})`);
  result.failures.forEach((failure) => console.log(`  - ${failure}`));
});

if (failed.length) process.exit(1);
