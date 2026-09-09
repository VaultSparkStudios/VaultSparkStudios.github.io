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
 * S335 exception: /proof/ was folded INTO this page. The in-browser ledger
 * verifier (assets/proof-verify.js) now lives at /evidence/#verify, the old
 * route is an edge 301 in _redirects, and the "proof" lane points at the
 * on-page anchor rather than a separate door.
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
import { injectSuite } from './build-intelligence-suite.mjs';

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
const SELF_PATH = '/evidence/';
/** Anchors this generator itself renders — a self-referential lane must land on one. */
export const SELF_ANCHORS = new Set(['verify']);

export function validateLanes(lanes, exists) {
  const problems = [];
  const seen = new Set();
  for (const lane of lanes) {
    if (seen.has(lane.id)) problems.push(`duplicate lane id "${lane.id}"`);
    seen.add(lane.id);
    for (const [what, href] of [['href', lane.href], ...(lane.also || []).map((a) => ['also', a.href])]) {
      const [path, anchor] = String(href).split('#');
      if (!path.startsWith('/')) { problems.push(`${lane.id}: ${what} "${href}" is not site-absolute`); continue; }
      if (path === SELF_PATH) {
        // S335: a lane may route to a section of this page — but only to one the
        // generator actually renders. Checking the tree here would be circular
        // (the page this script writes is the one being validated).
        if (!anchor || !SELF_ANCHORS.has(anchor)) problems.push(`${lane.id}: ${what} "${href}" is self-referential but names no rendered anchor (${[...SELF_ANCHORS].join(', ')})`);
        continue;
      }
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
.ev-verify{max-width:860px;padding:0 0 5rem;scroll-margin-top:calc(var(--nav-height,78px) + 1rem)}
.ev-verify h2{font-family:Georgia,"Times New Roman",serif;font-size:1.45rem;letter-spacing:-.03em;margin:2.4rem 0 .7rem;color:var(--text)}
.ev-verify h2:first-of-type{margin-top:.5rem}
.ev-verify p{color:var(--muted);font-size:.97rem;line-height:1.72;margin-bottom:.9rem}
.ev-verify a{color:var(--gold)}
.ev-verify a:hover{color:#ffe066}
.proof-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.9rem;margin:1.4rem 0 .4rem}
.proof-tile{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1rem 1.1rem;background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:.35rem}
body.light-mode .proof-tile{border-color:rgba(20,28,52,.12);background:rgba(20,28,52,.03)}
.proof-tile-label{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.proof-tile-value{font-family:Georgia,"Times New Roman",serif;font-size:1.25rem;color:var(--text)}
.proof-tile-good .proof-tile-value{color:#6fe3a1}
.proof-tile-amber .proof-tile-value{color:var(--gold)}
body.light-mode .proof-tile-good .proof-tile-value{color:#147a43}
.proof-tile-detail{font-size:.82rem;color:var(--muted);line-height:1.55}
.proof-run-row{margin:1.6rem 0 1rem;display:flex;flex-wrap:wrap;align-items:center;gap:1rem}
.proof-summary{color:var(--text);font-size:.95rem;font-weight:600;max-width:46ch}
.proof-checks{list-style:none;margin:1rem 0 0;padding:0;display:flex;flex-direction:column;gap:.6rem}
.proof-check{display:flex;gap:.8rem;align-items:flex-start;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:.85rem 1rem;background:rgba(255,255,255,.02)}
body.light-mode .proof-check{border-color:rgba(20,28,52,.12);background:rgba(20,28,52,.03)}
.proof-check-mark{font-weight:700;font-size:1.05rem;line-height:1.4}
.proof-pass .proof-check-mark{color:#6fe3a1}
body.light-mode .proof-pass .proof-check-mark{color:#147a43}
.proof-fail .proof-check-mark{color:#ff7a7a}
body.light-mode .proof-fail .proof-check-mark{color:#b3261e}
.proof-check-body{display:flex;flex-direction:column;gap:.15rem}
.proof-check-body strong{color:var(--text);font-size:.95rem}
.proof-check-detail{color:var(--muted);font-size:.84rem;line-height:1.55}
.proof-feeds{list-style:none;margin:.6rem 0 0;padding:0}
.proof-feeds li{color:var(--muted);font-size:.9rem;line-height:1.7;padding:.22rem 0 .22rem 1.4rem;position:relative}
.proof-feeds li::before{content:"—";position:absolute;left:0;color:var(--gold);font-weight:700}
@media(max-width:640px){.ev-head{padding:3.5rem 0 .5rem}.ev-card{padding:1.35rem}.ev-verify{padding-bottom:3.5rem}}
</style>`;

/**
 * The in-browser verifier, carried over from the retired /proof/ page (S335).
 * Every id here is a contract with assets/proof-verify.js — proof-tiles,
 * proof-run, proof-summary, proof-checks — so none of them is renamed.
 */
export function buildVerifySection() {
  return `<section id="verify" class="container ev-verify" aria-labelledby="verify-heading">
<span class="eyebrow">Proof</span>
<h2 id="verify-heading">Verify the deploy ledger in your browser</h2>
<p>Every deploy this studio ships is written into a public, hash-chained ledger — each entry carries the fingerprint of the one before it, so history cannot be quietly rewritten. Press the button. Your browser — not our server — will download the ledger, re-compute every SHA-256 hash, re-walk the chain link by link, and compare what it finds against the published anchor. If a single byte anywhere had been altered, a check below would turn red.</p>
<div class="proof-run-row">
<button type="button" class="button" id="proof-run">Run the verification</button>
<span class="proof-summary" id="proof-summary" role="status" aria-live="polite"></span>
</div>
<ul class="proof-checks" id="proof-checks" aria-label="Verification results"></ul>
<h2>Live evidence right now</h2>
<div class="proof-tiles" id="proof-tiles"></div>
<h2>Check the raw feeds yourself</h2>
<p>Nothing above is special access — these are the same public files any person or AI agent can fetch:</p>
<ul class="proof-feeds">
<li><a href="/data/staging-deploy-history.ndjson">The deploy ledger</a> — append-only, content-addressed, hash-chained</li>
<li><a href="/api/staging-deploy-continuity.json">The digest anchor</a> — the ledger’s expected hash, depth and head</li>
<li><a href="/api/release-proof.json">The release gate</a> — what is currently allowed to ship, and what is holding it</li>
<li><a href="/api/worker-route-provenance.json">Edge route provenance</a> — privacy-safe probes of the live edge</li>
<li><a href="/status/">The status board</a> — every public signal in one place</li>
</ul>
<p>A studio that says “trust us” is asking for something it hasn’t earned. A studio that says “check for yourself” has nothing to hide. When the release gate above reads <em>Holding</em>, that isn’t a failure — it’s the machinery refusing to promote anything that hasn’t proven itself.</p>
</section>`;
}

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
  return injectSuite(`<!DOCTYPE html><html lang="en" class="dark-mode" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evidence — Check Everything We Claim | VaultSpark Studios</title><meta name="description" content="Every live, checkable record VaultSpark Studios publishes about itself: real-time status, source-dated numbers, in-browser hash verification, and the forge in motion."><meta property="og:title" content="Evidence — VaultSpark Studios"><meta property="og:description" content="Do not take our word for it. Status, numbers, in-browser proof, and work in motion — each with its own freshness."><meta property="og:url" content="https://vaultsparkstudios.com/evidence/"><meta property="og:image" content="https://vaultsparkstudios.com/assets/og/og-evidence.png"><meta name="twitter:image" content="https://vaultsparkstudios.com/assets/og/og-evidence.png"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="https://vaultsparkstudios.com/evidence/"><link rel="stylesheet" href="${depth}${chrome.style}">${chrome.speculation}${HUB_STYLE}
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
  </header><main id="main-content"><section class="container ev-head"><span class="eyebrow">Evidence</span><h1 style="font-family:Georgia,serif;font-size:clamp(2.4rem,6vw,4.2rem)">Check everything we claim.</h1><p class="ev-lede">Most studios ask you to believe a launch trailer. This one publishes its own status, its own numbers, its own deploy hashes, and its own unfinished work — and lets you re-compute the proof in your browser. Four doors, each with its own freshness. If a feed is stale, this page says so rather than showing you a green light.</p></section><section class="container"><div class="ev-grid">${lanes.map(buildCard).join('\n')}</div><p class="ev-foot">Every lane above is generated from a public feed and links to the page that owns it — nothing here is retyped by hand, so nothing here can quietly disagree with the source. Machine readers: the same records are enumerated in <a href="/agents.json">agents.json</a>.</p></section>${buildVerifySection()}</main>${chrome.footer}  ${chrome.ambient}
${chrome.navSheet}<script src="${chrome.themeToggle}" defer></script><script src="${chrome.proofVerify}" defer></script>${HUB_SCRIPT}
</body></html>
`, '/evidence/');
}

const NAV_LABEL = '<span class="dropdown-label dropdown-status-intel">Live Intelligence</span>';
// Shared chrome is owned by propagate-nav.mjs and its route catalogs.
// Validation never repairs another page, even in --apply mode.
export function navHasEvidenceFirst(html) {
  const nav = html.match(/<nav\b[^>]*class="nav-center"[^>]*>[\s\S]*?<\/nav>/)?.[0];
  if (!nav || !nav.includes(NAV_LABEL)) return true; // utility page, no group
  const group = nav.slice(nav.indexOf(NAV_LABEL) + NAV_LABEL.length).split('<div class="dropdown-divider">')[0];
  const hrefs = [...group.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  return hrefs[0] === '/evidence/' && hrefs.filter((href) => href === '/evidence/').length === 1;
}

/** Check only the canonical Studio footer column, never a header lookalike. */
export function footerHasLink(html) {
  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0];
  return !footer || !footer.includes('<a href="/status/">Status</a>') || footer.includes('<a href="/evidence/">Evidence</a>');
}

export function validateChrome(chrome) {
  if (!chrome.nav.includes('nav-item') || !chrome.nav.includes(NAV_LABEL) || !navHasEvidenceFirst(chrome.nav)) {
    throw new Error('canonical nav missing Evidence first; run scripts/propagate-nav.mjs before generate-evidence-hub');
  }
  if (!chrome.footer.includes('<a href="/evidence/">Evidence</a>')) {
    throw new Error('canonical footer missing Evidence; run scripts/propagate-nav.mjs before generate-evidence-hub');
  }
  return chrome;
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
  // proof-verify.js is a fingerprinted shell asset. Resolve its current hashed
  // name from the manifest (the same way generate-news-pages resolves
  // deskReactions) so the page never points at a file the content lane withholds;
  // fall back to the source name, which build-shell-assets rewrites.
  const manifestPath = join(ROOT, 'assets/shell-manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { assets: {} };
  const themeToggle = manifest.assets?.themeToggle?.path ? `/${manifest.assets.themeToggle.path}` : '/assets/theme-toggle.js';
  const proofVerify = manifest.assets?.proofVerify?.path ? `/${manifest.assets.proofVerify.path}` : '/assets/proof-verify.js';
  return validateChrome({
    themeToggle,
    proofVerify,
    nav,
    footer: between('<footer class="site-footer"', '</footer>').replaceAll('../assets/', '../assets/'),
    ambient: between('<!-- vs-ambient:start -->', '<!-- vs-ambient:end -->'),
    speculation: between('<!-- vs-speculation:start -->', '<!-- vs-speculation:end -->'),
    themeBoot,
    style: (sample.match(/href="(?:\.\.\/)*(assets\/style\.shell-[a-f0-9]+\.css)"/) || [])[1] || 'assets/style.css',
    navSheet: (sample.match(/<script src="\/assets\/nav-sheet\.shell-[a-f0-9]+\.js" defer><\/script>/) || [''])[0],
  });
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
  // S335: /proof/ lives on this page now. A self-referential lane is judged
  // against the anchors the generator renders, never against the tree.
  t('a self-referential lane on a rendered anchor passes without the tree',
    validateLanes([{ id: 'a', href: '/evidence/#verify', feed: '/api/x.json' }], exists).length === 0);
  t('a self-referential lane without an anchor is rejected',
    validateLanes([{ id: 'a', href: '/evidence/', feed: '/api/x.json' }], exists).length === 1);
  t('a self-referential lane on an unrendered anchor is rejected',
    validateLanes([{ id: 'a', href: '/evidence/#nope', feed: '/api/x.json' }], exists).length === 1);
  const verify = buildVerifySection();
  t('every rendered self-anchor exists in the verify section',
    [...SELF_ANCHORS].every((a) => verify.includes(`id="${a}"`)));
  t('the verifier keeps the ids proof-verify.js looks up',
    ['proof-tiles', 'proof-run', 'proof-summary', 'proof-checks'].every((id) => verify.includes(`id="${id}"`)));
  t('the verify section is rendered inside main, before the footer', (() => {
    const page = buildPage([], { style: 's', speculation: '', themeBoot: '', nav: '', footer: '<footer class="site-footer"></footer>', ambient: '', navSheet: '', themeToggle: '/assets/theme-toggle.js', proofVerify: '/assets/proof-verify.js' });
    return page.indexOf('id="verify"') < page.indexOf('</main>') && page.includes('<script src="/assets/proof-verify.js" defer></script>');
  })());

  const now = Date.parse('2026-09-01T12:00:00Z');
  t('a missing timestamp is unknown, not fresh', describeAge(undefined, now) === null);
  t('an unparseable timestamp is unknown, not fresh', describeAge('soon', now) === null);
  t('minutes render as minutes', describeAge('2026-09-01T11:30:00Z', now) === '30 min ago');
  t('a day renders as hours', describeAge('2026-08-31T12:00:00Z', now) === '24h ago');
  t('a week renders as days', describeAge('2026-08-25T12:00:00Z', now) === '7d ago');
  t('escaping is applied to lane text', buildCard({ id: 'x', label: 'L', question: '<b>q</b>', blurb: 'b', href: '/a/', linkLabel: 'go', feed: '/f.json' }).includes('&lt;b&gt;q&lt;/b&gt;'));

  const nav = '<nav class="nav-center"><div class="nav-item">' + NAV_LABEL + '<a href="/evidence/" class="active" aria-current="page">Evidence</a><a href="/status/">Status</a><div class="dropdown-divider"></div></div></nav>';
  const footer = '<footer class="site-footer"><a href="/evidence/">Evidence</a><a href="/status/">Status</a></footer>';
  t('canonical active Evidence link is accepted first', navHasEvidenceFirst(nav));
  t('missing Evidence nav is rejected', !navHasEvidenceFirst(nav.replace('/evidence/', '/other/')));
  t('duplicate Evidence nav is rejected', !navHasEvidenceFirst(nav.replace('/status/', '/evidence/')));
  t('footer lookalike cannot satisfy nav', !navHasEvidenceFirst(nav.replace('/evidence/', '/other/') + footer));
  t('Evidence after another link is rejected', !navHasEvidenceFirst(nav.replace(NAV_LABEL, NAV_LABEL + '<a href="/oracle/">Oracle</a>')));
  t('canonical chrome remains unchanged across repeated validation', (() => {
    const chrome = { nav, footer }; const before = JSON.stringify(chrome);
    return validateChrome(validateChrome(chrome)) === chrome && JSON.stringify(chrome) === before;
  })());
  t('new page refuses missing canonical nav', (() => { try { validateChrome({nav: '', footer}); return false; } catch { return true; } })());
  t('new page refuses missing canonical footer', (() => { try { validateChrome({nav, footer: ''}); return false; } catch { return true; } })());
  t('footer link is required despite header lookalike', !footerHasLink(nav + footer.replace('/evidence/', '/other/')));
  t('utility pages without shared chrome are unaffected', navHasEvidenceFirst('<main>utility</main>') && footerHasLink('<main>utility</main>'));
  const shellFixture = { nav, footer, themeBoot: '', style: 'assets/style.css', speculation: '', ambient: '', navSheet: '', themeToggle: '/assets/theme-toggle.shell-test.js', proofVerify: '/assets/proof-verify.js' };
  const page = buildPage([], shellFixture);
  t('Evidence page reuses canonical secondary nav idempotently', injectSuite(page, '/evidence/') === page);
  t('secondary nav marks Evidence as current', page.includes('<a href="/evidence/" aria-current="page"><span>Evidence</span>'));
  t('theme picker uses canonical manifest-resolved shell exactly once', page.split('src="' + shellFixture.themeToggle + '"').length === 2);
  const catalog = JSON.parse(readFileSync(join(ROOT, 'config/intelligence-suite.json'), 'utf8'));
  t('canonical route catalog owns Evidence exactly once and first', catalog.routes[0].href === '/evidence/' && catalog.routes.filter((r) => r.href === '/evidence/').length === 1);

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

// Validate shared chrome before ANY output write. Repair belongs solely to
// propagate-nav, including default/dry-run invocations of this generator.
const navTargets = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n').map((s) => s.trim())
  .filter((f) => f && !f.startsWith('docs/') && !f.startsWith('lighthouse-results/') && !f.startsWith('.cache/'));
const chromeMissing = [];
for (const rel of navTargets) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  const body = readFileSync(file, 'utf8');
  if (!navHasEvidenceFirst(body) || !footerHasLink(body)) chromeMissing.push(rel);
}
if (chromeMissing.length) {
  console.error('[generate-evidence-hub] canonical Evidence navigation/footer missing or duplicated; run scripts/propagate-nav.mjs first:');
  for (const rel of chromeMissing) console.error('  - ' + rel);
  process.exit(1);
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
