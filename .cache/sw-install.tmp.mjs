import { chromium } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(base + '/status/', { waitUntil: 'load' });
const result = await p.evaluate(async () => {
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const w = reg.installing || reg.waiting || reg.active;
    if (!w) return 'no worker';
    if (w.state === 'activated') return 'activated';
    return await new Promise((res) => {
      w.addEventListener('statechange', () => { if (w.state === 'activated' || w.state === 'redundant') res(w.state); });
      setTimeout(() => res('timeout state=' + w.state), 45000);
    });
  } catch (e) { return 'err ' + e.message; }
});
console.log(base, 'service worker:', result);
await b.close();
