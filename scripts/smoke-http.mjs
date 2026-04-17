/**
 * smoke-http.mjs — HTTP-only smoke tier
 *
 * Checks that key pages return 200 with expected content strings, using
 * only Node.js built-in http/https. No browser, no Playwright, no Chrome.
 * Use this fallback when the Playwright browser process fails to spawn or
 * hangs in the local sandbox.
 *
 * Usage:
 *   node scripts/smoke-http.mjs           (uses default port 4173)
 *   node scripts/smoke-http.mjs --port=8080
 *
 * The script does NOT start the preview server. Start it first:
 *   node scripts/local-preview-server.mjs &
 *   node scripts/smoke-http.mjs
 *
 * Exit code 0 = all checks pass. Non-zero = at least one check failed.
 */

import http from 'node:http';

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; })
);

const HOST = args.host || '127.0.0.1';
const PORT = Number(args.port || 4173);
const BASE = `http://${HOST}:${PORT}`;

// Each check: { path, status, contains[] }
const CHECKS = [
  {
    path: '/',
    status: 200,
    contains: ['VaultSpark Studios', 'forge-wordmark', 'vault-member'],
  },
  {
    path: '/games/',
    status: 200,
    contains: ['Games', 'Call of Doodie', 'data-status'],
  },
  {
    path: '/community/',
    status: 200,
    contains: ['Community', 'Vault'],
  },
  {
    path: '/leaderboards/',
    status: 200,
    contains: ['Leaderboard', 'Vault'],
  },
  {
    path: '/membership/',
    status: 200,
    contains: ['Membership', 'Vault Member'],
  },
  {
    path: '/vaultsparked/',
    status: 200,
    contains: ['VaultSparked', 'month'],
  },
  {
    path: '/ranks/',
    status: 200,
    contains: ['Ranks', 'Spark Initiate'],
  },
  {
    path: '/studio-pulse/',
    status: 200,
    contains: ['Studio Pulse', 'Forge Window'],
  },
  {
    path: '/vault-wall/',
    status: 200,
    contains: ['Vault Wall', 'rank-dist'],
  },
  {
    path: '/api/public-intelligence.json',
    status: 200,
    contains: ['"schemaVersion"', '"catalog"'],
  },
  {
    path: '/manifest.json',
    status: 200,
    contains: ['"name"', '"start_url"'],
  },
  {
    path: '/sw.js',
    status: 200,
    contains: ['CACHE_NAME', 'fetch'],
  },
  {
    path: '/assets/style.shell-',
    status: null, // path prefix — skip if we can't resolve exact fingerprint
    contains: [],
    skip: true,
  },
];

function fetch(path) {
  return new Promise((resolve, reject) => {
    const url = BASE + path;
    const req = http.get(url, { timeout: 8000 }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, url }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const results = [];
let passed = 0;
let failed = 0;

for (const check of CHECKS) {
  if (check.skip) continue;
  try {
    const { status, body, url } = await fetch(check.path);
    const statusOk = check.status === null || status === check.status;
    const missingStrings = (check.contains || []).filter(s => !body.includes(s));
    const ok = statusOk && missingStrings.length === 0;

    if (ok) {
      passed++;
      process.stdout.write(`  ✓  ${check.path}\n`);
    } else {
      failed++;
      process.stdout.write(`  ✗  ${check.path}\n`);
      if (!statusOk) process.stdout.write(`       status: expected ${check.status}, got ${status}\n`);
      missingStrings.forEach(s => process.stdout.write(`       missing: "${s}"\n`));
    }
    results.push({ path: check.path, ok, status, missingStrings, url });
  } catch (err) {
    failed++;
    process.stdout.write(`  ✗  ${check.path}  (${err.message})\n`);
    results.push({ path: check.path, ok: false, error: err.message });
  }
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
