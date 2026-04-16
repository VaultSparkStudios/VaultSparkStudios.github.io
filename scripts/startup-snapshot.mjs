import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const format = process.argv.includes('--json') ? 'json' : 'md';

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function extractLatestHandoff(markdown) {
  const sections = markdown.match(/^## Session Intent:[\s\S]*?(?=^## Session Intent:|\Z)/gm) || [];
  return (sections[0] || '').trim();
}

function extractRollingStatus(markdown) {
  const match = markdown.match(/<!-- rolling-status-start -->[\s\S]*?<!-- rolling-status-end -->/m);
  return match ? match[0].replace(/<!-- rolling-status-start -->\s*/, '').replace(/\s*<!-- rolling-status-end -->/, '').trim() : '';
}

function extractLatestSilEntry(markdown) {
  const headings = markdown.match(/^## \d{4}-\d{2}-\d{2}.*$/gm) || [];
  const latestHeading = headings[headings.length - 1];
  if (!latestHeading) return '';
  const escaped = latestHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^${escaped}[\\s\\S]*?(?=^## \\d{4}-\\d{2}-\\d{2}|\\Z)`, 'm'));
  return match ? match[0].trim() : '';
}

const snapshot = {
  projectBrief: read('context/PROJECT_BRIEF.md').trim(),
  soul: read('context/SOUL.md').trim(),
  brain: read('context/BRAIN.md').trim(),
  currentState: read('context/CURRENT_STATE.md').trim(),
  decisions: read('context/DECISIONS.md').trim(),
  taskBoard: read('context/TASK_BOARD.md').trim(),
  latestHandoff: extractLatestHandoff(read('context/LATEST_HANDOFF.md')),
  rollingStatus: extractRollingStatus(read('context/SELF_IMPROVEMENT_LOOP.md')),
  latestSilEntry: extractLatestSilEntry(read('context/SELF_IMPROVEMENT_LOOP.md')),
  truthAudit: fs.existsSync(path.join(root, 'context/TRUTH_AUDIT.md')) ? read('context/TRUTH_AUDIT.md').trim() : '',
  projectStatus: JSON.parse(read('context/PROJECT_STATUS.json'))
};

if (format === 'json') {
  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
  process.exit(0);
}

process.stdout.write([
  '# Startup Snapshot',
  '',
  '## Project Status',
  JSON.stringify(snapshot.projectStatus, null, 2),
  '',
  '## Latest Handoff',
  snapshot.latestHandoff,
  '',
  '## Rolling Status',
  snapshot.rollingStatus,
  '',
  '## Latest SIL Entry',
  snapshot.latestSilEntry
].join('\n') + '\n');
