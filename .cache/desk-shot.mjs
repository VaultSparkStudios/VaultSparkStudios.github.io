import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = process.cwd();
const targets = [
  ['story', 'news/2026-08-10/the-intruder-was-an-agent-and-so-was-the-detector/index.html'],
  ['index', 'news/index.html'],
];
const viewports = [['desktop', 1280, 900], ['mobile', 390, 844]];
const b = await chromium.launch();
for (const [name, rel] of targets) {
  for (const [vp, width, height] of viewports) {
    const page = await b.newPage({ viewport: { width, height } });
    await page.goto(pathToFileURL(path.join(ROOT, rel)).href, { waitUntil: 'load' });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const sel = name === 'story' ? '.desk-stats' : '.desk-stats-wide';
    const el = await page.$(sel);
    if (el) await el.screenshot({ path: `.cache/desk-shots/${name}-stats-${vp}.png` });
    if (name === 'story') {
      const r = await page.$('.desk-reactions');
      if (r) await r.screenshot({ path: `.cache/desk-shots/reactions-${vp}.png` });
      const bd = await page.$('.desk-body');
      if (bd) await bd.screenshot({ path: `.cache/desk-shots/body-${vp}.png` });
    }
    await page.close();
  }
}
await b.close();
console.log('captured');
