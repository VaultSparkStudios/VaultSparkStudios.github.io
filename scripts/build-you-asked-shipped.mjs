#!/usr/bin/env node
/**
 * build-you-asked-shipped.mjs (S277 CLS root-fix · you-asked-shipped SSR)
 *
 * SSRs the "You asked → we shipped" closed-loop box into changelog/index.html at
 * build time from the committed api/ship-receipts.json, using the ONE shared
 * renderer assets/lib/you-asked-shipped-render.mjs. The box used to be injected
 * post-paint by assets/you-asked-shipped.js and measured ~0.50 of the /changelog/
 * 0.73 CLS; rendered at build it is present at first paint → zero CLS. The client
 * script now skips when the SSR box exists (honest-dark fallback still lives there
 * for any consumer page that has the mount but no SSR).
 *
 * Deterministic: "ago" is computed relative to the feed's own generatedAt, so the
 * committed HTML is stable and --check is a real drift gate (fails if the feed
 * changed without regenerating the box — the generated-layer strand class).
 *
 * Usage:
 *   node scripts/build-you-asked-shipped.mjs            # write
 *   node scripts/build-you-asked-shipped.mjs --check     # exit 1 on drift
 *   node scripts/build-you-asked-shipped.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { renderYasBox } from '../assets/lib/you-asked-shipped-render.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FEED = path.join(ROOT, 'api', 'ship-receipts.json');
const PAGE = path.join(ROOT, 'changelog', 'index.html');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

const START = '<!-- yas-ssr:start -->';
const END = '<!-- yas-ssr:end -->';

/** Pure: given page HTML + rendered box, return the page with the mount populated. */
export function injectBox(html, boxHtml) {
  const inner = boxHtml ? `\n${START}\n${boxHtml}\n${END}\n        ` : `${START}${END}`;
  // Case 1: markers already present — replace between them (idempotent path).
  const markerRe = new RegExp(
    `${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  );
  if (markerRe.test(html)) {
    return html.replace(markerRe, boxHtml ? `${START}\n${boxHtml}\n${END}` : `${START}${END}`);
  }
  // Case 2: bare empty mount — expand it to carry the marker block.
  const bareRe = /(<div data-you-asked-shipped[^>]*>)\s*(<\/div>)/;
  if (bareRe.test(html)) {
    return html.replace(bareRe, `$1${inner}$2`);
  }
  return null; // no mount found — caller decides how loud to be
}

function build(write) {
  const data = JSON.parse(fs.readFileSync(FEED, 'utf8'));
  const nowMs = Date.parse(data.generatedAt) || 0;
  const boxHtml = renderYasBox(data, nowMs);
  const html = fs.readFileSync(PAGE, 'utf8');
  const next = injectBox(html, boxHtml);
  if (next == null) {
    console.error('  ✗ you-asked-shipped: no [data-you-asked-shipped] mount in changelog/index.html');
    process.exit(1);
  }
  if (CHECK) {
    if (next !== html) {
      console.error('  ✗ you-asked-shipped SSR drift — run `node scripts/build-you-asked-shipped.mjs` and commit changelog/index.html');
      process.exit(1);
    }
    console.log('  ✓ you-asked-shipped SSR in sync');
    return;
  }
  if (write && next !== html) {
    fs.writeFileSync(PAGE, next);
    console.log(`  ✓ you-asked-shipped SSR → changelog/index.html (${boxHtml ? 'rendered' : 'honest-dark, empty'})`);
  } else {
    console.log('  ✓ you-asked-shipped SSR already current');
  }
}

if (SELF_TEST) {
  const cases = [];
  const sample = {
    generatedAt: '2026-07-13T00:00:00.000Z',
    receipts: [
      { theme: 'transparency', label: 'Transparency', feedbackSignals: 5, shippedCommits: [{ summary: 'ship <b>proof</b> & more', ts: '2026-07-12T00:00:00.000Z' }] },
      { theme: 'noise', label: 'Skip', feedbackSignals: 0, shippedCommits: [] },
    ],
  };
  const box = renderYasBox(sample, Date.parse(sample.generatedAt));
  cases.push(['renders qualifying receipt', box.includes('Transparency') && box.includes('data-yas-ssr')]);
  cases.push(['drops zero-signal receipt', !box.includes('Skip')]);
  cases.push(['escapes commit summary', box.includes('&lt;b&gt;proof&lt;/b&gt; &amp; more') && !box.includes('<b>proof</b>')]);
  cases.push(['honest-dark returns empty', renderYasBox({ generatedAt: '2026-07-13T00:00:00.000Z', receipts: [] }, 0) === '']);

  const bare = '<div class="container">\n        <div data-you-asked-shipped></div>\n        <section>next</section>';
  const injected = injectBox(bare, box);
  cases.push(['injects into bare mount', injected.includes(START) && injected.includes('data-yas-ssr')]);
  cases.push(['idempotent second inject', injectBox(injected, box) === injected]);
  const emptied = injectBox(injected, '');
  cases.push(['honest-dark collapses markers', emptied.includes(`${START}${END}`) && !emptied.includes('data-yas-ssr')]);
  cases.push(['re-fill after empty restores box', injectBox(emptied, box).includes('data-yas-ssr')]);
  cases.push(['no mount → null', injectBox('<div>nothing here</div>', box) === null]);

  let ok = true;
  for (const [name, pass] of cases) {
    console.log(`  ${pass ? '✓' : '✗'} ${name}`);
    if (!pass) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

build(!CHECK);
