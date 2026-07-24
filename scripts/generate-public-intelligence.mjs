import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPublicContracts } from './lib/public-intelligence-contracts.mjs';
import { matchesProjectSlug, normalizeProjectSlug, readPortfolioEvents } from './lib/public-activity.mjs';

const root = process.cwd();
const projectStatusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const taskBoardPath = path.join(root, 'context', 'TASK_BOARD.md');
const latestHandoffPath = path.join(root, 'context', 'LATEST_HANDOFF.md');
const silPath = path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md');
const runtimePackPath = path.join(root, 'context', 'runtime-pack', 'RUNTIME_PACK.json');
const outputPath = path.join(root, 'api', 'public-intelligence.json');
const contractsDir = path.join(root, 'context', 'contracts');

const outputTargets = [
  outputPath,
  path.join(contractsDir, 'website-public.json'),
  path.join(contractsDir, 'hub.json'),
  path.join(contractsDir, 'social-dashboard.json'),
];

// Portfolio scale — total initiatives tracked across the VaultSpark org
// (public + deep-forge sealed). The delta surfaces as "sealed" slots on the site.
const PORTFOLIO_TOTAL = 27;

// Public-safe rewrites of registry notes for each listed initiative. Keeps
// player-facing language aligned even when the registry description is
// engineer-flavoured. Keys are registry `id` values.
const CATALOG_NOTES = {
  'call-of-doodie': 'Playable now. Satirical multiplayer chaos, live and still sharpening.',
  'franchise-architect': 'Live beta. Deep football GM with analytics — polish rounds still in motion.',
  'football-gm': 'Live beta. Deep football GM with analytics — polish rounds still in motion.',
  'solara': 'Desert survival world. Systems converging.',
  'vaultspark-forge': 'Crafting-and-building world in early concept. Vaulted silhouette for now.',
  'the-exodus': 'Narrative survival — a dying world, a hard decision. Direction locked, scope expanding.',
  'voidfall': 'Nine-book cosmic-horror saga. Book 1 at lock. Not a game — a world.',
  'promogrind': 'Live utility. Vault-gated promo engine, iterating on UX.',
  'mindframe': 'Metacognition training platform. Live on external infra; identity consolidating.',
  'velaxis': 'Solana memecoin operator cockpit — no-custody by design. Production-stable.',
  'vorn': 'Social-first, agent-native platform. Give your agent a home.',
  'veilos': 'D1-backed public Cognitive Civilization OS — Sovereign Dashboard, Chain Verification, proprietary IP, Collaborate Exchange, onboarding ceremony, status/changelog/legal surfaces, and veilos.world redirect live.',
  'seamline': 'Creator portfolio hub. Your whole world, one thread.',
  'hashmark': 'Football, rewritten every week by AI.',
  'shadow': 'An operating system for artists.',
  'concurrent': 'A workstation built around user-owned AI.',
  'ouren': 'Ambient intelligence for smart eyewear.',
  'sparkraid': 'Every tip is an event.',
  'syntha': 'AI-accepted music, with rights made clear.',
  'obelisk': 'Trust and capability for the AI era.',
  'canon': 'Taste identity platform. Declare what\'s in your Canon.',
  'living-protocol': 'Generational wellness OS. Build your protocol, pass it down.',
};

// Specific, on-brand category per initiative (the coarse `type` bucket isn't the
// real category — e.g. MindFrame is AI intelligence, not a generic "tool").
// Grounded in each project's actual nature; falls back to a type label.
const CATALOG_CATEGORIES = {
  'call-of-doodie': 'Action Comedy',
  'franchise-architect': 'Sports Sim',
  'football-gm': 'Sports Sim',
  'gridiron-gm': 'Sports Sim',
  'solara': 'Survival World',
  'vaultspark-forge': 'Crafting World',
  'the-exodus': 'Narrative Survival',
  'voidfall': 'Cinematic Saga',
  'vaultfront': 'Survival World',
  'mindframe': 'AI Intelligence',
  'promogrind': 'Creator Tool',
  'velaxis': 'Trading Intelligence',
  'vorn': 'Agent Platform',
  'veilos': 'Cognitive Civilization OS',
  'seamline': 'Creator Tool',
  'hashmark': 'Sports AI',
  'shadow': 'Artist OS',
  'concurrent': 'Agent OS',
  'ouren': 'Ambient AI',
  'sparkraid': 'Creator Economy',
  'syntha': 'Music Platform',
  'obelisk': 'Trust Protocol',
  'canon': 'Taste Platform',
  'living-protocol': 'Wellness OS',
};
const TYPE_CATEGORY = { game: 'Game', tool: 'Tool', platform: 'Platform', infrastructure: 'Intelligence' };

// Translate developmentPhase → approximate visible progress so the forge reads
// honestly without leaking internal velocity numbers.
function progressForPhase(phase, vaultStatus) {
  if (vaultStatus === 'vaulted') return 10;
  const map = {
    'live-production': 95,
    'live-internal': 90,
    'live-beta': 78,
    'pre-launch': 85,
    'integration': 72,
    'backend-dev': 48,
    'full-stack-dev': 42,
    'design': 28,
    'writing': 32,
    'concept': 14,
    'paused': 10,
  };
  return map[phase] || 35;
}

// Hero spotlight — the studio's editorial flagship showcase for the homepage hero.
// This is a DELIBERATE curation (not a pure progress ranking): it puts our best-craft,
// most-representative, most-inviting worlds first, and keeps market/betting-adjacent
// utilities (velaxis.markets, promogrind.bet) out of the first thing every human + agent
// sees. Order = tile order; index 0 = featured tile. Items omitted here still appear
// everywhere else on the site (Atlas, constellation, /games, /projects) — this governs
// ONLY the hero tile membership + order. Keep every id in sync with the registry; the
// check-hero-spotlight-coherence gate blocks a dangling/duplicate/VAULTED spotlight id.
const HERO_SPOTLIGHT = ['call-of-doodie', 'mindframe', 'veilos', 'vorn', 'football-gm'];

async function loadRegistryCatalog() {
  const registryUrl = pathToFileURL(
    path.join(process.cwd(), 'studio-hub', 'src', 'data', 'studioRegistry.js')
  ).href;
  const { PROJECTS } = await import(registryUrl);
  const catalog = [];
  // IDs that are studio-internal tools — never surface in public constellation.
  // social-dashboard, sparkfunnel, studio-hub, ignis are ops infrastructure;
  // gridiron-gm / gridiron-gm-play are VAULTED with no public deployedUrl.
  const INTERNAL_IDS = new Set([
    'studio-ops', 'social-dashboard', 'sparkfunnel',
    'vaultspark-studio-hub', 'vaultspark-ignis',
    'gridiron-gm', 'gridiron-gm-play',
    'statsforge', // internal sports-analytics platform (public name: StatVault)
  ]);

  for (const project of PROJECTS) {
    if (!project || !project.id) continue;
    if (project.id === 'website') continue; // this very site
    if (INTERNAL_IDS.has(project.id)) continue; // studio-internal — not public
    // Also exclude anything marked live-internal by phase
    if (project.developmentPhase === 'live-internal') continue;
    const vaultRaw = (project.vaultStatus || 'forge').toLowerCase();
    // If an initiative is deployed on the studio's own domain and not paused,
    // treat it as SPARKED regardless of the registry vaultStatus flag — the
    // registry lags behind actual launch state for several items.
    const selfHosted = (project.deployedUrl || '').includes('vaultsparkstudios.com');
    const effectivelySparked = vaultRaw === 'sparked' || (selfHosted && vaultRaw !== 'vaulted');
    const status = vaultRaw === 'vaulted' ? 'VAULTED'
      : effectivelySparked ? 'SPARKED'
      : 'FORGE';
    const typeMap = { game: 'game', tool: 'tool', platform: 'platform', infrastructure: 'tool' };
    const type = typeMap[project.type] || 'project';
    catalog.push({
      id: project.id,
      name: project.name,
      type,
      category: CATALOG_CATEGORIES[project.id] || TYPE_CATEGORY[project.type] || 'Project',
      status,
      progress: progressForPhase(project.developmentPhase, vaultRaw),
      note: CATALOG_NOTES[project.id] || 'In the forge.',
      deployedUrl: project.deployedUrl || null,
      color: project.color || null,
      // Editorial hero rank (>=0) when spotlighted, else omitted. The hero builder
      // uses this to curate its tile set; all other surfaces ignore it.
      ...(HERO_SPOTLIGHT.includes(project.id) ? { spotlight: HERO_SPOTLIGHT.indexOf(project.id) } : {}),
    });
  }
  // Stable order: SPARKED first, then FORGE by progress desc, then VAULTED last
  const rank = { SPARKED: 0, FORGE: 1, VAULTED: 2 };
  catalog.sort((a, b) => {
    const r = rank[a.status] - rank[b.status];
    if (r !== 0) return r;
    return b.progress - a.progress;
  });
  return catalog;
}

const CATALOG = await loadRegistryCatalog();

const checkMode = process.argv.includes('--check');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^## ${escaped}[\\s\\S]*?(?=^## |\\Z)`, 'm');
  const match = markdown.match(regex);
  return match ? match[0] : '';
}

function extractFirstMatchingSection(markdown, pattern) {
  const headings = markdown.match(new RegExp(`^## ${pattern}.*$`, 'gm')) || [];
  if (!headings.length) return '';
  const heading = headings[0].replace(/^## /, '').trim();
  return extractSection(markdown, heading);
}

function extractBullets(section, limit = 5) {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .slice(0, limit)
    .map((line) => line.replace(/^- /, '').replace(/\*\*/g, '').trim());
}

function extractTaskSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^## ${escaped}[\\s\\S]*?(?=^## |^---|\\Z)`, 'm');
  const match = markdown.match(regex);
  if (!match) return [];
  return match[0]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^- \[.\]/.test(line))
    .map((line) => line.replace(/^- \[[ x]\]\s*/, '').replace(/\*\*/g, '').trim());
}

function countByStatus(items, status) {
  return items.filter((item) => item.status === status).length;
}

function extractLatestSessionBlock(markdown) {
  const sections = markdown.match(/^## Session Intent:[\s\S]*?(?=^## Session Intent:|\Z)/gm) || [];
  return sections[0] || markdown;
}

function stringify(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function slugifyLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function routeForCatalogItem(item) {
  if (!item) return null;
  if (item.deployedUrl) return item.deployedUrl;
  if (item.type === 'game') return `/games/${item.id}/`;
  if (item.id === 'voidfall') return '/universe/voidfall/';
  if (item.id === 'social-dashboard') return '/social/';
  return `/projects/${item.id}/`;
}

function fallbackRouteForSlug(slug) {
  const normalized = normalizeProjectSlug(slug);
  if (normalized === 'website') return '/';
  if (normalized === 'studio-ops') return '/studio-pulse/';
  if (normalized === 'social-dashboard') return '/social/';
  if (normalized === 'statsforge') return '/projects/statvault/';
  if (normalized === 'the-living-protocol') return '/projects/the-living-protocol/';
  return null;
}

function titleForEventType(eventType, projectName) {
  if (eventType === 'session-closed') return `${projectName} shipped a fresh session closeout`;
  if (eventType === 'onboard-applied') return `${projectName} received a new Studio OS pass`;
  if (eventType === 'runtime-pack-generated') return `${projectName} refreshed its runtime pack`;
  return `${projectName} emitted a fresh studio signal`;
}

function weightForEventType(eventType) {
  if (eventType === 'session-closed') return 100;
  if (eventType === 'onboard-applied') return 72;
  if (eventType === 'runtime-pack-generated') return 58;
  return 40;
}

function prettyProjectName(projectId) {
  if (projectId === 'website') return 'Studio Website';
  if (projectId === 'studio-ops') return 'Studio Ops';
  if (projectId === 'the-living-protocol') return 'The Living Protocol';
  if (projectId === 'statsforge') return 'StatVault';
  return String(projectId || 'VaultSpark project')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildNormalizedActivity(registryProjects) {
  const events = readPortfolioEvents(root);
  const allowedTypes = new Set(['session-closed', 'onboard-applied', 'runtime-pack-generated']);

  const mapped = events
    .filter((event) => event?.slug && event?.ts && allowedTypes.has(event.type))
    .slice(0, 40)
    .map((event) => {
      const project = registryProjects.find((candidate) => matchesProjectSlug(candidate, event.slug)) || null;
      const catalogItem = CATALOG.find((candidate) => matchesProjectSlug({ id: candidate.id, githubRepo: candidate.deployedUrl }, event.slug))
        || CATALOG.find((candidate) => normalizeProjectSlug(candidate.id) === normalizeProjectSlug(event.slug))
        || null;
      const projectId = project ? normalizeProjectSlug(project.id) : normalizeProjectSlug(event.slug);
      const projectName = project?.name || catalogItem?.name || prettyProjectName(projectId);
      return {
        id: slugifyLabel(`${event.type}-${projectId}-${event.ts}`),
        source: event.source || 'studio-events',
        type: event.type === 'session-closed' ? 'public_ship' : 'campaign_update',
        title: titleForEventType(event.type, projectName),
        url: routeForCatalogItem(catalogItem) || fallbackRouteForSlug(projectId),
        occurredAt: event.ts,
        projectId,
        weight: weightForEventType(event.type),
      };
    })
    .filter((event) => event.url);

  const latest = [];
  const seenProjects = new Set();

  for (const event of mapped) {
    if (latest.length >= 10) break;
    if (seenProjects.has(event.projectId)) continue;
    latest.push(event);
    seenProjects.add(event.projectId);
  }

  for (const event of mapped) {
    if (latest.length >= 10) break;
    if (latest.some((existing) => existing.id === event.id)) continue;
    latest.push(event);
  }

  return {
    schemaVersion: '1.0',
    mode: 'public-safe-normalized-feed',
    source: 'portfolio-events-ndjson',
    producer: 'social-dashboard',
    feedEndpoint: '/api/public-intelligence.json',
    status: latest.length ? 'live' : 'contract-ready',
    privacy: 'No private account identifiers, raw analytics, tokens, revenue figures, or internal operator notes.',
    fields: ['id', 'source', 'type', 'title', 'url', 'occurredAt', 'projectId', 'weight'],
    acceptedTypes: ['social_post', 'github_release', 'public_ship', 'community_signal', 'campaign_update'],
    latest,
  };
}

function normalizeForCheck(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeForCheck);
  }
  if (value && typeof value === 'object') {
    const normalized = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === 'generatedAt') continue;
      // ciHealth is updated by the CI beacon workflow independently; exclude from
      // drift check so beacon commits don't falsely fail build:check
      if (key === 'ciHealth') continue;
      normalized[key] = normalizeForCheck(child);
    }
    return normalized;
  }
  return value;
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

function checkExact(filePath, content) {
  if (!fs.existsSync(filePath)) return false;
  const current = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.stringify(normalizeForCheck(JSON.parse(current))) === JSON.stringify(normalizeForCheck(JSON.parse(content)));
  } catch {
    return current === content;
  }
}

const projectStatus = readJson(projectStatusPath);
const taskBoard = readText(taskBoardPath);
const latestHandoff = readText(latestHandoffPath);
const runtimePack = fs.existsSync(runtimePackPath) ? readJson(runtimePackPath) : {};
const ciStatusPath = path.join(root, 'api', 'ci-status.json');
const ciStatus = fs.existsSync(ciStatusPath) ? readJson(ciStatusPath) : null;

const latestSessionBlock = extractLatestSessionBlock(latestHandoff);
const sessionMatch = latestSessionBlock.match(/Session (\d+)/);
const updatedMatch = latestHandoff.match(/Last updated:\s*([0-9-]+)/);
// SIL rolling-status is the authoritative session counter (updated every closeout)
const silText = fs.existsSync(silPath) ? fs.readFileSync(silPath, 'utf8') : '';
const silSessionMatch = silText.match(/Last session:[^|]+\|\s*Session\s+(\d+)/);
const fromHandoff = sessionMatch && Number(sessionMatch[1]);
const fromSil = silSessionMatch && Number(silSessionMatch[1]);
const fromStatus = projectStatus.currentSession;
const currentSession = Math.max(fromHandoff || 0, fromSil || 0, fromStatus || 0) || null;
const latestWhereWeLeftOff =
  extractSection(latestSessionBlock, `Where We Left Off (Session ${currentSession})`) ||
  extractFirstMatchingSection(latestSessionBlock, 'Where We Left Off \\(Session ');

const shipped = extractBullets(latestWhereWeLeftOff.replace(/^[\s\S]*?### Shipped/m, '### Shipped'), 6);
const sessionNowHeading = `Now (S${currentSession}`;
const nowSection =
  extractFirstMatchingSection(taskBoard, sessionNowHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) ||
  extractFirstMatchingSection(taskBoard, 'Now \\(');
const nowItems = nowSection
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => /^- \[.\]/.test(line))
  .map((line) => line.replace(/^- \[[ x]\]\s*/, '').replace(/\*\*/g, '').trim())
  .slice(0, 8);
const nextItems = extractTaskSection(taskBoard, 'Next').slice(0, 5);

const pulse = {
  now: nowItems,
  next: nextItems,
  shipped,
};

const registryModule = await import(pathToFileURL(path.join(process.cwd(), 'studio-hub', 'src', 'data', 'studioRegistry.js')).href);
const normalizedActivity = buildNormalizedActivity(registryModule.PROJECTS || []);
const contracts = await buildPublicContracts(runtimePack, projectStatus, pulse, CATALOG, normalizedActivity);
contracts.websitePublic.intelligence.currentSession = currentSession;
contracts.hub.pulse.currentSession = currentSession;
contracts.hub.pulse.lastUpdated = projectStatus.lastUpdated || (updatedMatch && updatedMatch[1]);

// Strip internal ops syntax from task items before publishing publicly.
// Removes prefixes like [S90][COHESION], [FOLLOWUP], [OPS], etc. and
// any backtick-wrapped script/command references.
function toConsumerPulseItem(raw) {
  return raw
    .replace(/^\[S\d+\]\s*/g, '')           // [S90]
    .replace(/^\[[\w:⛔]+\]\s*/g, '')       // [COHESION], [OPS], [GENIUS], [SIL:2⛔]
    .replace(/\[(?:S\d+\]|\[[\w:⛔]+\])\s*/g, '') // embedded tags mid-string
    .replace(/`[^`]+`/g, '')                // backtick commands
    .replace(/DONE S\d+:\s*/g, '')          // "DONE S88:" prefix
    .replace(/\s{2,}/g, ' ')
    .replace(/\s[·—]\s*$/, '')
    .trim();
}

// Static consumer changelog — human-readable milestones authored here rather
// than derived from internal session notes. Updated at closeout when meaningful
// consumer-facing work ships.
const CONSUMER_CHANGELOG = [
  {
    date: '2026-05-14',
    title: 'Forge Window live data and feedback polish',
    highlights: [
      'Studio Pulse now loads the live forge data again — current focus, project cards, and session heartbeat render from the public intelligence feed',
      'Realtime heartbeat restored — the live ticker now listens for vault signals when realtime is available',
      'Feedback is less intrusive — the Signal Feedback prompt now starts as a small expandable button',
      'Resources are easier to find from the header through the new Resources menu',
    ],
  },
  {
    date: '2026-04-21',
    title: 'Evolving homepage — live milestones and cleaner signal',
    highlights: [
      'Studio Milestones section rebuilt as an evolving live timeline — past chapters, live now, and what\'s ahead',
      'Homepage exit-intent panel fixed — no longer surfaces on arrival, only on a genuine exit signal',
      'Ask IGNIS resilience upgrade — model fallback chain keeps the oracle responsive when a model is unavailable',
      'Changelog reframed as a live feed with a visible pulse indicator and public-safe copy',
    ],
  },
  {
    date: '2026-04-15',
    title: 'Annual membership, push notifications, portal polish',
    highlights: [
      'Annual billing is live — save 25% vs. monthly with a one-year lock-in',
      'Web push notifications — get alerts when you rank up or new content drops',
      'Member portal faster to load and easier to navigate on mobile',
    ],
  },
  {
    date: '2026-04-13',
    title: 'Speed pass, readability, and vault wall groundwork',
    highlights: [
      'Site-wide speed pass — faster connection setup and smoother page transitions',
      'Gold text readability fix — contrast now passes accessibility standards on every page',
      'Signal Log groundwork — cleaner format for studio updates across the member portal',
    ],
  },
  {
    date: '2026-04-12',
    title: 'Membership hub, VaultSparked polish, nav refresh',
    highlights: [
      'Membership page rebuilt as a full hub — tiers, perks, and comparisons in one place',
      'VaultSparked upgrade — new design with clearer tier comparison',
      'Navigation and footer refresh rolled out across the entire site',
    ],
  },
  {
    date: '2026-04-11',
    title: 'Press kit, Forge Window, Vault Wall, invite system',
    highlights: [
      'Press kit page live with assets and brand guidelines',
      'Forge Window — real-time window into what the studio is shipping',
      'Vault Wall launched — your public identity page with rank, achievements, and referrals',
      'Invite system expanded — milestone rewards at 1, 3, 5, and 10 referrals',
    ],
  },
  {
    date: '2026-03-20',
    title: 'Accessibility, member voices, game updates',
    highlights: [
      'Full accessibility audit passed — improved contrast, focus states, and screen-reader support',
      'Member voices — real member outcomes now featured on the membership page',
      'Call of Doodie patch — stability improvements and a new satirical map variant',
    ],
  },
  {
    date: '2026-03-10',
    title: 'Community challenges, weekly leaderboard, seasons',
    highlights: [
      'Community challenges system — earn Vault Points and climb the 9-tier rank ladder',
      'Weekly leaderboards — fresh competition every seven days',
      'Co-op teams — form squads and compete together for seasonal rewards',
    ],
  },
  {
    date: '2026-03-01',
    title: 'Public site launched — games, ranks, and community',
    highlights: [
      'Public pages live: games catalog, leaderboards, community hub, journal, ranks',
      'Daily login bonus + streak system with milestone rewards at 7, 30, 60, and 100 days',
      'Onboarding tour for new members, seasonal challenge badges, and achievement progress bars',
      'Studio founded and first world sparked — Call of Doodie goes live',
    ],
  },
];

// The published feed is data-driven: data/consumer-changelog.json is the source of
// truth (appended ONLY via scripts/publish-changelog-draft.mjs after founder approval),
// with the array above kept as the historical seed. Merge + dedupe by date+title,
// newest first — so new founder-approved entries keep the changelog current without any
// code change, and without ever admitting raw commit text (S284).
const consumerChangelogFile = path.join(root, 'data', 'consumer-changelog.json');
function resolveConsumerChangelog() {
  let published = [];
  try {
    const raw = JSON.parse(fs.readFileSync(consumerChangelogFile, 'utf8'));
    published = Array.isArray(raw) ? raw : (Array.isArray(raw.entries) ? raw.entries : []);
  } catch { /* absent → seed-only */ }
  const byKey = new Map();
  for (const e of [...CONSUMER_CHANGELOG, ...published]) {
    if (!e || !e.date || !e.title) continue;
    byKey.set(e.date + '|' + e.title, {
      date: e.date,
      title: e.title,
      highlights: Array.isArray(e.highlights) ? e.highlights : [],
    });
  }
  return [...byKey.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
const RESOLVED_CONSUMER_CHANGELOG = resolveConsumerChangelog();

// ─── P3 Studio Living Window — project graph + activity heatmap ──────────────
//
// Hand-curated high-signal edges. We do not auto-derive edges from registry fields
// because the registry has no relatedProjects/blockedBy column today; heuristic
// edges (shared type, shared phase) would be noise. When public copy says "Voidfall
// connects to The Exodus" that's a creative-canon decision, not graph theory.
//
// Edge types:
//   shares-universe  — same lore world
//   builds-on        — depends on the predecessor's runtime/infra
//   sibling          — same product family, similar mechanics
//
// CANON RULE: only public-facing projects (non-internal, non-VAULTED) may
// appear here. All edges must be founder-confirmed — do NOT infer
// relationships from genre/topic similarity alone.
// Internal projects excluded: social-dashboard, statsforge, studio-ops,
// sparkfunnel, studio-hub, ignis, gridiron-gm, gridiron-gm-play, vaultfront.
const PROJECT_EDGES = [
  // No verified public-to-public edges currently on record.
  // Declare new edges here once founder confirms canon relationships.
];

function buildProjectGraph(catalog) {
  const knownIds = new Set(catalog.map((c) => c.id));
  const edges = PROJECT_EDGES.filter((e) => knownIds.has(e.from) && knownIds.has(e.to));
  const nodeIds = new Set();
  for (const e of edges) { nodeIds.add(e.from); nodeIds.add(e.to); }
  const nodes = catalog
    .filter((c) => nodeIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, type: c.type, status: c.status, color: c.color || null }));
  return { nodes, edges };
}

// Activity heatmap — count of session-closed + onboard-applied + runtime-pack
// events per project, rolling-30 window. Anonymized at the source (events have
// no actor). Sealed-vault projects (ids in seal list) collapse into a single
// "sealed" bucket so we never expose codenames.
const HEATMAP_WINDOW_DAYS = 30;
const HEATMAP_SEALED_BUCKET = 'sealed-vault';
const HEATMAP_STUDIO_BUCKET = 'website';

function buildActivityHeatmap(catalog) {
  const eventsPath = path.join(root, 'portfolio', 'events.ndjson');
  if (!fs.existsSync(eventsPath)) return [];
  const cutoff = Date.now() - HEATMAP_WINDOW_DAYS * 86400 * 1000;
  const knownIds = new Set(catalog.map((c) => c.id));
  const counts = new Map();
  let sealedCount = 0;
  let studioCount = 0;

  const lines = fs.readFileSync(eventsPath, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    const ts = Date.parse(ev.ts || '');
    if (!ts || ts < cutoff) continue;
    const slug = normalizeProjectSlug(ev.slug || '');
    if (!slug || slug === 'studio-ops') continue;
    const weight = weightForEventType(ev.type);
    if (slug === HEATMAP_STUDIO_BUCKET) {
      studioCount += weight;
      continue;
    }
    if (knownIds.has(slug)) {
      counts.set(slug, (counts.get(slug) || 0) + weight);
    } else {
      sealedCount += Math.round(weight / 4); // sealed bucket dampened so it can't dominate
    }
  }

  const result = catalog
    .filter((c) => counts.has(c.id))
    .map((c) => ({
      projectId: c.id,
      name: c.name,
      type: c.type,
      heat: counts.get(c.id),
    }))
    .sort((a, b) => b.heat - a.heat);

  if (studioCount > 0) {
    result.push({ projectId: HEATMAP_STUDIO_BUCKET, name: 'Studio platform', type: 'platform', heat: studioCount });
  }
  if (sealedCount > 0) {
    result.push({ projectId: HEATMAP_SEALED_BUCKET, name: 'Vaulted projects', type: 'sealed', heat: sealedCount });
  }
  return result;
}

// Public-facing pulse uses human-authored consumer-safe language.
// TASK_BOARD items are too technical for external audiences — they stay in hub.json.
const publicPulse = {
  now: [
    'Studio Pulse live data — the Forge Window now hydrates from the public intelligence feed again.',
    'Feedback UX polish — Signal Feedback now opens from a compact button instead of interrupting the page.',
    'Social Dashboard activity feed — connecting cross-platform activity into a unified studio presence.',
  ],
  next: [
    'Forge Window naming rollout — public navigation, guidance copy, and activity surfaces now speak one language.',
    'Expanded intent routing on games and universe hubs.',
    'Cloudflare security hardening — additional WAF rules for international traffic filtering.',
  ],
  shipped: pulse.shipped,
};

const payload = {
  schemaVersion: '1.2',
  generatedAt: new Date().toISOString(),
  project: {
    name: projectStatus.name,
    slug: projectStatus.slug,
    status: projectStatus.status,
    health: projectStatus.health,
    vaultStatus: projectStatus.vaultStatus,
    currentSession,
    lastUpdated: projectStatus.lastUpdated || (updatedMatch && updatedMatch[1]),
    currentFocus: projectStatus.currentFocus,
    nextMilestone: projectStatus.nextMilestone,
    ignis: {
      score: projectStatus.ignisScore,
      grade: projectStatus.ignisGrade,
      lastComputed: projectStatus.ignisLastComputed,
    },
  },
  pulse: publicPulse,
  consumerChangelog: RESOLVED_CONSUMER_CHANGELOG,
  stats: {
    sessionsCompleted: currentSession || 0,
    liveProjects: countByStatus(CATALOG, 'SPARKED'),
    projectsInForge: countByStatus(CATALOG, 'FORGE'),
    activeEdgeFunctions: 16,
    vaultRankTiers: 9,
    trackedSocialAccounts: contracts.websitePublic.socialPresence.summary.trackedAccounts,
  },
  portfolio: {
    total: PORTFOLIO_TOTAL,
    publicListed: CATALOG.length,
    sealedCount: Math.max(0, PORTFOLIO_TOTAL - CATALOG.length),
    sparked: countByStatus(CATALOG, 'SPARKED'),
    forge: countByStatus(CATALOG, 'FORGE'),
    vaulted: countByStatus(CATALOG, 'VAULTED'),
    // Optional ISO date of the next sealed-vault reveal. Surfaces as a countdown
    // chip via assets/sealed-vault-row.js when present. Read from sibling
    // studioRegistry if any sealed entry exposes `estimatedRevealAt`; falls
    // back to null. Hand-curated in studio-ops when known; never guessed.
    silCategories: (() => {
      try {
        const statusPath = path.resolve(process.cwd(), 'context/PROJECT_STATUS.json');
        if (!fs.existsSync(statusPath)) return null;
        const st = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        const cats = st && st.silCategoriesV3;
        if (!cats || typeof cats !== 'object') return null;
        // Public-safe: only score values, no internal commentary or links.
        return {
          devHealth: cats.devHealth,
          alignment: cats.creativeAlignment,
          momentum: cats.momentum,
          engagement: cats.engagement,
          process: cats.processQuality,
          coherence: cats.crossRepoCoherence,
          security: cats.securityPosture,
          ecosystem: cats.ecosystemIntegration,
          capital: cats.capitalEfficiency,
          automation: cats.automationCoverage,
          total: st.silScore || null,
          updatedSession: st.silLastSession || null,
        };
      } catch { return null; }
    })(),
    sealedNextRevealAt: (() => {
      try {
        const regPath = path.resolve(process.cwd(), '../vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json');
        if (!fs.existsSync(regPath)) return null;
        const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
        const list = Array.isArray(reg) ? reg : (reg.projects || []);
        const dates = list
          .filter((p) => p && p.estimatedRevealAt && (p.vaultStatus === 'SEALED' || p.sealed === true))
          .map((p) => p.estimatedRevealAt)
          .sort();
        return dates[0] || null;
      } catch { return null; }
    })(),
  },
  catalog: CATALOG,
  ecosystem: {
    listingMetadata: contracts.websitePublic.listingMetadata,
    bridges: contracts.websitePublic.bridges,
    surfaces: {
      production: contracts.websitePublic.surfaces.production,
      staging: contracts.websitePublic.surfaces.staging,
      github: contracts.websitePublic.surfaces.github,
    },
  },
  feedback: {
    enabled: true,
    mode: 'browser-local-public-safe',
    prompts: ['goal', 'blocker', 'usefulness'],
    surfaces: ['/','/membership/','/vaultsparked/','/join/','/invite/','/studio-pulse/'],
    summaryFields: ['topGoal', 'topBlocker', 'topUsefulness', 'totalResponses'],
  },
  social: contracts.socialDashboard.socialPresence,
  normalizedActivity,
  projectGraph: buildProjectGraph(CATALOG),
  activityHeatmap: buildActivityHeatmap(CATALOG),
  ciHealth: ciStatus
    ? {
        allGreen: ciStatus.allGreen,
        summary: ciStatus.summary,
        checkedAt: ciStatus.generatedAt,
        workflows: (ciStatus.workflows || []).map(w => ({ name: w.name, status: w.status })),
      }
    : null,
};

const renderedOutputs = new Map([
  [outputPath, stringify(payload)],
  [path.join(contractsDir, 'website-public.json'), stringify(contracts.websitePublic)],
  [path.join(contractsDir, 'hub.json'), stringify(contracts.hub)],
  [path.join(contractsDir, 'social-dashboard.json'), stringify(contracts.socialDashboard)],
]);

if (checkMode) {
  const stale = outputTargets.filter((target) => !checkExact(target, renderedOutputs.get(target)));
  if (stale.length) {
    console.error(`Public intelligence drift detected:\n${stale.map((target) => `- ${path.relative(root, target)}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Public intelligence outputs are in sync.');
  process.exit(0);
}

const changedTargets = outputTargets.filter((target) => writeIfChanged(target, renderedOutputs.get(target)));
if (!changedTargets.length) {
  console.log('Public intelligence outputs already current.');
  process.exit(0);
}

for (const target of changedTargets) {
  console.log(`Wrote ${path.relative(root, target)}`);
}
