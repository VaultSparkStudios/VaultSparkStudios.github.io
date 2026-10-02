#!/usr/bin/env node
/**
 * derive-registry-surfaces.mjs — S368 registry-truth-everywhere (audit 2026-10-02 #3, L2).
 *
 * THE GAP IT CLOSES: S367 derived the nav + /games/ badges from the registry, but a
 * full-site pass still found hand-typed status everywhere else: the press kit listed
 * FORGE titles as "live" and said "Three are sparked" while naming six; project info
 * boxes said Sparked for FORGE tools (and Forge for a SPARKED one); /projects/ and
 * /games/ carried hand stat counts and hand catalogs that omitted registry titles;
 * the homepage no-JS spine said "6 active · 14 in the forge"; the roadmap said "Six
 * worlds". Every one of those is a status claim that only a person remembered to edit.
 *
 * This generator owns every such claim as a MARKER-BOUNDED block:
 *     <!-- registry:NAME:start --> … <!-- registry:NAME:end -->
 * and renders each block from the two canon-derived inputs:
 *   - data/game-registry.json        (games: status, name, playUrl, navOrder, featured)
 *   - api/public-intelligence.json   (studio-ops canon via the in-repo registry mirror:
 *                                     every public project + portfolio counts)
 * It also verifies the /projects/ catalog block owned by build-projects-catalog.mjs
 * (reusing its renderer), so one --check covers every registry surface.
 *
 * Founder canon D-S367.1: vault status derives from studio-ops canon only. A game's
 * registry status that disagrees with the canon feed is a hard --check failure. A
 * FORGE game with a registry playUrl is a "Playable Beta" and keeps its Play CTA.
 *
 * Copy that is not a status claim (descriptions, genre tags) lives in the COPY maps
 * below — keyed by id, rendered verbatim, never inferred. Contradictions inside that
 * copy (genre/description conflicts) are founder rulings, not generator decisions.
 *
 * Modes:
 *   (default)    bootstrap missing markers on known legacy regions, then re-render all blocks
 *   --dry-run    report files/blocks that would change; write nothing
 *   --check      exit 1 if any block is missing, stale, or the registry contradicts canon
 *   --self-test  fixture assertions incl. negative controls (mutated block / status → check fails)
 *
 * Import-safe: side effects only when invoked directly.
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCatalog, injectCatalog, offRegistryPages, CATALOG_START, CATALOG_END } from './build-projects-catalog.mjs';
import { toWord } from './build-portfolio-counts.mjs';
import { ORIGIN as SITE, ORG_REF as ORG_REF_ID, WEBSITE_REF as WEBSITE_REF_ID } from './lib/org-entity.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Registry slug → public-intelligence id where they differ.
export const PI_ALIAS = Object.freeze({ 'franchise-architect': 'football-gm' });

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

// ─── Non-status copy (verbatim; edit here, never in the pages) ────────────────
// games/index.html card + roadmap card copy per registry game slug. `roadmap` keeps
// each page's existing wording so this generator does not silently rule on the open
// description conflicts (Solara roguelite vs MMORPG, MindFrame puzzle vs platform…).
export const GAME_COPY = {
  'call-of-doodie': {
    genre: 'action', hero: 'doodie', eyebrow: 'Action Comedy Shooter',
    desc: 'A hilarious browser shooter RPG where absurdity is the primary mechanic and punchlines arrive via ammunition. Parody-fueled arcade chaos built for laughs, replayability, and surprisingly sharp gameplay — enter a world where the comedy never stops and the action never lets up.',
    features: ['Fast-paced arcade shooter gameplay, no download required', 'Comedy-first design — every encounter is the setup for the punchline', 'Active development with live updates'],
    meta: ['Action', 'Comedy', 'Arcade', 'Free'],
    playLabel: "Play Now — It's Free &rarr;",
    roadmap: { desc: 'Action comedy browser shooter. The first world unsealed from the vault — free to play, actively updated.', meta: ['Action', 'Comedy', 'Shooter'], link: 'Play Now →' },
  },
  'franchise-architect': {
    genre: 'sports', hero: 'footballgm',
    desc: 'Deep NFL front-office simulation with persistent leagues, multi-season career arcs, and a full franchise hub. Save and continue active leagues across sessions. The most complete football management sim on the web — currently in client beta.',
    meta: ['NFL Sim', 'Management', 'Persistent', 'Beta'],
    playLabel: 'Play Beta',
    roadmap: { desc: 'Deep NFL front-office simulation focused on league realism, career arcs, and franchise storytelling.', meta: ['Sports Sim', 'NFL', 'Front Office'], link: 'Access Beta →' },
  },
  'gridiron-gm': {
    genre: 'sports', hero: 'gridiron',
    desc: 'NFL-style franchise management sim with 32 fictional teams, a 7-round draft, a $300M salary cap, and animated play-by-play. Vaulted and honored — its systems live on in Franchise Architect.',
    meta: ['Franchise Sim', 'Draft', 'Dynasty', 'Vaulted'],
    waitLabel: 'Join The Vault',
    roadmap: { desc: 'Football franchise management simulation. Vaulted and honored — its systems live on in Franchise Architect.', meta: ['Sports Sim', 'Management', 'Dynasty'] },
  },
  vaultfront: {
    genre: 'strategy', hero: 'vaultfront',
    desc: 'Real-time strategy warfront built around convoy timing, vault capture mechanics, and swing-heavy map pressure. Asymmetric strategy where controlling a single chokepoint can flip the entire battle state. Release window to be announced.',
    meta: ['Strategy', 'Real-Time', 'Vault Warfare'],
    roadmap: { desc: 'Strategic warfront — tactical territory control and resource management. Release window to be announced.', meta: ['Strategy', 'Warfront', 'Tactical'] },
  },
  solara: {
    genre: 'roguelite', hero: 'solara', shortName: 'Solara',
    desc: 'A browser roguelite RPG with a shared world, where every player death dims a shared sun. Run the daily dungeon, leave your grave on the living map, and fight to keep the light alive.',
    meta: ['Roguelite RPG', 'Permadeath', 'Shared World'],
    roadmap: { desc: 'A browser roguelite RPG with a shared world — every player death dims a shared sun. Run the daily dungeon and keep the light alive.', meta: ['Roguelite RPG', 'Shared World', 'Browser'] },
  },
  mindframe: {
    genre: 'cognitive', hero: 'mindframe',
    desc: 'A live metacognition platform — structured cognitive practice that trains how you think about your own thinking. Open it now in your browser.',
    meta: ['Metacognition', 'Cognitive Training', 'Live'],
    openLabel: 'Open MindFrame',
    roadmap: { desc: 'A live metacognition platform — structured cognitive practice that trains how you think about your own thinking.', meta: ['Metacognition', 'Cognitive Training', 'Live'] },
  },
  'the-exodus': {
    genre: 'card', hero: 'the-exodus',
    desc: 'An engine-building card game for 2–4 players (plus solo) aboard a generation ship fleeing a dying star. Fulfill contracts across six ship sections and build your engine before the sun timer runs out.',
    meta: ['Card Game', 'Engine Builder', '2–4 Players + Solo'],
    roadmap: { desc: 'An engine-building card game for 2–4 players (plus solo) aboard a generation ship fleeing a dying star.', meta: ['Card Game', 'Engine Builder', '2–4 Players'] },
  },
  voidfall: {
    genre: 'saga', hero: 'voidfall card-hero--titled',
    desc: 'A nine-book cosmic-horror saga. Book 1 at lock. Not a game — a world, engineered to thread across every VaultSpark title as shared mythology.',
    meta: ['Saga', 'Cosmic Horror', 'Shared Mythology'],
    waitLabel: 'Get Early Signal',
    roadmap: { desc: 'A nine-book cosmic-horror saga. Not a game — a world, threading across every VaultSpark title.', meta: ['Saga', 'Cosmic Horror', 'Lore'] },
  },
  'vaultspark-forge': {
    genre: 'crafting', hero: 'vaultspark-forge card-hero--titled',
    desc: 'A crafting-and-building world in early concept. Details surface when the forge pressurizes.',
    meta: ['Crafting', 'Building', 'Early Concept'],
    waitLabel: 'Get Early Signal',
    roadmap: { desc: 'A crafting-and-building world taking shape in the forge.', meta: ['Crafting', 'Building', 'Concept'] },
  },
  'project-unknown': {
    genre: 'classified', hero: 'vault-sealed', shortName: 'Project ???',
    desc: 'Something is charged. The vault walls are warm. A new world is building pressure behind the steel. Vault Members will hear about this first.',
    meta: ['Sealed Teaser', 'Unknown Genre'],
    waitLabel: 'Join The Vault',
  },
};

// A registry game with `status: "sealed"` is a teaser with NO vault status
// (D-S368.3: Project Unknown stays sealed and leaves status counts until it has
// a canon record). It keeps its /games/ teaser card, but never enters a status
// count, a status list, the roadmap pipeline, or the nav status groups.
export const SEALED = 'sealed';
const STATUSES = ['sparked', 'forge', 'vaulted'];

// Genre filter buttons render only for genres a card actually carries (an empty
// filter — S367's MMORPG button matched nothing — is a dead control).
export const GENRE_ORDER = [
  ['sports', 'Sports'], ['action', 'Action'], ['strategy', 'Strategy'], ['puzzle', 'Puzzle'],
  ['roguelite', 'Roguelite'], ['card', 'Card Game'], ['cognitive', 'Cognitive'], ['survival', 'Survival'], ['mmorpg', 'MMORPG'], ['saga', 'Saga'], ['crafting', 'Crafting'],
];

// Press-kit copy per public-intelligence id. Missing ids fall back to category + feed note.
export const PRESS_COPY = {
  veilos: { emoji: '🌐', grad: 'rgba(167,139,250,0.25),rgba(31,162,255,0.15)', border: 'rgba(167,139,250,0.2)', meta: 'Cognitive Civilization OS &middot; Web Platform &middot; Live', desc: 'A public Cognitive Civilization OS — a Sovereign Dashboard, Chain Verification, and a Collaborate Exchange, with status, changelog and legal surfaces live at veilos.io.', open: 'Visit VEILOS' },
  vorn: { emoji: '🤖', grad: 'rgba(220,38,38,0.22),rgba(249,115,22,0.14)', border: 'rgba(220,38,38,0.2)', meta: 'Agent Platform &middot; Social-First &middot; Live', desc: 'A social-first, agent-native platform — give your AI agent a home. Live at joinvorn.com.', open: 'Open Vorn' },
  'football-gm': { emoji: '🏈', grad: 'rgba(16,185,129,0.2),rgba(31,162,255,0.15)', border: 'rgba(16,185,129,0.2)', meta: 'Sports Simulation &middot; Free Beta &middot; Browser', desc: 'A deep NFL front-office simulation that puts players in the GM seat — managing drafts, depth charts, salary cap, and the slow-burn drama of building a franchise contender. Currently in open beta with ongoing development. A sports sim for people who think the game happens before kickoff.', open: 'Play Beta' },
  'call-of-doodie': { emoji: '🎮', grad: 'rgba(255,122,0,0.25),rgba(255,196,0,0.15)', border: 'rgba(255,122,0,0.2)', meta: 'Action Comedy &middot; Free to Play &middot; Browser', desc: "A fast-paced browser-based shooter where absurdist action comedy arrives at full volume. Players navigate escalating chaos — punchlines via ammunition, every frame tuned for comedic timing. Free, instant, no download required. The studio's most-played title and primary audience driver.", open: 'Play the Beta' },
  promogrind: { meta: 'Sportsbook Promo Tool &middot; 21+', desc: 'A sportsbook promo conversion suite — calculators, sportsbook tracking and a profit-and-loss ledger for educational promo math. 21+. Gambling involves risk; if you or someone you know has a gambling problem, call 1-800-GAMBLER.' },
  solara: { meta: 'Roguelite RPG &middot; Shared World', desc: 'Every player death dims a shared sun. Run the daily dungeon, leave your grave on a living map, and fight to keep the light alive with every other player simultaneously.' },
  voidfall: { meta: 'Cosmic-Horror Saga &middot; Nine-Book Arc', desc: 'A nine-book cosmic-horror saga. Book 1 at lock. Not a game — a world, engineered to thread across every VaultSpark title as shared mythology.' },
  vaultfront: { meta: 'Strategy &middot; Vault Warfare', desc: 'A strategy warfront built around convoy timing, vault captures, and swing-heavy map pressure. Release window to be announced.' },
  mindframe: { meta: 'Metacognition Platform &middot; Live', desc: 'A live metacognition platform — structured cognitive practice that trains how you think about your own thinking.' },
  'the-exodus': { meta: 'Card Game &middot; 2–4 Players + Solo', desc: 'An engine-building card game for 2–4 players (plus solo) aboard a generation ship fleeing a dying star. Fulfill contracts across six ship sections before the sun timer runs out.' },
  velaxis: { meta: 'Crypto Market Intelligence &middot; Tool', desc: 'A crypto market intelligence dashboard — signal over noise for active traders, with no custody of your funds.' },
  'vaultspark-forge': { meta: 'Crafting &middot; Building &middot; Early Concept', desc: 'A crafting-and-building world in early concept. Details surface when the forge pressurizes.' },
  'gridiron-gm': { meta: 'Sports Simulation &middot; Vaulted', desc: 'A football franchise management simulation, paused and honored in the vault.' },
};

// ─── Model ────────────────────────────────────────────────────────────────────
// Registry games whose /games/<slug>/ page is retired behind an edge 301 (_redirects).
export const RETIRED_GAME_ROUTES = Object.freeze({ voidfall: '/universe/voidfall/' });

function defaultExists(rel) { return existsSync(join(ROOT, rel)); }

/**
 * Build the unified title model. Throws nothing; contradictions are returned so
 * --check can fail loudly while the default mode can still report them.
 */
export function buildModel(registry, pi, { exists = defaultExists } = {}) {
  const games = registry.games || {};
  const catalog = pi.catalog || [];
  const byPi = new Map(catalog.map((c) => [c.id, c]));
  const contradictions = [];
  const gameTitles = [];
  for (const [slug, g] of Object.entries(games)) {
    const piItem = byPi.get(PI_ALIAS[slug] || slug) || null;
    const status = String(g.status || '').toLowerCase();
    if (status !== SEALED && !STATUSES.includes(status)) {
      contradictions.push(`${slug}: game-registry status "${status}" is not one of ${[...STATUSES, SEALED].join(' | ')}`);
    }
    if (status === SEALED && piItem) {
      contradictions.push(`${slug}: game-registry says SEALED (no status) but canon feed lists it as ${piItem.status} — give it the canon status`);
    } else if (piItem && piItem.status.toLowerCase() !== status) {
      contradictions.push(`${slug}: game-registry says ${status.toUpperCase()} but canon feed (api/public-intelligence.json) says ${piItem.status}`);
    }
    gameTitles.push({
      id: slug, piId: piItem ? piItem.id : null, kind: 'game', name: g.name, status,
      playable: !!g.playUrl, playUrl: g.playUrl || null, featured: !!g.featured, navOrder: g.navOrder ?? 99,
      category: piItem ? piItem.category : null, note: piItem ? piItem.note : null,
      deployedUrl: piItem ? piItem.deployedUrl || null : null,
      // S368: a registry title whose /games/ page was retired routes to its new home.
      href: exists(`games/${slug}/index.html`) ? `/games/${slug}/` : (RETIRED_GAME_ROUTES[slug] || `/games/${slug}/`),
    });
  }
  const gameIds = new Set(Object.keys(games).map((s) => PI_ALIAS[s] || s));
  const projectTitles = catalog
    .filter((c) => c.type !== 'game' && !gameIds.has(c.id))
    .map((c) => {
      const local = `projects/${c.id}/index.html`;
      return {
        id: c.id, piId: c.id, kind: 'project', name: c.name, status: c.status.toLowerCase(),
        playable: false, playUrl: null, featured: false, category: c.category, note: c.note,
        deployedUrl: c.deployedUrl || null,
        href: exists(local) ? `/projects/${c.id}/` : (c.deployedUrl || null),
      };
    });
  const statusRank = { sparked: 0, forge: 1, vaulted: 2, [SEALED]: 3 };
  gameTitles.sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) || a.navOrder - b.navOrder || a.name.localeCompare(b.name));
  const count = (list, s) => list.filter((t) => t.status === s).length;
  const statused = gameTitles.filter((t) => STATUSES.includes(t.status));
  const p = pi.portfolio || {};
  return {
    games: gameTitles,
    projects: projectTitles,
    catalog,
    contradictions,
    edgeFunctions: (pi.stats && pi.stats.activeEdgeFunctions) || null,
    counts: {
      portfolio: { total: p.total, sparked: p.sparked, forge: p.forge, vaulted: p.vaulted, sealed: p.sealedCount ?? 0 },
      games: { sparked: count(gameTitles, 'sparked'), forge: count(gameTitles, 'forge'), vaulted: count(gameTitles, 'vaulted'), total: statused.length, sealed: count(gameTitles, SEALED) },
      projects: { sparked: count(projectTitles, 'sparked'), forge: count(projectTitles, 'forge'), vaulted: count(projectTitles, 'vaulted') },
    },
  };
}

// ─── Presentation helpers ─────────────────────────────────────────────────────
function statusKey(t) { return t.status === 'forge' && t.playable ? 'playable' : t.status; }
const STATUS_ROW = {
  sparked: ['#fbbf24', '🔥 Sparked'],
  playable: ['#f59e0b', '⚒️ Forge · Playable Beta'],
  forge: ['#f59e0b', '⚒️ In The Forge'],
  vaulted: ['#94a3b8', '🔒 Vaulted'],
  [SEALED]: ['#94a3b8', 'Unannounced'],
};
const CARD_BADGE = { sparked: '🔥 Sparked', playable: '⚒️ Forge · Playable Beta', forge: '⚒️ Forge', vaulted: '🔒 Vaulted' };
const CARD_ARIA = { sparked: 'Sparked', playable: 'Forge, playable beta', forge: 'In The Forge', vaulted: 'Vaulted', [SEALED]: 'Sealed teaser' };
const STAGE_BADGE = { sparked: ['stage-sparked', '🔥 Sparked'], playable: ['stage-forge', '⚒️ Forge · Playable Beta'], forge: ['stage-forge', '⚒️ Forge'], vaulted: ['stage-vaulted', '🔒 Vaulted'] };

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function piTitlesByStatus(model, status) {
  return model.catalog.filter((c) => c.status.toLowerCase() === status);
}
function playableIds(model) {
  return new Set(model.games.filter((g) => g.status === 'forge' && g.playable).map((g) => g.piId || g.id));
}

// ─── Block renderers ──────────────────────────────────────────────────────────
export function renderStatusRow(title) {
  const [color, label] = STATUS_ROW[statusKey(title)];
  return `<div class="info-row"><span>Status</span><span style="color:${color};">${label}</span></div>`;
}

export function renderPressFacts(model) {
  const c = model.counts.portfolio;
  const sparked = piTitlesByStatus(model, 'sparked').map((t) => esc(t.name));
  const playable = model.games.filter((g) => g.status === 'forge' && g.playable).map((g) => esc(g.name));
  const rows = [
    `<tr><td>Portfolio</td><td>${c.total} initiatives &middot; ${c.sparked} sparked &middot; ${c.forge} in the forge &middot; ${c.vaulted} vaulted</td></tr>`,
    `<tr><td>Sparked (live)</td><td>${sparked.join(' &middot; ') || 'None yet'}</td></tr>`,
  ];
  if (playable.length) rows.push(`<tr><td>Playable betas</td><td>${playable.join(' &middot; ')} &middot; in the forge, free to play</td></tr>`);
  return '\n              ' + rows.join('\n              ') + '\n              ';
}

export function renderPressBio(model) {
  const c = model.counts.portfolio;
  const sparked = piTitlesByStatus(model, 'sparked').map((t) => t.name);
  const playable = playableIds(model);
  const forge = piTitlesByStatus(model, 'forge');
  const named = [
    ...forge.filter((t) => playable.has(t.id)).map((t) => `${t.name} (a playable beta)`),
    ...forge.filter((t) => !playable.has(t.id)).map((t) => t.name),
  ];
  const listed = named.slice(0, 10);
  const vaulted = piTitlesByStatus(model, 'vaulted').map((t) => t.name);
  const edge = model.edgeFunctions ? `${model.edgeFunctions} live edge functions` : 'live edge functions';
  let text = `Founded in March 2026, the studio now spans ${c.total} initiatives across games, platforms, and tools. `
    + `${cap(toWord(c.sparked))} are sparked — ${joinNames(sparked)} — with ${toWord(c.forge)} more in active forge across games, platforms, and tools, including ${joinNames(named.length > listed.length ? [...listed, 'more'] : listed)}. `;
  if (vaulted.length) text += `${cap(toWord(vaulted.length))} ${vaulted.length === 1 ? 'title is' : 'titles are'} vaulted — ${joinNames(vaulted)}. `;
  text += `A cross-project membership platform called the Vault binds every title through a free 9-tier rank system, optional VaultSparked subscriptions, and a shared points economy powered by ${edge}.`;
  return `<p>${esc(text)}</p>`;
}

function pressBigCard(t, href, liveUrl, badge) {
  const copy = PRESS_COPY[t.id] || {};
  const page = href && !href.startsWith('http') ? `<a href="${esc(href)}" class="button-secondary button-sm">${t.type === 'game' ? 'Game Page' : 'Project Page'}</a>` : '';
  const live = liveUrl ? `<a href="${esc(liveUrl)}" target="_blank" rel="noreferrer" class="button button-sm">${esc(copy.open || 'Open')}</a>` : '';
  return `
        <div class="game-press-card">
          <div class="game-press-thumb" style="background:linear-gradient(135deg,${copy.grad || 'rgba(255,196,0,0.18),rgba(31,162,255,0.12)'});border:1px solid ${copy.border || 'rgba(255,196,0,0.2)'};">${copy.emoji || '⚡'}</div>
          <div>
            <div class="game-press-title">${esc(t.name)}</div>
            <div class="game-press-meta">${copy.meta || esc(t.category || '')} &middot; ${badge}</div>
            <div class="game-press-desc">${esc(copy.desc || t.note || '')}</div>
            <div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${[page, live].filter(Boolean).join('\n              ')}
            </div>
          </div>
        </div>`;
}

function pressSmallCard(t) {
  const copy = PRESS_COPY[t.id] || {};
  return `
          <div class="press-card" style="padding:1.25rem;">
            <div class="game-press-title">${esc(t.name)}</div>
            <div class="game-press-meta" style="margin-bottom:0.5rem;">${copy.meta || esc(t.category || 'Project')}</div>
            <div class="game-press-desc">${esc(copy.desc || t.note || 'In the forge.')}</div>
          </div>`;
}

function hrefForPi(model, t) {
  const g = model.games.find((x) => (x.piId || x.id) === t.id);
  if (g) return g.href;
  const p = model.projects.find((x) => x.id === t.id);
  return p ? p.href : null;
}

export function renderPressCatalog(model) {
  const h3 = (color, text, top) => `\n        <h3 style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${color};margin:${top ? '2rem 0 1rem' : '0 0 1rem'};">${text}</h3>`;
  const playable = playableIds(model);
  const sparked = piTitlesByStatus(model, 'sparked');
  const betas = piTitlesByStatus(model, 'forge').filter((t) => playable.has(t.id));
  const forge = piTitlesByStatus(model, 'forge').filter((t) => !playable.has(t.id));
  const vaulted = piTitlesByStatus(model, 'vaulted');
  let out = h3('#fbbf24', `🔥 Sparked — Live Now (${sparked.length})`, false);
  for (const t of sparked) out += pressBigCard(t, hrefForPi(model, t), t.deployedUrl, '🔥 Sparked');
  if (betas.length) {
    out += h3('#f59e0b', `⚒️ Playable Beta — In The Forge (${betas.length})`, true);
    for (const t of betas) {
      const g = model.games.find((x) => (x.piId || x.id) === t.id);
      out += pressBigCard(t, hrefForPi(model, t), g && g.playUrl, '⚒️ Forge (playable beta)');
    }
  }
  out += h3('#f59e0b', `⚒️ In The Forge — Active Development (${forge.length})`, true);
  out += '\n        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.85rem;">'
    + forge.map(pressSmallCard).join('') + '\n        </div>';
  if (vaulted.length) {
    out += h3('#94a3b8', `🔒 Vaulted (${vaulted.length})`, true);
    out += '\n        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.85rem;">'
      + vaulted.map(pressSmallCard).join('') + '\n        </div>';
  }
  const sealed = model.counts.portfolio.sealed;
  if (sealed > 0) {
    out += `\n        <p style="margin-top:1.2rem;font-size:0.82rem;color:var(--dim);">${sealed} further initiative${sealed === 1 ? ' is' : 's are'} unannounced and appear${sealed === 1 ? 's' : ''} only as sealed silhouettes on the public <a href="/studio-pulse/" style="color:var(--gold);">Studio Pulse</a>. Details shared under embargo — email <a href="mailto:press@vaultsparkstudios.com" style="color:var(--gold);">press@vaultsparkstudios.com</a>.</p>`;
  }
  return out + '\n        ';
}

function heroStat(value, label, extra = '') {
  return `
          <div class="hero-stat">
            <span class="hero-stat-val"${extra}>${value}</span>
            <span class="hero-stat-label${label[1] ? ` hero-stat-label--${label[1]}` : ''}">${label[0]}</span>
          </div>`;
}
const DIVIDER = '\n          <div class="hero-stat-divider" aria-hidden="true"></div>';

export function renderProjectsStats(model) {
  const c = model.counts.projects;
  const parts = [heroStat(c.sparked, ['🔥 Sparked'], ' style="color:#fbbf24;"'), heroStat(c.forge, ['⚒️ In The Forge'], ' style="color:#f59e0b;"')];
  if (c.vaulted) parts.push(heroStat(c.vaulted, ['🔒 Vaulted']));
  return parts.join(DIVIDER) + '\n          ';
}

export function renderGamesStats(model) {
  const c = model.counts.games;
  return [heroStat(c.sparked, ['🔥 Sparked', 'sparked']), heroStat(c.forge, ['⚒️ In The Forge', 'forge']), heroStat(c.vaulted, ['🔒 Vaulted', 'vaulted'])].join(DIVIDER) + '\n          ';
}

function gameCta(g, copy) {
  if (g.playable) return `<a class="button" href="${esc(g.playUrl)}" target="_blank" rel="noreferrer">${copy.playLabel || (g.status === 'sparked' ? 'Play Now' : 'Play the Beta')}</a>`;
  // A live non-game product (MindFrame) opens at its canon deployedUrl without
  // becoming a "Playable Beta": the vault badge still follows canon only.
  if (copy.openLabel && g.deployedUrl) return `<a class="button" href="${esc(g.deployedUrl)}" target="_blank" rel="noreferrer">${esc(copy.openLabel)}</a>`;
  return `<a class="button" href="/vault-member/#register">${esc(copy.waitLabel || (g.status === 'vaulted' ? 'Join The Vault' : 'Join Waitlist'))}</a>`;
}

function renderGameCard(g) {
  const copy = GAME_COPY[g.id] || { genre: 'other', hero: 'vault-sealed card-hero--titled', desc: g.note || '', meta: [] };
  const key = statusKey(g);
  const display = copy.shortName || g.name;
  const meta = copy.meta.map((m) => `<span>${esc(m)}</span>`).join('');
  return `
          <article class="game-card" data-status="${g.status}" data-game="${esc(g.id)}" data-genre="${esc(copy.genre)}" aria-label="${esc(g.name)} — ${CARD_ARIA[key]}">
            <div class="card-hero ${copy.hero}">${CARD_BADGE[key] ? `
              <span class="status status-${g.status} card-badge">${CARD_BADGE[key]}</span>` : ''}
              <h3>${esc(display)}</h3>
            </div>
            <div class="card-content">
              <p>${esc(copy.desc)}</p>
              <div class="meta">${meta}</div>
              <div class="game-card-actions">
                ${gameCta(g, copy)}
                <a class="button-secondary" href="${esc(g.href)}">About ${esc(g.id === 'project-unknown' ? 'Project Unknown' : display)}</a>
              </div>
            </div>
          </article>`;
}

function renderFeaturedGame(g) {
  const copy = GAME_COPY[g.id] || { genre: 'other', hero: 'vault-sealed', desc: g.note || '', meta: [] };
  const key = statusKey(g);
  const features = (copy.features || []).map((f) => `<li>${esc(f)}</li>`).join('\n                ');
  return `
        <div class="game-card-featured" role="article" data-status="${g.status}" data-game="${esc(g.id)}" data-genre="${esc(copy.genre)}" aria-label="${esc(g.name)} — ${CARD_ARIA[key]}">
          <div class="game-card-featured-inner">
            <div class="game-card-hero ${copy.hero}">
              <span class="status status-${g.status}">${CARD_BADGE[key]}</span>
              <h2>${esc(g.name)}</h2>
            </div>
            <div class="game-card-body">
              <p class="game-eyebrow">${esc(copy.eyebrow || g.category || 'Game')} &nbsp;·&nbsp; Featured</p>
              <p>${esc(copy.desc)}</p>${features ? `
              <ul class="feature-list">
                ${features}
              </ul>` : ''}
              <div class="meta" style="margin-top:0.4rem;">
                ${copy.meta.map((m) => `<span>${esc(m)}</span>`).join('')}
              </div>
              <div class="game-card-actions">
                ${gameCta(g, copy)}
                <a class="button-secondary" href="${esc(g.href)}">About ${esc(g.name)}</a>
              </div>
            </div>
          </div>
        </div>`;
}

const SECTION_LABEL = {
  sparked: ['#fbbf24', '🔥 Featured — Sparked &amp; Playable'],
  playable: ['#f59e0b', '⚒️ Featured — Playable Beta'],
  forge: ['#f59e0b', '⚒️ Featured — In The Forge'],
  vaulted: ['#94a3b8', '🔒 Featured — Vaulted'],
};

export function renderGamesCatalog(model) {
  const featured = model.games.find((g) => g.featured) || null;
  const rest = model.games.filter((g) => g !== featured);
  const present = new Set(model.games.map((g) => (GAME_COPY[g.id] || {}).genre));
  const genreBtns = GENRE_ORDER.filter(([k]) => present.has(k))
    .map(([k, label]) => `\n          <button type="button" class="genre-btn" data-genre="${k}">${label}</button>`).join('');
  let out = `
        <div class="filter-bar" role="group" aria-label="Filter games by genre" style="margin-top:0.5rem;">
          <button type="button" class="genre-btn active" data-genre="all">All Genres</button>${genreBtns}
        </div>
`;
  if (featured) {
    const [color, text] = SECTION_LABEL[statusKey(featured)];
    out += `
        <div class="games-section-label" data-section="${featured.status}" aria-hidden="true">
          <span style="color:${color};">${text}</span>
        </div>
${renderFeaturedGame(featured)}
`;
  }
  const c = model.counts.games;
  out += `
        <div class="games-section-label" data-section="all" aria-hidden="true">
          <span style="white-space:normal;">Every world in the vault — ${c.sparked} sparked · ${c.forge} in the forge · ${c.vaulted} vaulted</span>
        </div>

        <div class="games-grid" id="games-grid">
${rest.map(renderGameCard).join('\n')}

        </div><!-- /games-grid -->
        `;
  return out;
}

export function renderHomeSpine(model) {
  const c = model.counts.portfolio;
  return `<strong data-spine-active>${c.sparked}</strong> live ·
              <strong data-spine-pulses>${c.forge}</strong> in the forge`;
}

export function renderRoadmapCount(model) {
  const c = model.counts.games;
  return `<p>${cap(toWord(c.total))} worlds across every vault stage — ${c.sparked} sparked, ${c.forge} in the forge, ${c.vaulted} vaulted.</p>`;
}

export function renderRoadmapPipeline(model) {
  return model.games.filter((g) => g.status !== SEALED).map((g) => {
    const copy = (GAME_COPY[g.id] || {}).roadmap || { desc: g.note || '', meta: [] };
    const [cls, label] = STAGE_BADGE[statusKey(g)];
    const link = g.playable
      ? `<a class="pipeline-card-link" href="${esc(g.playUrl)}" target="_blank" rel="noreferrer">${esc(copy.link || (g.status === 'sparked' ? 'Play Now →' : 'Play the Beta →'))}</a>`
      : `<a class="pipeline-card-link" href="${esc(g.href)}">Learn More →</a>`;
    return `
          <div class="pipeline-card">
            <div class="pipeline-card-top">
              <h3>${esc(g.name)}</h3>
              <span class="stage-badge ${cls}">${label}</span>
            </div>
            <p>${esc(copy.desc)}</p>
            <div class="pipeline-card-meta">
              ${copy.meta.map((m) => `<span>${esc(m)}</span>`).join('')}
            </div>
            ${link}
          </div>`;
  }).join('\n') + '\n\n        ';
}

// ─── S368 new-pages-wave: /play/ hub + /roadmap/ Now · Next · Later ───────────
/** Where a live title opens: registry playUrl first, then the canon deployedUrl. */
function liveUrl(t) { return t.playUrl || t.deployedUrl || null; }

/** Every title a visitor can open right now, split into games and tools/platforms. */
export function playModel(model) {
  const live = (t) => (t.status === 'sparked' || t.status === 'forge') && !!liveUrl(t);
  return { games: model.games.filter(live), tools: model.projects.filter(live) };
}

const PLAY_CHIP = { sparked: ['play-chip--sparked', '🔥 SPARKED'], forge: ['play-chip--beta', '⚒️ Playable Beta'] };

function playCard(t, kind) {
  const [cls, chip] = PLAY_CHIP[t.status];
  const copy = GAME_COPY[t.id] || {};
  const pitch = t.note || (copy.roadmap && copy.roadmap.desc) || copy.desc || '';
  const label = kind === 'game' ? (copy.openLabel || 'Play') : (PRESS_COPY[t.piId || t.id] || {}).open || `Open ${t.name}`;
  const about = t.href && t.href.startsWith('/') ? `<a class="play-card__about" href="${esc(t.href)}">About ${esc(t.name)}</a>` : '';
  return `
          <article class="play-card" data-play-id="${esc(t.id)}" data-play-status="${esc(t.status)}">
            <div class="play-card__top">
              <h3 class="play-card__name">${esc(t.name)}</h3>
              <span class="play-chip ${cls}">${chip}</span>
            </div>
            ${t.category ? `<p class="play-card__cat">${esc(t.category)}</p>` : ''}
            <p class="play-card__pitch">${esc(pitch)}</p>
            <div class="play-card__actions">
              <a class="button button-sm play-card__go" href="${esc(liveUrl(t))}" target="_blank" rel="noreferrer">${esc(label)} <span aria-hidden="true">&rarr;</span><span class="vs-visually-hidden"> (opens in a new tab)</span></a>
              ${about}
            </div>
          </article>`;
}

export function renderPlayHub(model) {
  const { games, tools } = playModel(model);
  const group = (id, title, sub, list, kind) => list.length ? `
        <section class="play-group" aria-labelledby="${id}">
          <div class="play-group__head"><h2 id="${id}">${title}</h2><p>${sub}</p></div>
          <div class="play-grid">${list.map((t) => playCard(t, kind)).join('')}
          </div>
        </section>` : '';
  return group('play-games', 'Games you can play now', `${cap(toWord(games.length))} in your browser — no download, free to play.`, games, 'game')
    + group('play-tools', 'Live tools &amp; platforms', `${cap(toWord(tools.length))} studio products you can open today.`, tools, 'tool')
    + '\n        ';
}

/**
 * agent-geo-layer-v2: /games/ carried three hand-typed VideoGame nodes for a
 * ten-title registry. Every registry title now gets one structured-data node,
 * rendered from the same model as the cards. A sealed teaser has no canon
 * record (D-S368.3) and gets none; a saga that is "not a game" is a BookSeries,
 * not a VideoGame. Offers are honest: free + in stock only when playable.
 */
const GENRE_LABEL = Object.fromEntries(GENRE_ORDER);
const BOOK_GENRES = new Set(['saga']);

export function gameJsonLdNode(t) {
  const copy = GAME_COPY[t.id] || {};
  const url = t.href && t.href.startsWith('/') ? SITE + t.href : (t.href || `${SITE}/games/${t.id}/`);
  const description = (copy.roadmap && copy.roadmap.desc) || copy.desc || t.note || undefined;
  const genre = GENRE_LABEL[copy.genre] || undefined;
  if (BOOK_GENRES.has(copy.genre)) {
    return { '@type': 'BookSeries', '@id': `${url}#work`, name: t.name, url, description, genre: 'Cosmic horror', creator: ORG_REF_ID, publisher: ORG_REF_ID };
  }
  const offers = t.playable
    ? { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: t.playUrl }
    : t.status === 'vaulted'
      ? { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/Discontinued' }
      : { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/PreOrder' };
  return {
    '@type': 'VideoGame', '@id': `${url}#game`, name: t.name, url, description, genre,
    gamePlatform: 'Web browser', applicationCategory: 'GameApplication', operatingSystem: 'Any (modern web browser)',
    publisher: ORG_REF_ID, offers,
  };
}

export function renderGamesJsonLd(model) {
  const titles = model.games.filter((t) => t.status !== SEALED);
  const page = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE}/games/#page`,
    url: `${SITE}/games/`,
    name: 'VaultSpark Studios games',
    isPartOf: WEBSITE_REF_ID,
    publisher: ORG_REF_ID,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: titles.length,
      itemListElement: titles.map((t, i) => ({ '@type': 'ListItem', position: i + 1, item: gameJsonLdNode(t) })),
    },
  };
  return `\n  <script type="application/ld+json">${JSON.stringify(page).replace(/</g, '\\u003c')}</script>\n  `;
}

/** Now = SPARKED + live betas · Next = FORGE with progress ≥ 70 · Later = every other FORGE title. Vaulted titles leave the roadmap. No dates. */
export function roadmapHorizons(model) {
  const games = new Map(model.games.map((g) => [g.piId || g.id, g]));
  const isLive = (c) => c.status.toLowerCase() === 'sparked' || !!c.deployedUrl || !!(games.get(c.id) && games.get(c.id).playable);
  const forge = model.catalog.filter((c) => c.status.toLowerCase() === 'forge');
  const now = model.catalog.filter((c) => c.status.toLowerCase() !== 'vaulted' && isLive(c));
  const nowIds = new Set(now.map((c) => c.id));
  const byProgress = (a, b) => (b.progress ?? 0) - (a.progress ?? 0) || a.name.localeCompare(b.name);
  const next = forge.filter((c) => !nowIds.has(c.id) && (c.progress ?? 0) >= 70).sort(byProgress);
  const later = forge.filter((c) => !nowIds.has(c.id) && (c.progress ?? 0) < 70).sort(byProgress);
  now.sort((a, b) => (a.status === 'SPARKED' ? 0 : 1) - (b.status === 'SPARKED' ? 0 : 1) || byProgress(a, b));
  return { now, next, later };
}

function horizonItem(model, c) {
  const href = hrefForPi(model, c) || c.deployedUrl;
  const status = c.status.toLowerCase();
  const chip = status === 'sparked' ? ['stage-sparked', '🔥 Sparked'] : (c.deployedUrl || (model.games.find((g) => (g.piId || g.id) === c.id) || {}).playable) ? ['stage-forge', '⚒️ Playable Beta'] : ['stage-forge', '⚒️ Forge'];
  const external = href && !href.startsWith('/');
  const name = href ? `<a href="${esc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${esc(c.name)}</a>` : esc(c.name);
  return `
              <li class="horizon-item" data-horizon-id="${esc(c.id)}">
                <div class="horizon-item__top"><h4 class="horizon-item__name">${name}</h4><span class="stage-badge ${chip[0]}">${chip[1]}</span></div>
                <p class="horizon-item__cat">${esc(c.category || '')}</p>
                <p class="horizon-item__note">${esc(c.note || '')}</p>
              </li>`;
}

export function renderRoadmapHorizons(model) {
  const h = roadmapHorizons(model);
  const col = (id, label, title, sub, list) => `
          <section class="horizon horizon--${id}" aria-labelledby="horizon-${id}">
            <p class="horizon__label">${label}</p>
            <h3 id="horizon-${id}" class="horizon__title">${title}</h3>
            <p class="horizon__sub">${sub} <span class="horizon__count">${list.length}</span></p>
            <ul class="horizon__list">${list.map((c) => horizonItem(model, c)).join('')}
            </ul>
          </section>`;
  return col('now', 'Now', 'Live and playable', 'Sparked releases and live betas you can open today.', h.now)
    + col('next', 'Next', 'Closest to the light', 'In the forge and well along — the next titles to step out.', h.next)
    + col('later', 'Later', 'Deeper in the forge', 'Earlier builds and concepts still taking shape.', h.later)
    + '\n        ';
}

// ─── Block plumbing ───────────────────────────────────────────────────────────
export const markers = (name) => [`<!-- registry:${name}:start -->`, `<!-- registry:${name}:end -->`];

export function readBlock(html, name) {
  const [s, e] = markers(name);
  const i = html.indexOf(s);
  const j = i === -1 ? -1 : html.indexOf(e, i + s.length);
  if (i === -1 || j === -1) return null;
  return html.slice(i + s.length, j);
}

export function writeBlock(html, name, inner) {
  const [s, e] = markers(name);
  const i = html.indexOf(s);
  const j = i === -1 ? -1 : html.indexOf(e, i + s.length);
  if (i === -1 || j === -1) return null;
  return html.slice(0, i + s.length) + inner + html.slice(j);
}

/** Wrap the first legacy-region match in markers (write mode only). */
export function bootstrapBlock(html, name, legacy) {
  if (readBlock(html, name) !== null) return html;
  const [s, e] = markers(name);
  let done = false;
  const out = html.replace(legacy, (m) => { done = true; return s + m + e; });
  return done ? out : html;
}

// Static surface plan: file → blocks (name, renderer, legacy bootstrap pattern).
export const SURFACES = [
  { file: 'press/index.html', blocks: [
    { name: 'press-facts', render: renderPressFacts, legacy: /\n\s*<tr><td>Portfolio<\/td>[\s\S]*?<tr><td>Live titles &amp; tools<\/td><td>[^<]*<\/td><\/tr>\n\s*/ },
    { name: 'press-bio', render: renderPressBio, legacy: /<p>Founded in March 2026,[\s\S]*?<\/p>/ },
    { name: 'press-catalog', render: renderPressCatalog, legacy: /\n\s*<h3 style="[^"]*">🔥 Sparked — Live Now<\/h3>[\s\S]*?further initiatives are unannounced[\s\S]*?<\/p>\n\s*/ },
  ] },
  { file: 'projects/index.html', blocks: [
    { name: 'projects-stats', render: renderProjectsStats, legacy: /\n\s*<div class="hero-stat">\s*<span class="hero-stat-val" style="color:#fbbf24;">\d+<\/span>[\s\S]*?⚒️ In The Forge<\/span>\s*<\/div>\n\s*/ },
  ] },
  { file: 'games/index.html', blocks: [
    { name: 'games-stats', render: renderGamesStats, legacy: /\n\s*<div class="hero-stat">\s*<span class="hero-stat-val">\d+<\/span>\s*<span class="hero-stat-label hero-stat-label--sparked">[\s\S]*?hero-stat-label--vaulted">[^<]*<\/span>\s*<\/div>\n\s*/ },
    { name: 'games-jsonld', render: renderGamesJsonLd },
    { name: 'games-catalog', render: renderGamesCatalog, legacy: /\n\s*<!-- Filter bar: Genre -->[\s\S]*?<\/div><!-- \/games-grid -->\n\s*/ },
  ] },
  { file: 'index.html', blocks: [
    { name: 'home-spine', render: renderHomeSpine, legacy: /<strong data-spine-active>\d+<\/strong>[\s\S]*?<strong data-spine-pulses>\d+<\/strong> in the forge/ },
  ] },
  { file: 'roadmap/index.html', blocks: [
    { name: 'roadmap-horizons', render: renderRoadmapHorizons },
  ] },
  { file: 'play/index.html', blocks: [
    { name: 'play-hub', render: renderPlayHub },
  ] },
];

const STATUS_LEGACY = /<div class="info-row"><span>Status<\/span><span[^>]*>[^<]*<\/span><\/div>/;

/** Sync the <body data-game-status / data-project-status> attribute to the registry status. */
export function syncBodyStatus(html, status) {
  return html.replace(/(<body\b[^>]*\bdata-(?:game|project)-status=")([a-z]+)(")/, (m, a, cur, b) => (cur === status ? m : a + status + b));
}

/** Per-page Project Info status blocks: every /games/<slug>/ and /projects/<id>/ the registry knows. */
export function statusSurfaces(model) {
  const out = [];
  for (const g of model.games) out.push({ file: `games/${g.id}/index.html`, title: g });
  for (const p of model.projects) out.push({ file: `projects/${p.id}/index.html`, title: p });
  return out;
}

/**
 * Apply every block to one file's html. Returns { html, problems[] } where problems
 * lists missing markers (after optional bootstrap).
 */
export function applySurface(html, blocks, model, { bootstrap }) {
  const problems = [];
  let out = html;
  for (const b of blocks) {
    if (bootstrap && b.legacy) out = bootstrapBlock(out, b.name, b.legacy);
    const next = writeBlock(out, b.name, b.render(model));
    if (next === null) { problems.push(`missing <!-- registry:${b.name}:start/end --> markers`); continue; }
    out = next;
  }
  return { html: out, problems };
}

function plan(model, { root, bootstrap, catalogExtras, surfaces = SURFACES }) {
  const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : null);
  const results = [];
  for (const s of surfaces) {
    const cur = read(s.file);
    if (cur === null) { results.push({ file: s.file, cur, next: cur, problems: ['file missing'] }); continue; }
    let { html, problems } = applySurface(cur, s.blocks, model, { bootstrap });
    if (s.file === 'projects/index.html') {
      if (!html.includes(CATALOG_START) || !html.includes(CATALOG_END)) problems.push('missing registry-project-catalog markers');
      else html = injectCatalog(html, renderCatalog(model.catalog, { extraPages: catalogExtras }));
    }
    results.push({ file: s.file, cur, next: html, problems });
  }
  for (const { file, title } of statusSurfaces(model)) {
    const cur = read(file);
    if (cur === null) continue;
    const blocks = [{ name: 'status', render: () => renderStatusRow(title), legacy: STATUS_LEGACY }];
    const hasRow = STATUS_LEGACY.test(cur) || readBlock(cur, 'status') !== null;
    // Pages without a Project Info status row (portal-style pages) still get the
    // body status attribute synced — /games/gridiron-gm/ told schema readers
    // data-game-status="sparked" while the registry, nav and badge said VAULTED.
    const applied = hasRow ? applySurface(cur, blocks, model, { bootstrap }) : { html: cur, problems: [] };
    const html = syncBodyStatus(applied.html, title.status);
    if (!hasRow && html === cur) continue;
    results.push({ file, cur, next: html, problems: applied.problems });
  }
  return results;
}

export function applyAll(root = ROOT, inputs = loadInputs(root), { surfaces } = {}) {
  const exists = (rel) => existsSync(join(root, rel));
  const model = buildModel(inputs.registry, inputs.pi, { exists });
  const extras = existsSync(join(root, 'projects')) ? offRegistryPages(model.catalog, root) : [];
  const results = plan(model, { root, bootstrap: true, catalogExtras: extras, surfaces });
  for (const r of results) if (r.cur !== null && r.next !== r.cur) writeFileSync(join(root, r.file), r.next, 'utf8');
  return results;
}

export function loadInputs(root = ROOT) {
  const registry = JSON.parse(readFileSync(join(root, 'data', 'game-registry.json'), 'utf8'));
  const pi = JSON.parse(readFileSync(join(root, 'api', 'public-intelligence.json'), 'utf8'));
  return { registry, pi };
}

/** Pure-ish check over a root: returns { ok, drift[], problems[], contradictions[] }. */
export function runCheck(root = ROOT, inputs = loadInputs(root), { catalogExtras, surfaces } = {}) {
  const exists = (rel) => existsSync(join(root, rel));
  const model = buildModel(inputs.registry, inputs.pi, { exists });
  const extras = catalogExtras ?? (existsSync(join(root, 'projects')) ? offRegistryPages(model.catalog, root) : []);
  const results = plan(model, { root, bootstrap: false, catalogExtras: extras, surfaces });
  const drift = results.filter((r) => r.cur !== null && r.next !== r.cur && !r.problems.length).map((r) => r.file);
  const problems = results.flatMap((r) => r.problems.map((p) => `${r.file}: ${p}`));
  return { ok: !drift.length && !problems.length && !model.contradictions.length, drift, problems, contradictions: model.contradictions, results };
}

// ─── Self-test ────────────────────────────────────────────────────────────────
function selfTest() {
  let pass = 0, fail = 0;
  const a = (cond, msg) => { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.error('  ✗ ' + msg); } };
  const registry = { games: {
    'call-of-doodie': { name: 'Call of Doodie', status: 'forge', navOrder: 1, playUrl: 'https://cod.example/', featured: true },
    'franchise-architect': { name: 'Franchise Architect', status: 'sparked', navOrder: 2, playUrl: 'https://fa.example/' },
    'gridiron-gm': { name: 'Gridiron GM', status: 'vaulted', navOrder: 1, playUrl: null },
    voidfall: { name: 'Voidfall', status: 'forge', navOrder: 5, playUrl: null },
  } };
  const pi = {
    portfolio: { total: 9, sparked: 2, forge: 4, vaulted: 1, sealedCount: 2 },
    stats: { activeEdgeFunctions: 16 },
    catalog: [
      { id: 'vorn', name: 'Vorn', type: 'platform', category: 'Agent Platform', status: 'SPARKED', note: 'Agents.', deployedUrl: 'https://vorn.example' },
      { id: 'football-gm', name: 'Franchise Architect', type: 'game', category: 'Sports Sim', status: 'SPARKED', note: 'FA.', deployedUrl: 'https://fa.example/' },
      { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', category: 'Action Comedy', status: 'FORGE', note: 'CoD.', deployedUrl: 'https://cod.example/' },
      { id: 'promogrind', name: 'PromoGrind', type: 'tool', category: 'Creator Tool', status: 'FORGE', note: 'Promo.', deployedUrl: null },
      { id: 'voidfall', name: 'Voidfall', type: 'game', category: 'Cinematic Saga', status: 'FORGE', note: 'Saga.', deployedUrl: null },
      { id: 'gridiron-gm', name: 'Gridiron GM', type: 'game', category: 'Sports Sim', status: 'VAULTED', note: 'Paused.', deployedUrl: null },
    ],
  };
  const exists = (rel) => rel === 'projects/vorn/index.html';
  const model = buildModel(registry, pi, { exists });

  a(model.contradictions.length === 0, 'T1 consistent fixture has no registry↔canon contradictions');
  a(model.counts.games.sparked === 1 && model.counts.games.forge === 2 && model.counts.games.vaulted === 1, 'T2 game counts derive from registry (1/2/1)');
  a(model.counts.projects.sparked === 1 && model.counts.projects.forge === 1, 'T3 project counts exclude games');

  {
    const sealedModel = buildModel({ games: { ...registry.games, 'project-unknown': { name: 'Project Unknown', status: 'sealed', navOrder: 2, playUrl: null } } }, pi, { exists });
    const ld = JSON.parse(renderGamesJsonLd(sealedModel).replace(/^\s*<script[^>]*>|<\/script>\s*$/g, ''));
    const nodes = ld.mainEntity.itemListElement.map((li) => li.item);
    a(nodes.length === 4 && !nodes.some((n) => n.name === 'Project Unknown'), 'T4a games JSON-LD: one node per statused registry title, none for the sealed teaser');
    a(nodes.find((n) => n.name === 'Voidfall')['@type'] === 'BookSeries' && nodes.filter((n) => n['@type'] === 'VideoGame').every((n) => n.publisher['@id'] === 'https://vaultsparkstudios.com/#org' && n.gamePlatform === 'Web browser'), 'T4b saga is a BookSeries; every VideoGame references the canonical #org publisher');
    const cod = nodes.find((n) => n.name === 'Call of Doodie');
    const gg = nodes.find((n) => n.name === 'Gridiron GM');
    a(cod.offers.availability.endsWith('InStock') && gg.offers.availability.endsWith('Discontinued'), 'T4c offers: free + in stock only when playable; vaulted is discontinued');
  }

  const facts = renderPressFacts(model);
  a(facts.includes('9 initiatives &middot; 2 sparked &middot; 4 in the forge &middot; 1 vaulted'), 'T4 press Portfolio row uses feed counts');
  a(facts.includes('<td>Vorn &middot; Franchise Architect</td>') && !/Sparked \(live\)<\/td><td>[^<]*Call of Doodie/.test(facts), 'T5 press Sparked row lists only SPARKED titles (no FORGE beta)');
  a(facts.includes('Playable betas</td><td>Call of Doodie'), 'T6 FORGE game with playUrl listed as playable beta');
  const bio = renderPressBio(model);
  a(bio.includes('Two are sparked — Vorn and Franchise Architect —') && bio.includes('with four more in active forge'), 'T7 bio sparked count word matches the names it lists');
  a(bio.includes('One title is vaulted — Gridiron GM.'), 'T8 bio names vaulted titles');

  const rowCod = renderStatusRow(model.games.find((g) => g.id === 'call-of-doodie'));
  a(rowCod.includes('⚒️ Forge · Playable Beta') && !/Live &amp; Playable|Sparked/.test(rowCod), 'T9 playable FORGE status row says Playable Beta, never Live/Sparked');
  a(renderStatusRow(model.projects.find((p) => p.id === 'vorn')).includes('🔥 Sparked'), 'T10 SPARKED project status row');

  const catalog = renderGamesCatalog(model);
  a(catalog.includes('data-game="voidfall"') && catalog.includes('data-game="gridiron-gm"'), 'T11 /games/ grid renders every registry game');
  a(!catalog.includes('data-genre="mmorpg"'), 'T12 genre filter omits genres no card carries');
  a(catalog.includes('class="game-card-featured"') && catalog.includes('data-game="call-of-doodie"') && catalog.includes('Play the Beta') === false && catalog.includes("Play Now — It's Free"), 'T13 featured slot follows registry featured flag and keeps Play CTA');
  a(!/Sparked — Live &amp; Playable/.test(catalog), 'T14 featured FORGE game is not labelled Sparked');

  // D-S368.3: a sealed teaser carries no status — card stays, counts/pipeline/badge do not.
  const sealedReg = JSON.parse(JSON.stringify(registry));
  sealedReg.games['project-unknown'] = { name: 'Project Unknown', status: 'sealed', navOrder: 2, playUrl: null };
  const sealedModel = buildModel(sealedReg, pi, { exists });
  a(sealedModel.contradictions.length === 0 && sealedModel.counts.games.total === 4 && sealedModel.counts.games.vaulted === 1 && sealedModel.counts.games.sealed === 1, 'T26 sealed teaser is outside every status count (total 4, vaulted 1)');
  const sealedCatalog = renderGamesCatalog(sealedModel);
  const puCard = (sealedCatalog.match(/<article[^>]*data-game="project-unknown"[\s\S]*?<\/article>/) || [''])[0];
  a(puCard && !/class="status /.test(puCard) && puCard.includes('data-status="sealed"'), 'T27 sealed teaser card renders with no status badge');
  a(!renderRoadmapPipeline(sealedModel).includes('Project Unknown') && renderRoadmapCount(sealedModel).includes('Four worlds'), 'T28 sealed teaser is absent from the roadmap pipeline and its count');
  const badReg = JSON.parse(JSON.stringify(sealedReg));
  badReg.games['project-unknown'].status = 'classified';
  a(buildModel(badReg, pi, { exists }).contradictions.some((c) => c.startsWith('project-unknown:')), 'T29 negative control: an unknown registry status is a contradiction');
  // MindFrame-style live product: opens its canon deployedUrl, badge stays Forge.
  const mfReg = JSON.parse(JSON.stringify(registry));
  mfReg.games.mindframe = { name: 'MindFrame', status: 'forge', navOrder: 3, playUrl: null };
  const mfPi = JSON.parse(JSON.stringify(pi));
  mfPi.catalog.push({ id: 'mindframe', name: 'MindFrame', type: 'tool', category: 'Metacognition', status: 'FORGE', note: 'x', deployedUrl: 'https://mf.example/' });
  const mfCard = (renderGamesCatalog(buildModel(mfReg, mfPi, { exists })).match(/<article[^>]*data-game="mindframe"[\s\S]*?<\/article>/) || [''])[0];
  a(mfCard.includes('href="https://mf.example/"') && mfCard.includes('Open MindFrame') && mfCard.includes('⚒️ Forge') && !mfCard.includes('Playable Beta'), 'T30 live product opens its deployedUrl while its badge stays FORGE');

  // S368: /play/ lists only titles that open today; the roadmap horizons partition FORGE by progress, no dates.
  const play = renderPlayHub(model);
  a(play.includes('data-play-id="call-of-doodie"') && play.includes('href="https://cod.example/"') && play.includes('⚒️ Playable Beta'), 'T31 /play/ lists a FORGE game with a playUrl as Playable Beta with its Play link');
  a(play.includes('data-play-id="franchise-architect"') && play.includes('🔥 SPARKED') && play.includes('data-play-id="vorn"'), 'T32 /play/ lists SPARKED games and live projects');
  a(!play.includes('data-play-id="gridiron-gm"') && !play.includes('data-play-id="voidfall"') && !play.includes('data-play-id="promogrind"'), 'T33 negative control: vaulted, unplayable and URL-less titles never reach /play/');
  const hzPi = JSON.parse(JSON.stringify(pi));
  hzPi.catalog.find((c) => c.id === 'promogrind').progress = 72;
  hzPi.catalog.find((c) => c.id === 'voidfall').progress = 32;
  const hz = roadmapHorizons(buildModel(registry, hzPi, { exists }));
  a(hz.now.some((c) => c.id === 'call-of-doodie') && hz.now.some((c) => c.id === 'vorn') && hz.next.map((c) => c.id).join() === 'promogrind' && hz.later.map((c) => c.id).join() === 'voidfall', 'T34 roadmap: Now = sparked + live betas, Next = forge ≥ 70, Later = other forge');
  a(![...hz.now, ...hz.next, ...hz.later].some((c) => c.id === 'gridiron-gm') && !/20\d\d|Q[1-4]/.test(renderRoadmapHorizons(buildModel(registry, hzPi, { exists }))), 'T35 roadmap omits vaulted titles and carries no dates');

  // Round trip on a fixture page: apply → check clean; mutate → check fails.
  const blocks = [
    { name: 'press-facts', render: renderPressFacts },
    { name: 'games-stats', render: renderGamesStats },
  ];
  const [fs1, fe1] = markers('press-facts');
  const [gs1, ge1] = markers('games-stats');
  const page = `<table>${fs1}STALE${fe1}</table><div>${gs1}<span class="hero-stat-val">9</span>${ge1}</div>`;
  const applied = applySurface(page, blocks, model, { bootstrap: false }).html;
  const reapplied = applySurface(applied, blocks, model, { bootstrap: false }).html;
  a(applied !== page && applied === reapplied, 'T15 apply renders blocks and is idempotent');

  // NEGATIVE CONTROL 1: a hand edit inside a block is detected as drift.
  const tampered = applied.replace('1 vaulted', '0 vaulted');
  a(applySurface(tampered, blocks, model, { bootstrap: false }).html !== tampered, 'T16 negative control: hand-edited block differs from render (check would fail)');

  // NEGATIVE CONTROL 2: a registry status flip changes the expected render.
  const flipped = JSON.parse(JSON.stringify(registry));
  flipped.games['gridiron-gm'].status = 'forge';
  const flippedModel = buildModel(flipped, pi, { exists });
  a(applySurface(applied, blocks, flippedModel, { bootstrap: false }).html !== applied, 'T17 negative control: registry mutation makes the committed block stale');
  a(flippedModel.contradictions.some((c) => c.startsWith('gridiron-gm:')), 'T18 negative control: registry status disagreeing with canon feed is a contradiction');

  // NEGATIVE CONTROL 3: missing markers are reported, never silently skipped.
  const { problems } = applySurface('<p>no markers</p>', blocks, model, { bootstrap: false });
  a(problems.length === 2, 'T19 missing markers reported as problems');

  // Bootstrap wraps a legacy region exactly once.
  const legacy = '<p>Founded in March 2026, old text.</p>';
  const boot = bootstrapBlock(legacy, 'press-bio', /<p>Founded in March 2026,[\s\S]*?<\/p>/);
  a(boot.startsWith('<!-- registry:press-bio:start --><p>Founded') && bootstrapBlock(boot, 'press-bio', /<p>Founded in March 2026,[\s\S]*?<\/p>/) === boot, 'T20 bootstrap wraps legacy region once (idempotent)');

  // End-to-end on a temp fixture tree: the SAME runCheck the CLI --check uses.
  const tmp = mkdtempSync(join(tmpdir(), 'drs-selftest-'));
  try {
    const put = (rel, body) => { mkdirSync(dirname(join(tmp, rel)), { recursive: true }); writeFileSync(join(tmp, rel), body, 'utf8'); };
    put('data/game-registry.json', JSON.stringify(registry));
    put('api/public-intelligence.json', JSON.stringify(pi));
    put('press/index.html', '<table>\n              <tr><td>Portfolio</td><td>1 initiatives &middot; 6 sparked &middot; 0 in the forge &middot; 0 vaulted</td></tr>\n              <tr><td>Live titles &amp; tools</td><td>Call of Doodie &middot; PromoGrind</td></tr>\n              </table>');
    put('games/call-of-doodie/index.html', '<body data-game-status="sparked"><div class="info-row"><span>Status</span><span style="color: #86efac;">Live &amp; Playable</span></div>');
    const surfaces = [{ file: 'press/index.html', blocks: [SURFACES[0].blocks[0]] }];
    const before = runCheck(tmp, undefined, { surfaces, catalogExtras: [] });
    a(!before.ok && before.problems.length === 2, 'T21 check fails on unmarked legacy regions (press facts + status row)');
    applyAll(tmp, undefined, { surfaces });
    const after = runCheck(tmp, undefined, { surfaces, catalogExtras: [] });
    a(after.ok, 'T22 check passes after the generator renders the fixture tree');
    const codPage = readFileSync(join(tmp, 'games/call-of-doodie/index.html'), 'utf8');
    a(codPage.includes('⚒️ Forge · Playable Beta') && codPage.includes('data-game-status="forge"'), 'T23 status row rewritten from "Live & Playable" to Playable Beta; body status attr synced');
    // NEGATIVE CONTROL 4: mutate the committed fixture page → the real check fails.
    put('press/index.html', readFileSync(join(tmp, 'press/index.html'), 'utf8').replace('Vorn &middot; Franchise Architect', 'Vorn &middot; Franchise Architect &middot; PromoGrind'));
    const mutated = runCheck(tmp, undefined, { surfaces, catalogExtras: [] });
    a(!mutated.ok && mutated.drift.includes('press/index.html'), 'T24 negative control: hand-mutated fixture block fails runCheck');
    // NEGATIVE CONTROL 5: mutate the fixture registry → the real check fails.
    applyAll(tmp, undefined, { surfaces });
    const reg2 = JSON.parse(JSON.stringify(registry));
    reg2.games['call-of-doodie'].status = 'sparked';
    put('data/game-registry.json', JSON.stringify(reg2));
    const regFlip = runCheck(tmp, undefined, { surfaces, catalogExtras: [] });
    a(!regFlip.ok && regFlip.contradictions.length === 1 && regFlip.drift.includes('games/call-of-doodie/index.html'), 'T25 negative control: registry flip fails runCheck (contradiction + stale status row)');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log((fail === 0 ? '✓' : '✗') + ` derive-registry-surfaces self-test: ${pass}/${pass + fail}`);
  return fail;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/derive-registry-surfaces.mjs');

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) process.exit(selfTest() > 0 ? 1 : 0);
  const check = args.includes('--check');
  const dryRun = args.includes('--dry-run');

  if (check) {
    const r = runCheck();
    for (const c of r.contradictions) console.error(`  ✗ contradiction: ${c}`);
    for (const p of r.problems) console.error(`  ✗ ${p}`);
    for (const f of r.drift) console.error(`  ✗ stale registry block(s): ${f}`);
    if (!r.ok) {
      console.error(`\n✗ derive-registry-surfaces --check: ${r.contradictions.length} contradiction(s) · ${r.problems.length} missing marker set(s) · ${r.drift.length} stale file(s). Run: node scripts/derive-registry-surfaces.mjs`);
      process.exit(1);
    }
    console.log(`derive-registry-surfaces --check: ok · ${r.results.length} surface file(s) render from the registry`);
    process.exit(0);
  }

  const { registry, pi } = loadInputs();
  const model = buildModel(registry, pi);
  for (const c of model.contradictions) console.warn(`  ⚠ contradiction (fix data/game-registry.json to match canon): ${c}`);
  const results = plan(model, { root: ROOT, bootstrap: true, catalogExtras: offRegistryPages(model.catalog) });
  let changed = 0;
  for (const r of results) {
    for (const p of r.problems) console.warn(`  ⚠ ${r.file}: ${p}`);
    if (r.cur === null || r.next === r.cur) continue;
    changed++;
    if (!dryRun) writeFileSync(join(ROOT, r.file), r.next, 'utf8');
    console.log(`${dryRun ? '(would update)' : '(updated)'} ${r.file}`);
  }
  console.log(`derive-registry-surfaces → ${results.length} surface file(s) · ${changed} ${dryRun ? 'would change' : 'updated'}`);
  if (model.contradictions.length) process.exit(1);
}
