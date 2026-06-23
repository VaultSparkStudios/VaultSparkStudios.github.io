#!/usr/bin/env node
// build-ecosystem-velocity.mjs — S134 + S136 upgrade
//
// Aggregates a Studio Ecosystem Velocity time series for /oracle/ from FIVE
// data sources (was 3 before S136 — current chart was missing today's work
// because registry-only scan missed unregistered repos + uncommitted activity):
//
//   1. IGNIS score-history (studio-wide composite cognition score)
//   2. Per-day commit counts across every sibling repo (committer date)
//   3. Per-day commit counts using AUTHOR date (catches today's local commits
//      even when the push lands tomorrow)
//   4. Uncommitted working-tree activity (modified file mtimes today —
//      counts as "today active" even without a commit)
//   5. Auto-discovery: scans dev folder for .git directories regardless of
//      registry membership (the registry has 28 projects but the dev folder
//      has 30+ — the previous version silently dropped unregistered repos)
//
// Plus:
//   - Active-sessions overlay from .session-lock files (sibling repos report
//     who's actively in a session right now)
//   - perRepo includes `workingChanges` count (uncommitted today)
//
// Writes ignis/output/ecosystem-velocity.json — same schema; chart code stays
// compatible. Idempotent. Read-only cross-repo (no writes outside this repo).

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devRoot = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');
const opsRoot = path.join(devRoot, 'vaultspark-studio-ops');

const args = process.argv.slice(2);
const DAYS = Number((args.find((a) => a.startsWith('--days=')) || '--days=60').split('=')[1]);

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

// ─── inputs ────────────────────────────────────────────────────────────────
const registry = readJSON(path.join(opsRoot, 'portfolio', 'PROJECT_REGISTRY.json'));
const ignisHistory = readJSON(path.join(repoRoot, 'ignis', 'output', 'score-history.json')) || [];
const pulse = readJSON(path.join(repoRoot, 'ignis', 'output', 'portfolio-pulse.json'));

// ─── repo discovery ────────────────────────────────────────────────────────
// Layer 1: registry-listed projects with localPath (canonical name + slug).
const siblings = new Map();
const registryByPath = new Map();
for (const p of registry?.projects ?? []) {
  if (!p.localPath) continue;
  registryByPath.set(path.resolve(p.localPath), { name: p.name, slug: p.slug });
}
function addRepo(dir, meta) {
  const abs = path.resolve(dir);
  if (siblings.has(abs)) return;
  if (!fs.existsSync(path.join(abs, '.git'))) return;
  siblings.set(abs, { dir: abs, ...meta });
}
for (const [abs, meta] of registryByPath) addRepo(abs, meta);

// Layer 2: auto-discover any sibling git repo in dev folder NOT in registry.
// S136: the chart was missing data because the registry was lagging behind
// the actual project list. This layer closes that gap.
try {
  for (const entry of fs.readdirSync(devRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const abs = path.join(devRoot, entry.name);
    if (siblings.has(abs)) continue;                  // already from registry
    if (!fs.existsSync(path.join(abs, '.git'))) continue;
    addRepo(abs, { name: entry.name, slug: entry.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') });
  }
} catch (e) {
  console.error('[autodiscover] failed:', e.message);
}

// ─── date grid ─────────────────────────────────────────────────────────────
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const days = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(today.getTime() - i * 86_400_000);
  days.push(d.toISOString().slice(0, 10));
}
const dayIndex = Object.fromEntries(days.map((d, i) => [d, i]));
const todayStr = days[days.length - 1];

// ─── commit aggregation (committer + author dates, deduped) ───────────────
const dailyCommits     = Object.fromEntries(days.map((d) => [d, 0]));
const dailyActiveRepos = Object.fromEntries(days.map((d) => [d, new Set()]));
const dailyWorking     = Object.fromEntries(days.map((d) => [d, new Set()])); // uncommitted today
const perRepoStats = {};

function gitLogLines(dir, since) {
  // Pull BOTH committer-date and author-date — covers commits that landed
  // remotely yesterday but were authored today (and vice versa). Dedup
  // happens at the day-of-activity layer (Sets).
  try {
    const cmd = `git -C "${dir}" log --since="${since}" --all --format="%cd|%ad" --date=short`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function workingTreeDirty(dir) {
  // Returns true if the working tree or index has any modifications.
  // Used to flag "active today" even when no commit landed yet.
  try {
    const status = execSync(`git -C "${dir}" status --porcelain=v1 -uno`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function workingTreeMtime(dir) {
  // Most-recently-modified file in working tree (best signal for "touched today"
  // when work hasn't been committed yet). Cheap: only scans 1 level + .git
  // index file.
  let latest = 0;
  try {
    const indexFile = path.join(dir, '.git', 'index');
    if (fs.existsSync(indexFile)) {
      latest = Math.max(latest, fs.statSync(indexFile).mtimeMs);
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      try {
        const st = fs.statSync(full);
        if (st.mtimeMs > latest) latest = st.mtimeMs;
      } catch {}
    }
  } catch {}
  return latest;
}

for (const [dir, meta] of siblings) {
  const lines = gitLogLines(dir, days[0]);
  const seen = new Set();      // dedup commits by their composite stamp
  const counts = {};
  for (const line of lines) {
    const [cdate, adate] = line.split('|');
    const stamp = `${cdate}|${adate}`;
    if (seen.has(stamp)) continue;
    seen.add(stamp);
    // Count the EARLIER of the two dates so today's local commits land on today
    const day = (adate && adate < cdate) ? adate : cdate;
    if (day in dailyCommits) {
      dailyCommits[day]++;
      dailyActiveRepos[day].add(meta.slug);
      counts[day] = (counts[day] || 0) + 1;
    }
  }

  // Working-tree activity — counts as "active today" without a commit.
  const dirty = workingTreeDirty(dir);
  if (dirty) {
    dailyWorking[todayStr].add(meta.slug);
    dailyActiveRepos[todayStr].add(meta.slug);
  }

  // File-mtime fallback: if the .git/index or top-level files were touched
  // today, count the repo as active even if `git status` returned clean.
  const mtimeMs = workingTreeMtime(dir);
  if (mtimeMs > 0) {
    const mtimeDay = new Date(mtimeMs).toISOString().slice(0, 10);
    if (mtimeDay in dailyActiveRepos) {
      dailyActiveRepos[mtimeDay].add(meta.slug);
    }
  }

  perRepoStats[meta.slug] = {
    name: meta.name,
    totalCommits: Object.values(counts).reduce((a, b) => a + b, 0),
    activeDays: Object.keys(counts).length,
    workingChanges: dirty,
    lastMtime: mtimeMs > 0 ? new Date(mtimeMs).toISOString() : null,
  };
}

const dailyActiveRepoCount = {};
for (const d of days) dailyActiveRepoCount[d] = dailyActiveRepos[d].size;
const dailyWorkingCount = {};
for (const d of days) dailyWorkingCount[d] = dailyWorking[d].size;

// ─── active sessions overlay ──────────────────────────────────────────────
// Scan dev folder for .session-lock files — each represents a currently-open
// session in a sibling repo. Powers the "live session count" hint on the
// chart's "Active today" panel.
const liveSessions = [];
for (const [dir, meta] of siblings) {
  const lockPath = path.join(dir, 'context', '.session-lock');
  if (fs.existsSync(lockPath)) {
    try {
      const txt = fs.readFileSync(lockPath, 'utf8');
      liveSessions.push({ slug: meta.slug, lock: txt.trim().slice(0, 200) });
    } catch {}
  }
}

// ─── IGNIS score series ────────────────────────────────────────────────────
const sortedHistory = [...ignisHistory].sort((a, b) =>
  String(a.timestamp).localeCompare(String(b.timestamp)));
const ignisByDate = {};
const firstIgnisDate = sortedHistory[0]?.timestamp?.slice(0, 10);
for (const entry of sortedHistory) {
  const date = entry.timestamp?.slice(0, 10);
  if (!date) continue;
  ignisByDate[date] = entry.iqScore;
}
let fillScore = null;
const ignisSeries = days.map((d) => {
  if (firstIgnisDate && d < firstIgnisDate) return null;
  if (ignisByDate[d] != null) fillScore = ignisByDate[d];
  return fillScore;
});

// ─── rollups ──────────────────────────────────────────────────────────────
const commitSeries = days.map((d) => dailyCommits[d]);
const activeRepoSeries = days.map((d) => dailyActiveRepoCount[d]);
const workingSeries = days.map((d) => dailyWorkingCount[d]);
const totalCommits = commitSeries.reduce((a, b) => a + b, 0);
const peakDay = days[commitSeries.indexOf(Math.max(...commitSeries))];
const ignisKnown = ignisSeries.filter((x) => x != null);
const ignisMin = ignisKnown.length ? Math.min(...ignisKnown) : null;
const ignisMax = ignisKnown.length ? Math.max(...ignisKnown) : null;
const ignisFirstKnown = ignisKnown[0] ?? null;
const ignisLastKnown = ignisKnown[ignisKnown.length - 1] ?? null;
const ignisDelta = (ignisFirstKnown != null && ignisLastKnown != null)
  ? ignisLastKnown - ignisFirstKnown : 0;

// ─── output ───────────────────────────────────────────────────────────────
const out = {
  schemaVersion: '1.1',                                 // bumped — adds workingSeries
  generatedAt: new Date().toISOString(),
  rangeDays: DAYS,
  startDate: days[0],
  endDate: days[days.length - 1],
  ecosystem: {
    totalRepos: siblings.size,
    totalCommits,
    peakCommitDay: peakDay,
    peakCommitCount: Math.max(...commitSeries),
    ignisStart: ignisFirstKnown,
    ignisEnd: ignisLastKnown,
    ignisMin, ignisMax,
    ignisDelta,
    healthDistribution: pulse?.healthDistribution || null,
    activeRepoToday:  dailyActiveRepoCount[todayStr],
    workingRepoToday: dailyWorkingCount[todayStr],
    liveSessions:     liveSessions.length,
  },
  series: {
    dates: days,
    commits: commitSeries,
    activeRepos: activeRepoSeries,
    workingRepos: workingSeries,                        // NEW: uncommitted-only daily count
    ignis: ignisSeries,
  },
  liveSessions,
  perRepo: perRepoStats,
};

const outPath = path.join(repoRoot, 'ignis', 'output', 'ecosystem-velocity.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`✓ ecosystem-velocity → ${path.relative(repoRoot, outPath)}`);
console.log(`  range:   ${out.startDate} → ${out.endDate}  (${DAYS}d)`);
console.log(`  repos:   ${siblings.size} sibling git repos scanned (${registryByPath.size} registered, ${siblings.size - registryByPath.size} auto-discovered)`);
console.log(`  commits: ${totalCommits} total · peak ${out.ecosystem.peakCommitCount} on ${peakDay}`);
console.log(`  today:   ${out.ecosystem.activeRepoToday} active · ${out.ecosystem.workingRepoToday} with uncommitted changes · ${liveSessions.length} live sessions`);
console.log(`  ignis:   ${ignisFirstKnown ?? '—'} → ${ignisLastKnown ?? '—'}  (delta ${ignisDelta >= 0 ? '+' : ''}${ignisDelta})`);
