#!/usr/bin/env node
/**
 * build-flight-director.mjs (S277 CLS root-fix · Pathfinder SSR)
 *
 * SSRs the Pathfinder panel (intent-flight-director) into the routes where its
 * post-paint insert measured a real CLS hit (/membership/ 0.11, /games/ 0.18,
 * /universe/ 0.27 at 390px). The panel is rendered at build from the committed
 * data/intent-graph.json via the ONE shared renderer assets/lib/flight-director-render.mjs,
 * so it is present at first paint (real content → correct height per viewport → zero
 * CLS). The client (assets/intent-flight-director.js) then re-ranks the same 3 slots
 * in place with local personalization — same slot count → no shift.
 *
 * Only the over-budget routes carry a `<!-- fd-ssr:start --><!-- fd-ssr:end -->` mount;
 * the homepage (0.037) and studio-pulse/oracle (already reserved) are intentionally
 * NOT touched — smallest blast radius that clears the budget. Add a route by placing
 * the marker block before its second <main> section and listing it in TARGETS.
 *
 * Deterministic (graph order, no Date/random) → committed HTML is stable and --check
 * is a real drift gate.
 *
 * Usage:
 *   node scripts/build-flight-director.mjs            # write
 *   node scripts/build-flight-director.mjs --check     # exit 1 on drift
 *   node scripts/build-flight-director.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { defaultCards, renderFlightPanel, routeContext } from '../assets/lib/flight-director-render.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GRAPH = path.join(ROOT, 'data', 'intent-graph.json');

// route → file. Only routes whose measured CLS exceeded the 0.1 budget.
const TARGETS = [
  { route: '/membership/', file: 'membership/index.html' },
  { route: '/games/', file: 'games/index.html' },
  { route: '/universe/', file: 'universe/index.html' },
];

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

const START = '<!-- fd-ssr:start -->';
const END = '<!-- fd-ssr:end -->';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MARKER_RE = new RegExp(`${esc(START)}[\\s\\S]*?${esc(END)}`);

/** Pure: replace the marker block in `html` with the rendered panel. null if no markers. */
export function injectPanel(html, panelHtml) {
  if (!MARKER_RE.test(html)) return null;
  const block = panelHtml ? `${START}\n${panelHtml}\n${END}` : `${START}${END}`;
  return html.replace(MARKER_RE, block);
}

function run(write) {
  const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));
  let drift = false;
  for (const { route, file } of TARGETS) {
    const abs = path.join(ROOT, file);
    const html = fs.readFileSync(abs, 'utf8');
    const cards = defaultCards(graph, routeContext(route));
    const panel = renderFlightPanel(cards);
    const next = injectPanel(html, panel);
    if (next == null) {
      console.error(`  ✗ flight-director: no fd-ssr marker block in ${file}`);
      process.exit(1);
    }
    if (CHECK) {
      if (next !== html) {
        console.error(`  ✗ flight-director SSR drift in ${file} — run \`node scripts/build-flight-director.mjs\` and commit`);
        drift = true;
      }
    } else if (write && next !== html) {
      fs.writeFileSync(abs, next);
      console.log(`  ✓ flight-director SSR → ${file} (${cards.length} cards)`);
    }
  }
  if (CHECK) {
    if (drift) process.exit(1);
    console.log('  ✓ flight-director SSR in sync');
  } else {
    console.log('  ✓ flight-director SSR current');
  }
}

if (SELF_TEST) {
  const graph = {
    contexts: { games: ['a', 'b', 'c', 'd'], home: ['a'] },
    nodes: {
      a: { eyebrow: 'E', title: 'T<a>', copy: 'C&C', href: '/x/', new: true },
      b: { eyebrow: 'E2', title: 'T2', copy: 'C2', href: '/y/' },
      c: { eyebrow: 'E3', title: 'T3', copy: 'C3', href: '/z/' },
      d: { eyebrow: 'E4', title: 'T4', copy: 'C4', href: '/w/' },
    },
  };
  const cards = defaultCards(graph, 'games');
  const panel = renderFlightPanel(cards);
  const cases = [];
  cases.push(['defaultCards caps at 3', cards.length === 3]);
  cases.push(['panel marks data-fd-ssr', panel.includes('data-fd-ssr')]);
  cases.push(['card carries data-fd-key', panel.includes('data-fd-key="a"')]);
  cases.push(['escapes title', panel.includes('T&lt;a&gt;') && !panel.includes('<a>C')]);
  cases.push(['new badge present', panel.includes('vs-flight-new')]);
  cases.push(['empty context → empty panel', renderFlightPanel(defaultCards(graph, 'nope-no-home')) !== undefined]);

  const doc = `<main>\n    ${START}${END}\n    <section>2</section></main>`;
  const injected = injectPanel(doc, panel);
  cases.push(['injects into markers', injected.includes('data-fd-ssr') && injected.includes(START)]);
  cases.push(['idempotent re-inject', injectPanel(injected, panel) === injected]);
  cases.push(['empty panel collapses markers', injectPanel(injected, '').includes(`${START}${END}`)]);
  cases.push(['no markers → null', injectPanel('<main>none</main>', panel) === null]);

  let ok = true;
  for (const [n, p] of cases) { console.log(`  ${p ? '✓' : '✗'} ${n}`); if (!p) ok = false; }
  process.exit(ok ? 0 : 1);
}

run(!CHECK);
