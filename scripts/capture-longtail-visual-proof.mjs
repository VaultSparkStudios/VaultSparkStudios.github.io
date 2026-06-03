#!/usr/bin/env node
/**
 * Capture desktop/mobile visual proof for representative long-tail pages.
 *
 * Output:
 *   docs/visual-proof/longtail-s171/manifest.json
 *   docs/visual-proof/longtail-s171/*.png
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'visual-proof', 'longtail-s171');
const PORT = 4177;

const ROUTES = [
  { route: '/projects/vorn/', slug: 'projects-vorn' },
  { route: '/privacy/', slug: 'privacy' },
  { route: '/journal/community-enters-the-vault/', slug: 'journal-community-enters-the-vault' }
];

const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8']
]);

function resolveRequest(requestPath) {
  const clean = decodeURIComponent(requestPath.split('?')[0].split('#')[0]);
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  let file = path.resolve(ROOT, rel);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && !path.extname(file)) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return file;
}

function startServer() {
  const server = http.createServer((req, res) => {
    const file = resolveRequest(req.url || '/');
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME.get(path.extname(file).toLowerCase()) || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function imageStats(file) {
  const image = sharp(file);
  const metadata = await image.metadata();
  const stats = await image.stats();
  const channelStddev = stats.channels.map((channel) => channel.stdev || 0);
  const nonBlankScore = Math.max(...channelStddev);
  return {
    width: metadata.width,
    height: metadata.height,
    bytes: fs.statSync(file).size,
    nonBlankScore: Number(nonBlankScore.toFixed(2))
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const server = await startServer();
const browser = await chromium.launch({ headless: true });
const captures = [];

try {
  for (const pageDef of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      const response = await page.goto(`http://127.0.0.1:${PORT}${pageDef.route}`, {
        waitUntil: 'networkidle',
        timeout: 30_000
      });
      const fileName = `${pageDef.slug}-${viewport.name}.png`;
      const abs = path.join(OUT_DIR, fileName);
      await page.screenshot({ path: abs, fullPage: true });
      const stats = await imageStats(abs);
      await page.close();
      captures.push({
        route: pageDef.route,
        viewport: viewport.name,
        expectedViewport: { width: viewport.width, height: viewport.height },
        status: response?.status() || 0,
        screenshot: path.relative(ROOT, abs).replace(/\\/g, '/'),
        pageErrors,
        ...stats
      });
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const manifest = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/capture-longtail-visual-proof.mjs',
  purpose: 'S171 long-tail primitive rhythm desktop/mobile proof',
  routes: ROUTES.map((r) => r.route),
  captures
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`long-tail visual proof captured: ${captures.length} screenshot(s) → ${path.relative(ROOT, OUT_DIR)}`);
