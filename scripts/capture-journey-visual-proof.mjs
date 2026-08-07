#!/usr/bin/env node
// CANON-053 journey proof: all four touched states × seven themes × desktop
// and mobile. Raw state captures stay in .cache; one 2×2 contact sheet per
// theme/viewport is committed and hash-bound by docs/visual-qa/LATEST.json.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = resolve('.');
const RAW = join(ROOT, '.cache', 'journey-visual');
const RECEIPT_DIR = join(ROOT, 'docs', 'visual-qa');
const argv = process.argv.slice(2);
const listArg = (name, fallback) => { const at = argv.indexOf(name); return (at >= 0 ? argv[at + 1].split(',') : fallback); };
const THEMES = listArg('--themes', ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast']);
const viewportNames = listArg('--viewports', ['desktop', 'mobile']);
const VIEWPORTS = [{ name: 'desktop', width: 1366, height: 900 }, { name: 'mobile', width: 390, height: 844 }].filter((item) => viewportNames.includes(item.name));
const STATES = listArg('--states', ['bridge', 'tour', 'feedback', 'compass']);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function server() {
  return new Promise((resolveServer) => {
    const instance = createServer((req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        const rel = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
        let file = join(ROOT, rel);
        if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
        if (statSync(file).isDirectory()) file = join(file, 'index.html');
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(readFileSync(file));
      } catch { res.writeHead(500); res.end(); }
    });
    instance.listen(0, '127.0.0.1', () => resolveServer(instance));
  });
}

async function capture(browser, origin, theme, viewport, state) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  await context.addInitScript(({ selectedTheme, selectedState }) => {
    localStorage.clear(); sessionStorage.clear(); localStorage.setItem('vs_theme', selectedTheme);
    if (selectedState === 'tour') localStorage.setItem('vs_journey_pages_v1', JSON.stringify(['/studio/']));
    if (selectedState === 'compass') localStorage.setItem('vs_cst_visited', JSON.stringify(['/studio/']));
  }, { selectedTheme: theme, selectedState: state });
  const page = await context.newPage();
  const route = state === 'compass' ? '/games/' : '/games/call-of-doodie/';
  await page.goto(origin + route, { waitUntil: 'load', timeout: 30000 });
  await page.dispatchEvent('body', 'pointerdown');
  if (state === 'bridge') {
    const target = page.locator('[data-vault-bridge]'); await target.waitFor({ timeout: 20000 }); await target.scrollIntoViewIfNeeded();
  } else if (state === 'tour') {
    await page.locator('.vs-journey').waitFor({ timeout: 20000 });
  } else if (state === 'feedback') {
    await page.waitForFunction(() => !!window.VSJourneyConductor, null, { timeout: 20000 });
    await page.evaluate(() => { document.documentElement.setAttribute('data-vs-feedback-preview', ''); window.VSJourneyConductor.previewFeedback(); });
    await page.locator('.vs-decision-choices').waitFor({ timeout: 5000 });
  } else {
    await page.locator('[data-constellation-compass]').waitFor({ timeout: 20000 });
  }
  await page.waitForTimeout(350);
  const file = join(RAW, `${theme}--${viewport.name}--${state}.png`);
  await page.screenshot({ path: file, animations: 'disabled' });
  await context.close();
  return file;
}

function labelSvg(label, width) {
  const safe = label.replace(/[&<>]/g, '');
  return Buffer.from(`<svg width="${width}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="44" fill="#07080f" fill-opacity=".88"/><text x="16" y="28" fill="#ffc400" font-family="Arial,sans-serif" font-size="18" font-weight="700">${safe}</text></svg>`);
}

async function contactSheet(theme, viewport, files) {
  const cellW = Math.floor(viewport.width / 2); const cellH = Math.floor(viewport.height / 2);
  const composites = [];
  for (let index = 0; index < files.length; index++) {
    const state = STATES[index];
    const image = await sharp(files[index]).resize(cellW, cellH, { fit: 'cover', position: 'centre' }).composite([{ input: labelSvg(state.toUpperCase(), cellW), top: 0, left: 0 }]).png().toBuffer();
    composites.push({ input: image, left: (index % 2) * cellW, top: Math.floor(index / 2) * cellH });
  }
  const out = join(RECEIPT_DIR, `journey-${theme}-${viewport.name}.png`);
  await sharp({ create: { width: cellW * 2, height: cellH * 2, channels: 4, background: '#07080f' } }).composite(composites).png().toFile(out);
  return out;
}

async function main() {
  mkdirSync(RAW, { recursive: true }); mkdirSync(RECEIPT_DIR, { recursive: true });
  const httpServer = await server(); const port = httpServer.address().port; const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true }); const captures = [];
  try {
    for (const theme of THEMES) for (const viewport of VIEWPORTS) {
      const files = [];
      for (const state of STATES) { console.log(`→ ${theme} ${viewport.name} ${state}`); files.push(await capture(browser, origin, theme, viewport, state)); console.log(`✓ ${theme} ${viewport.name} ${state}`); }
      const sheet = await contactSheet(theme, viewport, files);
      captures.push({ theme, viewport: { width: viewport.width, height: viewport.height }, file: sheet.split(/[\\/]/).at(-1), sha256: sha256(sheet), page: '/games/ journey states: bridge · tour · feedback · constellation compass' });
    }
  } finally { await browser.close(); await new Promise((done) => httpServer.close(done)); }
  const manifest = { schemaVersion: 1, capturedAt: new Date().toISOString(), generatedBy: 'scripts/capture-journey-visual-proof.mjs', themes: THEMES, inspection: { renderedPixelsReviewed: false, reviewer: 'pending image-capable review', findings: [], fixesApplied: [], blockingDefectsOpen: 1 }, matrix: { rawCaptures: THEMES.length * VIEWPORTS.length * STATES.length, states: STATES, contactSheets: captures.length }, captures };
  writeFileSync(join(RECEIPT_DIR, 'LATEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`journey visual proof: ${manifest.matrix.rawCaptures} raw captures · ${captures.length} hash-bound contact sheets · review pending`);
}

main().catch((error) => { console.error(error); process.exit(1); });
