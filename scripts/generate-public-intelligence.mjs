import fs from 'node:fs';
import path from 'node:path';
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

const CATALOG = [
  { name: 'Call of Doodie', type: 'game', status: 'SPARKED', progress: 88, note: 'Live, public, and still actively refined.' },
  { name: 'VaultSpark Football GM', type: 'game', status: 'SPARKED', progress: 76, note: 'Live beta with ongoing polish and iteration.' },
  { name: 'MindFrame', type: 'game', status: 'FORGE', progress: 42, note: 'Core identity is strong; next step is deeper live adoption.' },
  { name: 'Solara', type: 'game', status: 'FORGE', progress: 30, note: 'World and combat systems still consolidating.' },
  { name: 'VaultFront', type: 'game', status: 'FORGE', progress: 24, note: 'Early runtime and gameplay differentiation still in progress.' },
  { name: 'The Exodus', type: 'game', status: 'FORGE', progress: 18, note: 'Conceptual direction is stronger than implementation depth.' },
  { name: 'PromoGrind', type: 'project', status: 'SPARKED', progress: 91, note: 'Live utility product with incremental UX refinements.' },
  { name: 'Vorn', type: 'project', status: 'FORGE', progress: 61, note: 'Strong operating direction, still moving toward fuller agent-native depth.' },
];

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
  social: contracts.socialDashboard.socialPresence,
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
