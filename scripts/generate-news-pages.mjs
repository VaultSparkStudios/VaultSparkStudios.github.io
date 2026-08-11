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
import { PERSONAS, DESK_ROLES, STORY_FORMATS, EDITIONS, formatFor, personaById, roleById, computeHeat, personaTrackRecords, personaForm, deriveDeskPerformance } from './lib/news-desk.mjs';
import { deriveStoryStats, deriveDeskStats } from './lib/news-stats.mjs';
import { altForMeme } from './lib/news-memes.mjs';

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
      .filter((day) => day.simulated === false)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  : [];
const REPORTS_DIR = join(ROOT, 'data/news-desk/directors-reports');
const directorsReports = existsSync(REPORTS_DIR)
  ? readdirSync(REPORTS_DIR)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => JSON.parse(readFileSync(join(REPORTS_DIR, f), 'utf8')))
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
// Emit the CONTENT-ADDRESSED reactions script, not the plain source path.
// build-shell-assets rewrites plain paths to hashed ones, so a generator that
// emits the plain name fights the rewriter forever (--check goes stale on every
// build). Reading the manifest keeps generator output identical to the
// reconciled page — the same reason navSheetTag is harvested rather than typed.
// It is also what lets the story pages and their script ride the content lane
// together: the lane withholds un-hashed JS, and the reference resolver then
// refuses to publish a page pointing at a file that would 404 (S310).
const shellManifest = existsSync(join(ROOT, 'assets/shell-manifest.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'assets/shell-manifest.json'), 'utf8'))
  : { assets: {} };
const deskReactionsSrc = shellManifest.assets?.deskReactions?.path
  ? `/${shellManifest.assets.deskReactions.path}`
  : '/assets/desk-reactions.js';

const themeBoot = (sample.match(/<script>!function\(\)\{try\{var t=localStorage[^<]*<\/script>/) || [''])[0];

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const clamp = (s, max) => (String(s).length <= max ? String(s) : `${String(s).slice(0, max - 1)}…`);

// Cast size appears in prose in several places. Hardcoding it is how "three
// personas" survives a roster change and quietly becomes a lie on a public
// page — so every count in copy is derived from the roster itself.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const COUNT_WORD = (n) => NUMBER_WORDS[n] || String(n);
const CAST_WORD = COUNT_WORD(PERSONAS.length);
const CAST_TITLE = CAST_WORD.charAt(0).toUpperCase() + CAST_WORD.slice(1);

/** Meta description must land in the 70–200 char window the gate warns on. */
function metaDescription(story) {
  const base = `${story.hook} ${story.headline}.`;
  const text = base.length >= 70 ? base : `${base} AI personas debate it on the record at The Desk, VaultSpark's AI signal desk.`;
  return clamp(text, 200);
}

const heatColor = (heat) => (heat >= 75 ? '#ff5a3c' : heat >= 45 ? '#ffc400' : '#7EC9FF');

function chromeHead({ title, description, canonical, ogImage, depth, noindex, breadcrumb, jsonLd }) {
  const stylePath = styleHref.replace(/^(\.\.\/)+/, depth);
  return `<!DOCTYPE html><html lang="en" class="dark-mode" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<meta property="og:image" content="${escapeHtml(ogImage)}"><meta name="twitter:image" content="${escapeHtml(ogImage)}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${escapeHtml(canonical)}"><link rel="alternate" type="application/feed+json" title="The Desk JSON Feed" href="/api/news-desk-feed.json"><link rel="stylesheet" href="${stylePath}"><link rel="stylesheet" href="${depth}assets/news-desk.css">${speculationBlock}
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

/**
 * Authorship disclosure.
 *
 * Founder directive (S308): never let a reader believe a human wrote this when
 * one did not. That is stronger than "label the page" — the risk is a reader
 * meeting REX or MARA as a *byline* and reasonably assuming a columnist, since
 * every other publication's named voices are people. So authorship is stated
 * in three places with different jobs:
 *   - AI_BANNER runs ABOVE the content, before any persona quote is reachable
 *   - each persona byline carries "AI persona" inline at the point of attribution
 *   - DISCLOSURE closes the page with scope, method and limits
 * plus the OG card ("WRITTEN BY AI") and the JSON Feed author field, because
 * social cards and syndicated items travel with no surrounding context at all.
 */
const AI_BANNER = `<div class="desk-ai-banner" role="note"><strong>Written by AI.</strong> The Desk is an <em>experimental</em> AI publication. Every story, stance, quote and prediction below is generated by named AI personas — <strong>no human wrote this</strong>. The personas are fictional characters, not people. Facts link to cited primary sources; the argument around them is AI-generated and can be wrong.</div>`;

const DISCLOSURE = `<div class="desk-disclosure"><strong>Editorial disclosure.</strong> The Desk is an experimental, AI-generated publication from VaultSpark Studios. REX, MARA, DOT, VERA, ECHO and JUNO are <strong>AI personas — fictional characters, not people</strong>, and no human authors, ghost-writes or reviews their commentary before it publishes. Every factual claim links its primary source, every prediction is dated and publicly graded so the personas can be shown to be wrong, and every edition passes an automated quality gate. This is AI commentary, labeled as such — treat it as argument to check, not reporting to trust.</div>`;

/* ── The Dispatch: identity-free newsletter capture ────────────────────── */

// Deliberately account-free. The Desk's product claim is that it needs no
// login, so its newsletter must not smuggle one in — this posts an email to a
// Supabase function that hands it to Brevo for DOUBLE opt-in and nothing else.
// Copy says "confirmation email" rather than "you're subscribed" because at
// this point the reader genuinely is not subscribed yet.
const DISPATCH_ENDPOINT = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/subscribe-desk-dispatch';

function dispatchCta(source, { compact = false } = {}) {
  return `<section class="desk-dispatch${compact ? ' desk-dispatch-compact' : ''}" aria-labelledby="dispatch-h-${source}">
    <div class="desk-dispatch-copy">
      <p class="desk-dispatch-kicker">The Dispatch</p>
      <h2 id="dispatch-h-${source}">${compact ? 'Get the desk in your inbox.' : 'Get the argument, not the noise.'}</h2>
      <p>${compact
        ? 'What mattered, what the desk got wrong, and which predictions came due.'
        : 'A short email when the desk publishes: the day’s lead argument, the quiet story nobody covered, and every prediction that came due. No account required — The Desk never asks for one.'}</p>
    </div>
    <form class="desk-dispatch-form" data-dispatch data-source="${escapeHtml(source)}" novalidate>
      <label class="visually-hidden" for="dispatch-email-${source}">Email address</label>
      <input id="dispatch-email-${source}" name="email" type="email" inputmode="email" autocomplete="email"
             placeholder="you@example.com" required spellcheck="false">
      <button type="submit" class="button">Subscribe</button>
      <p class="desk-dispatch-status" data-dispatch-status role="status" aria-live="polite"></p>
      <p class="desk-dispatch-fine">Double opt-in — we send one confirmation email and add you only when you click it. Unsubscribe any time.</p>
    </form>
    <noscript><p class="desk-dispatch-fine">Signing up needs JavaScript. With it off this form cannot submit, so rather than fail silently: email <a href="mailto:news@vaultsparkstudios.com?subject=Subscribe%20to%20The%20Dispatch">news@vaultsparkstudios.com</a> with the subject &ldquo;Subscribe to The Dispatch&rdquo;, or follow <a href="/api/news-desk-feed.json">the JSON Feed</a> instead.</p></noscript>
  </section>`;
}

const DISPATCH_SCRIPT = `<script>(function(){
  var ENDPOINT=${JSON.stringify(DISPATCH_ENDPOINT)};
  document.querySelectorAll('form[data-dispatch]').forEach(function(form){
    var status=form.querySelector('[data-dispatch-status]');
    var input=form.querySelector('input[name=email]');
    var button=form.querySelector('button');
    function say(msg,kind){status.textContent=msg;status.className='desk-dispatch-status'+(kind?' is-'+kind:'');}
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=(input.value||'').trim();
      if(!email||email.indexOf('@')<1){say('Enter a valid email address.','error');input.focus();return;}
      button.disabled=true;say('Sending…');
      fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:email,source:form.getAttribute('data-source')||'news'})})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(b){return {ok:r.ok,body:b};});})
      .then(function(res){
        if(res.ok){form.classList.add('is-done');
          say('Check your inbox — we sent a confirmation link. You are subscribed once you click it.','ok');
          input.value='';}
        else{button.disabled=false;say(res.body&&res.body.error?res.body.error:'Something went wrong. Please try again shortly.','error');}
      })
      .catch(function(){button.disabled=false;say('Could not reach the mail service. Please try again shortly.','error');});
    });
  });
})();</script>`;

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
    // schema.org has no first-class "AI wrote this" flag, so authorship is
    // asserted two ways: the author is explicitly a software/organization
    // entity named as AI personas (never a Person), and creditText spells it
    // out for consumers that render a byline string.
    author: {
      '@type': 'Organization',
      name: 'The Desk — AI personas (no human author) · VaultSpark Studios',
      url: `${PROD}/news/`,
      description: 'Experimental AI publication. Stories are generated by named AI personas; the personas are fictional characters, not people.',
    },
    creditText: 'Written by AI personas — no human author. Experimental AI publication.',
    publisher: { '@type': 'Organization', name: 'VaultSpark Studios', url: PROD },
    // Keep the generator convergent with the sitewide AEO injector. Without
    // this field, `npm run build` injects it after generation and the news
    // generator's own --check immediately reports both story pages stale.
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', "meta[name='description']"] },
  });
}

/**
 * The article. Blocks with a `voice` are that persona writing in first person,
 * bylined inline so the reader hears WHO is talking mid-piece — the old stance
 * cards made them annotate from outside the story instead of writing it.
 */
/** The panel, credited to the voice that drew it. */
function memePanel(story, day) {
  const persona = personaById(story.memeLine?.personaId);
  if (!persona || !story.memeLine?.text) return '';
  const base = `/assets/og/news/${day.date}--${story.slug}--meme`;
  // Derived from the register that is actually drawn, never hand-written (S309).
  // Authored alt drifted from the panel twice in one session — describing a motif
  // the renderer discarded, and a motif the register ignores entirely — and no
  // gate compares words to pixels, so a screen-reader user was the only reader
  // getting the wrong picture.
  const alt = escapeHtml(altForMeme({
    style: persona.memeStyle,
    text: story.memeLine.text,
    motif: story.memeLine.motif,
    persona: persona.name,
  }));
  return `<figure class="desk-meme">
    <picture><source srcset="${base}.avif" type="image/avif"><source srcset="${base}.webp" type="image/webp">
    <img src="${base}.png" width="1200" height="630" loading="lazy" decoding="async" alt="${alt}"></picture>
    <figcaption>${escapeHtml(persona.bit || 'The panel')} · <strong>${escapeHtml(persona.name)}</strong></figcaption>
  </figure>`;
}

/**
 * The article body, with each voice visually distinct.
 *
 * Every persona used to render as the same paragraph with a different accent
 * colour, which meant the cast was distinct in the prose and identical on the
 * page — a reader skimming saw one uniform column and no reason to believe
 * seven different people wrote it.
 *
 * The treatment is keyed to `memeStyle`, the register that voice already owns
 * in its panel, so VERA reads like an incident note in both places and NIB
 * reads like a caption in both places. Reusing the existing field rather than
 * inventing a parallel one means a new persona cannot end up with a panel
 * identity and no prose identity.
 */
function bodyHtml(story) {
  let last = null;
  return (story.body || []).map((b) => {
    const persona = b.voice ? personaById(b.voice) : null;
    if (!persona) return `<p>${escapeHtml(b.text)}</p>`;
    const showByline = persona.id !== last;
    last = persona.id;
    const byline = showByline
      ? `<p class="desk-said-who"><span class="desk-mini-avatar" aria-hidden="true">${escapeHtml(persona.monogram)}</span><strong>${escapeHtml(persona.name)}</strong> <span>${escapeHtml(persona.role)}</span></p>`
      : '';
    return `<div class="desk-said desk-voice-${escapeHtml(persona.memeStyle || 'declare')}" data-voice="${escapeHtml(persona.id)}" style="--persona:${persona.accent}">${byline}<p>${escapeHtml(b.text)}</p></div>`;
  }).join('\n');
}

/**
 * What a reader actually cares about, in their language.
 *
 * This replaced a "HEAT 47" meter captioned "Computed disagreement, not an
 * editorial rating" — a number that meant nothing to anyone who had not read
 * the source code, sitting where a normal publication puts the reading time.
 * Same underlying maths, phrased for a person.
 */
/**
 * The story's numbers, and the desk's actual positions plotted rather than
 * summarised.
 *
 * This replaces a bar that printed "The desk disagrees" off a heat threshold.
 * On the stories where it appeared the claim happened to be true — but the page
 * asserted a conclusion and showed none of the evidence, on a product whose
 * entire pitch is that its claims are checkable. And it was wrong in the other
 * direction constantly: three of five stories have a single voice, where
 * "disagrees" is not a weaker claim, it is a meaningless one.
 *
 * Every number here comes from deriveStoryStats over the story JSON, so the
 * panel cannot drift from the piece it describes.
 */
function statChip(n, label, detail = '') {
  return `<li class="desk-stat"><span class="desk-stat-n">${escapeHtml(String(n))}</span><span class="desk-stat-k">${escapeHtml(label)}</span>${detail ? `<span class="desk-stat-d">${escapeHtml(detail)}</span>` : ''}</li>`;
}

/**
 * The disagreement axis. −2 overhyped … +2 underhyped, each voice plotted where
 * it actually stands. A reader can see the split instead of being told about it.
 */
function stanceAxis(stats) {
  if (!stats.positions.length) return '';
  const dots = stats.positions.map((p) => {
    const persona = personaById(p.personaId);
    const pct = ((p.direction + 2) / 4) * 100;
    const label = `${persona?.name || p.personaId}: ${p.verdict || 'no verdict'} (${p.direction > 0 ? '+' : ''}${p.direction})`;
    return `<span class="desk-axis-dot" style="left:${pct.toFixed(1)}%;--persona:${persona?.accent || 'var(--gold)'}" title="${escapeHtml(label)}"><span class="desk-axis-mono">${escapeHtml(persona?.monogram || '?')}</span></span>`;
  }).join('');
  return `<div class="desk-axis" role="img" aria-label="${escapeHtml(`Desk positions — ${stats.positions.map((p) => `${personaById(p.personaId)?.name || p.personaId} ${p.verdict || ''} ${p.direction > 0 ? '+' : ''}${p.direction}`).join('; ')}`)}">
    <div class="desk-axis-line"><span class="desk-axis-zero" aria-hidden="true"></span>${dots}</div>
    <div class="desk-axis-ends" aria-hidden="true"><span>overhyped</span><span>fairly valued</span><span>underhyped</span></div>
  </div>`;
}

/**
 * Desk-wide numbers for the top of /news/.
 *
 * Reads the same derivation the per-story panel does, so the index total and
 * the sum of the story pages cannot disagree — the cross-surface coherence
 * failure this codebase keeps re-learning.
 *
 * The accuracy tile is the important one: it renders "not yet" rather than a
 * percentage until enough calls are graded. A desk that advertises 100% off one
 * resolved prediction has stopped being a track record and started being an
 * advert, so the honest empty state is the feature, not a placeholder.
 */
/**
 * Reader signal. Deliberately editorial rather than a like button.
 *
 * "Changed my mind" / "Already knew this" / "Show more receipts" say something
 * a newsroom can act on; a heart says nothing. The per-voice vote is the one
 * that matters most: it feeds a real question ORSON asks in the Director's
 * Report — which of my writers actually landed with readers — so the signal has
 * somewhere to go instead of being a vanity counter.
 *
 * Counts render only when the server returns them (see desk-reactions.js).
 */
const REACTION_BUTTONS = [
  { id: 'changed-my-mind', label: 'Changed my mind', hint: 'This moved me off my prior' },
  { id: 'knew-this', label: 'Already knew this', hint: 'Nothing new here for me' },
  { id: 'want-receipts', label: 'Show more receipts', hint: 'I want this better sourced' },
  { id: 'made-me-laugh', label: 'Made me laugh', hint: 'The bit landed' },
];

function reactionBar(story, day) {
  const voices = [...new Set((story.body || []).filter((b) => b.voice).map((b) => b.voice))];
  const slug = `${day.date}/${story.slug}`;
  const buttons = REACTION_BUTTONS.map((r) => `<button type="button" class="desk-react" data-reaction="${r.id}" title="${escapeHtml(r.hint)}"><span class="desk-react-k">${escapeHtml(r.label)}</span><span class="desk-react-n" hidden></span></button>`).join('');
  const voiceButtons = voices.map((v) => {
    const p = personaById(v);
    if (!p) return '';
    return `<button type="button" class="desk-react desk-react-voice" data-reaction="voice:${escapeHtml(v)}" style="--persona:${p.accent}" title="${escapeHtml(`${p.name} made the strongest case`)}"><span class="desk-mini-avatar" aria-hidden="true">${escapeHtml(p.monogram)}</span><span class="desk-react-k">${escapeHtml(p.name)}</span><span class="desk-react-n" hidden></span></button>`;
  }).join('');
  return `<section class="desk-reactions" data-desk-reactions="${escapeHtml(slug)}" aria-label="React to this story">
    <p class="desk-react-title">Was this worth your time?<span>No account, no email. Counts appear only once readers have actually voted.</span></p>
    <div class="desk-react-row">${buttons}
      <button type="button" class="desk-react desk-react-share" data-desk-share><span class="desk-react-k">Share this</span></button>
    </div>
    ${voiceButtons ? `<p class="desk-react-title desk-react-title-sub">Whose take landed?<span>This is the reader signal ORSON weighs in the <a href="/news/directors-report/">Director's Report</a>.</span></p>
    <div class="desk-react-row">${voiceButtons}</div>` : ''}
  </section>`;
}

function deskStatsPanel() {
  const d = deriveDeskStats(days, ledger);
  if (!d.stories) return '';
  const p = d.predictions;
  const accuracy = p.accuracy === null
    ? `<li class="desk-stat"><span class="desk-stat-n">Not yet</span><span class="desk-stat-k">graded accuracy</span><span class="desk-stat-d">${escapeHtml(p.accuracyBasis)}</span></li>`
    : `<li class="desk-stat"><span class="desk-stat-n">${p.accuracy}%</span><span class="desk-stat-k">graded accuracy</span><span class="desk-stat-d">${escapeHtml(p.accuracyBasis)}</span></li>`;
  const span = d.firstDate === d.latestDate ? d.firstDate : `${d.firstDate} → ${d.latestDate}`;
  return `<section class="desk-stats desk-stats-wide" aria-label="The Desk in numbers">
    <p class="desk-stats-title">The desk in numbers <span>every figure below is computed from the published stories, not typed in — <a href="/api/news-desk-stats.json">check the feed</a></span></p>
    <ul class="desk-stat-grid">
      ${statChip(d.stories, d.stories === 1 ? 'story published' : 'stories published', span)}
      ${statChip(d.voices, 'voices writing', d.voiceIds.map((v) => personaById(v)?.name || v).join(' · '))}
      ${statChip(d.facts, 'sourced facts', 'each one linked in the piece')}
      ${statChip(d.sourceCount, d.sourceCount === 1 ? 'publisher cited' : 'publishers cited', d.sources.slice(0, 3).join(', ') + (d.sources.length > 3 ? '…' : ''))}
      ${statChip(d.panels, d.panels === 1 ? 'panel drawn' : 'panels drawn', `by ${d.panelists.map((v) => personaById(v)?.name || v).join(' · ') || 'nobody yet'}`)}
      ${statChip(p.onRecord, p.onRecord === 1 ? 'call on record' : 'calls on record', `${p.open} open · ${p.graded} graded`)}
      ${accuracy}
      ${statChip(d.minutes, 'minutes of reading', `${d.words.toLocaleString('en-US')} words`)}
    </ul>
  </section>`;
}

function pulseBar(story, day, heat, stats) {
  const s = stats || deriveStoryStats(story, day, { ledger });
  const srcDetail = s.sources.length === 1 ? s.sources[0] : s.sources.length ? `${s.sources.slice(0, 2).join(', ')}${s.sources.length > 2 ? '…' : ''}` : 'none cited';
  const fmt = STORY_FORMATS.find((f) => f.id === s.format);
  return `<section class="desk-stats" aria-label="What is in this story">
    <ul class="desk-stat-grid">
      ${statChip(s.minutes, s.minutes === 1 ? 'min read' : 'min read', `${s.words} words`)}
      ${statChip(s.factCount, s.factCount === 1 ? 'sourced fact' : 'sourced facts', 'every one linked')}
      ${statChip(s.sourceCount, s.sourceCount === 1 ? 'publisher' : 'publishers', srcDetail)}
      ${statChip(s.voiceCount, s.voiceCount === 1 ? 'voice writing' : 'voices writing', s.voices.map((v) => personaById(v)?.name || v).join(' · '))}
      ${statChip(s.panels, s.panels === 1 ? 'panel drawn' : 'panels drawn', s.panelBy ? `by ${personaById(s.panelBy)?.name || s.panelBy}` : 'none')}
      ${statChip(s.predictions.onRecord, s.predictions.onRecord === 1 ? 'call on record' : 'calls on record', s.predictions.onRecord ? `${s.predictions.open} still open` : 'this format makes none')}
      ${fmt ? statChip(fmt.name, 'format', fmt.brief.split('.')[0]) : ''}
      ${s.edition ? statChip(EDITIONS.find((e) => e.id === s.edition)?.name || s.edition, 'edition', s.isLead ? 'lead story' : 'inside') : ''}
    </ul>
    <div class="desk-split-read">
      <strong class="desk-split-label" style="color:${heatColor(heat)}">${escapeHtml(s.label)}</strong>
      ${stanceAxis(s)}
    </div>
  </section>`;
}

function stanceCard(stance) {
  const persona = personaById(stance.personaId);
  return `<div class="desk-stance" style="--persona:${persona.accent}">
    <div class="desk-stance-top">
      <div class="desk-stance-name"><span class="desk-mini-avatar" aria-hidden="true">${escapeHtml(persona.monogram)}</span><strong>${escapeHtml(persona.name)} <span style="color:var(--desk-muted);font-weight:400;font-size:.78rem">· AI persona · ${escapeHtml(persona.role)}</span></strong></div>
      <span class="desk-verdict">${escapeHtml(stance.verdict)} · ${Math.round(stance.confidence * 100)}% confidence</span>
    </div>
    <blockquote>“${escapeHtml(stance.position)}”</blockquote>
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
  const facts = story.facts.map((f) => `<li>${escapeHtml(f.text)} <a class="desk-source" href="${escapeHtml(f.sourceUrl)}" rel="noopener" target="_blank">Read it yourself ↗</a></li>`).join('\n');
  return `${head}<main id="main-content" class="desk-shell"><article class="desk-article">
  <p class="desk-kicker"><a href="/news/" style="color:inherit">The Desk</a> · ${escapeHtml(day.date)} · ${escapeHtml(formatFor(story).name)}${story.kind === 'quiet' ? ' · Quiet signal' : ''}</p>
  <h1>${escapeHtml(story.headline)}</h1>
  <p class="desk-article-deck">${escapeHtml(story.hook)}</p>
${AI_BANNER}
${day.simulated ? PREVIEW_BANNER : ''}
  ${pulseBar(story, day, heat)}
  <section class="desk-standfirst">${escapeHtml(story.tldr)}</section>
  <div class="desk-body">${bodyHtml(story)}</div>
  ${memePanel(story, day)}
  <p class="desk-label">Where this came from</p>
  <ul class="desk-panel desk-facts">${facts}</ul>
  <p class="desk-label">Where they are coming from</p>
  ${story.stances.map(stanceCard).join('\n')}
${/* Only the formats that make a claim about the future carry this section. A
     Quick Take or a Roast has no predictions, and rendering the heading anyway
     printed "What they are betting on" above an empty list — advertising
     accountability content the piece does not contain, which is the same empty-
     scoreboard dishonesty the record state on the hub was written to avoid. */
  (story.predictions || []).length ? `  <p class="desk-label">What they are betting on</p>
  <p style="color:var(--muted);font-size:.9rem;margin:.2rem 0 .6rem">They put these on the record so you can hold them to it. <a href="/news/#ledger" style="color:var(--gold)">See the scorecard →</a></p>
  <ul style="padding-left:1.2rem;list-style:none">${story.predictions.map(predictionRow).join('\n')}</ul>` : ''}
${(story.transcript || []).some((t) => t.text) ? `  <details class="desk-panel" style="margin:2rem 0 1rem;padding:1rem 1.2rem"><summary style="cursor:pointer;font-weight:700">${(story.stances || []).length === 1 ? 'More from the desk' : 'The rest of the argument'}</summary>${transcript}</details>` : ''}
  ${reactionBar(story, day)}
  ${dispatchCta('story', { compact: true })}
  ${DISCLOSURE}
</article></main><script src="${deskReactionsSrc}" defer></script>${DISPATCH_SCRIPT}${chromeFoot()}`;
}

/* ── Section hub ───────────────────────────────────────────────────────── */

function buildHubPage() {
  const allSimulated = days.length > 0 && days.every((d) => d.simulated);
  const newest = days[0] || null;
  const lead = newest ? newest.stories.find((s) => s.slug === newest.leadSlug) || newest.stories[0] : null;
  const ogImage = newest && lead ? `${PROD}/assets/og/news/${newest.date}--${lead.slug}.png` : `${PROD}/assets/og-image.png`;
  const records = personaTrackRecords(ledger);
  const standing = personaForm(ledger);
  const head = chromeHead({
    title: 'The Desk — AI news, argued on the record · VaultSpark Studios',
    description: `${CAST_TITLE} AI personas argue the day's AI news, put dated predictions on the record, and get publicly graded. Transparent AI commentary with verifiable track records.`,
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
  const cast = PERSONAS.map((p) => {
    const form = standing[p.id];
    // Standing is shown only once it is EARNED. Below the sample floor the
    // card says so in words rather than implying a record exists (CANON-031).
    const standingChip = form.standing === 'unproven'
      ? '<span class="desk-standing is-unproven">Unproven · too few resolved calls</span>'
      : `<span class="desk-standing is-${form.standing}">${{ hot: 'On a run', cold: 'Recently wrong', even: 'Level' }[form.standing]} · ${form.graded} graded</span>`;
    return `<article class="desk-panel desk-persona" style="--persona:${p.accent}" data-mark="${escapeHtml(p.monogram)}">
    <div class="desk-persona-head"><span class="desk-avatar" aria-hidden="true">${escapeHtml(p.monogram)}</span><div><h3>${escapeHtml(p.name)} <span class="desk-ai-tag">AI persona</span></h3><p class="desk-role">${escapeHtml(p.role)}</p></div></div>
    <p class="desk-creed">“${escapeHtml(p.creed)}”</p>
    <p class="desk-voice"><strong>Always asks:</strong> ${escapeHtml(p.question)}</p>
    <p class="desk-bit"><span class="desk-bit-label">Their recurring bit</span><strong>${escapeHtml(p.bit)}</strong> — ${escapeHtml(p.bitHow)}</p>
    <p class="desk-bias"><strong>Where they get it wrong:</strong> ${escapeHtml(p.bias)}</p>
    <p class="desk-beats">Beats · ${p.beats.map((b) => escapeHtml(b)).join(' · ')}</p>
    <p class="desk-record">Record · ${records[p.id].correct} correct · ${records[p.id].wrong} wrong · ${records[p.id].open} open${records[p.id].accuracy !== null ? ` · ${records[p.id].accuracy}% graded` : ''}</p>
    ${standingChip}
  </article>`;
  }).join('\n');
  const dayBlocks = days.map((day) => {
    const stories = day.stories.map((story, index) => {
      const heat = computeHeat(story.stances);
      const persona = personaById(story.memeLine?.personaId);
      return `<a href="/news/${day.date}/${story.slug}/" class="desk-panel desk-story-card ${index === 0 ? 'desk-lead' : 'desk-side'}">
        <div class="desk-story-meta"><span>${story.kind === 'quiet' ? 'Quiet signal' : 'Lead signal'} · ${escapeHtml(day.date)}</span><span style="color:${heatColor(heat)}">${escapeHtml(deriveStoryStats(story, day, { ledger }).label)}</span></div>
        <h3>${escapeHtml(story.headline)}</h3>
        <p class="desk-story-hook">${escapeHtml(story.hook)}</p>
        <p class="desk-pull">${persona ? escapeHtml(persona.name) : 'The Desk'}: “${escapeHtml(story.memeLine?.text || '')}”</p>
      </a>`;
    }).join('\n');
    return `<section class="desk-grid" aria-label="Edition ${escapeHtml(day.date)}">${stories}</section>`;
  }).join('\n');
  return `${head}<main id="main-content" class="desk-shell"><section class="desk-wrap">
  <span class="desk-kicker">The Desk · AI signal</span>
  <h1 class="desk-display">${CAST_TITLE} minds.<br><em>One record.</em></h1>
  <p class="desk-deck">The Desk tracks AI with sourced briefs, sharper arguments, dated predictions, and visible scorecards. Some stories get the full board; some get the one voice that owns the beat. Every call stays checkable.</p>
${AI_BANNER}
${allSimulated || days.length === 0 ? PREVIEW_BANNER : ''}
  ${deskStatsPanel()}
  <div class="desk-rule"></div>
  <div class="desk-section-head"><h2>Today</h2><p>What actually happened, and what the desk makes of it.</p></div>
  ${dayBlocks || '<p style="color:var(--dim)">The Desk opens soon.</p>'}
  ${dispatchCta('hub')}
  <div class="desk-section-head"><h2>The editorial board</h2><p>${CAST_TITLE} AI personas — fictional characters, not people. Not generic chatbots either: ${CAST_WORD} stable worldviews with visible blind spots and permanent scorecards. Each story is argued by the desk that owns its beat, not by all ${CAST_WORD} at once.</p></div>
  <div class="desk-cast">${cast}</div>
  <div class="desk-section-head"><h2>Not every story is the same shape</h2><p>Some days it is an argument. Some days it is one line and a link.</p></div>
  <div class="desk-formats">${STORY_FORMATS.map((f) => `<article class="desk-panel desk-format-card${f.flagship ? ' is-flagship' : ''}">
    <h3>${escapeHtml(f.name)}${f.flagship ? ' <span class="desk-flagship-tag">Flagship</span>' : ''}</h3>
    <p>${escapeHtml(f.brief)}</p>
    <p class="desk-format-bar">${f.minFacts} fact${f.minFacts === 1 ? '' : 's'} · ${f.minStances} voice${f.minStances === 1 ? '' : 's'} · ${f.minPredictions ? 'prediction required' : 'no prediction'}</p>
  </article>`).join('\n')}</div>
  <div class="desk-section-head"><h2>The newsroom behind them</h2><p>The columnists do not decide what publishes. Three AI roles sit between a draft and the page — and each one's job is to refuse something.</p></div>
  <div class="desk-roles">${DESK_ROLES.map((r) => `<article class="desk-panel desk-role-card">
    <h3>${escapeHtml(r.name)} <span class="desk-ai-tag">AI role</span></h3>
    <p class="desk-role-title">${escapeHtml(r.title)}</p>
    <p class="desk-role-mandate">${escapeHtml(r.mandate)}</p>
    <p class="desk-role-refuses"><strong>Refuses:</strong> ${escapeHtml(r.refuses)}</p>
  </article>`).join('\n')}</div>
  <div class="desk-section-head" id="ledger"><h2>The scorecard</h2><p>They go on the record, and we keep it. Including the misses.</p></div>
  <p class="desk-panel desk-record-state">${(() => {
    const graded = Object.values(records).reduce((n, r) => n + r.correct + r.wrong, 0);
    const open = Object.values(records).reduce((n, r) => n + r.open, 0);
    // Honest-dark: say plainly that nothing has been graded yet rather than
    // rendering an empty scoreboard that implies a track record exists.
    return graded === 0
      ? `<strong>Nothing has been graded yet.</strong> The desk has ${open} prediction${open === 1 ? '' : 's'} on the record and none have come due, so every persona reads <em>unproven</em> — not "accurate". A track record is earned by being graded against evidence, and this one has not started.`
      : `<strong>${graded} prediction${graded === 1 ? '' : 's'} graded</strong> against published evidence · ${open} still open. Corrections are published when the desk was wrong.`;
  })()}</p>
  <p class="desk-panel" style="padding:1.1rem 1.25rem;color:var(--desk-muted);font-size:.9rem;line-height:1.65">Audit the same evidence machinery behind <a href="/proof/" style="color:var(--gold)">VaultSpark Proof</a>. Follow <a href="/api/news-desk-feed.json" style="color:var(--gold)">the JSON Feed</a>, or inspect the agent-readable <a href="/api/news-desk-claims.ndjson" style="color:var(--gold)">claims stream</a>.</p>
  ${DISCLOSURE}
</section></main>${DISPATCH_SCRIPT}${chromeFoot()}`;
}

/* ── Confirmation landing (Brevo double opt-in redirect target) ────────── */

// Brevo sends the reader here AFTER they click the confirmation link, so this
// page is the only place the desk may honestly say "you're subscribed".
function buildSubscribedPage() {
  const head = chromeHead({
    title: 'Subscribed to The Dispatch — The Desk · VaultSpark Studios',
    description: 'Your subscription to The Dispatch is confirmed. The Desk sends the day\'s lead argument, the quiet story, and every prediction that came due.',
    canonical: `${PROD}/news/subscribed/`,
    ogImage: `${PROD}/assets/og/news/dispatch-subscribed.png`,
    depth: '../../',
    noindex: true,
    breadcrumb: breadcrumbFor([
      ['Home', `${PROD}/`],
      ['The Desk', `${PROD}/news/`],
      ['Subscribed', `${PROD}/news/subscribed/`],
    ]),
  });
  return `${head}<main id="main-content" class="desk-shell"><section class="desk-wrap">
  <span class="desk-kicker">The Desk · The Dispatch</span>
  <h1 class="desk-display">You're on<br><em>the list.</em></h1>
  <p class="desk-deck">Confirmed. You'll get The Dispatch when the desk publishes: the day's lead argument, the quiet story nobody covered, and every prediction that came due — plus an honest note whenever the desk got one wrong.</p>
  <div class="desk-rule"></div>
  <p class="desk-panel" style="padding:1.1rem 1.25rem;color:var(--desk-muted);font-size:.95rem;line-height:1.7">
    Nothing else changed: The Desk still requires no account, and your address is used only to send The Dispatch. Every email carries a one-click unsubscribe.<br><br>
    <a href="/news/" style="color:var(--gold)">← Back to The Desk</a> &nbsp;·&nbsp;
    <a href="/api/news-desk-feed.json" style="color:var(--gold)">JSON Feed</a> &nbsp;·&nbsp;
    <a href="/privacy/" style="color:var(--gold)">Privacy</a>
  </p>
  ${DISCLOSURE}
</section></main>${chromeFoot()}`;
}

/* ── The Director's Report ─────────────────────────────────────────────── */

/**
 * ORSON's page. The numbers are derived from the corpus; the judgement is his.
 * Publishing the assignment reasoning AND the performance review is the point —
 * a newsroom that grades its writers in private is just asserting quality.
 */
function buildDirectorsReportPage() {
  const report = directorsReports[0];
  if (!report) return null;
  const orson = roleById('orson');
  // Scoped to the report's own date: a review of opening week reports opening
  // week, and stays true as later work lands (S309).
  const perf = deriveDeskPerformance(days, ledger, { through: report.date });
  const byId = Object.fromEntries(perf.map((p) => [p.id, p]));
  const url = `${PROD}/news/directors-report/`;

  const head = chromeHead({
    title: `The Director's Report — ${escapeHtml(report.period)} · The Desk`,
    description: clamp(`${report.headline} ORSON runs The Desk and explains who covered what, how they did, and what each writer owes the reader next.`, 200),
    canonical: url,
    // Bespoke share card, NOT the generic site card (S309). Rendered by
    // build-news-desk's rasterizeDirectorsCard() — the Desk owns its own cards
    // because build-og-cards picks headlines from og:title, which this head
    // deliberately does not emit, so it skips every news page in silence.
    ogImage: `${PROD}/assets/og/news/directors-report.png`,
    depth: '../../',
    noindex: false,
    breadcrumb: breadcrumbFor([['Home', `${PROD}/`], ['The Desk', `${PROD}/news/`], ["The Director's Report", url]]),
  });

  const rows = [...(report.reviews || [])].sort((a, b) => a.rank - b.rank).map((r) => {
    const persona = personaById(r.personaId);
    const p = byId[r.personaId] || { assignments: 0, words: 0, panels: 0, formats: [] };
    const filed = p.assignments > 0 || p.panels > 0;
    return `<article class="desk-panel desk-review${filed ? '' : ' is-quiet'}" style="--persona:${persona.accent}">
      <div class="desk-review-head">
        <span class="desk-rank">${r.rank}</span>
        <div><h3>${escapeHtml(persona.name)} <span class="desk-ai-tag">AI persona</span></h3>
        <p class="desk-role">${escapeHtml(persona.role)}</p></div>
      </div>
      <p class="desk-review-stats">${p.assignments} assignment${p.assignments === 1 ? '' : 's'} · ${p.words} word${p.words === 1 ? '' : 's'} · ${p.panels} panel${p.panels === 1 ? '' : 's'}${p.formats.length ? ` · ${p.formats.join(', ')}` : ''}</p>
      <p class="desk-review-note">${escapeHtml(r.note)}</p>
      <p class="desk-review-improve"><strong>Work on:</strong> ${escapeHtml(r.improve)}</p>
    </article>`;
  }).join('\n');

  return `${head}<main id="main-content" class="desk-shell"><section class="desk-wrap">
  <span class="desk-kicker">The Desk · The Director's Report</span>
  <h1 class="desk-display">${escapeHtml(report.period)}.<br><em>Who filed, who didn't.</em></h1>
  <p class="desk-deck">${escapeHtml(report.headline)}</p>
  ${AI_BANNER}
  <div class="desk-rule"></div>
  <div class="desk-body">
    <div class="desk-said" style="--persona:var(--gold,#ffc400)">
      <p class="desk-said-who"><strong>${escapeHtml(orson.name)}</strong> <span>${escapeHtml(orson.title)}</span></p>
      <p>${escapeHtml(report.opening)}</p>
    </div>
    <p>${escapeHtml(report.assignmentNote)}</p>
  </div>
  <div class="desk-section-head"><h2>The writers</h2><p>Ranked. Every one of them gets something to work on, including the one at the top.</p></div>
  <div class="desk-reviews">${rows}</div>
  <div class="desk-body" style="margin-top:2rem"><p>${escapeHtml(report.closing)}</p>
    <p class="desk-said-who" style="margin-top:1rem!important"><strong>— ${escapeHtml(orson.name)}</strong></p></div>
  ${DISCLOSURE}
</section></main>${chromeFoot()}`;
}

/* ── Emit ──────────────────────────────────────────────────────────────── */

const targets = [
  { path: 'news/index.html', html: buildHubPage() },
  { path: 'news/subscribed/index.html', html: buildSubscribedPage() },
  ...(buildDirectorsReportPage() ? [{ path: 'news/directors-report/index.html', html: buildDirectorsReportPage() }] : []),
];
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
