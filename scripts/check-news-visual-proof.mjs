#!/usr/bin/env node
// @verification-scope release — launches browsers for focused rendered-pixel proof.
/**
 * Focused rendered-pixel proof for changed News surfaces.
 *
 * This complements the committed screenshot receipt: Chromium loads each route,
 * checks the actual layout boxes for overflow/key-content visibility, and decodes
 * screenshot pixels with sharp so a blank/flat capture cannot pass as review.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = process.cwd();
const PORT = 4181;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  {
    path: '/news/',
    required: ['Cloudflare gave the agent a browser and a chaperone', 'The agent budget has a blindfold line item'],
  },
  {
    path: '/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/',
    required: ['The Roast', 'One hundred and twenty concurrent browsers is not a launch metric.'],
  },
  {
    path: '/news/2026-08-11/the-agent-budget-has-a-blindfold-line-item/',
    required: ["DOT's Flatline", 'My recommendation: before naming the agent, name the meter.'],
  },
];

const THEMES = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];
const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
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
  ['.woff2', 'font/woff2'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.ndjson', 'application/x-ndjson'],
]);

function resolveRoute(reqUrl) {
  const url = new URL(reqUrl || '/', ORIGIN);
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT)) return null;
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
  if (!path.extname(abs) && fs.existsSync(`${abs}.html`)) abs = `${abs}.html`;
  return abs;
}

function serve() {
  const server = http.createServer((req, res) => {
    const abs = resolveRoute(req.url);
    if (!abs || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME.get(path.extname(abs).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function inspectPixels(buffer, label, expected) {
  const image = sharp(buffer);
  const meta = await image.metadata();
  if (meta.width !== expected.width || meta.height !== expected.height) {
    throw new Error(`${label}: screenshot dimensions ${meta.width}x${meta.height}, expected ${expected.width}x${expected.height}`);
  }
  const stats = await image.stats();
  const avgStddev = stats.channels.slice(0, 3).reduce((sum, c) => sum + c.stdev, 0) / 3;
  const min = Math.min(...stats.channels.slice(0, 3).map((c) => c.min));
  const max = Math.max(...stats.channels.slice(0, 3).map((c) => c.max));
  if (avgStddev < 12 || max - min < 50) {
    throw new Error(`${label}: screenshot appears blank/flat (stddev ${avgStddev.toFixed(1)}, range ${max - min})`);
  }
  return { stddev: Number(avgStddev.toFixed(1)), range: max - min };
}

async function main() {
  const server = await serve();
  const browser = await chromium.launch();
  const receipts = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
        await context.addInitScript((value) => {
          try { localStorage.setItem('vs_theme', value); } catch {}
        }, theme);
        for (const route of ROUTES) {
          const page = await context.newPage();
          const label = `${route.path} ${theme} ${viewport.name}`;
          const response = await page.goto(`${ORIGIN}${route.path}`, { waitUntil: 'load', timeout: 30000 });
          if (!response || response.status() !== 200) {
            throw new Error(`${label}: HTTP ${response ? response.status() : 'none'}`);
          }
          await page.waitForTimeout(500);
          const layout = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyText: document.body.innerText,
          }));
          if (layout.scrollWidth > layout.clientWidth + 1) {
            throw new Error(`${label}: horizontal overflow ${layout.scrollWidth}px > ${layout.clientWidth}px`);
          }
          for (const text of route.required) {
            if (!layout.bodyText.includes(text)) {
              throw new Error(`${label}: missing required text "${text}" in body "${layout.bodyText.slice(0, 180).replace(/\s+/g, ' ')}"`);
            }
            const visible = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
            if (!visible) throw new Error(`${label}: required text not visible "${text}"`);
          }
          const screenshot = await page.screenshot({ fullPage: false });
          const pixels = await inspectPixels(screenshot, label, viewport);
          receipts.push({ route: route.path, theme, viewport: viewport.name, ...pixels });
          await page.close();
        }
        await context.close();
      }
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
  console.log(`check-news-visual-proof: ${receipts.length} viewport captures passed`);
  for (const row of receipts) {
    console.log(`  ✓ ${row.route} ${row.theme} ${row.viewport} · pixel range ${row.range} · stddev ${row.stddev}`);
  }
}

main().catch((error) => {
  console.error(`check-news-visual-proof: ${error.message}`);
  process.exit(1);
});
