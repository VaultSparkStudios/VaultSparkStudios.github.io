#!/usr/bin/env node
/**
 * check-sitemap-coverage.mjs — S227 sitemap-auto-derivation-gate
 *
 * Verifies that every generated page URL is present in sitemap.xml.
 * Scans page generators (leaderboards, games, projects) and warns on gaps.
 * Prevents phantom TASK_BOARD carries caused by manually maintained sitemap.xml.
 *
 *   node scripts/check-sitemap-coverage.mjs
 *   node scripts/check-sitemap-coverage.mjs --self-test
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RUN_DIRECT = import.meta.main ?? process.argv[1].endsWith('check-sitemap-coverage.mjs');

/** Parse all <loc> URLs from sitemap.xml into a normalized Set. */
function parseSitemapLocs(sitemapPath) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = new Set();
  let match;
  const re = /<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/g;
  while ((match = re.exec(xml)) !== null) {
    // normalize: strip trailing slash for comparison (we compare both forms)
    const url = match[1].trim();
    locs.add(url);
    locs.add(url.endsWith('/') ? url.slice(0, -1) : url + '/');
  }
  return locs;
}

// Paths intentionally excluded from sitemap.xml (see .github/workflows/sitemap.yml EXCLUDE).
const SITEMAP_EXCLUDE = /vault-member|investor-portal|member\/[^/]+\/index/;
const CONSOLIDATED_ROUTES = new Map(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'route-consolidation.json'), 'utf8')).redirects || [])
    .map((rule) => [rule.from, String(rule.to).split('#')[0]]),
);
const canonicalRoute = (route) => {
  const target = CONSOLIDATED_ROUTES.get(`/${route}/`);
  return target ? target.replace(/^\/+|\/+$/g, '') : route;
};
export const UNIVERSAL_ROUTES = Object.freeze(
  [...new Set(['privacy', 'terms', 'contact', 'ip'].map(canonicalRoute))],
);

/** Collect expected URLs by scanning known page directories. */
function collectExpectedUrls(root) {
  const base = 'https://vaultsparkstudios.com';
  const expected = [];

  function scanDir(category) {
    const dir = path.join(root, category);
    if (!fs.existsSync(dir)) return;
    for (const slug of fs.readdirSync(dir)) {
      const source = category + '/' + slug;
      if (SITEMAP_EXCLUDE.test(source)) continue;
      if (CONSOLIDATED_ROUTES.has(`/${source}/`)) continue;
      const idx = path.join(dir, slug, 'index.html');
      if (slug !== 'index.html' && fs.existsSync(idx)) {
        expected.push({ url: `${base}/${source}/`, source });
      }
    }
  }

  scanDir('leaderboards');
  scanDir('games');
  scanDir('projects');

  for (const route of UNIVERSAL_ROUTES) {
    expected.push({
      url: `${base}/${route}/`,
      source: `${route}/index.html`,
      required: true,
      sourceExists: fs.existsSync(path.join(root, route, 'index.html')),
    });
  }

  return expected;
}

function runCheck(root) {
  const sitemapPath = path.join(root, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('ERROR: sitemap.xml not found');
    return 1;
  }

  const locs = parseSitemapLocs(sitemapPath);
  const expected = collectExpectedUrls(root);

  const missing = expected.filter(e => !locs.has(e.url));
  const missingSources = expected.filter((entry) => entry.required && !entry.sourceExists);
  const blockingMissing = missing.filter((entry) => entry.required);

  if (missing.length === 0 && missingSources.length === 0) {
    console.log(`check-sitemap-coverage: ✓ ${expected.length} pages verified in sitemap.xml`);
    return 0;
  }

  for (const entry of missingSources) console.error(`  FAIL missing required source: ${entry.source}`);
  for (const entry of blockingMissing) console.error(`  FAIL required route absent from sitemap: ${entry.url}`);
  if (missingSources.length || blockingMissing.length) {
    console.error('check-sitemap-coverage: universal public-route contract failed');
    return 1;
  }

  console.warn(`check-sitemap-coverage: ${missing.length} page(s) missing from sitemap.xml`);
  missing.forEach(m => console.warn(`  WARN missing: ${m.url}  (source: ${m.source})`));
  console.warn('  → run: npm run build to regenerate sitemap.xml');
  return 0; // warn-only (not blocking — sitemap re-generates on build)
}

function runSelfTest() {
  const os = { ok: 0, fail: 0 };
  function ok(cond, label) {
    if (cond) { os.ok++; } else { os.fail++; console.error('  FAIL:', label); }
  }

  // Test parseSitemapLocs
  const xml = '<urlset><url><loc>https://vaultsparkstudios.com/leaderboards/global/</loc></url>' +
    '<url><loc>https://vaultsparkstudios.com/games/call-of-doodie/</loc></url></urlset>';
  const tmpPath = path.join(__dirname, '.check-sitemap-test.xml');
  fs.writeFileSync(tmpPath, xml, 'utf8');
  const locs = parseSitemapLocs(tmpPath);
  fs.unlinkSync(tmpPath);

  ok(locs.has('https://vaultsparkstudios.com/leaderboards/global/'), 'trailing-slash URL in Set');
  ok(locs.has('https://vaultsparkstudios.com/leaderboards/global'), 'no-trailing-slash variant in Set');
  ok(locs.has('https://vaultsparkstudios.com/games/call-of-doodie/'), 'games URL in Set');
  ok(!locs.has('https://vaultsparkstudios.com/nonexistent/'), 'absent URL not in Set');
  ok(typeof collectExpectedUrls(ROOT) === 'object', 'collectExpectedUrls returns array');
  ok(collectExpectedUrls(ROOT).some((entry) => entry.url.endsWith('/rights/') && entry.required), 'retired IP route resolves to canonical rights route');
  ok(!collectExpectedUrls(ROOT).some((entry) => entry.url.endsWith('/ip/') && entry.required), 'retired IP alias is not required in the sitemap');

  console.log(`check-sitemap-coverage --self-test: ${os.ok} passing, ${os.fail} failing`);
  return os.fail > 0 ? 1 : 0;
}

if (RUN_DIRECT) {
  const selfTest = process.argv.includes('--self-test');
  process.exit(selfTest ? runSelfTest() : runCheck(ROOT));
}
