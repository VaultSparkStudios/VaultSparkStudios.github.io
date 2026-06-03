/**
 * perf-forensics.mjs (S172 audit #3 · perf-forensic-commit-correlator)
 *
 * Joins the two halves of regression forensics that already exist but never
 * met: `data/perf-history.ndjson` rows carry timestamps per (route × profile),
 * and git history knows which commits touched perf-relevant surfaces. Given an
 * over-budget group, this module finds the last-good → first-bad window and
 * names the commits inside it that plausibly moved the metric — so a fix
 * recipe says "suspect these 4 commits" instead of "go bisect".
 *
 * S160 context: the / LCP regression burned a full manual bisect plan
 * (revert nav-sheet → re-trace → suspect account-chip → ...). This automates
 * exactly that first step.
 *
 * Pure functions + injected git runner → unit-testable without a repo.
 */
import { execFileSync } from 'node:child_process';

/** Paths whose changes can plausibly move LCP/CLS on any route. */
const PERF_SURFACES = [
  /^assets\//,
  /^index\.html$/,
  /\/index\.html$/,
  /^scripts\/build-ambient-bundle\.mjs$/,
  /^scripts\/build-shell-assets\.mjs$/,
  /^scripts\/inject-pre-paint-stage\.mjs$/,
  /^scripts\/inject-lqip\.mjs$/,
  /^cloudflare\//,
];

/**
 * Find the regression window for one (route, profile) from history rows.
 * Returns { lastGood, firstBad } entries or null when no transition exists
 * (e.g. the route was always over budget in the available history).
 */
export function findRegressionWindow(history, { route, profile, lcpBudget }) {
  const rows = history
    .filter((r) => r.route === route && r.profile === profile && Number.isFinite(r.lcp))
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  if (rows.length < 2) return null;

  let lastGood = null;
  let firstBad = null;
  for (const row of rows) {
    if (row.lcp <= lcpBudget) {
      lastGood = row;
      firstBad = null; // regression must come AFTER the most recent good sample
    } else if (lastGood && !firstBad) {
      firstBad = row;
    }
  }
  if (!lastGood || !firstBad) return null;
  return { lastGood, firstBad };
}

/** True when a changed file path is a plausible perf surface for the route. */
export function isPerfSurface(file, route) {
  if (PERF_SURFACES.some((re) => re.test(file))) return true;
  // The route's own page file (e.g. membership/index.html for /membership/)
  const routePage = route === '/' ? 'index.html' : `${route.replace(/^\/|\/$/g, '')}/index.html`;
  return file === routePage;
}

/**
 * List commits between two ISO timestamps that touched perf surfaces.
 * gitRunner is injectable for tests; defaults to real git.
 */
export function suspectCommits({ sinceIso, untilIso, route, gitRunner = defaultGitRunner, limit = 12 }) {
  const raw = gitRunner(sinceIso, untilIso);
  const commits = [];
  let current = null;
  for (const line of raw.split('\n')) {
    const head = line.match(/^([0-9a-f]{7,40})\x1f(.*)\x1f(.*)$/);
    if (head) {
      if (current && current.files.length) commits.push(current);
      current = { sha: head[1].slice(0, 12), ts: head[2], subject: head[3].slice(0, 100), files: [] };
    } else if (current && line.trim()) {
      const file = line.trim();
      if (isPerfSurface(file, route)) current.files.push(file);
    }
  }
  if (current && current.files.length) commits.push(current);
  return commits.slice(0, limit).map((c) => ({
    sha: c.sha,
    ts: c.ts,
    subject: c.subject,
    perfSurfaces: c.files.slice(0, 8),
  }));
}

function defaultGitRunner(sinceIso, untilIso) {
  try {
    return execFileSync('git', [
      'log',
      `--since=${sinceIso}`,
      `--until=${untilIso}`,
      '--name-only',
      '--no-merges',
      `--format=%H\x1f%cI\x1f%s`,
    ], { encoding: 'utf8', timeout: 30000 });
  } catch {
    return '';
  }
}

/**
 * Full correlation for one over-budget group. Returns a forensics block for
 * the fix recipe, or a reason string when correlation isn't possible.
 */
export function correlate({ history, route, profile, lcpBudget, gitRunner }) {
  const window = findRegressionWindow(history, { route, profile, lcpBudget });
  if (!window) {
    return { available: false, reason: 'no good→bad transition in history window (route may be persistently over budget or under-sampled)' };
  }
  const suspects = suspectCommits({
    sinceIso: window.lastGood.ts,
    untilIso: window.firstBad.ts,
    route,
    gitRunner,
  });
  return {
    available: true,
    lastGood: { ts: window.lastGood.ts, lcp: window.lastGood.lcp, session: window.lastGood.session || null },
    firstBad: { ts: window.firstBad.ts, lcp: window.firstBad.lcp, session: window.firstBad.session || null },
    suspectCommits: suspects,
    note: suspects.length
      ? `${suspects.length} commit(s) touched perf surfaces inside the regression window — start the bisect there.`
      : 'no perf-surface commits in the window — suspect infra/cache-state (shell-hash rotation, Worker deploy) rather than product code.',
  };
}

/** Self-test — pure-function checks with injected fixtures. */
export function selfTest() {
  const hist = [
    { route: '/', profile: 'desktop', ts: '2026-05-01T00:00:00Z', lcp: 1200 },
    { route: '/', profile: 'desktop', ts: '2026-05-02T00:00:00Z', lcp: 1400 },
    { route: '/', profile: 'desktop', ts: '2026-05-03T00:00:00Z', lcp: 9000 },
    { route: '/', profile: 'desktop', ts: '2026-05-04T00:00:00Z', lcp: 9500 },
    { route: '/x/', profile: 'desktop', ts: '2026-05-03T00:00:00Z', lcp: 800 },
  ];
  const w = findRegressionWindow(hist, { route: '/', profile: 'desktop', lcpBudget: 2500 });
  if (!w || w.lastGood.lcp !== 1400 || w.firstBad.lcp !== 9000) throw new Error('window detection failed');

  const none = findRegressionWindow(hist, { route: '/x/', profile: 'desktop', lcpBudget: 2500 });
  if (none !== null) throw new Error('single-sample route must yield null window');

  const allBad = findRegressionWindow(
    [{ route: '/y/', profile: 'desktop', ts: '2026-05-01T00:00:00Z', lcp: 9000 },
     { route: '/y/', profile: 'desktop', ts: '2026-05-02T00:00:00Z', lcp: 9100 }],
    { route: '/y/', profile: 'desktop', lcpBudget: 2500 });
  if (allBad !== null) throw new Error('persistently-bad route must yield null window');

  if (!isPerfSurface('assets/nav-sheet.js', '/')) throw new Error('assets must be a perf surface');
  if (!isPerfSurface('membership/index.html', '/membership/')) throw new Error('route page must be a perf surface');
  if (isPerfSurface('docs/NOTES.md', '/')) throw new Error('docs must not be a perf surface');

  const fakeGit = () => [
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\x1f2026-05-02T12:00:00Z\x1ffeat: heavy hero',
    'assets/hero.js',
    'docs/why.md',
    '',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\x1f2026-05-02T13:00:00Z\x1fdocs only',
    'docs/other.md',
  ].join('\n');
  const sus = suspectCommits({ sinceIso: '2026-05-02T00:00:00Z', untilIso: '2026-05-03T00:00:00Z', route: '/', gitRunner: fakeGit });
  if (sus.length !== 1 || sus[0].sha !== 'aaaaaaaaaaaa' || sus[0].perfSurfaces[0] !== 'assets/hero.js') {
    throw new Error('suspect filtering failed');
  }

  const corr = correlate({ history: hist, route: '/', profile: 'desktop', lcpBudget: 2500, gitRunner: fakeGit });
  if (!corr.available || corr.suspectCommits.length !== 1) throw new Error('correlate end-to-end failed');
  return 7;
}
