#!/usr/bin/env node
/**
 * build-studio-timeline.mjs — Build `api/studio-timeline.json`, the studio-wide
 * "Last 7 days in the studio" feed rendered on /studio-pulse/.
 *
 * Merges two public-safe sources:
 *   github   — commits on the VaultSparkStudios org's PUBLIC, non-fork repos
 *              (GitHub REST API; GITHUB_TOKEN / GH_TOKEN when present, else
 *              unauthenticated). Automation is classified STRUCTURALLY — bot
 *              author, skip-ci token, merge commit — never by a subject list.
 *   desk     — Desk editions from api/news-desk.json cards.
 *
 * PRIVACY (CANON-028 Founder Identity Privacy). A third source used to merge
 * work-session closeouts from portfolio/events.ndjson, emitting rows like
 * "Studio Website · Session 356 closed" stamped to the minute. That published
 * when a private individual was working, day after day, and was removed as a
 * privacy incident. Do not re-add a session source: the validator now REJECTS
 * session rows so a stale published feed fails the gate instead of rendering.
 * Commits are the public evidence of work; they are the author's own published
 * artifacts, not a derived schedule.
 *
 * Honest-dark (CANON-031): a source that cannot be read is recorded in
 * sources[].state ('ok' | 'partial' | 'unavailable') with a public-safe reason.
 * Nothing is ever fabricated to fill a gap.
 *
 * Public-safety: only repos that map to a public catalog item (or the studio
 * website) are named; commits and sessions for any other repo/slug are counted
 * in `withheld` and never emitted as rows. Subjects are first-line only, with
 * URLs, emails, backtick spans, token-like strings, and skip-ci tokens removed.
 *
 * Writes only when content changes (generatedAt/windowStart excluded), so the
 * 4-hourly refresh does not commit + deploy an otherwise identical feed. The
 * client re-filters the window against the viewer's clock.
 *
 * Usage: node scripts/build-studio-timeline.mjs [--check | --dry-run | --self-test]
 *   (no flag)   collect live + write api/studio-timeline.json if content changed
 *   --check     validate the committed file's shape + public-safety invariants
 *               (live network output is not reproducible, so it is not diffed)
 *   --dry-run   collect live, print counts only, write nothing
 *   --self-test fixture tests, no network
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { matchesProjectSlug, normalizeProjectSlug } from './lib/public-activity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'studio-timeline.json');
const ORG = 'VaultSparkStudios';
const MS_DAY = 86_400_000;
export const WINDOW_DAYS = 7;
export const MAX_ITEMS = 80;
const REQUEST_TIMEOUT_MS = 10_000;
const DEADLINE_MS = 60_000;
const TITLE_MAX = 110;

// ── Commit pagination budget ────────────────────────────────────────────────
// GitHub caps /commits at 100 per page. This repo alone lands ~500 commits in a
// 7-day window (the overwhelming majority [skip ci] publisher beacons), so ONE
// page covers barely a day: a single-page fetch silently undercounts the window
// and publishes the undercount as state:'ok'. We walk pages until the window is
// provably covered (a short page, or a page entirely older than the window) and
// mark the source 'partial'/'truncated' when the budget runs out first — never a
// silent undercount. Budgets bound rate-limit exposure: 8 pages/repo (≤800
// commits) and 40 pages studio-wide per run.
export const COMMIT_PAGE_BUDGET_PER_REPO = 8;
export const COMMIT_PAGE_BUDGET_TOTAL = 40;
const COMMITS_PER_PAGE = 100;

// Future-dated rows are clock skew, not news. The tolerance must match the row's
// PRECISION: a minute-precision row (a commit) can only be ahead
// by clock skew, while a day-precision row (a Desk edition stamped at UTC
// midnight) is legitimately "ahead" for any viewer west of UTC. A flat 1-day
// slack on everything let a mis-stamped commit a full day in the future through.
const FUTURE_SLACK_MS = { minute: 3_600_000, day: MS_DAY };
export function futureSlackMs(precision) {
  return FUTURE_SLACK_MS[precision] ?? FUTURE_SLACK_MS.minute;
}

const KINDS = new Set(['commit', 'edition']);
const SOURCE_IDS = ['github', 'desk'];
// Retired row kind. Kept as an explicit denylist so a stale published feed (or a
// reintroduced source) is REJECTED with a privacy-specific message rather than a
// vague "kind invalid" (CANON-028).
const BANNED_KINDS = new Set(['session']);
const STATES = new Set(['ok', 'partial', 'unavailable']);
const TOP_KEYS = ['schemaVersion', 'generatedAt', 'generatedBy', 'publicSafe', 'windowDays', 'windowStart', 'sources', 'summary', 'items'];

// ── Structural automation classification ────────────────────────────────────
const SKIP_CI_SOURCE = String.raw`\[(?:skip ci|ci skip|no ci|skip actions|actions skip)\]|\*\*\*NO_CI\*\*\*`;
const SKIP_CI_RE = new RegExp(SKIP_CI_SOURCE, 'i');
const SKIP_CI_RE_G = new RegExp(SKIP_CI_SOURCE, 'gi');

/** → 'skip-ci' | 'merge' | 'bot' | null (null = human work). */
export function automationReason(commit) {
  const message = commit?.commit?.message || '';
  // Any skip-ci token anywhere in the message (body included) marks a publisher commit.
  if (SKIP_CI_RE.test(message)) return 'skip-ci';
  if (Array.isArray(commit?.parents) && commit.parents.length > 1) return 'merge';
  if (commit?.author?.type === 'Bot') return 'bot';
  const identities = [commit?.author?.login, commit?.commit?.author?.name, commit?.commit?.author?.email];
  if (identities.some((v) => /\[bot\]/i.test(String(v || '')))) return 'bot';
  return null;
}

const MOVE_LABELS = {
  feat: 'Feature', fix: 'Fix', perf: 'Speed', docs: 'Docs', refactor: 'Refactor', test: 'Tests',
  chore: 'Upkeep', ci: 'Pipeline', style: 'Polish', build: 'Build', revert: 'Revert', security: 'Security',
};

/** First line only; strips secrets-shaped content; returns { move, title }. */
export function sanitizeSubject(message) {
  let s = String(message || '').split(/\r?\n/)[0];
  let move = 'Change';
  const conventional = s.match(/^([a-z]+)(?:\([^)]*\))?!?:\s*/i);
  if (conventional) {
    move = MOVE_LABELS[conventional[1].toLowerCase()] || 'Change';
    s = s.slice(conventional[0].length);
  }
  s = s
    .replace(SKIP_CI_RE_G, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[\s:;,·—-]+$/u, '')
    .trim();
  if (s.length > TITLE_MAX) s = s.slice(0, TITLE_MAX - 1).trimEnd() + '…';
  return { move, title: s || 'Untitled change' };
}

/** Public name for a GitHub repo, or null (withheld). */
export function publicRepoName(repoFullName, registry, catalog) {
  const full = String(repoFullName || '').toLowerCase();
  const short = full.split('/').pop();
  const entry = (registry || []).find((p) => p && String(p.githubRepo || '').toLowerCase() === full)
    || (registry || []).find((p) => p && p.id && matchesProjectSlug(p, short))
    || null;
  const id = entry ? normalizeProjectSlug(entry.id) : normalizeProjectSlug(short);
  if (id === 'website') return 'Studio Website';
  const item = (catalog || []).find((c) => c && c.id && matchesProjectSlug({ id: c.id }, id));
  return item ? item.name : null;
}

/** Commit timestamp in ms, or NaN when neither date parses. */
function commitTime(commit) {
  const at = Date.parse(commit?.commit?.committer?.date || commit?.commit?.author?.date || '');
  return Number.isFinite(at) ? at : NaN;
}

/**
 * Walk /repos/:full/commits pages until the 7-day window is provably covered or
 * the page budget runs out. GitHub returns newest-first, so a SHORT page (fewer
 * than per_page rows) or a page whose every commit predates the window means we
 * have seen the whole window. Anything else with budget exhausted is truncation
 * and must be reported, not swallowed.
 *
 * → { commits, truncated, pagesUsed }
 */
export async function collectRepoCommits({ repoFullName, sinceIso, since, fetchJson, pageBudget = COMMIT_PAGE_BUDGET_PER_REPO }) {
  const commits = [];
  let pagesUsed = 0;
  let truncated = false;
  for (let page = 1; ; page += 1) {
    if (pagesUsed >= pageBudget) { truncated = true; break; }
    const batch = await fetchJson(`/repos/${repoFullName}/commits?since=${encodeURIComponent(sinceIso)}&per_page=${COMMITS_PER_PAGE}&page=${page}`);
    pagesUsed += 1;
    if (!Array.isArray(batch)) throw Object.assign(new Error('unexpected commit listing'), { status: 'shape' });
    commits.push(...batch);
    if (batch.length < COMMITS_PER_PAGE) break;                          // window fully covered
    if (batch.every((c) => !(commitTime(c) >= since))) break;            // already past the window
  }
  return { commits, truncated, pagesUsed };
}

function errorReason(error) {
  if (error?.rateLimited) return 'rate-limited';
  if (error?.status) return `http-${error.status}`;
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  return 'network';
}

// ── Sources ─────────────────────────────────────────────────────────────────
export async function collectGithub({
  now, fetchJson, registry, catalog, deadlineMs = DEADLINE_MS,
  commitPageBudget = COMMIT_PAGE_BUDGET_PER_REPO,
  commitPageBudgetTotal = COMMIT_PAGE_BUDGET_TOTAL,
}) {
  const sinceIso = new Date(now - WINDOW_DAYS * MS_DAY).toISOString();
  const source = { id: 'github', label: 'Public GitHub commits', state: 'ok', reason: null, reposScanned: 0, kept: 0, automationFiltered: 0, withheld: 0, truncated: 0, commitPages: 0 };
  const items = [];
  const started = Date.now();
  let repos = [];
  // VaultSparkStudios is a GitHub USER account, not an org: /orgs/… answers 404.
  // Try the user listing first and fall back to the org listing only on 404, so
  // an account-type change never silently darkens the source.
  const listings = [
    (page) => `/users/${ORG}/repos?type=owner&sort=pushed&per_page=100&page=${page}`,
    (page) => `/orgs/${ORG}/repos?type=public&sort=pushed&per_page=100&page=${page}`,
  ];
  let lastError = null;
  for (const listing of listings) {
    repos = [];
    lastError = null;
    try {
      for (let page = 1; page <= 3; page += 1) {
        const batch = await fetchJson(listing(page));
        if (!Array.isArray(batch)) throw Object.assign(new Error('unexpected repo listing'), { status: 'shape' });
        repos.push(...batch);
        if (batch.length < 100) break;
      }
      break;
    } catch (error) {
      lastError = error;
      if (error?.status !== 404) break;
    }
  }
  if (lastError) return { source: { ...source, state: 'unavailable', reason: errorReason(lastError) }, items: [] };
  const since = Date.parse(sinceIso);
  repos = repos.filter((r) => r && r.private === false && !r.fork && Date.parse(r.pushed_at || 0) >= since);
  // Truncation is honest-dark, not an error: an explicit error reason (rate limit,
  // timeout, HTTP) always outranks it, but truncation must never be silent.
  const markTruncated = () => {
    source.state = 'partial';
    if (!source.reason) source.reason = 'truncated';
  };
  let pagesLeft = commitPageBudgetTotal;
  for (let index = 0; index < repos.length; index += 1) {
    const repo = repos[index];
    if (Date.now() - started > deadlineMs) { source.state = 'partial'; source.reason = 'deadline'; break; }
    if (pagesLeft <= 0) {
      // Studio-wide budget gone: every remaining repo is unscanned, not empty.
      source.truncated += repos.length - index;
      markTruncated();
      break;
    }
    let page;
    try {
      page = await collectRepoCommits({
        repoFullName: repo.full_name, sinceIso, since, fetchJson,
        pageBudget: Math.min(commitPageBudget, pagesLeft),
      });
    } catch (error) {
      pagesLeft -= 1; // the failed request still consumed rate-limit budget
      source.state = 'partial';
      source.reason = errorReason(error);
      if (error?.rateLimited) break;
      continue;
    }
    pagesLeft -= page.pagesUsed;
    source.commitPages += page.pagesUsed;
    if (page.truncated) { source.truncated += 1; markTruncated(); }
    source.reposScanned += 1;
    const name = publicRepoName(repo.full_name, registry, catalog);
    for (const c of page.commits) {
      if (automationReason(c)) { source.automationFiltered += 1; continue; }
      const at = commitTime(c);
      if (!Number.isFinite(at) || at < since || at > now + futureSlackMs('minute')) continue;
      if (!name) { source.withheld += 1; continue; }
      const { move, title } = sanitizeSubject(c.commit.message);
      const url = typeof c.html_url === 'string' && c.html_url.startsWith(`https://github.com/${ORG}/`) ? c.html_url : null;
      items.push({ id: `commit:${String(repo.name).toLowerCase()}:${String(c.sha || '').slice(0, 12)}`, kind: 'commit', at: new Date(at).toISOString(), precision: 'minute', project: name, move, title, url });
    }
  }
  source.kept = items.length;
  return { source, items };
}

export function collectDesk({ now, desk }) {
  const source = { id: 'desk', label: 'The Desk editions', state: 'ok', reason: null, kept: 0 };
  if (!desk) return { source: { ...source, state: 'unavailable', reason: 'feed-absent' }, items: [] };
  if (desk.publicSafe !== true || !Array.isArray(desk.cards)) return { source: { ...source, state: 'unavailable', reason: 'not-public-safe' }, items: [] };
  const sinceDay = new Date(now - WINDOW_DAYS * MS_DAY).toISOString().slice(0, 10);
  const items = [];
  for (const card of desk.cards) {
    if (!card || !/^\d{4}-\d{2}-\d{2}$/.test(card.date || '') || card.date < sinceDay) continue;
    const at = Date.parse(`${card.date}T00:00:00.000Z`);
    if (!Number.isFinite(at) || at > now + futureSlackMs('day')) continue;
    const { title } = sanitizeSubject(card.headline);
    items.push({ id: `edition:${card.date}:${String(card.slug || '').slice(0, 80)}`, kind: 'edition', at: new Date(at).toISOString(), precision: 'day', project: 'The Desk', move: 'Edition', title, url: typeof card.href === 'string' && card.href.startsWith('/news/') ? card.href : null });
  }
  source.kept = items.length;
  return { source, items };
}

export function buildTimeline({ now, parts }) {
  const byId = new Map();
  for (const part of parts) for (const item of part.items) byId.set(item.id, item);
  const all = [...byId.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const sources = SOURCE_IDS.map((id) => parts.find((p) => p.source.id === id)?.source
    || { id, label: id, state: 'unavailable', reason: 'not-collected', kept: 0 });
  const count = (kind) => all.filter((i) => i.kind === kind).length;
  return {
    schemaVersion: '1.0',
    generatedAt: new Date(now).toISOString(),
    generatedBy: 'scripts/build-studio-timeline.mjs',
    publicSafe: true,
    windowDays: WINDOW_DAYS,
    windowStart: new Date(now - WINDOW_DAYS * MS_DAY).toISOString(),
    sources,
    summary: {
      total: all.length,
      commits: count('commit'),
      editions: count('edition'),
      projects: new Set(all.map((i) => i.project)).size,
      withheld: sources.reduce((n, s) => n + (Number(s.withheld) || 0), 0),
      truncated: Math.max(0, all.length - MAX_ITEMS),
    },
    items: all.slice(0, MAX_ITEMS),
  };
}

/** Shape + public-safety invariants. Returns problems (empty = valid). */
export function validateTimeline(payload) {
  const problems = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ['payload is not an object'];
  for (const key of TOP_KEYS) if (!(key in payload)) problems.push(`missing key ${key}`);
  if (payload.publicSafe !== true) problems.push('publicSafe is not true');
  if (Number.isNaN(Date.parse(payload.generatedAt))) problems.push('generatedAt is not a timestamp');
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  for (const id of SOURCE_IDS) {
    const s = sources.find((x) => x && x.id === id);
    if (!s) problems.push(`source ${id} missing`);
    else if (!STATES.has(s.state)) problems.push(`source ${id} has invalid state ${s.state}`);
    // A degraded source without a reason is an unexplained gap: the Pulse UI renders
    // "partially available" with nothing after it and nobody can tell WHY.
    else if (s.state !== 'ok' && !s.reason) problems.push(`source ${id} is ${s.state} without a reason`);
    if (s && 'truncated' in s && !(Number.isInteger(s.truncated) && s.truncated >= 0)) problems.push(`source ${id} truncated is not a count`);
    if (s && 'commitPages' in s && !(Number.isInteger(s.commitPages) && s.commitPages >= 0)) problems.push(`source ${id} commitPages is not a count`);
    // Truncation is the one gap that can otherwise look healthy: an undercount
    // published as 'ok'. If any repo was cut short the source cannot be 'ok'.
    if (s && Number(s.truncated) > 0 && s.state === 'ok') problems.push(`source ${id} truncated ${s.truncated} repo(s) but reports state ok`);
  }
  const items = Array.isArray(payload.items) ? payload.items : null;
  if (!items) return [...problems, 'items is not an array'];
  if (items.length > MAX_ITEMS) problems.push(`items exceed ${MAX_ITEMS}`);
  items.forEach((item, i) => {
    const where = `items[${i}]`;
    // Work-session rows publish when a private individual was working (CANON-028).
    if (BANNED_KINDS.has(item?.kind)) problems.push(`${where} is a work-session row — session timing is not a public signal (CANON-028)`);
    else if (!KINDS.has(item?.kind)) problems.push(`${where} kind invalid`);
    if (/work session|session \d+ closed/i.test(String(item?.title))) problems.push(`${where} title publishes work-session timing (CANON-028)`);
    if (/^session:/i.test(String(item?.id))) problems.push(`${where} id is a work-session row (CANON-028)`);
    if (Number.isNaN(Date.parse(item?.at))) problems.push(`${where} at invalid`);
    if (typeof item?.title !== 'string' || !item.title || item.title.length > TITLE_MAX) problems.push(`${where} title invalid`);
    if (typeof item?.project !== 'string' || !item.project) problems.push(`${where} project missing (withheld rows must not be emitted)`);
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(`${item?.title} ${item?.project}`)) problems.push(`${where} contains an email-shaped string`);
    if (/\b[A-Za-z0-9_-]{32,}\b/.test(String(item?.title))) problems.push(`${where} title contains a token-shaped string`);
    if (item?.url != null && !(typeof item.url === 'string' && (/^\/[a-z0-9]/i.test(item.url) || item.url.startsWith(`https://github.com/${ORG}/`) || /^https:\/\/[a-z0-9.-]+\//i.test(item.url)))) problems.push(`${where} url not allowed`);
    if (i > 0 && String(items[i - 1].at) < String(item.at)) problems.push(`${where} out of order`);
  });
  const src = sources.find((s) => s?.id === 'github');
  if (src && src.state === 'unavailable' && items.some((x) => x.kind === 'commit')) problems.push('commit rows present while github source is unavailable');
  return problems;
}

function materialView(payload) {
  const { generatedAt, windowStart, ...rest } = payload || {};
  return JSON.stringify(rest);
}

// ── I/O ─────────────────────────────────────────────────────────────────────
function makeGithubFetch() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  return async (pathname) => {
    const res = await fetch(`https://api.github.com${pathname}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vaultspark-studio-timeline',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const rateLimited = (res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0';
      throw Object.assign(new Error(`github ${res.status}`), { status: res.status, rateLimited });
    }
    return res.json();
  };
}

function readJsonOrNull(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

async function loadRegistry() {
  const file = path.join(ROOT, 'studio-hub', 'src', 'data', 'studioRegistry.js');
  if (!fs.existsSync(file)) return [];
  try {
    const mod = await import(pathToFileURL(file).href);
    return Array.isArray(mod.PROJECTS) ? mod.PROJECTS : [];
  } catch { return []; }
}

async function collectLive(now) {
  const registry = await loadRegistry();
  const catalog = readJsonOrNull(path.join(ROOT, 'api', 'public-intelligence.json'))?.catalog || [];
  const parts = [
    await collectGithub({ now, fetchJson: makeGithubFetch(), registry, catalog }),
    collectDesk({ now, desk: readJsonOrNull(path.join(ROOT, 'api', 'news-desk.json')) }),
  ];
  return buildTimeline({ now, parts });
}

function describe(payload) {
  const s = payload.summary;
  const states = payload.sources.map((x) => `${x.id}=${x.state}${x.reason ? `(${x.reason})` : ''}`).join(' ');
  const gh = payload.sources.find((x) => x?.id === 'github') || {};
  const pages = Number.isInteger(gh.commitPages) ? ` · ${gh.commitPages} commit page(s)` : '';
  const cut = Number(gh.truncated) > 0 ? ` · ${gh.truncated} repo(s) TRUNCATED (undercount)` : '';
  return `${s.total} items · ${s.commits} commits · ${s.editions} editions · ${s.projects} projects · ${s.withheld} withheld${pages}${cut} · ${states}`;
}

// ── Self-test ───────────────────────────────────────────────────────────────
async function selfTest() {
  const NOW = Date.parse('2026-09-14T12:00:00Z');
  const ago = (d) => new Date(NOW - d * MS_DAY).toISOString();
  const cases = [];
  const check = (name, ok) => cases.push([name, Boolean(ok)]);
  const human = (msg, extra = {}) => ({ sha: 'a'.repeat(40), html_url: `https://github.com/${ORG}/vorn/commit/${'a'.repeat(40)}`, parents: [{}], author: { login: 'founder', type: 'User' }, commit: { message: msg, author: { name: 'VaultSpark Studios', email: 'x@users.noreply.github.com', date: ago(1) }, committer: { date: ago(1) } }, ...extra });

  check('skip-ci token in subject → automation', automationReason(human('chore: update CI status beacon [skip ci]')) === 'skip-ci');
  check('skip-ci token in body → automation', automationReason(human('chore(uptime): publish\n\n[skip ci]')) === 'skip-ci');
  check('bot author type → automation', automationReason(human('refresh', { author: { login: 'github-actions[bot]', type: 'Bot' } })) === 'bot');
  check('[bot] identity without type → automation', automationReason(human('x', { author: null, commit: { message: 'x', author: { name: 'dependabot[bot]' }, committer: { date: ago(1) } } })) === 'bot');
  check('merge commit → filtered', automationReason(human('Merge pull request #1', { parents: [{}, {}] })) === 'merge');
  check('human closeout commit is work (no subject list)', automationReason(human('chore(closeout): S355 release addendum')) === null);

    // S356: the sanitizer must be fed a PAT-SHAPED string, but a literal one trips
  // lint-repo's secret scanner. Assemble the fake token at runtime so the fixture
  // still exercises stripping while the repo contains no PAT-shaped literal.
  const fakeToken = ['gh', 'p_'].join('') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const s1 = sanitizeSubject('feat(pulse): ship timeline for dev@example.com see https://x.y/z `npm run x` token ' + fakeToken + ' [skip ci]\nbody secret');
  check('sanitize strips email/url/backticks/token/skip-ci/body; maps move', s1.move === 'Feature' && s1.title === 'ship timeline for see token' && !/body/.test(s1.title));
  check('sanitize truncates long subjects', sanitizeSubject('fix: ' + 'a '.repeat(120)).title.length <= TITLE_MAX);
  check('sanitize empty → Untitled change', sanitizeSubject('`only code`').title === 'Untitled change');

  const registry = [
    { id: 'website', githubRepo: `${ORG}/VaultSparkStudios.github.io` },
    { id: 'vorn', githubRepo: `${ORG}/vorn` },
    { id: 'studio-ops', githubRepo: `${ORG}/vaultspark-studio-ops` },
    { id: 'football-gm', githubRepo: `${ORG}/franchise-architect` },
  ];
  const catalog = [{ id: 'vorn', name: 'Vorn', deployedUrl: 'https://vorn.example/' }, { id: 'football-gm', name: 'Franchise Architect' }];
  check('website repo named', publicRepoName(`${ORG}/VaultSparkStudios.github.io`, registry, catalog) === 'Studio Website');
  check('catalog repo named via registry githubRepo', publicRepoName(`${ORG}/franchise-architect`, registry, catalog) === 'Franchise Architect');
  check('internal repo withheld', publicRepoName(`${ORG}/vaultspark-studio-ops`, registry, catalog) === null);
  check('unregistered repo withheld', publicRepoName(`${ORG}/secret-codename`, registry, catalog) === null);

  const repoRow = (name, extra = {}) => ({ name, full_name: `${ORG}/${name}`, private: false, fork: false, pushed_at: ago(1), ...extra });
  const fakeFetch = (routes) => async (p) => {
    for (const [prefix, value] of routes) if (p.startsWith(prefix)) { if (value instanceof Error) throw value; return value; }
    throw Object.assign(new Error('404'), { status: 404 });
  };
  const listingDown = await collectGithub({ now: NOW, registry, catalog, fetchJson: fakeFetch([[`/orgs/`, Object.assign(new Error('x'), { status: 403, rateLimited: true })]]) });
  check('repo listing failure → unavailable, zero rows (no fabrication)', listingDown.source.state === 'unavailable' && listingDown.source.reason === 'rate-limited' && listingDown.items.length === 0);
  const viaUser = await collectGithub({ now: NOW, registry, catalog, fetchJson: fakeFetch([[`/users/${ORG}/repos`, [repoRow('vorn')]], [`/repos/${ORG}/vorn/`, [human('feat: via user listing')]], [`/orgs/`, Object.assign(new Error('x'), { status: 500 })]]) });
  check('user-account listing is used first (org endpoint never consulted)', viaUser.source.state === 'ok' && viaUser.items.length === 1);
  const userDown = await collectGithub({ now: NOW, registry, catalog, fetchJson: fakeFetch([[`/users/`, Object.assign(new Error('x'), { status: 500 })]]) });
  check('non-404 user listing failure does not fall through to org', userDown.source.state === 'unavailable' && userDown.source.reason === 'http-500');

  const ok = await collectGithub({
    now: NOW, registry, catalog,
    fetchJson: fakeFetch([
      [`/orgs/`, [repoRow('vorn'), repoRow('secret-codename'), repoRow('old', { pushed_at: ago(30) }), repoRow('forked', { fork: true }), repoRow('priv', { private: true })]],
      [`/repos/${ORG}/vorn/`, [human('feat: agent homes'), human('chore: beacon [skip ci]'), human('fix: old', { commit: { message: 'fix: old', committer: { date: ago(9) } } })]],
      [`/repos/${ORG}/secret-codename/`, [human('feat: sealed thing')]],
    ]),
  });
  check('only public, non-fork, recently pushed repos are scanned', ok.source.reposScanned === 2);
  check('human commit kept, automation filtered, out-of-window dropped', ok.items.length === 1 && ok.items[0].title === 'agent homes' && ok.source.automationFiltered === 1);
  check('sealed repo commits counted as withheld, never emitted', ok.source.withheld === 1 && !ok.items.some((i) => /sealed/.test(i.title)));
  check('github state ok when every call succeeds', ok.source.state === 'ok');

  const partial = await collectGithub({
    now: NOW, registry, catalog,
    fetchJson: fakeFetch([[`/orgs/`, [repoRow('vorn'), repoRow('franchise-architect')]], [`/repos/${ORG}/vorn/`, Object.assign(new Error('x'), { status: 403, rateLimited: true })], [`/repos/${ORG}/franchise-architect/`, [human('fix: sim')]]]),
  });
  check('rate limit mid-scan → partial and stops', partial.source.state === 'partial' && partial.source.reason === 'rate-limited' && partial.items.length === 0);

  // ── Commit pagination (the S356 undercount class) ─────────────────────────
  // A [skip ci]-heavy repo puts hundreds of automation commits in front of the
  // human ones. ONE page of 100 covers ~1.2 days of this repo, so a single-page
  // fetch publishes a large undercount as state:'ok'. These cases pin the walk.
  const shaFor = (page, i) => String(page * 1000 + i).padStart(40, '0');
  const commitAt = (msg, sha, dAgo = 1) => ({
    sha, html_url: `https://github.com/${ORG}/vorn/commit/${sha}`, parents: [{}],
    author: { login: 'founder', type: 'User' },
    commit: { message: msg, author: { name: 'VaultSpark Studios', date: ago(dAgo) }, committer: { date: ago(dAgo) } },
  });
  const fullPage = (page, humanAt = -1) => Array.from({ length: 100 }, (_, i) => (
    commitAt(i === humanAt ? `feat: human work page ${page}` : 'chore: beacon [skip ci]', shaFor(page, i))
  ));
  // Repo listing first (it also carries `page=`), then commit pages by number.
  const pagedFetch = (repoRows, pageFor) => async (p) => {
    if (p.startsWith('/users/') || p.startsWith('/orgs/')) return repoRows;
    const m = p.match(/^\/repos\/([^?]+)\/commits\?.*\bpage=(\d+)/);
    if (m) return pageFor(Number(m[2]), m[1]);
    throw Object.assign(new Error('404'), { status: 404 });
  };

  const walked = await collectGithub({
    now: NOW, registry, catalog, commitPageBudget: 8,
    fetchJson: pagedFetch([repoRow('vorn')], (page) => (page === 1 ? fullPage(1) : page === 2 ? [commitAt('feat: real human work', 'b'.repeat(40))] : [])),
  });
  check('pagination walks past a full page of automation to the human commits',
    walked.items.length === 1 && walked.items[0].title === 'real human work' && walked.source.automationFiltered === 100);
  check('window covered inside the budget → ok, no truncation claimed',
    walked.source.state === 'ok' && walked.source.truncated === 0 && walked.source.commitPages === 2);

  const cut = await collectGithub({
    now: NOW, registry, catalog, commitPageBudget: 3,
    fetchJson: pagedFetch([repoRow('vorn')], (page) => fullPage(page, page === 3 ? 0 : -1)),
  });
  check('budget exhausted before the window is covered → partial + truncated (never a silent ok)',
    cut.source.state === 'partial' && cut.source.reason === 'truncated' && cut.source.truncated === 1 && cut.source.commitPages === 3);
  check('automation-heavy repo still yields the real human commits it did reach',
    cut.items.length === 1 && cut.items[0].title === 'human work page 3');

  const budgetGone = await collectGithub({
    now: NOW, registry, catalog, commitPageBudget: 8, commitPageBudgetTotal: 1,
    fetchJson: pagedFetch([repoRow('vorn'), repoRow('franchise-architect')], (page) => fullPage(page)),
  });
  check('studio-wide page budget counts UNSCANNED repos as truncated, not empty',
    budgetGone.source.state === 'partial' && budgetGone.source.reason === 'truncated' && budgetGone.source.truncated === 2 && budgetGone.source.reposScanned === 1);

  const errorOutranks = await collectGithub({
    now: NOW, registry, catalog, commitPageBudget: 1,
    fetchJson: pagedFetch([repoRow('vorn'), repoRow('franchise-architect')], (page, repo) => {
      if (repo.endsWith('franchise-architect')) throw Object.assign(new Error('x'), { status: 500 });
      return fullPage(page);
    }),
  });
  check('an explicit error reason outranks truncation', errorOutranks.source.state === 'partial' && errorOutranks.source.reason === 'http-500' && errorOutranks.source.truncated === 1);

  const futureCommit = await collectGithub({
    now: NOW, registry, catalog,
    fetchJson: pagedFetch([repoRow('vorn')], () => [commitAt('feat: from the future', 'c'.repeat(40), -0.5), commitAt('feat: today', 'd'.repeat(40), 0.1)]),
  });
  check('commit dated hours in the future is clock skew, not news (minute-precision slack)',
    futureCommit.items.length === 1 && futureCommit.items[0].title === 'today');

  check('day-precision editions keep the full-day slack a UTC-midnight stamp needs',
    collectDesk({ now: NOW, desk: { publicSafe: true, cards: [{ date: new Date(NOW + 6 * 3_600_000).toISOString().slice(0, 10), slug: 't', href: '/news/t/', headline: 'Tonight' }] } }).items.length === 1);
  check('per-precision slack: minute is an hour, day is a day', futureSlackMs('minute') === 3_600_000 && futureSlackMs('day') === MS_DAY && futureSlackMs(undefined) === 3_600_000);

  const truncatedTimeline = buildTimeline({ now: NOW, parts: [cut] });
  check('truncated github source surfaces in the payload (Pulse renders source states)',
    truncatedTimeline.sources.find((s) => s.id === 'github').state === 'partial'
    && truncatedTimeline.sources.find((s) => s.id === 'github').reason === 'truncated'
    && validateTimeline(truncatedTimeline).length === 0);
  check('validator rejects a truncated source that still claims ok',
    validateTimeline({ ...truncatedTimeline, sources: truncatedTimeline.sources.map((s) => (s.id === 'github' ? { ...s, state: 'ok', reason: null } : s)) }).some((p) => /truncated 1 repo/.test(p)));
  check('validator rejects a degraded source with no reason',
    validateTimeline({ ...truncatedTimeline, sources: truncatedTimeline.sources.map((s) => (s.id === 'github' ? { ...s, reason: null } : s)) }).some((p) => /without a reason/.test(p)));

  // Work-session closeouts are no longer a source at all (CANON-028): the module
  // exports no session collector, and the validator rejects session rows so a
  // stale published feed fails the gate instead of rendering work timing.
  check('declared sources are commits and Desk editions only', SOURCE_IDS.join(',') === 'github,desk' && !KINDS.has('session'));

  const desk = { publicSafe: true, cards: [{ date: '2026-09-12', slug: 's', href: '/news/2026-09-12/s/', headline: 'Headline one' }, { date: '2026-08-01', slug: 'old', href: '/news/old/', headline: 'Old' }] };
  const deskPart = collectDesk({ now: NOW, desk });
  check('desk: in-window editions only, day precision', deskPart.items.length === 1 && deskPart.items[0].precision === 'day' && deskPart.items[0].url === '/news/2026-09-12/s/');
  check('desk: absent / not public-safe → unavailable', collectDesk({ now: NOW, desk: null }).source.state === 'unavailable' && collectDesk({ now: NOW, desk: { cards: [] } }).source.reason === 'not-public-safe');

  const timeline = buildTimeline({ now: NOW, parts: [ok, deskPart] });
  check('timeline validates', validateTimeline(timeline).length === 0);
  check('timeline sorted newest first with per-kind summary', timeline.items[0].at >= timeline.items.at(-1).at && timeline.summary.commits === 1 && timeline.summary.editions === 1);
  check('summary publishes no session count', !Object.prototype.hasOwnProperty.call(timeline.summary, 'sessions'));
  check('withheld totals roll up across sources', timeline.summary.withheld === 1);

  // A feed published before the removal still carries session rows; --check must
  // fail on it rather than let the Pulse page render when work happened.
  // Fixture titles are assembled at runtime so this file is not itself a match
  // for the session-timing copy guard (tests/founder-presence-absent.unit.spec.js).
  const SESSION_TITLE = ['Session', '356', 'closed'].join(' ');
  const WORK_SESSION_TITLE = ['Work', 'session', 'closed'].join(' ');
  const sessionRow = { ...timeline.items[0], id: 'session:website:1', kind: 'session', project: 'Studio Website', title: SESSION_TITLE };
  const staleProblems = validateTimeline({ ...timeline, items: [sessionRow] });
  check('validator rejects a session row on all three of kind, id and title',
    staleProblems.some((p) => /work-session row — session timing/.test(p))
    && staleProblems.some((p) => /id is a work-session row/.test(p))
    && staleProblems.some((p) => /title publishes work-session timing/.test(p)));
  check('validator rejects session-titled rows even under an allowed kind',
    validateTimeline({ ...timeline, items: [{ ...timeline.items[0], title: WORK_SESSION_TITLE }] }).some((p) => /title publishes work-session timing/.test(p)));

  const dark = buildTimeline({ now: NOW, parts: [listingDown, collectDesk({ now: NOW, desk: null })] });
  check('all sources dark → empty items, every state unavailable, still valid', dark.items.length === 0 && dark.sources.every((s) => s.state === 'unavailable') && validateTimeline(dark).length === 0);

  const leaky = { ...timeline, items: [{ ...timeline.items[0], title: 'mail dev@example.com' }] };
  check('validator rejects email-shaped titles', validateTimeline(leaky).some((p) => /email/.test(p)));
  check('validator rejects javascript: urls', validateTimeline({ ...timeline, items: [{ ...timeline.items[0], url: 'javascript:alert(1)' }] }).some((p) => /url/.test(p)));
  check('validator rejects nameless rows', validateTimeline({ ...timeline, items: [{ ...timeline.items[0], project: null }] }).some((p) => /withheld/.test(p)));
  check('material view ignores generatedAt/windowStart only', materialView(timeline) === materialView({ ...timeline, generatedAt: 'x', windowStart: 'y' }) && materialView(timeline) !== materialView(dark));

  let failed = 0;
  for (const [name, pass] of cases) { console.log(`  ${pass ? 'ok' : 'FAIL'} ${name}`); if (!pass) failed += 1; }
  console.log(`build-studio-timeline --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

// ── Entry ───────────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  if (process.argv.includes('--check')) {
    const committed = readJsonOrNull(OUT);
    if (!committed) {
      console.error('studio-timeline: api/studio-timeline.json absent or unparseable — run: node scripts/build-studio-timeline.mjs');
      process.exit(1);
    }
    const problems = validateTimeline(committed);
    if (problems.length) {
      console.error('studio-timeline: committed feed violates invariants — run: node scripts/build-studio-timeline.mjs');
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.log(`studio-timeline: api/studio-timeline.json valid (${describe(committed)}); live network output is not a gate input`);
    return;
  }
  const payload = await collectLive(Date.now());
  const problems = validateTimeline(payload);
  if (problems.length) {
    console.error('studio-timeline: refusing to publish an invalid feed');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (process.argv.includes('--dry-run')) {
    console.log(`studio-timeline (dry run, nothing written): ${describe(payload)}`);
    return;
  }
  const current = readJsonOrNull(OUT);
  if (current && materialView(current) === materialView(payload)) {
    console.log(`studio-timeline: content unchanged, not rewriting (${describe(payload)})`);
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT)} · ${describe(payload)}`);
}

const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('build-studio-timeline.mjs');
if (RUN_DIRECT) await main();
