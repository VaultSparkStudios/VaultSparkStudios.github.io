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

export function parseHumanItems(markdown) {
  const section = extractSection(markdown, 'Human Action Required');
  if (!section) return [];

  const results = [];
  for (const line of section.split(/\r?\n/)) {
    // Must be an open checkbox
    if (!/^- \[ \]/.test(line)) continue;

    const body = line.replace(/^- \[ \]\s*/, '');

    // Extract first **…** block as the title tag (e.g. "[WEB3FORMS]")
    const tagMatch = body.match(/^\*\*(.+?)\*\*/);
    const rawTag = tagMatch ? tagMatch[1].trim() : '';

    // Description: everything after the last ` — ` separator, or the full body
    const dashIdx = body.lastIndexOf(' — ');
    const description = dashIdx !== -1 ? body.slice(dashIdx + 3).trim() : body;

    // Build a clean title: tag + any text between the closing ** and the first —
    let title = rawTag;
    if (tagMatch) {
      const afterTag = body.slice(tagMatch[0].length).replace(/^ — .*$/, '').replace(/ — .*$/, '').trim();
      if (afterTag) title = `${rawTag} ${afterTag}`;
    }
    if (!title) title = body.split(' — ')[0].replace(/\*\*/g, '').trim();

    const ageMatch =
      description.match(/\((~?\d+)\s+sessions?\)/i) ||
      description.match(/\((\d+)\s+sessions?\s+old\)/i);
    const ageSessions = ageMatch ? parseInt(ageMatch[1].replace('~', ''), 10) : null;

    results.push({ title, description, raw: body, ageSessions });
  }
  return results;
}

export function extractCurrentSessionIntent(markdown) {
  const match = String(markdown || '').match(/## Current Session Intent: Session \d+\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (!match) return '';
  return match[1].trim().replace(/\r?\n+/g, ' ');
}
