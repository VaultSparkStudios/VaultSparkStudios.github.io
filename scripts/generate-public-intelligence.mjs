import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPublicContracts } from './lib/public-intelligence-contracts.mjs';

const root = process.cwd();
const projectStatusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const taskBoardPath = path.join(root, 'context', 'TASK_BOARD.md');
const latestHandoffPath = path.join(root, 'context', 'LATEST_HANDOFF.md');
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
  'vaultspark-football-gm': 'Live beta. Deep football GM with analytics — polish rounds still in motion.',
  'gridiron-gm': 'Resting in the vault. Legacy GM sim, paused on known bugs.',
  'gridiron-gm-play': 'Resting in the vault. Browser deployment of Gridiron GM.',
  'solara': 'Desert survival world. Systems converging.',
  'vaultfront': 'Strategy world taking shape. Early runtime, big ambitions.',
  'vaultspark-forge': 'Crafting-and-building world in early concept. Sealed silhouette for now.',
  'the-exodus': 'Narrative survival — a dying world, a hard decision. Direction locked, scope expanding.',
  'voidfall': 'Nine-book cosmic-horror saga. Book 1 at lock. Not a game — a world.',
  'promogrind': 'Live utility. Vault-gated promo engine, iterating on UX.',
  'mindframe': 'Metacognition training platform. Live on external infra; identity consolidating.',
  'velaxis': 'Crypto market intelligence dashboard. Production-stable v1.7.',
  'statsforge': 'Sports analytics platform. ForgeRating + ForgeAI, 500K+ programmatic pages.',
  'vorn': 'Social-first, agent-native platform. Give your agent a home.',
  'social-dashboard': 'Internal social-ops surface. Bridges live social data into the studio.',
};

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

async function loadRegistryCatalog() {
  const registryUrl = pathToFileURL(
    path.join(process.cwd(), 'studio-hub', 'src', 'data', 'studioRegistry.js')
  ).href;
  const { PROJECTS } = await import(registryUrl);
  const catalog = [];
  for (const project of PROJECTS) {
    if (!project || !project.id) continue;
    if (project.id === 'website') continue; // this very site
    if (project.id === 'studio-ops') continue; // private internal ops
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
      status,
      progress: progressForPhase(project.developmentPhase, vaultRaw),
      note: CATALOG_NOTES[project.id] || 'In the forge.',
      deployedUrl: project.deployedUrl || null,
      color: project.color || null,
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
const currentSession = (sessionMatch && Number(sessionMatch[1])) || projectStatus.currentSession || null;
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

const contracts = await buildPublicContracts(runtimePack, projectStatus, pulse, CATALOG);

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
    lastUpdated: (updatedMatch && updatedMatch[1]) || projectStatus.lastUpdated,
    currentFocus: projectStatus.currentFocus,
    nextMilestone: projectStatus.nextMilestone,
    blockers: projectStatus.blockers,
    ignis: {
      score: projectStatus.ignisScore,
      grade: projectStatus.ignisGrade,
      lastComputed: projectStatus.ignisLastComputed,
    },
  },
  pulse,
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
