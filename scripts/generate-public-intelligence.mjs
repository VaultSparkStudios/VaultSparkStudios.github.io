import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const projectStatusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const taskBoardPath = path.join(root, 'context', 'TASK_BOARD.md');
const latestHandoffPath = path.join(root, 'context', 'LATEST_HANDOFF.md');
const outputPath = path.join(root, 'api', 'public-intelligence.json');

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

const projectStatus = readJson(projectStatusPath);
const taskBoard = readText(taskBoardPath);
const latestHandoff = readText(latestHandoffPath);

const sessionMatch = latestHandoff.match(/Session (\d+)/);
const updatedMatch = latestHandoff.match(/Last updated:\s*([0-9-]+)/);
const currentSession = (sessionMatch && Number(sessionMatch[1])) || projectStatus.currentSession || null;
const latestWhereWeLeftOff =
  extractSection(latestHandoff, `Where We Left Off (Session ${currentSession})`) ||
  extractFirstMatchingSection(latestHandoff, 'Where We Left Off \\(Session ');
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

const payload = {
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
  pulse: {
    now: nowItems,
    next: nextItems,
    shipped,
  },
  stats: {
    sessionsCompleted: currentSession || 0,
    liveProjects: countByStatus(CATALOG, 'SPARKED'),
    projectsInForge: countByStatus(CATALOG, 'FORGE'),
    activeEdgeFunctions: 16,
    vaultRankTiers: 9,
  },
  catalog: CATALOG,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, outputPath)}`);
