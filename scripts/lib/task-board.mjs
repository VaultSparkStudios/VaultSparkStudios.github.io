/**
 * task-board.mjs
 *
 * Shared TASK_BOARD parsing helpers used by startup, blocker, and queue flows.
 */

export function extractSection(markdown, heading) {
  const parts = String(markdown || '').split(/^## /m);
  const match = parts.find((part) => part.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1);
}

export function parseUnifiedItems(markdown) {
  const section = extractSection(markdown, 'Unified Genius List');
  if (!section) return [];

  const items = [];
  for (const line of section.split(/\r?\n/)) {
    if (!/^\|\s*[\d.]+\s*\|/.test(line)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6 || cells[0] === '#') continue;
    const [rank, tier, category, status, effort, item] = cells;
    const titleMatch = item.match(/\*\*(.+?)\*\*/);
    items.push({
      rank,
      rankNumber: parseFloat(rank),
      tier,
      category,
      status,
      effort,
      item: item.replace(/\*\*/g, ''),
      rawItem: item,
      title: (titleMatch ? titleMatch[1] : item).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
    });
  }

  return items;
}

/**
 * Parse every numeric task row in every historical/current Markdown table.
 * Unlike parseUnifiedItems(), this is intentionally not scoped to the first
 * Unified Genius section: ops task --id must find an old committed ID without
 * loading the whole board into an agent's context.
 */
export function parseTaskRows(markdown) {
  const rows = [];
  let section = '(root)';
  const lines = String(markdown || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const heading = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if (heading) section = heading[1].trim();
    if (!/^\|\s*\d+(?:\.\d+)?\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 6) continue;
    const [id, tier, category, status, effort, ...itemCells] = cells;
    const rawItem = itemCells.join(' | ').trim();
    const titleMatch = rawItem.match(/\*\*(.+?)\*\*/);
    rows.push({
      id,
      idNumber: Number(id),
      tier,
      category,
      status,
      effort,
      item: rawItem.replace(/\*\*/g, ''),
      rawItem,
      title: (titleMatch?.[1] || rawItem).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
      section,
      line: index + 1,
      raw: line,
    });
  }
  return rows;
}

export function findTaskRowsById(markdown, id) {
  const key = String(id ?? '').trim();
  return parseTaskRows(markdown).filter((row) => row.id === key);
}

export function parseHumanItems(markdown) {
  const section = extractSection(markdown, 'Human Action Required');
  if (!section) return [];

  return section
    .split(/\r?\n/)
    .map((line) => line.match(/^- \[ \] \*\*(.*?)\*\* — (.*)$/))
    .filter(Boolean)
    .map((parts) => {
      const title = parts[1].trim();
      const description = parts[2].trim();
      const ageMatch =
        description.match(/\((~?\d+)\s+sessions?\)/i) ||
        description.match(/\((\d+)\s+sessions?\s+old\)/i);
      const ageSessions = ageMatch ? parseInt(ageMatch[1].replace('~', ''), 10) : null;
      return {
        title,
        description,
        raw: `**${title}** — ${description}`,
        ageSessions,
      };
    });
}

export function extractCurrentSessionIntent(markdown) {
  const match = String(markdown || '').match(/## Current Session Intent: Session \d+\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (!match) return '';
  return match[1].trim().replace(/\r?\n+/g, ' ');
}

/** Current checkbox inventory; unchecked does not imply execution authorization. */
export function parseCurrentTaskInventory(markdown) {
  const tasks = [];
  let section = null;
  let current = null;
  let currentSectionPresent = false;
  const lines = String(markdown || '').replace(/<!--[^]*?-->/g, comment => comment.replace(/[^\r\n]/g, '')).split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = /^Now(?:\s*\([^)]*\))?$/i.test(heading[1]) ? 'now'
        : /^Human Action Required$/i.test(heading[1]) ? 'human' : null;
      currentSectionPresent ||= section === 'now';
      current = null;
      continue;
    }
    if (!section) continue;
    const checkbox = line.match(/^\s*-\s+\[([ xX])\]\s*(.*)$/);
    if (checkbox) {
      current = null;
      if (checkbox[1] !== ' ') continue;
      const rawItem = checkbox[2].trim();
      const title = (rawItem.match(/\*\*(.+?)\*\*/)?.[1] || rawItem).replace(/\*\*/g, '').trim();
      current = { section, line: index + 1, title, rawItem };
      tasks.push(current);
    } else if (current && /^\s+\S/.test(line)) {
      current.rawItem += '\n' + line.trim();
    } else if (line.trim()) {
      current = null;
    }
  }
  return { format: currentSectionPresent ? 'checkbox' : 'absent', tasks,
    current: tasks.filter(task => task.section === 'now'),
    human: tasks.filter(task => task.section === 'human') };
}

export function currentTaskInventoryLabel(markdown) {
  const inventory = parseCurrentTaskInventory(markdown);
  return inventory.format === 'checkbox'
    ? `Open current tasks ${inventory.current.length} / Human-action entries ${inventory.human.length}`
    : 'Current task inventory unavailable';
}
