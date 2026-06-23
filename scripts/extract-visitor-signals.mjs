#!/usr/bin/env node
// extract-visitor-signals.mjs — S134 follow-up.
//
// Pulls per-project signals that actually matter to a random visitor of the
// website (not IGNIS internals). Output is a normalized JSON consumed by the
// session agent to hand-write voice quotes with real personality.
//
// Visitor-facing signals:
//   - Activity recency: days since last commit, longest-streak month
//   - Shipping cadence: commits last 30d / last 7d
//   - Studio rank: where does this project sit in the activity leaderboard
//   - Catalog distinctness: only-of-genre / longest-running / newest
//   - Cross-project gravity: how many sibling READMEs reference this project
//   - Genre / type from registry
//
// Writes: .cache/visitor-signals.json
//
// Usage:
//   node scripts/extract-visitor-signals.mjs
//   node scripts/extract-visitor-signals.mjs --pretty

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devRoot = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');
const opsRoot = path.join(devRoot, 'vaultspark-studio-ops');

const args = new Set(process.argv.slice(2));
const pretty = args.has('--pretty');

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

const registry = readJSON(path.join(opsRoot, 'portfolio', 'PROJECT_REGISTRY.json'));
if (!registry?.projects) { console.error('no registry'); process.exit(1); }

// Build sibling list with localPath
const siblings = registry.projects
  .filter(p => p.localPath && fs.existsSync(p.localPath))
  .map(p => ({
    slug: p.slug,
    name: p.name,
    folder: path.basename(p.localPath),
    localPath: p.localPath,
    medium: p.medium || 'project',
    type: p.type || null,
    vaultStatus: (p.vaultStatus || 'forge').toString().toLowerCase(),
    audience: p.audience || null,
    summary: p.summary || null,
    runtimeUrl: p.runtimeUrl || null,
    lifecycle: p.lifecycle || null,
  }));

const today = new Date(); today.setUTCHours(0, 0, 0, 0);

function gitStats(dir) {
  if (!fs.existsSync(path.join(dir, '.git'))) return null;
  try {
    const allCommits = execSync(
      `git -C "${dir}" log --all --format="%cd" --date=short`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).split(/\r?\n/).filter(Boolean);
    if (!allCommits.length) return null;

    const allDates = allCommits;
    const lastCommitDate = allDates[0];
    const firstCommitDate = allDates[allDates.length - 1];

    const daysSinceLast = Math.floor(
      (today.getTime() - new Date(lastCommitDate + 'T00:00:00Z').getTime()) / 86_400_000
    );
    const firstCommitT = new Date(firstCommitDate + 'T00:00:00Z').getTime();
    const projectAgeDays = Math.floor((today.getTime() - firstCommitT) / 86_400_000);

    const last30 = allDates.filter(d =>
      (today.getTime() - new Date(d + 'T00:00:00Z').getTime()) <= 30 * 86_400_000
    );
    const last7 = allDates.filter(d =>
      (today.getTime() - new Date(d + 'T00:00:00Z').getTime()) <= 7 * 86_400_000
    );

    // Active days (distinct) in last 30
    const last30Days = new Set(last30).size;
    const last7Days = new Set(last7).size;

    // Peak day (most commits in a single day, all-time)
    const dayCounts = {};
    for (const d of allDates) dayCounts[d] = (dayCounts[d] || 0) + 1;
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalCommits: allDates.length,
      firstCommitDate, lastCommitDate,
      daysSinceLast,
      projectAgeDays,
      commitsLast30d: last30.length,
      commitsLast7d: last7.length,
      activeDaysLast30: last30Days,
      activeDaysLast7: last7Days,
      peakDay: peakDay ? peakDay[0] : null,
      peakDayCommits: peakDay ? peakDay[1] : 0,
    };
  } catch (e) {
    return { error: String(e.message || e).slice(0, 100) };
  }
}

// Count cross-project mentions in sibling READMEs
function buildCrossRefMap() {
  const refs = {};
  for (const s of siblings) refs[s.slug] = 0;
  for (const s of siblings) {
    const readme = readText(path.join(s.localPath, 'README.md'));
    if (!readme) continue;
    const text = readme.toLowerCase();
    for (const target of siblings) {
      if (target.slug === s.slug) continue;
      // Match name or slug — be lenient
      const nameTokens = [
        target.name,
        target.slug,
        target.slug.replace(/-/g, ' '),
      ].map(t => t.toLowerCase()).filter(t => t.length >= 4);
      if (nameTokens.some(t => text.includes(t))) refs[target.slug]++;
    }
  }
  return refs;
}

// ---------- run ----------
console.log(`extract-visitor-signals · ${siblings.length} projects`);
const crossRefs = buildCrossRefMap();

const enriched = siblings.map(s => {
  const git = gitStats(s.localPath);
  return {
    ...s,
    git,
    crossRefMentions: crossRefs[s.slug] || 0,
  };
});

// ---------- compute studio-wide ranks ----------
const sortedByLast30 = [...enriched]
  .filter(p => p.git && !p.git.error)
  .sort((a, b) => (b.git.commitsLast30d || 0) - (a.git.commitsLast30d || 0));
sortedByLast30.forEach((p, i) => { p.rank30dCommits = i + 1; });

const sortedByLast7 = [...enriched]
  .filter(p => p.git && !p.git.error)
  .sort((a, b) => (b.git.commitsLast7d || 0) - (a.git.commitsLast7d || 0));
sortedByLast7.forEach((p, i) => { p.rank7dCommits = i + 1; });

const sortedByAge = [...enriched]
  .filter(p => p.git && !p.git.error)
  .sort((a, b) => (b.git.projectAgeDays || 0) - (a.git.projectAgeDays || 0));
sortedByAge.forEach((p, i) => { p.rankByAge = i + 1; });

// Genre-distinctness — count of projects sharing same `medium`
const mediumCounts = {};
for (const p of enriched) mediumCounts[p.medium] = (mediumCounts[p.medium] || 0) + 1;
for (const p of enriched) {
  p.isUniqueMedium = mediumCounts[p.medium] === 1;
  p.mediumCount = mediumCounts[p.medium];
}

// Type-distinctness — flagged from registry.type[]
const typeCounts = {};
for (const p of enriched) {
  if (Array.isArray(p.type)) for (const t of p.type) typeCounts[t] = (typeCounts[t] || 0) + 1;
}
for (const p of enriched) {
  p.uniqueTypes = Array.isArray(p.type) ? p.type.filter(t => typeCounts[t] === 1) : [];
}

// ---------- output ----------
const studioTotals = {
  totalProjects: enriched.length,
  totalCommits30d: enriched.reduce((a, p) => a + (p.git?.commitsLast30d || 0), 0),
  totalCommits7d: enriched.reduce((a, p) => a + (p.git?.commitsLast7d || 0), 0),
  totalCommitsAllTime: enriched.reduce((a, p) => a + (p.git?.totalCommits || 0), 0),
  mediums: mediumCounts,
};

const out = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  studioTotals,
  projects: enriched.map(p => ({
    slug: p.slug,
    name: p.name,
    medium: p.medium,
    type: p.type,
    vaultStatus: p.vaultStatus,
    audience: p.audience,
    summary: p.summary,
    runtimeUrl: p.runtimeUrl,
    git: p.git,
    crossRefMentions: p.crossRefMentions,
    rank30dCommits: p.rank30dCommits,
    rank7dCommits: p.rank7dCommits,
    rankByAge: p.rankByAge,
    isUniqueMedium: p.isUniqueMedium,
    mediumCount: p.mediumCount,
    uniqueTypes: p.uniqueTypes,
  })),
};

fs.mkdirSync(path.join(repoRoot, '.cache'), { recursive: true });
const outPath = path.join(repoRoot, '.cache', 'visitor-signals.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, pretty ? 2 : 0));

console.log(`  → ${path.relative(repoRoot, outPath)}`);
console.log(`  studio totals: ${studioTotals.totalCommits30d} commits/30d · ${studioTotals.totalCommits7d} commits/7d · ${studioTotals.totalCommitsAllTime} all-time`);
console.log(`  most-shipped 7d: ${sortedByLast7[0]?.name} (${sortedByLast7[0]?.git?.commitsLast7d})`);
console.log(`  most-shipped 30d: ${sortedByLast30[0]?.name} (${sortedByLast30[0]?.git?.commitsLast30d})`);
console.log(`  oldest project: ${sortedByAge[0]?.name} (${sortedByAge[0]?.git?.projectAgeDays}d)`);
