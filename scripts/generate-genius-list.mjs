#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outPath = join(root, 'docs', 'GENIUS_LIST.md');

function read(relativePath, fallback = '') {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : fallback;
}

function readJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(read(relativePath, '{}'));
  } catch {
    return fallback;
  }
}

function stripMd(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function openTasks(taskBoard) {
  const seen = new Set();
  return taskBoard
    .split(/\r?\n/)
    .filter((line) => /^- \[ \]/.test(line))
    .map((line) => stripMd(line.replace(/^- \[ \]\s*/, '')))
    .filter(Boolean)
    .filter((task) => {
      const key = task
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\s+—.*$/, '')
        .toLowerCase()
        .trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function latestIntent(handoff) {
  const match = handoff.match(/^## Session Intent:[\s\S]*?(?=^## Session Intent:|\z)/m);
  return match ? stripMd(match[0]).slice(0, 520).trimEnd() : 'No current session intent found.';
}

function categoryFor(task) {
  const lower = task.toLowerCase();
  if (/\b(lighthouse|axe|verify|ci|e2e|playwright)\b/.test(lower)) return 'VERIFY';
  if (lower.includes('stripe') || lower.includes('checkout') || lower.includes('annual')) return 'REVENUE';
  if (/\b(security|pat|token|waf)\b/.test(lower)) return 'SECURITY';
  if (lower.includes('social dashboard') || lower.includes('contract') || lower.includes('bridge')) return 'COHESION';
  if (lower.includes('nav') || lower.includes('forge window') || lower.includes('voice')) return 'BRAND';
  if (lower.includes('ignis') || lower.includes('concierge') || lower.includes('oracle')) return 'AI';
  if (lower.includes('genius') || lower.includes('audit')) return 'INTELLIGENCE';
  return 'PRODUCT';
}

function scoreFor(task, index) {
  const lower = task.toLowerCase();
  let score = 82 - Math.min(index, 8);
  if (/\b(lighthouse|axe|verify|ci|e2e|playwright)\b/.test(lower)) score += 13;
  if (/\b(security|pat|token|waf)\b/.test(lower)) score += 10;
  if (lower.includes('blocked') || lower.includes('founder action') || lower.includes('har')) score -= 9;
  if (lower.includes('social dashboard') || lower.includes('bridge')) score += 7;
  if (lower.includes('ignis') || lower.includes('concierge') || lower.includes('oracle')) score += 6;
  if (lower.includes('genius')) score += 6;
  return Math.max(70, Math.min(98, score));
}

function itemFromTask(task, index) {
  const category = categoryFor(task);
  const title = task.replace(/^(\[[^\]]+\]\s*)+/, '').split(' — ')[0].trim();
  const score = scoreFor(task, index);
  return {
    category,
    title,
    score,
    task,
    rationale: rationaleFor(category, task),
    command: commandFor(category, task),
  };
}

function rationaleFor(category, task) {
  if (category === 'VERIFY') return 'Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.';
  if (category === 'SECURITY') return 'Security cleanup lowers operational risk without changing public promises or membership logic.';
  if (category === 'REVENUE') return 'Revenue-path work should only activate when the missing external price IDs exist; until then honesty beats fake availability.';
  if (category === 'COHESION') return 'Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.';
  if (category === 'BRAND') return 'Naming and voice polish should keep user-facing surfaces player-readable while preserving the public URL contract.';
  if (category === 'AI') return 'AI surfaces should remain grounded in public intelligence and bounded by the Vault Oracle contract.';
  if (category === 'INTELLIGENCE') return 'Keeping the ranked audit fresh prevents the site from sliding back into piecemeal iteration.';
  return 'This task is open, local, and connected to the current project state.';
}

function commandFor(category, task) {
  if (category === 'VERIFY') return 'npm run build:check && node scripts/csp-audit.mjs';
  if (category === 'INTELLIGENCE') return 'node scripts/generate-genius-list.mjs';
  if (category === 'COHESION') return 'node scripts/generate-public-intelligence.mjs';
  if (category === 'SECURITY') return 'node scripts/lint-repo.mjs';
  if (category === 'AI') return 'node scripts/generate-public-intelligence.mjs';
  return '';
}

function ensureMinimum(items) {
  const defaults = [
    {
      category: 'VERIFY',
      title: 'Post-push CI confirmation',
      score: 96,
      task: 'Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.',
      rationale: 'The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.',
      command: 'gh run list --limit 10',
    },
    {
      category: 'COHESION',
      title: 'Social Dashboard bidirectional mirror',
      score: 91,
      task: 'Expose normalized public activity in Social Dashboard and pull it back into website public intelligence.',
      rationale: 'This is the next cross-surface bridge after the website contract work.',
      command: '',
    },
    {
      category: 'BRAND',
      title: 'Forge Window naming decision',
      score: 86,
      task: 'Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.',
      rationale: 'The page experience changed; navigation language needs founder sign-off before public vocabulary changes.',
      command: '',
    },
  ];

  for (const item of defaults) {
    if (!items.some((existing) => existing.title.toLowerCase() === item.title.toLowerCase())) {
      items.push(item);
    }
  }
  return items;
}

function section(title, items) {
  if (!items.length) return '';
  return `### ${title}\n\n` + items.map((item, index) => {
    return [
      `#### ${index + 1}. [${item.category}] ${item.title}`,
      `Final score: **${item.score}**`,
      '',
      item.task,
      '',
      `Why it matters: ${item.rationale}`,
      item.command ? `\nFirst command: \`${item.command}\`` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n') + '\n';
}

const status = readJson('context/PROJECT_STATUS.json');
const taskBoard = read('context/TASK_BOARD.md');
const handoff = read('context/LATEST_HANDOFF.md');
const tasks = openTasks(taskBoard);

const items = ensureMinimum(tasks.map(itemFromTask))
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

const now = items.slice(0, 4);
const next = items.slice(4, 9);
const later = items.slice(9);
const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);

const body = `# Genius Hit List — Session ${status.currentSession || 'Current'}\n\n` +
`Generated: ${new Date().toISOString().slice(0, 10)}\n` +
`Project: \`${status.name || 'VaultSparkStudios.github.io'}\`\n` +
`Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md\n\n` +
`## Score Summary\n\n` +
`- Overall opportunity pressure: **${avg}/100**\n` +
`- Health: **${status.health || 'unknown'}**\n` +
`- Current SIL: **${status.silScore || 'unknown'}/500**\n` +
`- Current focus: ${status.currentFocus || 'Not recorded.'}\n\n` +
`## Strategic Read\n\n` +
`${latestIntent(handoff)}\n\n` +
`The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.\n\n` +
`## Ranked Hit List\n\n` +
section('NOW', now) + '\n' +
section('NEXT', next) + '\n' +
section('LATER', later) + '\n' +
`## Recommended Build Order\n\n` +
items.map((item, index) => `${index + 1}. ${item.title}`).join('\n') +
`\n\n## Best Immediate Move\n\n` +
`Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.\n`;

writeFileSync(outPath, body, 'utf8');
console.log(`Wrote ${outPath}`);
