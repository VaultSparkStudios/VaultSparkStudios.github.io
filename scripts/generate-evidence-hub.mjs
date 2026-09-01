#!/usr/bin/env node
/**
 * generate-evidence-hub.mjs — S334.
 *
 * Builds /evidence/, the front door for the studio's live-data surfaces.
 *
 * The site publishes eight of them — /status/, /stats/, /stats/ecosystem/,
 * /proof/, /studio-pulse/, /oracle/, /notebook/, /ignis-health/ — and every one
 * answers a version of the same question: is this studio real and working? The
 * radical-transparency layer is the most differentiated thing here, and a
 * first-time visitor had eight unlabelled doors and no way to choose.
 *
 * This page is a SPINE, not a replacement. Each lane's deep page stays
 * canonical; the hub routes to it and stamps how fresh its feed is. Nothing
 * moves, so no permalink, receipt, or evidence graph edge breaks.
 *
 * The freshness stamp is fetched live in the browser rather than baked at build
 * time, because a build-time stamp ages into a lie the moment it ships — the
 * exact failure this whole surface exists to avoid. A feed that cannot be read
 * says UNKNOWN. It never guesses, and it never renders a stale green.
 *
 * Chrome is harvested from a page this script does NOT write (S305's rule,
 * learned when a generator harvested from its own output and a failed nav
 * harvest became self-perpetuating).
 *
 * Usage:
 *   node scripts/generate-evidence-hub.mjs           # dry-run
 *   node scripts/generate-evidence-hub.mjs --apply
 *   node scripts/generate-evidence-hub.mjs --check   # exit 1 if stale
 *   node scripts/generate-evidence-hub.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'evidence', 'index.html');

const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Validate the lane set before rendering anything.
 *
 * A hub that routes to a page which does not exist is worse than no hub: it
 * turns a navigation problem into a 404. Every href and every feed is resolved
 * against the tree at build time.
 */
export function validateLanes(lanes, exists) {
  const problems = [];
  const seen = new Set();
  for (const lane of lanes) {
    if (seen.has(lane.id)) problems.push(`duplicate lane id "${lane.id}"`);
    seen.add(lane.id);
    for (const [what, href] of [['href', lane.href], ...(lane.also || []).map((a) => ['also', a.href])]) {
      const path = String(href).split('#')[0];
      if (!path.startsWith('/')) { problems.push(`${lane.id}: ${what} "${href}" is not site-absolute`); continue; }
      const rel = path.replace(/^\//, '');
      const target = rel.endsWith('/') ? `${rel}index.html` : rel;
      if (!exists(target)) problems.push(`${lane.id}: ${what} "${href}" does not resolve to ${target}`);
    }
    const feedRel = String(lane.feed).replace(/^\//, '');
    if (!exists(feedRel)) problems.push(`${lane.id}: feed "${lane.feed}" does not exist`);
  }
  return problems;
}

/** Ages a timestamp into words. Kept pure so the self-test does not need a clock. */
export function describeAge(generatedAt, now) {
  const ts = Date.parse(generatedAt);
  if (!generatedAt || Number.isNaN(ts)) return null;
  const mins = Math.round((now - ts) / 60000);
  if (mins < 0) return 'just now';
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const HUB_STYLE = `<style>
.ev-head{padding:5rem 0 1rem}
.ev-lede{color:var(--muted);max-width:68ch;font-size:1.08rem;line-height:1.7;margin-top:1rem}
.ev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(248px,1fr));gap:1.25rem;padding:2rem 0 4rem}
.ev-card{display:flex;flex-direction:column;padding:1.75rem;border-radius:var(--radius,20px);border:1px solid rgba(127,127,127,.22);background:rgba(127,127,127,.04)}
.ev-q{font-family:Georgia,serif;font-size:1.28rem;line-height:1.25;margin:0 0 .6rem}
.ev-label{font:600 .72rem/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:.85rem}
.ev-blurb{color:var(--muted);font-size:.95rem;line-height:1.65;margin:0 0 1.4rem;flex:1}
.ev-cta{display:inline-flex;align-items:center;gap:.45rem;font-weight:700;font-size:.95rem;color:var(--gold);text-decoration:none;border-bottom:1px solid transparent}
.ev-cta:hover,.ev-cta:focus-visible{border-bottom-color:currentColor}
.ev-also{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:.4rem}
.ev-also a{color:var(--muted);font-size:.88rem;text-decoration:underline;text-underline-offset:3px}
.ev-fresh{display:inline-flex;align-items:center;gap:.45rem;margin-top:1.25rem;font:500 .8rem/1 system-ui,sans-serif;color:var(--dim)}
.ev-dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex-shrink:0}
.ev-fresh[data-state="current"]{color:#4ade80}
.ev-fresh[data-state="aging"]{color:#fbbf24}
.ev-fresh[data-state="unknown"]{color:var(--dim)}
.ev-foot{color:var(--dim);font-size:.88rem;max-width:68ch;padding-bottom:4rem;line-height:1.7}
@media(max-width:640px){.ev-head{padding:3.5rem 0 .5rem}.ev-card{padding:1.35rem}}
</style>`;

/**
 * Freshness is read in the browser, from the same public feeds the deep pages
 * use. Three states only, and the third is honest: a feed that will not parse
 * is UNKNOWN, never green.
 */
const HUB_SCRIPT = `<script>
(function(){
  function describe(ts,now){
    var t=Date.parse(ts); if(!ts||isNaN(t))return null;
    var m=Math.round((now-t)/60000);
    if(m<2)return'just now';
    if(m<60)return m+' min ago';
    var h=Math.round(m/60);
    if(h<48)return h+'h ago';
    return Math.round(h/24)+'d ago';
  }
  var nodes=document.querySelectorAll('[data-ev-feed]');
  Array.prototype.forEach.call(nodes,function(el){
    var url=el.getAttribute('data-ev-feed');
    fetch(url,{cache:'no-store'}).then(function(r){
      if(!r.ok)throw new Error(r.status);
      return r.json();
    }).then(function(j){
      var age=describe(j.generatedAt,Date.now());
      if(!age){el.setAttribute('data-state','unknown');el.querySelector('.ev-fresh-text').textContent='freshness unknown';return;}
      var hours=(Date.now()-Date.parse(j.generatedAt))/3600000;
      el.setAttribute('data-state',hours<36?'current':'aging');
      el.querySelector('.ev-fresh-text').textContent='updated '+age;
    }).catch(function(){
      el.setAttribute('data-state','unknown');
      el.querySelector('.ev-fresh-text').textContent='freshness unavailable';
    });
  });
})();
</script>`;

export function buildCard(lane) {
  const also = (lane.also || []).length
    ? `<ul class="ev-also">${lane.also.map((a) => `<li><a href="${escapeHtml(a.href)}">${escapeHtml(a.label)}</a></li>`).join('')}</ul>`
    : '';
  return `<article class="ev-card" id="${escapeHtml(lane.id)}">
<p class="ev-label">${escapeHtml(lane.label)}</p>
<h2 class="ev-q">${escapeHtml(lane.question)}</h2>
<p class="ev-blurb">${escapeHtml(lane.blurb)}</p>
<a class="ev-cta" href="${escapeHtml(lane.href)}">${escapeHtml(lane.linkLabel)} &rarr;</a>
${also}
<p class="ev-fresh" data-state="unknown" data-ev-feed="${escapeHtml(lane.feed)}"><span class="ev-dot" aria-hidden="true"></span><span class="ev-fresh-text">checking freshness…</span></p>
</article>`;
}

/** Every indexable page carries a BreadcrumbList — inject-breadcrumb-jsonld gates it. */
function buildBreadcrumb() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vaultsparkstudios.com/' },
      { '@type': 'ListItem', position: 2, name: 'Evidence', item: 'https://vaultsparkstudios.com/evidence/' },
    ],
  });
}

function buildJsonLd(lanes) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Evidence — VaultSpark Studios',
    url: 'https://vaultsparkstudios.com/evidence/',
    description: 'Every live, checkable record VaultSpark Studios publishes about itself — status, numbers, in-browser proof, and work in motion.',
    hasPart: lanes.map((l) => ({ '@type': 'WebPage', name: l.question, url: `https://vaultsparkstudios.com${l.href}` })),
    publisher: { '@type': 'Organization', name: 'VaultSpark Studios', url: 'https://vaultsparkstudios.com/' },
  });
}

export function buildPage(lanes, chrome) {
  const depth = '../';
  return `<!DOCTYPE html><html lang="en" class="dark-mode" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evidence — Check Everything We Claim | VaultSpark Studios</title><meta name="description" content="Every live, checkable record VaultSpark Studios publishes about itself: real-time status, source-dated numbers, in-browser hash verification, and the forge in motion."><meta property="og:title" content="Evidence — VaultSpark Studios"><meta property="og:description" content="Do not take our word for it. Status, numbers, in-browser proof, and work in motion — each with its own freshness."><meta property="og:url" content="https://vaultsparkstudios.com/evidence/"><meta property="og:image" content="https://vaultsparkstudios.com/assets/og/og-evidence.png"><meta name="twitter:image" content="https://vaultsparkstudios.com/assets/og/og-evidence.png"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="https://vaultsparkstudios.com/evidence/"><link rel="stylesheet" href="${depth}${chrome.style}">${chrome.speculation}${HUB_STYLE}
<script type="application/ld+json" data-vs-breadcrumb>${buildBreadcrumb()}</script>
<script type="application/ld+json">${buildJsonLd(lanes)}</script>
  <link rel="alternate" type="application/json" href="/agents.json" />
</head><body class="dark-mode" data-theme="dark">
${chrome.themeBoot}<a href="#main-content" class="skip-link">Skip to main content</a><header class="site-header">
    <div class="container nav">
      <a class="brand" href="/" aria-label="VaultSpark Studios — home">
        <img fetchpriority="high" src="${depth}assets/vaultspark-icon-nav.webp" alt="VaultSpark Studios icon" width="44" height="44" />
        <span class="brand-wordmark">VaultSpark<span class="brand-suffix"> Studios</span><small>The vault is sparked</small></span>
      </a>
      ${chrome.nav}
      <div class="nav-right">
        <a class="nav-signin" href="/vault-member/#login">Sign In</a>
        <a class="button button-sm" href="/vault-member/#register">Join The Vault</a>
        <button type="button" class="hamburger" id="hamburger" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header><main id="main-content"><section class="container ev-head"><span class="eyebrow">Evidence</span><h1 style="font-family:Georgia,serif;font-size:clamp(2.4rem,6vw,4.2rem)">Check everything we claim.</h1><p class="ev-lede">Most studios ask you to believe a launch trailer. This one publishes its own status, its own numbers, its own deploy hashes, and its own unfinished work — and lets you re-compute the proof in your browser. Four doors, each with its own freshness. If a feed is stale, this page says so rather than showing you a green light.</p></section><section class="container"><div class="ev-grid">${lanes.map(buildCard).join('\n')}</div><p class="ev-foot">Every lane above is generated from a public feed and links to the page that owns it — nothing here is retyped by hand, so nothing here can quietly disagree with the source. Machine readers: the same records are enumerated in <a href="/agents.json">agents.json</a>.</p></section></main>${chrome.footer}  ${chrome.ambient}
${chrome.navSheet}${HUB_SCRIPT}
</body></html>
`;
}

const NAV_LABEL = '<span class="dropdown-label dropdown-status-intel">Live Intelligence</span>';
const NAV_LINK = '<a href="/evidence/" class="dropdown-link-intel">Evidence</a>';

/**
 * Put the hub at the head of the nav group it is the front door to.
 *
 * The Studio > Live Intelligence group already lists Pulse, Oracle, IGNIS,
 * Atlas, Status, Stats and Proof — the exact surfaces this hub routes between —
 * so Evidence belongs first in that list, not as an eighth peer.
 *
 * Injected here rather than by propagate-nav.mjs, which is a documented
 * landmine: its hand-maintained NAV_GAMES/NAV_PROJECTS arrays are stale against
 * the registry-driven pages, and running it bare clobbered 126 pages in S329.
 * This is a single anchored, idempotent insertion that touches nothing else.
 */
export function injectNavLink(html) {
  if (html.includes(NAV_LINK)) return null;          // already present
  if (!html.includes(NAV_LABEL)) return null;        // page has no such group
  return html.replace(NAV_LABEL, NAV_LABEL + NAV_LINK);
}

const FOOTER_ANCHOR = '<a href="/status/">Status</a>';
const FOOTER_LINK = '<a href="/evidence/">Evidence</a>';

function footerSpan(html) {
  const start = html.indexOf('<footer class="site-footer"');
  if (start < 0) return null;
  const end = html.indexOf('</footer>', start);
  return end < 0 ? null : { start, end };
}

/**
 * The header/footer contract (check-footer-contract, derived from index.html)
 * requires every header link to be reachable from the footer too — a reader who
 * scrolled past the nav must still be able to get anywhere the nav offered.
 * Adding Evidence to the Live Intelligence dropdown without the footer entry
 * correctly failed that gate.
 *
 * Scoped to the <footer> element on purpose: `<a href="/status/">Status</a>`
 * also occurs in the header nav, so an unscoped replace() hit the HEADER's first
 * match and left the footer untouched — producing a duplicate header link and
 * the identical gate failure it was meant to fix.
 */
export function injectFooterLink(html) {
  const span = footerSpan(html);
  if (!span) return null;
  const footer = html.slice(span.start, span.end);
  if (footer.includes(FOOTER_LINK)) return null;
  if (!footer.includes(FOOTER_ANCHOR)) return null;
  const patched = footer.replace(FOOTER_ANCHOR, `${FOOTER_LINK}\n          ${FOOTER_ANCHOR}`);
  return html.slice(0, span.start) + patched + html.slice(span.end);
}

/** Does the FOOTER — not the whole document — already satisfy the contract? */
export function footerHasLink(html) {
  const span = footerSpan(html);
  if (!span) return true;                            // no footer to satisfy
  const footer = html.slice(span.start, span.end);
  return !footer.includes(FOOTER_ANCHOR) || footer.includes(FOOTER_LINK);
}

/** Harvest shared chrome from a page this generator does not write (S305). */
function readChrome() {
  const sample = readFileSync(join(ROOT, 'journal/index.html'), 'utf8');
  const between = (start, end) => {
    const a = sample.indexOf(start);
    if (a < 0) return '';
    const b = sample.indexOf(end, a);
    return b < 0 ? '' : sample.slice(a, b + end.length);
  };
  const navStart = sample.indexOf('<nav class="nav-center"');
  const navEnd = sample.indexOf('</nav>', navStart) + '</nav>'.length;
  const nav = navStart >= 0 && navEnd > navStart ? sample.slice(navStart, navEnd) : '';
  if (!nav.includes('nav-item')) {
    console.error('[generate-evidence-hub] nav harvest failed — refusing to write a page without a primary nav');
    process.exit(1);
  }
  const themeBoot = (sample.match(/<script>!function\(\)\{try\{var t=localStorage\.getItem\('vs_theme'\)[\s\S]*?<\/script>/) || [''])[0];
  return {
    nav,
    footer: between('<footer class="site-footer"', '</footer>').replaceAll('../assets/', '../assets/'),
    ambient: between('<!-- vs-ambient:start -->', '<!-- vs-ambient:end -->'),
    speculation: between('<!-- vs-speculation:start -->', '<!-- vs-speculation:end -->'),
    themeBoot,
    style: (sample.match(/href="(?:\.\.\/)*(assets\/style\.shell-[a-f0-9]+\.css)"/) || [])[1] || 'assets/style.css',
    navSheet: (sample.match(/<script src="\/assets\/nav-sheet\.shell-[a-f0-9]+\.js" defer><\/script>/) || [''])[0],
  };
}

function selfTest() {
  const results = [];
  const t = (n, ok) => results.push([n, ok]);
  const exists = (p) => ['status/index.html', 'stats/index.html', 'api/x.json'].includes(p);

  t('a lane pointing at a missing page is rejected',
    validateLanes([{ id: 'a', href: '/nope/', feed: '/api/x.json' }], exists).length === 1);
  t('a lane with a missing feed is rejected',
    validateLanes([{ id: 'a', href: '/status/', feed: '/api/gone.json' }], exists).length === 1);
  t('a valid lane passes',
    validateLanes([{ id: 'a', href: '/status/', feed: '/api/x.json' }], exists).length === 0);
  t('an anchor href resolves through its page',
    validateLanes([{ id: 'a', href: '/stats/#x', feed: '/api/x.json' }], exists).length === 0);
  t('a duplicate lane id is rejected',
    validateLanes([{ id: 'a', href: '/status/', feed: '/api/x.json' }, { id: 'a', href: '/status/', feed: '/api/x.json' }], exists).length === 1);

  const now = Date.parse('2026-09-01T12:00:00Z');
  t('a missing timestamp is unknown, not fresh', describeAge(undefined, now) === null);
  t('an unparseable timestamp is unknown, not fresh', describeAge('soon', now) === null);
  t('minutes render as minutes', describeAge('2026-09-01T11:30:00Z', now) === '30 min ago');
  t('a day renders as hours', describeAge('2026-08-31T12:00:00Z', now) === '24h ago');
  t('a week renders as days', describeAge('2026-08-25T12:00:00Z', now) === '7d ago');
  t('escaping is applied to lane text', buildCard({ id: 'x', label: 'L', question: '<b>q</b>', blurb: 'b', href: '/a/', linkLabel: 'go', feed: '/f.json' }).includes('&lt;b&gt;q&lt;/b&gt;'));

  // The footer link must land in the FOOTER even though the same anchor text
  // appears earlier in the header — the first version of this replaced the
  // header's match, added a duplicate nav link, and left the gate failing.
  const dual = '<header><a href="/status/">Status</a></header><footer class="site-footer"><a href="/status/">Status</a></footer>';
  const injected = injectFooterLink(dual);
  t('the footer link lands in the footer, not the header',
    injected.indexOf(FOOTER_LINK) > injected.indexOf('<footer'));
  t('the header copy is left untouched',
    (injected.match(/<a href="\/evidence\/">Evidence<\/a>/g) || []).length === 1);
  t('a page whose footer already has it is a no-op', injectFooterLink(injected) === null);
  t('footerHasLink is judged on the footer alone',
    footerHasLink('<header><a href="/evidence/">Evidence</a></header><footer class="site-footer"><a href="/status/">Status</a></footer>') === false);

  const failed = results.filter(([, ok]) => !ok);
  for (const [n, ok] of results) console.log(`  ${ok ? '✓' : '⛔'} ${n}`);
  console.log(`[generate-evidence-hub] self-test ${results.length - failed.length}/${results.length}`);
  return failed.length === 0;
}

if (SELF_TEST) {
  process.exit(selfTest() ? 0 : 1);
}

const { lanes } = JSON.parse(readFileSync(join(ROOT, 'data/evidence-hub.json'), 'utf8'));
const problems = validateLanes(lanes, (p) => existsSync(join(ROOT, p)));
if (problems.length) {
  console.error('[generate-evidence-hub] refusing to build a hub that routes into 404s:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

/* Nav injection is judged independently of the page: a hub that is current must
   still be reachable, so gating this on "the page changed" would leave it
   permanently unlinked on a settled tree. */
const navTargets = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n').map((s) => s.trim())
  .filter((f) => f && !f.startsWith('docs/') && !f.startsWith('lighthouse-results/') && !f.startsWith('.cache/'));
let navLinked = 0;
let footerLinked = 0;
const navMissing = [];
const footerMissing = [];
for (const rel of navTargets) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  let body = readFileSync(file, 'utf8');
  let dirty = false;

  if (body.includes(NAV_LABEL) && !body.includes(NAV_LINK)) {
    if (CHECK) navMissing.push(rel);
    else { const next = injectNavLink(body); if (next) { body = next; dirty = true; navLinked += 1; } }
  }
  // Header and footer travel together — the contract requires both.
  if (!footerHasLink(body)) {
    if (CHECK) footerMissing.push(rel);
    else { const next = injectFooterLink(body); if (next) { body = next; dirty = true; footerLinked += 1; } }
  }
  if (dirty) writeFileSync(file, body, 'utf8');
}
if (navLinked) console.log(`[generate-evidence-hub] linked /evidence/ into the Live Intelligence nav on ${navLinked} page(s)`);
if (footerLinked) console.log(`[generate-evidence-hub] linked /evidence/ into the Studio footer column on ${footerLinked} page(s)`);
if (CHECK && (navMissing.length || footerMissing.length)) {
  if (navMissing.length) console.error(`[generate-evidence-hub] --check: ${navMissing.length} page(s) have the Live Intelligence nav group but no /evidence/ link`);
  if (footerMissing.length) console.error(`[generate-evidence-hub] --check: ${footerMissing.length} page(s) have the Studio footer column but no /evidence/ link`);
  process.exitCode = 1;
}

const html = buildPage(lanes, readChrome());
const existing = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
if (existing.trim() === html.trim()) {
  console.log('[generate-evidence-hub] OK: evidence/index.html current');
} else if (CHECK) {
  console.error('[generate-evidence-hub] STALE: evidence/index.html — run with --apply');
  process.exit(1);
} else if (APPLY) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html, 'utf8');
  console.log(`[generate-evidence-hub] wrote evidence/index.html (${lanes.length} lanes)`);
} else {
  console.log('[generate-evidence-hub] STALE — run with --apply');
}
