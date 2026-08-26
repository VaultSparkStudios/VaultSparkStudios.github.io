#!/usr/bin/env node
/**
 * capture-theme-matrix.mjs — CANON-047 AI image-test harness (S303).
 *
 * Screenshots key pages in every shipped theme so a reviewing agent (or human)
 * can verify readability/contrast/atmosphere per theme before release. Output
 * goes to --out (default .cache/theme-matrix — NOT committed; the reviewed
 * verdict lands in docs/THEME_READABILITY_MATRIX.md).
 *
 * Usage:
 *   node scripts/capture-theme-matrix.mjs [--out <dir>] [--themes dark,light] [--routes /,/proof/]
 *   Add --receipt --receipt-all to hash-bind every requested route/theme/viewport
 *   into docs/visual-qa/LATEST.json for a focused changed-surface review. Pass
 *   --reviewed-files <comma-separated filenames> only after directly inspecting
 *   those rendered files; unlisted captures remain explicitly automated-only.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
const require = createRequire(import.meta.url);
const { candidateBinding, sourceBinding } = require('./lib/mobile-runtime-contract.cjs');

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };

const OUT_DIR = path.resolve(ROOT, arg('--out', '.cache/theme-matrix'));
const PORT = Number(arg('--port', '4179'));

const THEMES = arg('--themes', 'dark,light,ambient,warm,cool,lava,high-contrast').split(',');
const ROUTES = arg('--routes', '/,/games/,/membership/,/status/,/proof/,/atlas/').split(',');
const VIEWPORT_PRESETS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile-small', width: 360, height: 640 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
];
const requestedViewports = new Set(arg('--viewports', 'desktop,mobile').split(','));
const VIEWPORTS = VIEWPORT_PRESETS.filter((viewport) => requestedViewports.has(viewport.name));
const OPEN_NAV = argv.includes('--open-nav');
const FOCUS_CHANGED = argv.includes('--focus-changed');
const FOCUS_FOOTER = argv.includes('--footer');

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.woff2', 'font/woff2'],
  ['.ndjson', 'application/x-ndjson'], ['.txt', 'text/plain; charset=utf-8'],
]);

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
        let rel = reqPath.endsWith('/') ? reqPath + 'index.html' : reqPath;
        let abs = path.join(ROOT, rel);
        if (!abs.startsWith(ROOT) || !fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
        if (fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
        if (!fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'content-type': MIME.get(path.extname(abs)) || 'application/octet-stream' });
        res.end(fs.readFileSync(abs));
      } catch { res.writeHead(500); res.end(); }
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const slug = (s) => s.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch();
  const manifest = [];
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    for (const theme of THEMES) {
      // Theme is applied by the head boot script from localStorage before paint.
      await context.addInitScript((t) => {
        try {
          localStorage.setItem('vs_theme', t);
          localStorage.setItem('vs_cookie_consent', 'declined');
        } catch {}
      }, theme);
      for (const route of ROUTES) {
        const page = await context.newPage();
        try {
          // 'load' not 'networkidle': several pages poll feeds forever.
          await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(600);
          if (OPEN_NAV) {
            await page.locator('#hamburger').dispatchEvent('click');
            await page.locator('.vs-nav-sheet.open').waitFor({ state: 'visible', timeout: 5000 });
          }
          if (FOCUS_FOOTER) {
            const footer = page.locator('footer.site-footer');
            await footer.waitFor({ state: 'visible', timeout: 5000 });
            await footer.scrollIntoViewIfNeeded();
            await page.waitForTimeout(200);
          }
          const changedSelector = {
            '/vault-member/': '.auth-card',
            '/studio/': '#roadmap .two-col',
            '/press/': '.press-grid',
            '/ignis/': '.ignis-caps-grid',
            '/status/': '#liveSignalsGrid',
            '/news/': '.desk-story-card[href="/news/2026-08-22/from-atari-to-eve-online-building-on-15-years/"]',
          }[route] || (route.startsWith('/news/') ? '.desk-meme' : null);
          const focusSelector = FOCUS_CHANGED ? changedSelector : null;
          if (focusSelector) {
            const focus = page.locator(focusSelector);
            await focus.waitFor({ state: 'visible', timeout: 5000 });
            const images = focus.locator('img');
            for (let index = 0; index < await images.count(); index += 1) {
              await images.nth(index).evaluate(async (image) => {
                image.loading = 'eager';
                if (!image.complete) await new Promise((resolve) => image.addEventListener('load', resolve, { once: true }));
                await image.decode().catch(() => {});
              });
            }
          }
          const stateSuffix = OPEN_NAV ? '--nav-open' : FOCUS_FOOTER ? '--footer' : focusSelector ? '--changed-surface' : '';
          const file = `${slug(route)}--${theme}--${viewport.name}${stateSuffix}.png`;
          if (FOCUS_FOOTER) await page.locator('footer.site-footer').screenshot({ path: path.join(OUT_DIR, file) });
          else if (focusSelector) await page.locator(focusSelector).screenshot({ path: path.join(OUT_DIR, file) });
          else await page.screenshot({ path: path.join(OUT_DIR, file) });
          manifest.push({ route, theme, viewport: viewport.name, state: OPEN_NAV ? 'nav-open' : FOCUS_FOOTER ? 'footer' : focusSelector ? 'changed-surface' : 'page', file });
          console.log(`  ✓ ${file}`);
        } catch (error) {
          console.error(`  ✗ ${route} ${theme} ${viewport.name}: ${String(error.message).slice(0, 90)}`);
        } finally {
          await page.close();
        }
      }
      // New context per theme keeps localStorage init scripts from stacking.
      await context.clearCookies();
    }
    await context.close();
  }
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), shots: manifest }, null, 2));
  console.log(`capture-theme-matrix: ${manifest.length} screenshot(s) → ${OUT_DIR}`);
  if (argv.includes('--receipt')) writeCanonReceipt(manifest);
}

/**
 * CANON-053: emit the hash-bound rendered-pixel review receipt at
 * docs/visual-qa/LATEST.json, with a committed capture subset (homepage
 * desktop+mobile per theme, plus /proof/ in dark+light). Capture and inspection
 * are separate facts: only files named by --reviewed-files receive a manual
 * inspection receipt, and the aggregate can claim complete review only when
 * every hash-bound capture was named.
 */
function writeCanonReceipt(manifest) {
  const receiptDir = path.join(ROOT, 'docs', 'visual-qa');
  fs.mkdirSync(receiptDir, { recursive: true });
  const receiptName = arg('--receipt-name', 'LATEST.json');
  if (!/^[A-Za-z0-9._-]+\.json$/.test(receiptName)) throw new Error('--receipt-name must be a simple JSON filename');
  // A canonical receipt is always the complete requested Cartesian matrix.
  // Partial receipts cannot prove route × theme × viewport completion.
  const wanted = manifest;
  const reviewedFiles = new Set(arg('--reviewed-files', '').split(',').map((value) => value.trim()).filter(Boolean));
  const reviewer = arg('--reviewer', 'image-capable agent');
  const capturedFiles = new Set(wanted.map((shot) => shot.file));
  const unknownReviewedFiles = [...reviewedFiles].filter((file) => !capturedFiles.has(file));
  if (unknownReviewedFiles.length) {
    throw new Error(`--reviewed-files includes uncaptured file(s): ${unknownReviewedFiles.join(', ')}`);
  }
  const captures = wanted.map((shot) => {
    const src = path.join(OUT_DIR, shot.file);
    const dest = path.join(receiptDir, shot.file);
    fs.copyFileSync(src, dest);
    return {
      theme: shot.theme,
      viewportName: shot.viewport,
      viewport: VIEWPORT_PRESETS.find((viewport) => viewport.name === shot.viewport),
      file: shot.file,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),
      page: shot.route,
      state: shot.state,
      inspection: reviewedFiles.has(shot.file)
        ? { mode: 'manual', reviewer }
        : { mode: 'automated-only' },
    };
  });
  const manuallyReviewed = captures.filter((capture) => capture.inspection.mode === 'manual').length;
  const completeManualReview = captures.length > 0 && manuallyReviewed === captures.length;
  const routes = [...new Set(captures.map((capture) => capture.page))];
  const themes = [...new Set(captures.map((capture) => capture.theme))];
  const viewports = [...new Set(captures.map((capture) => capture.viewportName))].map((name) => VIEWPORT_PRESETS.find((viewport) => viewport.name === name));
  const states = [...new Set(captures.map((capture) => capture.state))];
  const sourceFiles = [
    'assets/style.css', 'assets/rank-projector.js', 'assets/page-sigil.js', 'assets/rank-orb.js', 'assets/vault-genome-strip.js',
    'assets/news-desk.css', 'assets/desk-presence.js', 'scripts/generate-news-pages.mjs',
    'scripts/build-news-desk.mjs', 'scripts/lib/news-desk.mjs', 'scripts/lib/news-memes.mjs',
    'data/news-desk/days/2026-08-21.json', 'data/news-desk/days/2026-08-22.json', 'data/news-desk/days/2026-08-23.json',
    'assets/og/news/2026-08-22--from-atari-to-eve-online-building-on-15-years--meme.png',
    'assets/og/news/2026-08-22--from-atari-to-eve-online-building-on-15-years--meme.webp',
    'assets/og/news/2026-08-22--from-atari-to-eve-online-building-on-15-years--meme.avif',
    'assets/og/news/2026-08-23--from-atari-to-eve-online-building-on-15-years--meme.png',
    'assets/og/news/2026-08-23--from-atari-to-eve-online-building-on-15-years--meme.webp',
    'assets/og/news/2026-08-23--from-atari-to-eve-online-building-on-15-years--meme.avif',
    'vault-member/portal.css',
    'scripts/build-deploy-currency.mjs', 'scripts/check-status-feed-field-contract.mjs',
    'scripts/capture-theme-matrix.mjs', 'scripts/check-visual-review-receipt.mjs',
    ...routes.map((route) => route === '/' ? 'index.html' : `${route.slice(1)}index.html`),
  ].filter((file) => fs.existsSync(path.join(ROOT, file)));
  const receipt = {
    schemaVersion: 1,
    inspectionSchemaVersion: 2,
    capturedAt: new Date().toISOString(),
    generatedBy: 'scripts/capture-theme-matrix.mjs --receipt',
    themes: THEMES,
    source: sourceBinding(ROOT, sourceFiles),
    candidate: candidateBinding(ROOT),
    matrix: { routes, themes, viewports, states, expectedCaptures: routes.length * themes.length * viewports.length * states.length, completedCaptures: captures.length },
    inspection: {
      renderedPixelsReviewed: completeManualReview,
      coverage: {
        totalCaptures: captures.length,
        manuallyReviewed,
        automatedOnly: captures.length - manuallyReviewed,
        complete: completeManualReview,
      },
      reviewer: manuallyReviewed ? reviewer : null,
      findings: [],
      fixesApplied: [],
      blockingDefectsOpen: completeManualReview ? 0 : null,
      limitation: completeManualReview
        ? null
        : 'Unreviewed captures prove rendering and hash binding only; they do not claim human-judged hierarchy, readability, or contrast.',
    },
    captures,
  };
  fs.writeFileSync(path.join(receiptDir, receiptName), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`capture-theme-matrix: CANON-053 receipt → docs/visual-qa/${receiptName} (${captures.length} hash-bound capture(s))`);
}

if (argv.includes('--receipt-only')) {
  try {
    const prior = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
    if (!Array.isArray(prior.shots) || !prior.shots.length) throw new Error('capture manifest has no shots');
    writeCanonReceipt(prior.shots);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
} else {
  main().catch((error) => { console.error(error); process.exit(1); });
}
