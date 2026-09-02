#!/usr/bin/env node
/**
 * S339 (D-S339.4) — the home portfolio tiers must agree with the canonical feeds,
 * and must state each card's status exactly once.
 *
 * WHAT WAS LIVE. S247 found four project pages showing "⚒️ Forge" while the nav
 * promoted them as "🔥 Sparked", and closed that with check-project-status-coherence
 * — which binds each DESTINATION PAGE's hero badge to the nav grouping. The home
 * page is a third surface, and it was never bound to anything. Measured in S339,
 * on the busiest page on the site:
 *
 *   · PromoGrind sat under the "🔥 Sparked" heading wearing a "⚒️ Forge" badge —
 *     the card contradicted the heading directly above it.
 *   · Velaxis and Vorn sat in the FORGE tier entirely, while the catalog, the nav
 *     and their own destination pages all said SPARKED.
 *
 * So a visitor's first impression of three shipped products was "still building",
 * and every existing coherence gate was green, because each one compared surfaces
 * that happened to agree with each other.
 *
 * TWO RULES, neither naming a project:
 *   1. every home portfolio card sits in the tier its canonical feed status says
 *      it belongs in — `data/game-registry.json` for games, the
 *      `api/public-intelligence.json` catalog for everything else;
 *   2. no card inside a tier carries its own status badge. The tier heading states
 *      the fact once. A card repeating it is redundant when it agrees and a lying
 *      surface when it does not, and rule 2 is what makes the second case
 *      impossible rather than merely currently-absent.
 *
 * Usage:
 *   node scripts/check-home-portfolio-status-coherence.mjs
 *   node scripts/check-home-portfolio-status-coherence.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/** A card whose href cannot name a catalog entry must say why, on the record. */
const UNRESOLVABLE = Object.freeze({
  '/#social': 'The sealed-vault teaser is deliberately unnamed and unlinked (sealed-vault pattern); it advertises no product page to resolve against.',
});

const TIER_STATUS = Object.freeze({ sparked: 'SPARKED', forge: 'FORGE', vaulted: 'VAULTED' });

const normaliseUrl = (u) => String(u || '').trim().toLowerCase().replace(/\/+$/, '');

/** Slug -> canonical status, from the two feeds the nav itself groups by. */
export function canonicalStatuses({ gameRegistry, catalog }) {
  const bySlug = new Map();
  const byUrl = new Map();
  for (const [slug, game] of Object.entries(gameRegistry?.games || {})) {
    const status = String(game?.status || '').toUpperCase();
    bySlug.set(slug, status);
    if (game?.url) byUrl.set(normaliseUrl(game.url), status);
  }
  for (const entry of catalog?.catalog || []) {
    const status = String(entry?.status || '').toUpperCase();
    if (!bySlug.has(entry.id)) bySlug.set(entry.id, status);
    const url = entry.deployedUrl || entry.url;
    if (url && !byUrl.has(normaliseUrl(url))) byUrl.set(normaliseUrl(url), status);
  }
  return { bySlug, byUrl };
}

/** Tier blocks with their heading status class and their cards. */
export function parseTiers(html) {
  const tiers = [];
  const starts = [...html.matchAll(/<div class="project-tier">/g)].map((m) => m.index);
  for (let i = 0; i < starts.length; i += 1) {
    const block = html.slice(starts[i], starts[i + 1] ?? html.length);
    const tierClass = /tier-label-([a-z]+)/.exec(block)?.[1] || null;
    const cards = [];
    // Match the whole class list, not the bare `class="card"`. Caught on this
    // gate's own first live run: the sealed-vault teaser is `class="card card-stub"`
    // and an exact-match regex skipped it silently — the gate reported 10 coherent
    // cards on a page that has 11, and looked green either way. A card excluded by
    // a regex accident is indistinguishable from one nobody thought about.
    for (const m of block.matchAll(/<article class="([^"]*\bcard\b[^"]*)">([\s\S]*?)<\/article>/g)) {
      const classList = m[1];
      const body = m[2];
      cards.push({
        name: (/<h3>([^<]*)<\/h3>/.exec(body)?.[1] || '').trim(),
        href: /class="card-actions"[\s\S]*?href="([^"]+)"/.exec(body)?.[1] || null,
        badge: /<span class="status status-([a-z]+)"/.exec(body)?.[1] || null,
        // The status can also hide in the descriptive meta chips. Found live in
        // S339 on a rendered capture, AFTER the badge rule was already passing:
        // Franchise Architect carried "Football Sim · Front Office · Sparked",
        // so the status was still stated twice on that card while every check
        // said the card was clean. Same class, different element.
        statusChips: [...body.matchAll(/<div class="meta">([\s\S]*?)<\/div>/g)]
          .flatMap((meta) => [...meta[1].matchAll(/<span>([^<]*)<\/span>/g)].map((c) => c[1].trim()))
          .filter((chip) => /^(sparked|forge|in the forge|vaulted)$/i.test(chip)),
        // A stub advertises no product yet (sealed-vault pattern), so it has no
        // catalog entry to be coherent with. That is a DECLARED kind, readable in
        // the markup itself — not a name on a list here and not a silent skip.
        stub: /\bcard-stub\b/.test(classList),
      });
    }
    tiers.push({ tierClass, cards });
  }
  return tiers;
}

export function evaluate({ html, gameRegistry, catalog, unresolvable = UNRESOLVABLE }) {
  const findings = [];
  const { bySlug, byUrl } = canonicalStatuses({ gameRegistry, catalog });
  const tiers = parseTiers(html);
  let checked = 0;
  let exempt = 0;

  if (!tiers.length) findings.push('no project tiers found on the home page — the gate would otherwise pass by measuring nothing');

  for (const tier of tiers) {
    const expected = TIER_STATUS[tier.tierClass];
    if (!expected) {
      findings.push(`tier with class "${tier.tierClass}" is not one of ${Object.keys(TIER_STATUS).join('/')}`);
      continue;
    }
    if (!tier.cards.length) findings.push(`the ${expected} tier contains no cards`);

    for (const card of tier.cards) {
      const label = card.name || '(unnamed card)';

      // RULE 2 — stated once, in the heading. Any element, not just the badge.
      if (card.badge) {
        findings.push(`"${label}" repeats a status badge (${card.badge}) inside the ${expected} tier; the tier heading already states it`);
      }
      for (const chip of card.statusChips || []) {
        findings.push(`"${label}" carries "${chip}" as a descriptive meta chip inside the ${expected} tier; the tier heading already states the status, and a chip is for what the product IS, not what stage it is at`);
      }

      // RULE 1 — placement must match canonical truth.
      // A stub is a deliberate placeholder for something with no catalog entry
      // yet; it still may not carry a badge (rule 2 above already ran).
      if (card.stub) { exempt += 1; continue; }
      const href = card.href;
      if (!href) { findings.push(`"${label}" has no link, so its status cannot be resolved`); continue; }
      if (href in unresolvable) { exempt += 1; continue; }

      const localSlug = /^\/(?:games|projects)\/([^/]+)\/?$/.exec(href)?.[1];
      const actual = localSlug ? bySlug.get(localSlug) : byUrl.get(normaliseUrl(href));

      if (!actual) {
        findings.push(`"${label}" links to ${href}, which matches no entry in game-registry or the catalog, and is not declared unresolvable`);
        continue;
      }
      checked += 1;
      if (actual !== expected) {
        findings.push(`"${label}" is ${actual} in the canonical feed but is presented in the ${expected} tier`);
      }
    }
  }

  return { ok: findings.length === 0, findings, checked, exempt, tiers: tiers.length };
}

function selfTest() {
  const gameRegistry = { games: { solara: { status: 'forge', name: 'Solara' }, doodie: { status: 'sparked', name: 'CoD', url: 'https://doodie.example.com/' } } };
  const catalog = { catalog: [{ id: 'velaxis', status: 'SPARKED', name: 'Velaxis' }] };
  const card = (name, href, badge, cls = 'card', chips = []) => `<article class="${cls}"><div class="card-art x">${badge ? `<span class="status status-${badge}">b</span>` : ''}<h3>${name}</h3></div><div class="meta">${chips.map((c) => `<span>${c}</span>`).join('')}</div><div class="card-actions"><a href="${href}">go</a></div></article>`;
  const tier = (cls, ...cards) => `<div class="project-tier"><div class="tier-label tier-label-${cls}"><h3>t</h3></div><div class="cards">${cards.join('')}</div></div>`;
  const run = (html) => evaluate({ html, gameRegistry, catalog });

  const cases = [
    ['a correctly-placed, badge-free card passes',
      run(tier('forge', card('Solara', '/games/solara/'))).ok],

    // THE LIVE S339 SHAPES.
    ['a SPARKED product presented in the FORGE tier fails',
      !run(tier('forge', card('Velaxis', '/projects/velaxis/'))).ok],
    ['the finding names the card, the real status and the tier it was put in',
      (() => {
        const f = run(tier('forge', card('Velaxis', '/projects/velaxis/'))).findings.join(' ');
        return f.includes('Velaxis') && f.includes('SPARKED') && f.includes('FORGE');
      })()],
    ['a card carrying its own badge inside a tier fails even when it agrees',
      !run(tier('forge', card('Solara', '/games/solara/', 'forge'))).ok],
    ['a card whose badge contradicts its tier fails',
      !run(tier('sparked', card('Solara', '/games/solara/', 'forge'))).ok],

    ['an external link resolves through the feed url',
      run(tier('sparked', card('CoD', 'https://doodie.example.com/'))).ok],
    ['a trailing-slash difference does not defeat url resolution',
      run(tier('sparked', card('CoD', 'https://doodie.example.com'))).ok],
    ['an external link matching nothing in either feed fails',
      !run(tier('sparked', card('Ghost', 'https://nowhere.example.com/'))).ok],

    ['an unresolvable card passes only when declared, with a reason',
      evaluate({ html: tier('vaulted', card('Sealed', '/#social')), gameRegistry, catalog }).ok
      && !evaluate({ html: tier('vaulted', card('Sealed', '/#social')), gameRegistry, catalog, unresolvable: {} }).ok],

    ['a card with no link at all fails rather than being skipped',
      !run('<div class="project-tier"><div class="tier-label tier-label-forge"><h3>t</h3></div><article class="card"><h3>Orphan</h3></article></div>').ok],
    ['an unknown tier class fails',
      !run(tier('someday', card('Solara', '/games/solara/'))).ok],
    ['an empty tier fails rather than passing vacuously',
      !run(tier('forge')).ok],
    ['a page with no tiers at all fails rather than measuring nothing',
      !run('<p>no portfolio here</p>').ok],

    // The gate's own first live run skipped this card silently and still looked green.
    // The residue found on a rendered capture after the badge rule was green.
    ['a status word hiding in a descriptive meta chip fails',
      !run(tier('sparked', card('Velaxis', '/projects/velaxis/', null, 'card', ['Dashboard', 'Sparked']))).ok],
    ['ordinary descriptive chips pass untouched',
      run(tier('sparked', card('Velaxis', '/projects/velaxis/', null, 'card', ['Dashboard', 'Crypto', 'Real-Time']))).ok],
    ['the chip rule is case- and phrasing-insensitive',
      !run(tier('forge', card('Solara', '/games/solara/', null, 'card', ['RPG', 'in the forge']))).ok],

    ['a card with extra classes is still measured, not skipped by the selector',
      !run(tier('forge', card('Velaxis', '/projects/velaxis/', null, 'card card-featured'))).ok],
    ['a declared stub is exempt from placement but not from the badge rule',
      run(tier('vaulted', card('Sealed', '/#social', null, 'card card-stub'))).ok
      && !run(tier('vaulted', card('Sealed', '/#social', 'forge', 'card card-stub'))).ok],
    ['a non-stub card with the same unmatched link is NOT exempt',
      !evaluate({ html: tier('vaulted', card('Sealed', '/#social')), gameRegistry, catalog, unresolvable: {} }).ok],

    ['game-registry wins over the catalog for a slug present in both',
      canonicalStatuses({
        gameRegistry: { games: { mindframe: { status: 'forge' } } },
        catalog: { catalog: [{ id: 'mindframe', status: 'SPARKED' }] },
      }).bySlug.get('mindframe') === 'FORGE'],
  ];

  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-home-portfolio-status-coherence --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();

const result = evaluate({
  html: fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
  gameRegistry: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'game-registry.json'), 'utf8')),
  catalog: JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'public-intelligence.json'), 'utf8')),
});
if (!result.ok) {
  console.error('check-home-portfolio-status-coherence: FAILED');
  for (const finding of result.findings) console.error(`  x ${finding}`);
  console.error('\n  The home page is the first surface a visitor reads. A card in the wrong tier tells them a shipped product is still being built.');
  process.exit(1);
}
console.log(`check-home-portfolio-status-coherence: ${result.checked} card(s) coherent across ${result.tiers} tier(s) · ${result.exempt} declared unresolvable · no in-tier badge duplication`);
