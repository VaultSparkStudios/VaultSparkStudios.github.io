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
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import url from 'node:url';
import { renderYasBox, readerActionReceipts, renderReaderActions } from '../assets/lib/you-asked-shipped-render.mjs';

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

  const snapshotPayload = { observedAt:'2026-08-08T12:00:00Z', minSignals:5, stories:[{slug:'2026-08-07/story',state:'sufficient',total:5}] };
  const hash = (payload) => createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0,20);
  const snapshot = {...snapshotPayload, receiptId:hash(snapshotPayload)};
  const verifySnapshot = ({receiptId, ...payload}) => hash(payload) === receiptId;
  const action = {id:'response-one',storySlug:'2026-08-07/story',sourceReceiptId:snapshot.receiptId,observedAt:snapshot.observedAt,actionAt:'2026-08-09T10:00:00Z',summary:'Filed a clearer <explanation>',actionHref:'/news/directors-report/'};
  const options = {snapshots:[snapshot],verifySnapshot,routeExists:(href)=>['/news/2026-08-07/story/','/news/directors-report/'].includes(href)};
  const contract = (patch={}, opts={}) => readerActionReceipts({date:'2026-08-09',readerActions:[{...action,...patch}]},{...options,...opts});
  const valid = contract();
  cases.push(['explicit action requires a hash-bound sufficient observation', valid.receipts.length===1 && valid.receipts[0].signals===5]);
  cases.push(['absent declarations produce honest empty rather than inferred action', renderReaderActions(readerActionReceipts({date:'2026-08-09'},options)).includes('No reader-linked editorial actions')]);
  for (const [name, patch] of Object.entries({ future:{actionAt:'2026-08-10T00:00:00Z'}, beforeObservation:{actionAt:'2026-08-07T00:00:00Z'}, invalidDate:{actionAt:'2026-02-30T00:00:00Z'}, mismatchedReceipt:{sourceReceiptId:'other'}, mismatchedObservation:{observedAt:'2026-08-08T13:00:00Z'}, missingAction:{summary:''}, unsafeRoute:{actionHref:'//evil.example/'}, missingRoute:{actionHref:'/news/missing/'} })) {
    cases.push(['reader action rejects '+name,contract(patch).errors.length===1]);
  }
  const tinyPayload = {...snapshotPayload,stories:[{...snapshotPayload.stories[0],total:4}]};
  const tiny = {...tinyPayload,receiptId:hash(tinyPayload)};
  cases.push(['tiny counts never buy causal attribution',contract({sourceReceiptId:tiny.receiptId},{snapshots:[tiny]}).errors.length===1]);
  cases.push(['tampered snapshot with unchanged receipt ID is rejected',contract({}, {snapshots:[{...snapshot,stories:[{...snapshot.stories[0],total:50}]}]}).errors.length===1]);
  cases.push(['later observation cannot backfill an older report',readerActionReceipts({date:'2026-08-07',readerActions:[action]},options).errors.length===1]);
  cases.push(['duplicate declarations cannot multiply one response',readerActionReceipts({date:'2026-08-09',readerActions:[action,action]},options).errors.length===1]);
  const rendered = renderReaderActions(valid);
  cases.push(['labels escaped and structured receipt cannot inject script', rendered.includes('&lt;explanation&gt;') && !rendered.includes('<explanation>') && rendered.includes('data-reader-action-receipts')]);
  cases.push(['signals never masquerade as reader totals or ranks', rendered.includes('not unique readers or writer rankings')]);
  cases.push(['rendering is deterministic',rendered===renderReaderActions(valid)]);
  const malicious = contract({summary:'</script><x> & "quoted" \\ literal'});
  const htmlReceipt = renderReaderActions(malicious);
  const embedded = htmlReceipt.match(/<script type="application\/json" data-reader-action-receipts>([\s\S]*?)<\/script>/)?.[1];
  cases.push(['embedded JSON round-trips malicious action text exactly', typeof embedded === 'string' && isDeepStrictEqual(JSON.parse(embedded), malicious)]);
  cases.push(['embedded receipt contains no raw script terminator or opening tag', !embedded.includes('</script>') && !embedded.includes('<x>') && !htmlReceipt.includes('</script><x>')]);


  const chronological = readerActionReceipts({date:'2026-08-09',readerActions:[{...action,id:'fractional',actionAt:'2026-08-09T10:00:00.100Z'},{...action,id:'whole-second',actionAt:'2026-08-09T10:00:00Z'}]},options);
  cases.push(['mixed fractional and whole seconds sort chronologically',chronological.errors.length===0 && chronological.receipts.map((r)=>r.id).join(',')==='whole-second,fractional']);

  let ok = true;
  for (const [name, pass] of cases) {
    console.log(`  ${pass ? '✓' : '✗'} ${name}`);
    if (!pass) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

build(!CHECK);
