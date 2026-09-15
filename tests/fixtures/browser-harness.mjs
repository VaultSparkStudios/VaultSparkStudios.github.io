// browser-harness.mjs — shared fixture origin for node:test browser unit specs.
//
// Serves fixture HTML + the real repo assets/ files from a fake origin, routes
// named handlers (mocked APIs), and ABORTS every other request — these specs
// never touch production, Supabase, Turnstile, or any network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ORIGIN = 'https://unit.fixture.test';

const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' };

export function launchBrowser() {
  return chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage'] });
}

export function html({ head = '', body = '' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>fixture</title>${head}</head><body>${body}</body></html>`;
}

/**
 * @param {import('@playwright/test').Browser} browser
 * @param {object} opts
 * @param {Record<string,string>} [opts.pages] pathname -> HTML
 * @param {{match:(url:URL, req:any)=>boolean, handle:(route:any, req:any)=>Promise<void>}[]} [opts.handlers]
 * @param {(Function|{fn:Function,arg:any})[]} [opts.initScripts]
 * @param {object} [opts.contextOptions]
 * @param {boolean} [opts.clock] install Playwright's fake clock before navigation
 */
export async function openFixture(browser, { pages = {}, handlers = [], initScripts = [], contextOptions = {}, clock = false } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', ...contextOptions });
  const log = { requests: [], blocked: [], errors: [] };
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    log.requests.push({ method: request.method(), url: request.url(), postData: request.postData() });
    for (const h of handlers) {
      if (h.match(url, request)) return h.handle(route, request);
    }
    if (url.origin === ORIGIN) {
      if (Object.hasOwn(pages, url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: pages[url.pathname] });
      }
      if (url.pathname.startsWith('/assets/')) {
        const file = path.join(ROOT, url.pathname);
        if (file.startsWith(path.join(ROOT, 'assets')) && fs.existsSync(file)) {
          return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        }
      }
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    }
    log.blocked.push(request.url());
    return route.abort('blockedbyclient');
  });
  for (const s of initScripts) {
    if (typeof s === 'function') await context.addInitScript(s);
    else await context.addInitScript(s.fn, s.arg);
  }
  if (clock) await context.clock.install();
  const page = await context.newPage();
  page.on('pageerror', (e) => log.errors.push(String((e && e.message) || e)));
  return {
    context,
    page,
    log,
    goto: (p) => page.goto(ORIGIN + p, { waitUntil: 'load' }),
    close: () => context.close(),
  };
}

/** Node-side poll (real timers, so it also works when the page clock is faked). */
export async function waitFor(predicate, { timeout = 2000, interval = 25, message = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${message}`);
    await new Promise((r) => setTimeout(r, interval));
  }
}

/** Short fixed wait used only to prove something did NOT happen. */
export const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/** Init script: capture navigator.sendBeacon payloads into window.__beacons. */
export function beaconStub() {
  window.__beacons = [];
  navigator.sendBeacon = function (url, data) {
    const push = (body) => window.__beacons.push({ url: String(url), body });
    if (data && typeof data.text === 'function') data.text().then(push);
    else push(String(data));
    return true;
  };
}
