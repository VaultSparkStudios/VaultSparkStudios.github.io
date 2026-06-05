import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_SLUG_ALIASES = {
  website: ['vaultsparkstudios-website', 'vaultsparkstudios.github.io'],
  statsforge: ['statvault'],
  'the-living-protocol': ['living-protocol'],
  'football-gm': ['vaultspark-football-gm'],
};

function cleanSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^\/+|\/+$/g, '');
}

export function normalizeProjectSlug(value) {
  const cleaned = cleanSlug(value);
  if (!cleaned) return '';
  for (const [canonical, aliases] of Object.entries(PROJECT_SLUG_ALIASES)) {
    if (cleaned === canonical) return canonical;
    if (aliases.some((alias) => cleanSlug(alias) === cleaned)) return canonical;
  }
  return cleaned;
}

export function projectSlugCandidates(project) {
  const candidates = new Set();
  const push = (value) => {
    const normalized = normalizeProjectSlug(value);
    if (normalized) candidates.add(normalized);
  };

  push(project?.id);
  push(project?.slug);
  push(project?.githubRepo?.split('/').pop());
  push(project?.localFolder);
  (PROJECT_SLUG_ALIASES[normalizeProjectSlug(project?.id)] || []).forEach(push);

  return candidates;
}

export function matchesProjectSlug(project, slug) {
  const normalized = normalizeProjectSlug(slug);
  if (!normalized) return false;
  return projectSlugCandidates(project).has(normalized);
}

export function readPortfolioEvents(root) {
  // Single source of truth: the local per-repo events feed. The sibling
  // studio-ops copy is NOT read here — that introduces a CI/local divergence
  // (studio-ops is never checked out in Actions) which ships contracts whose
  // regeneration fails `build:check --check` on remote. Closeout autopilot
  // mirrors studio-ops/portfolio/events.ndjson → this file so the local copy
  // stays complete.
  const candidates = [
    path.join(root, 'portfolio', 'events.ndjson'),
  ];

  const seen = new Set();
  const rows = [];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const key = [
          parsed.ts || '',
          normalizeProjectSlug(parsed.slug),
          parsed.type || '',
          parsed.signal || '',
          parsed.note || '',
        ].join('::');
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(parsed);
      } catch {}
    }
  }

  rows.sort((a, b) => {
    const aTs = Date.parse(a?.ts || 0) || 0;
    const bTs = Date.parse(b?.ts || 0) || 0;
    return bTs - aTs;
  });

  return rows;
}
