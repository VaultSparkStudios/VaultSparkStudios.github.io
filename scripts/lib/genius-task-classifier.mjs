/**
 * True only for consolidated carry-forward meta rows, never for an ordinary
 * actionable task whose explanation happens to use the word "carry".
 */
export function isConsolidatedCarryItem(task) {
  const text = String(task || '').trim();
  if (!text) return false;

  const tags = [...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1].trim());
  if (tags.some((tag) => /^(?:followup\s+)?carry(?:[ -]?forward)?$/i.test(tag))) return true;

  const subject = text
    .replace(/^(?:\[[^\]]+\]\s*)+/, '')
    .split(/\s+—\s+/)[0]
    .trim();
  return /^(?:consolidated\s+carry|carry[ -]?forward)\b/i.test(subject);
}
