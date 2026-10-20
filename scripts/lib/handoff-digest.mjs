import crypto from 'node:crypto';
import { parseHandoffBlocks } from './handoff-blocks.mjs';

// Extract source text, never infer completion or hide omitted sections. The
// source hash makes cached extracts valid until their input actually changes.
export function handoffDigest(source, { maxChars = 6000 } = {}) {
  const text = String(source).replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  const lines = text.split('\n');
  const structural = parseHandoffBlocks(text);
  const sections = lines.flatMap((line, i) => /^(?:#{1,3}\s|\*\*Session\s)/.test(line)
    ? [{ line: i + 1, heading: line }] : []);
  const prefix = `<!-- generated-by: scripts/compact-handoff.mjs deterministic-v1 -->\n<!-- source-hash: ${hash} -->\n\n# LATEST_HANDOFF (source extract)\n\n`;
  if (prefix.length + text.length <= maxChars) return { hash, digest: prefix + text, omitted: false };
  const index = sections.map(s => `- L${s.line}: ${s.heading.replace(/^#+\s*/, '')}`).join('\n');
  const footer = `\n\n## Source lookup\n\nExtract is incomplete. Read context/LATEST_HANDOFF.md at the indicated lines before acting on omitted work or approvals. Full file: ${lines.length} lines; ${structural.length} typed handoff blocks.\n${index}\n`;
  // Reserve room for a useful lookup even if a malformed input has thousands of headings.
  const indexBudget = Math.min(Math.floor(maxChars / 2), footer.length);
  const lookup = footer.length <= indexBudget ? footer : footer.slice(0, indexBudget - 80).trimEnd() + '\nAdditional headings omitted; read the full source.\n';
  const budget = Math.max(0, maxChars - prefix.length - lookup.length - 2);
  const candidate = text.slice(0, budget);
  const excerpt = candidate.slice(0, Math.max(0, candidate.lastIndexOf('\n')));
  return { hash, digest: prefix + excerpt + lookup, omitted: true, keptChars: excerpt.length, sourceChars: text.length };
}

// Measure what the extract leaves out across handoff versions, before anyone
// decides to grow maxChars. "newestCut" is the costly case: the newest session
// itself did not fit, so the next session starts from a partial account of it.
export function measureOmissions(sources, options = {}) {
  const rows = sources.map(source => {
    const text = String(source).replace(/\r\n/g, '\n');
    const result = handoffDigest(source, options);
    const kept = result.omitted ? result.keptChars : text.length;
    const boundaries = [...text.matchAll(/^## Where We Left Off/gm)].map(m => m.index);
    const newestEnd = boundaries.length > 1 ? boundaries[1] : text.length;
    return { chars: text.length, omitted: result.omitted, omittedChars: text.length - kept, newestCut: result.omitted && kept < newestEnd };
  });
  const omitted = rows.filter(r => r.omitted);
  const sorted = omitted.map(r => r.omittedChars).sort((a, b) => a - b);
  return {
    versions: rows.length,
    omitted: omitted.length,
    newestCut: rows.filter(r => r.newestCut).length,
    omittedChars: { median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0, max: sorted.length ? sorted[sorted.length - 1] : 0 },
    maxSourceChars: Math.max(0, ...rows.map(r => r.chars)),
  };
}
