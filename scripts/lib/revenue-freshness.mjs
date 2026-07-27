import fs from 'node:fs';
import path from 'node:path';

export const REVENUE_WARN_DAYS = 7;
export const REVENUE_CRITICAL_DAYS = 14;

export function parseRevenueGeneratedDate(content) {
  return String(content || '').match(/Generated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

export function evaluateRevenueFreshness({ content = '', sourcePath = null, today = new Date().toISOString().slice(0, 10) } = {}) {
  const genDate = parseRevenueGeneratedDate(content);
  const ageDays = genDate
    ? Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${genDate}T00:00:00Z`)) / 86400000))
    : null;
  const stale = ageDays === null || ageDays >= REVENUE_WARN_DAYS;
  const critical = ageDays === null || ageDays >= REVENUE_CRITICAL_DAYS;
  return {
    genDate,
    ageDays,
    stale,
    critical,
    available: Boolean(genDate),
    status: critical ? 'critical' : stale ? 'stale' : 'fresh',
    signal: critical ? '⛔' : stale ? '⚠' : '✓',
    sourcePath,
  };
}

export function resolveRevenueFreshnessFromCandidates(candidates, { today } = {}) {
  const selected = candidates.find((candidate) => String(candidate?.content || '').trim()) ?? null;
  return evaluateRevenueFreshness({
    content: selected?.content ?? '',
    sourcePath: selected?.path ?? null,
    today,
  });
}

export function revenueSignalCandidates(root) {
  return [
    path.join(root, 'portfolio', 'REVENUE_SIGNALS.md'),
    path.resolve(root, '..', 'vaultspark-studio-ops', 'portfolio', 'REVENUE_SIGNALS.md'),
  ];
}

export function resolveRevenueFreshness(root, { today } = {}) {
  const candidates = revenueSignalCandidates(root).map((candidatePath) => {
    try {
      return { path: candidatePath, content: fs.readFileSync(candidatePath, 'utf8') };
    } catch {
      return { path: candidatePath, content: '' };
    }
  });
  return resolveRevenueFreshnessFromCandidates(candidates, { today });
}
