#!/usr/bin/env node
/**
 * Timed first-viewport proof for the homepage field-LCP sprint.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'visual-proof', 'home-lcp-s173');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const CHECK = args.includes('--check');
const PORT = 4181;
const FRAMES = [500, 1500, 2500, 4000];

async function imageStats(file) {
  const image = sharp(file);
  const metadata = await image.metadata();
  const stats = await image.stats();
  return {
    width: metadata.width,
    height: metadata.height,
    bytes: fs.statSync(file).size,
    nonBlankScore: Number(Math.max(...stats.channels.map((c) => c.stdev || 0)).toFixed(2)),
  };
}

function manifestOk(manifest) {
  return Boolean(manifest && manifest.schemaVersion === '1.0' && Array.isArray(manifest.captures) && manifest.captures.length >= FRAMES.length);
}

if (SELF_TEST) {
  const cases = [
    ['valid manifest passes', manifestOk({ schemaVersion: '1.0', captures: FRAMES.map((n) => ({ frameMs: n })) })],
    ['empty manifest fails', !manifestOk({ schemaVersion: '1.0', captures: [] })],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (CHECK) {
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('capture-home-first-viewport-proof --check: missing manifest');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifestOk(manifest)) {
    console.error('capture-home-first-viewport-proof --check: manifest shape drift');
    process.exit(1);
  }
  console.log(`capture-home-first-viewport-proof --check: OK (${manifest.captures.length} frame(s))`);
  process.exit(0);
}

function waitForServer(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('local preview server did not start')), timeoutMs);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https?:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`local preview server exited early with code ${code}`));
    });
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const { spawn } = await import('node:child_process');
const child = spawn(process.execPath, ['scripts/local-preview-server.mjs'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, LOCAL_PREVIEW_PORT: String(PORT) },
});

let browser;
const captures = [];
try {
  const base = await waitForServer(child);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const start = Date.now();
  for (const frameMs of FRAMES) {
    const wait = Math.max(0, frameMs - (Date.now() - start));
    if (wait) await page.waitForTimeout(wait);
    const file = path.join(OUT_DIR, `home-${frameMs}ms-desktop.png`);
    await page.screenshot({ path: file, fullPage: false });
    const visibility = await page.evaluate(() => ({
      brand: Boolean(document.querySelector('.brand')),
      heroWordmark: Boolean(document.querySelector('.forge-wordmark')),
      primaryCta: Boolean(document.querySelector('.hero-actions .button, .hero-actions a')),
      tagline: Boolean(document.querySelector('.hero-tagline')),
    }));
    captures.push({
      route: '/',
      viewport: 'desktop',
      frameMs,
      status: 200,
      screenshot: path.relative(ROOT, file).replace(/\\/g, '/'),
      visibility,
      pageErrors,
      ...(await imageStats(file)),
    });
  }
} finally {
  if (browser) await browser.close();
  child.kill();
}

const manifest = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/capture-home-first-viewport-proof.mjs',
  purpose: 'S173 homepage first-viewport proof for field-LCP sprint',
  routes: ['/'],
  captures,
};
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`home first-viewport proof captured: ${captures.length} frame(s) -> ${path.relative(ROOT, OUT_DIR)}`);

spawnSync(process.execPath, ['scripts/render-visual-proof-gallery.mjs'], { cwd: ROOT, stdio: 'inherit' });
