#!/usr/bin/env node
/**
 * generate-news-pages.mjs — THE DESK page generator (/news/).
 *
 * Renders the section hub (/news/) and one page per story
 * (/news/<date>/<slug>/) from the committed day artifacts in
 * data/news-desk/days/. The generator owns the FULL head contract
 * (canonical, description, og:image, twitter:image, breadcrumb JSON-LD,
 * theme boot) and harvests live chrome (nav/footer/ambient/speculation)
 * from a sibling page, so new pages are born compliant with the
 * propagate-nav ecosystem rather than reconciled after the fact.
 *
 * Truth posture (CANON-031): a day marked `simulated: true` is a pipeline
 * dry-run — its pages carry a PREVIEW banner and `noindex`, and the hub
 * renders the same warning. Real reporting arrives via the daily build;
 * nothing simulated ever presents as news.
 *
 * Usage:
 *   node scripts/generate-news-pages.mjs           # dry-run (diff summary)
 *   node scripts/generate-news-pages.mjs --apply   # write files
 *   node scripts/generate-news-pages.mjs --check   # exit 1 on drift
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { PERSONAS, personaById, computeHeat, personaTrackRecords } from './lib/news-desk.mjs';
import { injectSpeakable } from './inject-speakable-jsonld.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');
const PROD = 'https://vaultsparkstudios.com';

/* ── Load committed days + ledger ──────────────────────────────────────── */

const DAYS_DIR = join(ROOT, 'data/news-desk/days');
const days = existsSync(DAYS_DIR)
  ? readdirSync(DAYS_DIR)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => JSON.parse(readFileSync(join(DAYS_DIR, f), 'utf8')))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  : [];
const ledger = existsSync(join(ROOT, 'data/news-desk/prediction-ledger.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'data/news-desk/prediction-ledger.json'), 'utf8'))
  : { entries: [] };

/* ── Harvest shared chrome from a live sibling page ────────────────────── */

// Harvest from journal/index.html — a hand-maintained page that provably
// carries the full chrome. NEVER harvest from a generator's own output:
// generate-pathways did, one bad harvest became self-perpetuating, and all
// six pathways pages silently lost their primary nav (found S305).
const sample = readFileSync(join(ROOT, 'journal/index.html'), 'utf8');
const slice = (startMark, endMark, endOffset) => {
  const start = sample.indexOf(startMark);
  const end = sample.indexOf(endMark, start) + endOffset;
  return sample.slice(start, end);
};
// The menu is ONE <nav> element (dropdowns are divs inside it). The old
// two-</nav> assumption is the exact bug that emptied the pathways navs.
const NAV_START = sample.indexOf('<nav class="nav-center"');
const NAV_END = sample.indexOf('</nav>', NAV_START) + '</nav>'.length;
const navBlock = NAV_START >= 0 && NAV_END > NAV_START ? sample.slice(NAV_START, NAV_END) : null;
if (!navBlock || !navBlock.includes('nav-item')) {
  console.error('generate-news-pages: nav harvest failed — refusing to write pages without a primary nav');
  process.exit(1);
}
const footerBlock = slice('<footer class="site-footer"', '</footer>', 9);
const ambientBlock = slice('<!-- vs-ambient:start -->', '<!-- vs-ambient:end -->', '<!-- vs-ambient:end -->'.length);
const speculationBlock = slice('<!-- vs-speculation:start -->', '<!-- vs-speculation:end -->', '<!-- vs-speculation:end -->'.length);
const styleHref = (sample.match(/href="([^"]*style\.shell-[a-f0-9]+\.css)"/) || [])[1] || '../../assets/style.css';
// build-shell-assets injects the nav-sheet loader per page; emitting it here
// keeps generator output byte-identical with the reconciled page (no cycle).
const navSheetTag = (sample.match(/<script src="\/assets\/nav-sheet\.shell-[a-f0-9]+\.js" defer><\/script>/) || [''])[0];
const themeBoot = (sample.match(/<script>!function\(\)\{try\{var t=localStorage[^<]*<\/script>/) || [''])[0];

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const clamp = (s, max) => (String(s).length <= max ? String(s) : `${String(s).slice(0, max - 1)}…`);

/** Meta description must land in the 70–200 char window the gate warns on. */
function metaDescription(story) {
  const base = `${story.hook} ${story.headline}.`;
  const text = base.length >= 70 ? base : `${base} AI personas debate it on the record at The Desk, VaultSpark's AI signal desk.`;
  return clamp(text, 200);
}

const heatColor = (heat) => (heat >= 75 ? '#ff5a3c' : heat >= 45 ? '#ffc400' : '#7EC9FF');

function chromeHead({ title, description, canonical, ogImage, depth, noindex, breadcrumb, jsonLd }) {
  const stylePath = styleHref.replace(/^(\.\.\/)+/, depth);
  return `<!DOCTYPE html><html lang="en" class="dark-mode" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<meta property="og:image" content="${escapeHtml(ogImage)}"><meta name="twitter:image" content="${escapeHtml(ogImage)}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${escapeHtml(canonical)}"><link rel="stylesheet" href="${stylePath}">${speculationBlock}
<script type="application/ld+json" data-vs-breadcrumb>${breadcrumb}</script>
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>\n` : ''}</head><body class="dark-mode" data-theme="dark">
${themeBoot}<a href="#main-content" class="skip-link">Skip to main content</a><header class="site-header">
    <div class="container nav">
      <a class="brand" href="/" aria-label="VaultSpark Studios — home">
        <img fetchpriority="high" src="${depth}assets/vaultspark-icon-nav.webp" alt="VaultSpark Studios icon" width="44" height="44" />
        <span class="brand-wordmark">VaultSpark<span class="brand-suffix"> Studios</span><small>The vault is sparked</small></span>
      </a>
      ${navBlock}
      <div class="nav-right">
        <a class="nav-signin" href="/vault-member/#login">Sign In</a>
        <a class="button button-sm" href="/vault-member/#register">Join The Vault</a>
        <button type="button" class="hamburger" id="hamburger" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>`;
}

const chromeFoot = () => `${footerBlock}  ${ambientBlock}\n${navSheetTag ? `${navSheetTag}\n` : ''}</body></html>\n`;

const PREVIEW_BANNER = `<div style="background:rgba(255,196,0,.12);border:1px solid rgba(255,196,0,.4);border-radius:12px;padding:.8rem 1.1rem;margin:1.2rem 0;font-size:.9rem;color:var(--text)"><strong>Preview dry-run.</strong> This content is simulated pipeline output used to prove the publishing system — it is <em>not</em> real reporting. The Desk goes live after its dark-run period.</div>`;

const DISCLOSURE = `<div style="border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:.9rem 1.1rem;margin:1.6rem 0;font-size:.85rem;color:var(--muted)">Written by The Desk — VaultSpark's named AI personas. Every claim links its source, every prediction is dated and publicly graded, and output ships through an editorial quality gate. AI commentary, honestly labeled.</div>`;

/* ── Story page ────────────────────────────────────────────────────────── */

function breadcrumbFor(items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  });
}

function storyJsonLd(day, story, url, image) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.headline,
    datePublished: day.date,
    dateModified: day.date,
    description: metaDescription(story),
    image: [image],
    mainEntityOfPage: url,
    isAccessibleForFree: true,
    author: { '@type': 'Organization', name: 'The Desk — VaultSpark Studios AI personas', url: `${PROD}/news/` },
    publisher: { '@type': 'Organization', name: 'VaultSpark Studios', url: PROD },
  });
}

function stanceCard(stance) {
  const persona = personaById(stance.personaId);
  return `<div style="border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;padding:1.1rem 1.2rem;margin:.7rem 0;background:var(--panel,rgba(255,255,255,.02))">
    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline">
      <strong>${persona.emoji} ${escapeHtml(persona.name)} <span style="color:var(--dim);font-weight:400;font-size:.82rem">· ${escapeHtml(persona.role)}</span></strong>
      <span style="font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)">${escapeHtml(stance.verdict)} · ${Math.round(stance.confidence * 100)}%</span>
    </div>
    <p style="margin:.55rem 0 0;font-size:1.02rem;line-height:1.6">“${escapeHtml(stance.position)}”</p>
  </div>`;
}

function predictionRow(p) {
  const persona = personaById(p.personaId);
  const status = p.status || 'open';
  const chip = { open: '⏳ open', correct: '✅ correct', wrong: '❌ wrong', void: '➖ void' }[status];
  return `<li style="margin:.5rem 0;line-height:1.55"><strong>${persona.emoji} ${escapeHtml(persona.name)}</strong> — ${escapeHtml(p.claim)} <span style="color:var(--dim)">(${Math.round(p.confidence * 100)}% · resolves by ${escapeHtml(p.resolveBy)} · ${chip})</span></li>`;
}

function buildStoryPage(day, story) {
  const url = `${PROD}/news/${day.date}/${story.slug}/`;
  const image = `${PROD}/assets/og/news/${day.date}--${story.slug}.png`;
  const heat = computeHeat(story.stances);
  const head = chromeHead({
    title: `${story.headline} — The Desk · VaultSpark Studios`,
    description: metaDescription(story),
    canonical: url,
    ogImage: image,
    depth: '../../../',
    noindex: !!day.simulated,
    breadcrumb: breadcrumbFor([
      ['Home', `${PROD}/`],
      ['The Desk', `${PROD}/news/`],
      [story.headline, url],
    ]),
    jsonLd: storyJsonLd(day, story, url, image),
  });
  const transcript = (story.transcript || []).map((turn) => {
    const persona = personaById(turn.personaId);
    return `<p style="margin:.7rem 0"><strong style="color:var(--gold)">${persona.emoji} ${escapeHtml(persona.name)}:</strong> ${escapeHtml(turn.text)}</p>`;
  }).join('\n');
  const facts = story.facts.map((f) => `<li style="margin:.45rem 0;line-height:1.55">${escapeHtml(f.text)} <a href="${escapeHtml(f.sourceUrl)}" rel="noopener" target="_blank" style="color:var(--gold);font-size:.85rem">[source]</a></li>`).join('\n');
  const rawHtml = `${head}<main id="main-content"><article class="container" style="max-width:820px;padding:3.4rem 0 4rem">
  <p style="font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)"><a href="/news/" style="color:var(--gold)">The Desk</a> · ${escapeHtml(day.date)}${story.kind === 'quiet' ? ' · The Quiet Story' : ''}</p>
  <h1 style="font-family:Georgia,serif;font-size:clamp(2rem,5vw,3.2rem);line-height:1.08;margin:.5rem 0">${escapeHtml(story.headline)}</h1>
  <p style="font-size:1.15rem;color:var(--muted);font-style:italic;margin:.4rem 0 1rem">${escapeHtml(story.hook)}</p>
  ${day.simulated ? PREVIEW_BANNER : ''}
  <div style="display:flex;align-items:center;gap:.7rem;margin:1.1rem 0">
    <span style="font-size:.78rem;font-weight:700;letter-spacing:.1em;color:${heatColor(heat)}">HEAT ${heat}</span>
    <span style="flex:0 1 260px;height:10px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(4, heat)}%;background:${heatColor(heat)}"></span></span>
    <span style="font-size:.78rem;color:var(--dim)">desk disagreement index</span>
  </div>
  <section aria-label="TLDR" style="border-left:3px solid var(--gold);padding:.2rem 0 .2rem 1.1rem;margin:1.4rem 0"><p style="font-size:1.08rem;line-height:1.75">${escapeHtml(story.tldr)}</p></section>
  <h2 style="font-family:Georgia,serif;font-size:1.35rem;margin:1.8rem 0 .4rem">What actually happened</h2>
  <ul style="padding-left:1.2rem">${facts}</ul>
  <h2 style="font-family:Georgia,serif;font-size:1.35rem;margin:1.8rem 0 .4rem">The desk takes the floor</h2>
  ${story.stances.map(stanceCard).join('\n')}
  <h2 style="font-family:Georgia,serif;font-size:1.35rem;margin:1.8rem 0 .4rem">On the record</h2>
  <p style="color:var(--muted);font-size:.9rem;margin:.2rem 0 .6rem">Dated, falsifiable, and graded when reality answers. <a href="/news/#ledger" style="color:var(--gold)">Track records →</a></p>
  <ul style="padding-left:1.2rem;list-style:none">${story.predictions.map(predictionRow).join('\n')}</ul>
  <details style="margin:2rem 0 1rem;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;padding:1rem 1.2rem"><summary style="cursor:pointer;font-weight:700">The full floor — complete debate transcript</summary>${transcript}</details>
  ${DISCLOSURE}
</article></main>${chromeFoot()}`;
  return injectSpeakable(rawHtml).html;
}

/* ── Section hub ───────────────────────────────────────────────────────── */

function buildHubPage() {
  const allSimulated = days.length > 0 && days.every((d) => d.simulated);
  const newest = days[0] || null;
  const lead = newest ? newest.stories.find((s) => s.slug === newest.leadSlug) || newest.stories[0] : null;
  const ogImage = newest && lead ? `${PROD}/assets/og/news/${newest.date}--${lead.slug}.png` : `${PROD}/assets/og-image.png`;
  const records = personaTrackRecords(ledger);
  const head = chromeHead({
    title: 'The Desk — AI news, argued on the record · VaultSpark Studios',
    description: 'Three AI personas argue the day\'s AI news, put dated predictions on the record, and get publicly graded. Transparent AI commentary with verifiable track records.',
    canonical: `${PROD}/news/`,
    ogImage,
    depth: '../',
    noindex: allSimulated || days.length === 0,
    breadcrumb: breadcrumbFor([[ 'Home', `${PROD}/` ], ['The Desk', `${PROD}/news/`]]),
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'The Desk — VaultSpark AI Signal',
      url: `${PROD}/news/`,
      description: 'Daily AI news argued by named AI personas with public, hash-verifiable prediction track records.',
    }),
  });
  const cast = PERSONAS.map((p) => `<div style="border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;padding:1.1rem 1.2rem;background:var(--panel,rgba(255,255,255,.02))">
    <strong style="font-size:1.05rem">${p.emoji} ${escapeHtml(p.name)}</strong>
    <p style="color:var(--gold);font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;margin:.2rem 0">${escapeHtml(p.role)}</p>
    <p style="color:var(--muted);font-size:.9rem;line-height:1.55;margin:.4rem 0 0">${escapeHtml(p.voice)}</p>
    <p style="color:var(--dim);font-size:.8rem;margin:.5rem 0 0">Track record: ${records[p.id].correct}✅ ${records[p.id].wrong}❌ ${records[p.id].open}⏳${records[p.id].accuracy !== null ? ` · ${records[p.id].accuracy}% graded accuracy` : ''}</p>
  </div>`).join('\n');
  const dayBlocks = days.map((day) => {
    const stories = day.stories.map((story) => {
      const heat = computeHeat(story.stances);
      return `<a href="/news/${day.date}/${story.slug}/" style="display:block;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;padding:1.1rem 1.2rem;margin:.6rem 0;background:var(--panel,rgba(255,255,255,.02));text-decoration:none">
        <div style="display:flex;justify-content:space-between;gap:.8rem;flex-wrap:wrap"><strong style="font-size:1.05rem">${escapeHtml(story.headline)}</strong><span style="font-size:.75rem;font-weight:700;color:${heatColor(heat)}">HEAT ${heat}</span></div>
        <p style="color:var(--muted);font-size:.92rem;font-style:italic;margin:.3rem 0 0">${escapeHtml(story.hook)}${story.kind === 'quiet' ? ' <span style="color:var(--dim)">· The Quiet Story</span>' : ''}</p>
      </a>`;
    }).join('\n');
    return `<section style="margin:1.6rem 0"><h2 style="font-family:Georgia,serif;font-size:1.2rem;color:var(--dim)">${escapeHtml(day.date)}</h2>${stories}</section>`;
  }).join('\n');
  return `${head}<main id="main-content"><section class="container" style="max-width:900px;padding:3.4rem 0 4rem">
  <span class="eyebrow">THE DESK · AI SIGNAL</span>
  <h1 style="font-family:Georgia,serif;font-size:clamp(2.4rem,6vw,4rem);line-height:1.05;margin:.4rem 0">Argued daily.<br>Graded forever.</h1>
  <p style="color:var(--muted);max-width:62ch;font-size:1.08rem;line-height:1.7;margin:.8rem 0">Three AI personas read the day's AI news, argue it on the record, and leave dated predictions behind. Reality grades them; a hash-chained ledger makes the grades permanent. No anonymous takes, no memory-holed misses.</p>
  ${allSimulated || days.length === 0 ? PREVIEW_BANNER : ''}
  <h2 style="font-family:Georgia,serif;font-size:1.4rem;margin:2rem 0 .6rem">The cast</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.8rem">${cast}</div>
  <h2 id="ledger" style="font-family:Georgia,serif;font-size:1.4rem;margin:2.2rem 0 .2rem">The record</h2>
  <p style="color:var(--muted);font-size:.9rem;margin:.2rem 0 .8rem">Every prediction lands in a hash-chained public ledger — the same evidence machinery behind <a href="/proof/" style="color:var(--gold)">/proof</a>. Machine feed: <a href="/api/news-desk-claims.ndjson" style="color:var(--gold)">claims.ndjson</a>.</p>
  ${dayBlocks || '<p style="color:var(--dim)">The Desk opens soon.</p>'}
  ${DISCLOSURE}
</section></main>${chromeFoot()}`;
}

/* ── Emit ──────────────────────────────────────────────────────────────── */

const targets = [{ path: 'news/index.html', html: buildHubPage() }];
for (const day of days) {
  for (const story of day.stories) {
    targets.push({ path: `news/${day.date}/${story.slug}/index.html`, html: buildStoryPage(day, story) });
  }
}

let stale = 0;
let updated = 0;
for (const t of targets) {
  const outPath = join(ROOT, t.path);
  const existing = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
  if (existing !== null && existing.trim() === t.html.trim()) continue;
  stale += 1;
  if (APPLY) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, t.html, 'utf8');
    updated += 1;
    console.log(`[generate-news-pages] wrote ${t.path}`);
  } else {
    console.log(`[generate-news-pages] ${existing === null ? 'MISSING' : 'STALE'}: ${t.path}`);
  }
}

if (CHECK && stale > 0) {
  console.error(`[generate-news-pages] ${stale} page(s) stale — run with --apply`);
  process.exit(1);
}
if (!stale) console.log(`[generate-news-pages] all ${targets.length} page(s) current`);
else if (APPLY) console.log(`[generate-news-pages] done — ${updated} written`);
