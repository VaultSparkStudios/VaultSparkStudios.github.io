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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
    path: '/studio-pulse/',
    status: 200,
    contains: ['Studio Pulse'],
  },
  {
    // S335: the Vault Wall lives at /community/#wall; the retired route is an
    // edge 301 in _redirects (no stub to smoke).
    path: '/community/',
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

/**
 * Every consolidated route, asserted as the 301 CONTRACT it actually is.
 *
 * `/vaultsparked/` and `/ranks/` used to be smoked as `200` carrying the body of
 * a stub page — and S335 deleted the stubs. The assertion outlived the thing it
 * asserted. Because this script is a PRE-gate, those two failures killed both
 * E2E jobs on every push for 17 hours while eight further stranded specs sat
 * untested behind them; S338 had already lost 27 hours of Lighthouse verdicts to
 * the same route merge reaching a consumer nobody updated.
 *
 * Two changes end the class rather than the instance. `local-preview-server.mjs`
 * now applies `_redirects`, so the preview answers these routes the way the edge
 * does. And this list is DERIVED from `config/route-consolidation.json` rather
 * than typed out, so the next merge is covered the moment it is recorded — and
 * can never again be asserted as a page that no longer exists.
 */
function consolidatedChecks() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'route-consolidation.json'), 'utf8'));
    return (cfg.redirects || []).map((r) => ({
      path: r.from,
      status: 301,
      location: r.to,
      contains: [],
    }));
  } catch {
    return [];
  }
}

CHECKS.push(...consolidatedChecks());

function fetch(path) {
  return new Promise((resolve, reject) => {
    const url = BASE + path;
    const req = http.get(url, { timeout: 8000 }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, url, location: res.headers.location }));
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
    const { status, body, url, location } = await fetch(check.path);
    const statusOk = check.status === null || status === check.status;
    const missingStrings = (check.contains || []).filter(s => !body.includes(s));
    // A redirect check is about WHERE it sends you, not what it renders.
    const locationOk = !check.location || location === check.location;
    const ok = statusOk && locationOk && missingStrings.length === 0;

    if (ok) {
      passed++;
      process.stdout.write(`  ✓  ${check.path}\n`);
    } else {
      failed++;
      process.stdout.write(`  ✗  ${check.path}\n`);
      if (!statusOk) process.stdout.write(`       status: expected ${check.status}, got ${status}\n`);
      if (!locationOk) process.stdout.write(`       location: expected ${check.location}, got ${location ?? '(none)'}\n`);
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
