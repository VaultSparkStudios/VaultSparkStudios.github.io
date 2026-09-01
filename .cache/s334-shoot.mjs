/**
 * S334 rendered-pixel capture (CANON-053). Serves the repo statically and
 * screenshots the changed surfaces at desktop + mobile across themes.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(process.argv[2]);
const OUT = resolve(process.argv[3]);
const TARGETS = JSON.parse(process.argv[4]);   // [{url,name}]
const THEMES = JSON.parse(process.argv[5]);    // ['dark','light',...]

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let f = join(ROOT, p);
  if (!existsSync(f) && existsSync(f + '.html')) f = f + '.html';
  if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  try {
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  } catch { res.writeHead(500); res.end('err'); }
});

await new Promise((r) => server.listen(4321, r));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const vp of [{ n: 'desktop', w: 1440, h: 1100 }, { n: 'mobile', w: 390, h: 900 }]) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('vs_theme', t); localStorage.setItem('vs_motion', 'reduced'); } catch {} }, theme);
    const page = await ctx.newPage();
    for (const t of TARGETS) {
      try {
        // 'load' rather than networkidle — several surfaces poll live feeds and
        // never go idle, which would time out instead of capturing.
        await page.goto(`http://127.0.0.1:4321${t.url}`, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(OUT, `${t.name}--${theme}--${vp.n}.png`), fullPage: false });
      } catch (e) {
        console.error(`  ⚠ ${t.name} ${theme} ${vp.n}: ${e.message.split('\n')[0]}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log('captured →', OUT);
