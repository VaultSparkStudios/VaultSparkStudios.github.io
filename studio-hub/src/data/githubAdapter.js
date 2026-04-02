// GitHub REST API adapter
// Fetches live repo data with sessionStorage caching and graceful degradation.
// Adding a new repo: no code changes needed — pass any repoPath to fetchRepoData().

const BASE = "https://api.github.com";
const CACHE_PREFIX = "vshub_gh_";

// ── Rate limit tracking ───────────────────────────────────────────────────────
const _rateLimit = { remaining: null, limit: null, reset: null };
export function getRateLimitInfo() { return { ..._rateLimit }; }

// ── Last fetch error tracking ─────────────────────────────────────────────────
// Distinguishes "no token", "rate limited", "repo not found", "network error"
const _fetchErrors = {};
export function getFetchError(repoPath) { return _fetchErrors[repoPath] || null; }
export function clearFetchErrors() { Object.keys(_fetchErrors).forEach((k) => delete _fetchErrors[k]); }

// Returns { cached, fresh } counts for a set of repo paths given a TTL.
// Used to surface cache hit/miss stats in the sync status panel.
export function countCachedRepos(repoPaths, ttlMs) {
  let cached = 0;
  for (const rp of repoPaths) {
    if (readCache(rp, ttlMs) !== null) cached++;
  }
  return { cached, fresh: repoPaths.length - cached };
}

// Sentinel stored in cache when a file is confirmed not found (avoids repeat 404s)
const NOT_FOUND = "__vsHub_404__";

function cacheKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function readCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(cacheKey(key), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // storage full or unavailable — skip
  }
}

async function ghFetch(path, token, retries = 2) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30000);
      let res;
      try {
        res = await fetch(`${BASE}${path}`, { headers, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      const remaining = res.headers.get("X-RateLimit-Remaining");
      const limit     = res.headers.get("X-RateLimit-Limit");
      const reset     = res.headers.get("X-RateLimit-Reset");
      if (remaining !== null) _rateLimit.remaining = Number(remaining);
      if (limit     !== null) _rateLimit.limit     = Number(limit);
      if (reset     !== null) _rateLimit.reset     = Number(reset);
      if (!res.ok) return { __status: res.status };
      return res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function isError(v) { return v && typeof v === "object" && "__status" in v; }
function statusToError(status, hasToken) {
  if (status === 401 || status === 403) return hasToken ? "token_invalid" : "no_token";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  return "api_error";
}

// ── Context file fetcher ──────────────────────────────────────────────────────
// Fetches a single file from a repo via GitHub Contents API.
// Caches NOT_FOUND to avoid repeat 404s within the TTL window.
export async function fetchContextFile(repoPath, filePath, token = "", ttlMs = 600000) {
  const key = `ctx_${repoPath.replace(/\//g, "_")}_${filePath.replace(/\//g, "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached === NOT_FOUND) return null;
  if (cached !== null) return cached;

  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE}/repos/${repoPath}/contents/${filePath}`, { headers });
    if (!res.ok) { writeCache(key, NOT_FOUND); return null; }
    const json = await res.json();
    if (!json.content) { writeCache(key, NOT_FOUND); return null; }
    let content;
    try {
      content = atob(json.content.replace(/\n/g, ""));
    } catch {
      writeCache(key, NOT_FOUND);
      return null;
    }
    writeCache(key, content);
    return content;
  } catch {
    return null;
  }
}

// Fetch Studio OS context files for all projects in parallel.
// Returns { [projectId]: { statusJson, currentState, latestHandoff, ... } }
export async function fetchAllProjectContextFiles(projects, token = "", ttlMs = 600000) {
  const results = await Promise.all(
    projects
      .filter((p) => p.githubRepo)
      .map(async (p) => {
        // Check if repo has been updated since last context fetch
        const cachedRepoData = readCache(p.githubRepo, ttlMs * 10);
        const repoUpdatedAt = cachedRepoData?.repo?.updatedAt || null;
        const ctxCacheKey = `ctx_bundle_${p.githubRepo.replace(/\//g, "_")}`;
        const ctxBundle = readCache(ctxCacheKey, ttlMs * 2);
        if (ctxBundle && repoUpdatedAt && ctxBundle.repoUpdatedAt === repoUpdatedAt) {
          return [p.id, ctxBundle.data];
        }

        const [statusRaw, currentState, decisions, brain, soul, taskBoard, latestHandoff, truthAudit] = await Promise.all([
          fetchContextFile(p.githubRepo, "context/PROJECT_STATUS.json", token, ttlMs),
          fetchContextFile(p.githubRepo, "context/CURRENT_STATE.md",   token, ttlMs),
          fetchContextFile(p.githubRepo, "context/DECISIONS.md",       token, ttlMs),
          fetchContextFile(p.githubRepo, "context/BRAIN.md",           token, ttlMs),
          fetchContextFile(p.githubRepo, "context/SOUL.md",            token, ttlMs),
          fetchContextFile(p.githubRepo, "context/TASK_BOARD.md",      token, ttlMs),
          fetchContextFile(p.githubRepo, "context/LATEST_HANDOFF.md",  token, ttlMs),
          fetchContextFile(p.githubRepo, "context/TRUTH_AUDIT.md",     token, ttlMs),
        ]);
        let statusJson = null;
        if (statusRaw) { try { statusJson = JSON.parse(statusRaw); } catch { /* ignore */ } }
        const result = { statusJson, currentState, decisions, brain, soul, taskBoard, latestHandoff, truthAudit, fetchedAt: Date.now() };
        // Cache the bundle keyed by the repo's updatedAt so future calls can skip re-fetching
        if (repoUpdatedAt) {
          writeCache(ctxCacheKey, { repoUpdatedAt, data: result });
        }
        return [p.id, result];
      })
  );
  return Object.fromEntries(results);
}

// Fetch all meaningful data for one repo in parallel.
// repoPath format: "owner/repo"  e.g. "VaultSparkStudios/call-of-doodie"
export async function fetchRepoData(repoPath, token = "", ttlMs = 300000) {
  const cached = readCache(repoPath, ttlMs);
  if (cached) return cached;

  try {
    const [repo, commits, issues, prs, runs, release, deps, milestones] = await Promise.all([
      ghFetch(`/repos/${repoPath}`, token),
      ghFetch(`/repos/${repoPath}/commits?per_page=20`, token),
      ghFetch(`/repos/${repoPath}/issues?state=open&per_page=10&pulls=false`, token),
      ghFetch(`/repos/${repoPath}/pulls?state=open&per_page=10`, token),
      ghFetch(`/repos/${repoPath}/actions/runs?per_page=3`, token),
      ghFetch(`/repos/${repoPath}/releases/latest`, token),
      ghFetch(`/repos/${repoPath}/deployments?per_page=5`, token),
      ghFetch(`/repos/${repoPath}/milestones?state=open&per_page=5`, token),
    ]);

    // Track error type from the primary repo call
    if (isError(repo)) {
      _fetchErrors[repoPath] = statusToError(repo.__status, !!token);
      return null;
    }
    delete _fetchErrors[repoPath];

    const data = {
      repo: repo
        ? {
            name: repo.name,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
            isPrivate: repo.private,
            language: repo.language,
          }
        : null,
      commits: Array.isArray(commits)
        ? commits.map((c) => ({
            sha: c.sha?.slice(0, 7),
            message: c.commit?.message?.split("\n")[0] || "",
            author: c.commit?.author?.name || "",
            date: c.commit?.author?.date || "",
            url: c.html_url,
          }))
        : [],
      issues: Array.isArray(issues)
        ? issues
            .filter((i) => !i.pull_request)
            .map((i) => ({
              number: i.number,
              title: i.title,
              labels: (i.labels || []).map((l) => l.name),
              createdAt: i.created_at,
              url: i.html_url,
            }))
        : [],
      prs: Array.isArray(prs)
        ? prs.map((p) => ({
            number: p.number,
            title: p.title,
            author: p.user?.login || "",
            createdAt: p.created_at,
            url: p.html_url,
            draft: p.draft || false,
          }))
        : [],
      ciRuns: runs?.workflow_runs
        ? runs.workflow_runs.map((r) => ({
            name: r.name,
            status: r.status,
            conclusion: r.conclusion,
            triggeredAt: r.created_at,
            url: r.html_url,
          }))
        : [],
      latestRelease: release && !release.message
        ? {
            tag: release.tag_name,
            name: release.name,
            publishedAt: release.published_at,
            url: release.html_url,
          }
        : null,
      deployments: Array.isArray(deps)
        ? deps.map((d) => ({
            id: d.id,
            environment: d.environment,
            createdAt: d.created_at,
            sha: d.sha?.slice(0, 7),
            url: d.url,
          }))
        : [],
      milestones: Array.isArray(milestones)
        ? milestones.map((m) => ({
            id: m.number,
            title: m.title,
            openIssues: m.open_issues,
            closedIssues: m.closed_issues,
            dueOn: m.due_on || null,
            url: m.html_url,
            progress: m.open_issues + m.closed_issues > 0
              ? Math.round((m.closed_issues / (m.open_issues + m.closed_issues)) * 100)
              : 0,
          }))
        : [],
      fetchedAt: new Date().toISOString(),
    };

    writeCache(repoPath, data);
    return data;
  } catch {
    return null;
  }
}

// Fetch org-level recent activity (public events feed).
export async function fetchOrgActivity(org, token = "", ttlMs = 300000) {
  const key = `org_${org}`;
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const events = await ghFetch(`/orgs/${org}/events?per_page=30`, token);
    if (!Array.isArray(events)) return [];
    const data = events
      .filter((e) => ["PushEvent", "CreateEvent", "ReleaseEvent", "IssuesEvent", "PullRequestEvent"].includes(e.type))
      .map((e) => ({
        type: e.type,
        repo: e.repo?.name || "",
        actor: e.actor?.login || "",
        createdAt: e.created_at,
        summary: summariseEvent(e),
      }));
    writeCache(key, data);
    return data;
  } catch {
    return [];
  }
}

function summariseEvent(e) {
  switch (e.type) {
    case "PushEvent":
      return `Pushed ${e.payload?.commits?.length || 1} commit(s)`;
    case "CreateEvent":
      return `Created ${e.payload?.ref_type} ${e.payload?.ref || ""}`;
    case "ReleaseEvent":
      return `Released ${e.payload?.release?.tag_name || ""}`;
    case "IssuesEvent":
      return `${e.payload?.action} issue #${e.payload?.issue?.number}`;
    case "PullRequestEvent":
      return `${e.payload?.action} PR #${e.payload?.pull_request?.number}`;
    default:
      return e.type;
  }
}

// ── Active Session Beacon ─────────────────────────────────────────────────────
// Reads a GitHub Gist that Claude Code hooks write to signal active sessions.
// Gist content should be JSON: { "active": [{ "project": "id", "agent": "claude-code", "since": "ISO" }] }
export async function fetchBeaconGist(gistId, token = "") {
  if (!gistId) return null;
  const key = `beacon_${gistId}`;
  const cached = readCache(key, 30000); // 30s TTL — near-realtime
  if (cached !== null) return cached;

  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!res.ok) { writeCache(key, null); return null; }
    const gist = await res.json();
    const file = Object.values(gist.files || {})[0];
    if (!file?.content) { writeCache(key, null); return null; }
    const data = JSON.parse(file.content);
    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}

// Fetch TODO/FIXME occurrences via GitHub Code Search API.
// Returns array of { repo, path, url, fragment }
export async function fetchTodoSearch(org, token = "", ttlMs = 300000) {
  const key = `todo_${org}`;
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const res = await ghFetch(`/search/code?q=TODO+OR+FIXME+org:${org}&per_page=20`, token);
    if (!res.items) return [];
    const data = res.items.map((item) => ({
      repo: item.repository?.name || "",
      path: item.path,
      url: item.html_url,
      fragment: item.text_matches?.[0]?.fragment || "",
    }));
    writeCache(key, data);
    return data;
  } catch {
    return [];
  }
}

// Search GitHub repositories by query string.
// Returns { total_count, items: [...] } or null on error.
// 15-min cache because search results change slowly.
export async function fetchCompetitorSearch(query, token = "", ttlMs = 900000) {
  const key = `comp_search_${query.replace(/\W+/g, "_").slice(0, 60)}`;
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const q = encodeURIComponent(query);
    const res = await ghFetch(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`, token);
    if (isError(res) || !res.items) return null;
    const data = {
      total_count: res.total_count,
      items: res.items.map((r) => ({
        full_name: r.full_name,
        description: r.description,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        language: r.language,
        pushed_at: r.pushed_at,
        topics: r.topics || [],
        html_url: r.html_url,
      })),
    };
    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}

// Fetch language byte-count breakdown for a repo.
// Returns { JavaScript: 12345, CSS: 5000, ... } or null on error.
// Long TTL (1 hour) because language composition rarely changes.
export async function fetchRepoLanguages(repoPath, token = "", ttlMs = 3600000) {
  const key = `lang_${repoPath.replace("/", "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;

  try {
    const langRaw = await ghFetch(`/repos/${repoPath}/languages`, token);
    const languages = (!langRaw || isError(langRaw)) ? null : langRaw;
    if (languages !== null) writeCache(key, languages);
    return languages;
  } catch {
    return null;
  }
}

// Fetch branch list for a repo (up to 20 branches).
// Returns array of { name, protected } or null on error.
export async function fetchRepoBranches(repoPath, token = "", ttlMs = 300000) {
  const key = `branches_${repoPath.replace("/", "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;

  try {
    const raw = await ghFetch(`/repos/${repoPath}/branches?per_page=20`, token);
    if (!Array.isArray(raw)) return null;
    const branches = raw.map((b) => ({
      name: b.name,
      protected: b.protected || false,
    }));
    writeCache(key, branches);
    return branches;
  } catch {
    return null;
  }
}

// Fetch TODO/FIXME count for a single repo via code search total_count.
// Uses per_page=1 to minimize data transfer; only total_count matters.
// TTL 10 min — changes slowly; search API is rate-limited separately.
export async function fetchRepoTodoCount(repoPath, token = "", ttlMs = 600000) {
  const key = `todocount_${repoPath.replace("/", "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;

  try {
    const res = await ghFetch(`/search/code?q=TODO+OR+FIXME+repo:${repoPath}&per_page=1`, token);
    const count = typeof res?.total_count === "number" ? res.total_count : 0;
    writeCache(key, count);
    return count;
  } catch {
    return 0;
  }
}

// ── Dependency freshness (Dependabot alerts summary) ─────────────────────────
// Returns { total, critical, high, medium, low } counts of open Dependabot alerts.
// Requires repo admin token for private repos; public repos need no extra scope.
export async function fetchDependencyAlerts(repoPath, token = "", ttlMs = 600000) {
  const key = `depalerts_${repoPath.replace("/", "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;

  const result = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  if (!token) { writeCache(key, result); return result; }

  try {
    const res = await ghFetch(`/repos/${repoPath}/dependabot/alerts?state=open&per_page=100`, token);
    if (Array.isArray(res)) {
      result.total = res.length;
      for (const alert of res) {
        const sev = alert.security_vulnerability?.severity || alert.security_advisory?.severity || "";
        if (sev === "critical") result.critical++;
        else if (sev === "high") result.high++;
        else if (sev === "medium") result.medium++;
        else result.low++;
      }
    }
    writeCache(key, result);
    return result;
  } catch {
    writeCache(key, result);
    return result;
  }
}

// ── Project Ticketing (GitHub Issues backend) ─────────────────────────────────
// Hub repo where listing tickets are filed as issues.
const HUB_REPO = "VaultSparkStudios/vaultspark-studio-hub";
const TICKET_LABEL = "project-listing";

// ── Studio OS compliance check ────────────────────────────────────────────────
// Checks which Studio OS required files are present in the repo.
// Returns { score, total, present: [...], missing: [...] }
// Uses the GitHub git/trees API (one call) to avoid per-file 404 churn.
export const STUDIO_OS_REQUIRED_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  "context/PROJECT_BRIEF.md",
  "context/SOUL.md",
  "context/BRAIN.md",
  "context/CURRENT_STATE.md",
  "context/TRUTH_AUDIT.md",
  "context/TASK_BOARD.md",
  "context/LATEST_HANDOFF.md",
  "context/DECISIONS.md",
  "context/SELF_IMPROVEMENT_LOOP.md",
  "context/PORTFOLIO_CARD.md",
  "context/PROJECT_STATUS.json",
  "docs/CREATIVE_DIRECTION_RECORD.md",
  "prompts/start.md",
  "prompts/closeout.md",
  "logs/WORK_LOG.md",
];

export async function fetchStudioOsCompliance(repoPath, token = "", ttlMs = 600000) {
  const key = `studioOs_${repoPath.replace(/\//g, "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    // Single recursive tree call — all file paths in one request
    const res = await fetch(`${BASE}/repos/${repoPath}/git/trees/HEAD?recursive=1`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const blobs = (data.tree || []).filter((t) => t.type === "blob");
    const paths = new Set(blobs.map((t) => t.path));
    const present = STUDIO_OS_REQUIRED_FILES.filter((f) => paths.has(f));
    const missing = STUDIO_OS_REQUIRED_FILES.filter((f) => !paths.has(f));

    // ── Governance signals ────────────────────────────────────────────────────
    // SIL freshness: check if SELF_IMPROVEMENT_LOOP.md blob was committed recently
    // We use the blob list's sha to fetch content and check for recent date headers
    let silFresh = false;
    let silScore = null; // latest SIL total (0–50), null if not parsed
    let cdrActive = false;
    if (paths.has("context/SELF_IMPROVEMENT_LOOP.md")) {
      try {
        const silRes = await fetch(`${BASE}/repos/${repoPath}/contents/context/SELF_IMPROVEMENT_LOOP.md`, { headers });
        if (silRes.ok) {
          const silData = await silRes.json();
          const content = atob(silData.content.replace(/\s/g, ""));
          // SIL is "fresh" if there's a date entry in the last 14 days
          const dateMatches = [...content.matchAll(/### (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
          const cutoff = Date.now() - 14 * 86400000;
          silFresh = dateMatches.some((d) => new Date(d).getTime() > cutoff);
          // Parse the latest SIL total score (e.g. "**Total** | **42 / 50**")
          const scoreTotals = [...content.matchAll(/\*\*Total\*\*\s*\|\s*\*\*(\d+)\s*\/\s*50\*\*/g)];
          if (scoreTotals.length > 0) {
            silScore = parseInt(scoreTotals[scoreTotals.length - 1][1], 10);
          }
        }
      } catch { /* non-fatal */ }
    }
    if (paths.has("docs/CREATIVE_DIRECTION_RECORD.md")) {
      try {
        const cdrRes = await fetch(`${BASE}/repos/${repoPath}/contents/docs/CREATIVE_DIRECTION_RECORD.md`, { headers });
        if (cdrRes.ok) {
          const cdrData = await cdrRes.json();
          const content = atob(cdrData.content.replace(/\s/g, ""));
          // CDR is "active" if it has a real dated entry (beyond the placeholder)
          const entries = [...content.matchAll(/### \d{4}-\d{2}-\d{2}/g)];
          cdrActive = entries.length >= 2; // at least 1 real entry beyond the onboarding entry
        }
      } catch { /* non-fatal */ }
    }

    const result = {
      score: present.length,
      total: STUDIO_OS_REQUIRED_FILES.length,
      present,
      missing,
      silFresh,
      silScore,
      cdrActive,
    };
    writeCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// Fetch all project listing tickets (open + closed last 30d).
// Short TTL — queue should feel live.
export async function fetchProjectTickets(token = "", ttlMs = 60000) {
  const key = "project_tickets";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;

  try {
    const [open, closed] = await Promise.all([
      ghFetch(`/repos/${HUB_REPO}/issues?labels=${TICKET_LABEL}&state=open&per_page=20`, token),
      ghFetch(`/repos/${HUB_REPO}/issues?labels=${TICKET_LABEL}&state=closed&per_page=10`, token),
    ]);
    const openArr   = Array.isArray(open)   ? open   : [];
    const closedArr = Array.isArray(closed) ? closed : [];
    const tickets = [...openArr, ...closedArr].map((iss) => ({
      id:        iss.number,
      title:     iss.title || "",
      body:      iss.body  || "",
      state:     iss.state,
      author:    iss.user?.login || "unknown",
      createdAt: iss.created_at,
      updatedAt: iss.updated_at,
      comments:  iss.comments || 0,
      url:       iss.html_url,
      labels:    (iss.labels || []).map((l) => l.name),
    }));
    writeCache(key, tickets);
    return tickets;
  } catch {
    return [];
  }
}

// Submit a new project listing ticket as a GitHub issue.
// Returns { ok: true, url } on success or { ok: false, error } on failure.
export async function submitProjectTicket(fields, token = "") {
  if (!token) return { ok: false, error: "No GitHub token configured. Add one in Settings." };

  // Machine-readable block for agent-to-agent parsing (invisible in rendered GitHub UI)
  const yamlBlock = [
    "<!-- agent-ticket",
    `project_name: ${JSON.stringify(fields.name || "")}`,
    `github_repo: ${JSON.stringify(fields.githubRepo || "")}`,
    `type: ${JSON.stringify(fields.type || "")}`,
    `status: ${JSON.stringify(fields.status || "")}`,
    `description: ${JSON.stringify(fields.description || "")}`,
    `deployed_url: ${JSON.stringify(fields.deployedUrl || "")}`,
    `supabase_slug: ${JSON.stringify(fields.supabaseSlug || "")}`,
    `brand_color: ${JSON.stringify(fields.color || "")}`,
    `studio_os_compliant: ${JSON.stringify(!!fields.studioOsCompliant)}`,
    `submitted_by: ${JSON.stringify(fields.agentSubmitted ? "agent" : "human")}`,
    `submitted_at: ${JSON.stringify(new Date().toISOString())}`,
    "-->",
  ].join("\n");

  const osStatus = fields.studioOsCompliant
    ? "✓ Studio OS files confirmed"
    : "⚠ Studio OS files not confirmed — project must apply Studio OS before acceptance";

  const body = [
    yamlBlock,
    "",
    "## Project Listing Request",
    "",
    `**Project Name:** ${fields.name || "—"}`,
    `**GitHub Repo:** ${fields.githubRepo || "—"}`,
    `**Type:** ${fields.type || "—"}`,
    `**Status:** ${fields.status || "—"}`,
    `**Description:** ${fields.description || "—"}`,
    `**Deployed URL:** ${fields.deployedUrl || "N/A"}`,
    `**Supabase Game Slug:** ${fields.supabaseSlug || "N/A"}`,
    `**Brand Color:** ${fields.color || "N/A"}`,
    `**Studio OS:** ${osStatus}`,
    "",
    "---",
    fields.agentSubmitted
      ? "*Submitted via project agent · VaultSpark Agent-to-Agent Pipeline*"
      : "*Submitted via VaultSpark Studio Hub · Project Ticketing*",
  ].join("\n");

  try {
    const res = await fetch(`https://api.github.com/repos/${HUB_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `[Project Listing] ${fields.name || "Unnamed Project"}`,
        body,
        labels: [TICKET_LABEL],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.message || `GitHub error ${res.status}` };
    }
    const data = await res.json();
    // Bust tickets cache so queue refreshes immediately
    try { sessionStorage.removeItem(`${CACHE_PREFIX}project_tickets`); } catch {}
    return { ok: true, url: data.html_url, id: data.number };
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

// Fetches decoded content for key portfolio files from studio-ops.
// Returns { [filePath]: { content: string, truncated: boolean } }.
const PORTFOLIO_CONTENT_FILES = [
  "portfolio/WEEKLY_DIGEST.md",
  "portfolio/DEBT_REPORT.md",
  "portfolio/REVENUE_SIGNALS.md",
];

export async function fetchPortfolioFileContents(token = "", ttlMs = 3600000) {
  const key = "portfolio_file_contents";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const results = await Promise.all(
      PORTFOLIO_CONTENT_FILES.map(async (filePath) => {
        try {
          const res = await fetch(`${BASE}/repos/${STUDIO_OPS_REPO}/contents/${filePath}`, { headers });
          if (!res.ok) return [filePath, null];
          const json = await res.json();
          const full = atob(json.content.replace(/\n/g, ""));
          const lines = full.split("\n");
          const truncated = lines.length > 60;
          return [filePath, { content: lines.slice(0, 60).join("\n"), truncated }];
        } catch {
          return [filePath, null];
        }
      })
    );
    const result = Object.fromEntries(results);
    writeCache(key, result);
    return result;
  } catch {
    return {};
  }
}

// Fetches the last GitHub Actions run for each automated workflow in studio-ops.
// Returns { [workflowName]: { conclusion, runAt, url } }.
export async function fetchAgentRunHistory(token = "", ttlMs = 300000) {
  const key = "agent_run_history";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const data = await ghFetch(
      `/repos/${STUDIO_OPS_REPO}/actions/runs?per_page=50`,
      token
    );
    if (!data?.workflow_runs) { writeCache(key, {}); return {}; }
    // Group by workflow name — keep most recent run + last 7 for sparkline + compute streak
    const byName = {};
    for (const run of data.workflow_runs) {
      const name = run.name;
      if (!byName[name]) {
        byName[name] = {
          conclusion: run.conclusion,       // "success" | "failure" | null (in_progress)
          runAt:      run.updated_at,
          url:        run.html_url,
          history:    [],                   // last 7 runs oldest→newest
        };
      }
      if (byName[name].history.length < 7) {
        byName[name].history.unshift({ conclusion: run.conclusion });
      }
    }
    // Compute streak (consecutive successes from most recent)
    for (const entry of Object.values(byName)) {
      let streak = 0;
      for (let i = entry.history.length - 1; i >= 0; i--) {
        if (entry.history[i].conclusion === "success") streak++;
        else break;
      }
      entry.streak = streak >= 2 ? streak : null;
    }
    writeCache(key, byName);
    return byName;
  } catch {
    return {};
  }
}

// Creates a GitHub Issue in studio-ops with the agent-request label.
// Used by the one-click "Request Run →" button on manual agent cards.
export async function submitAgentRequest(agentId, agentName, dispatchPhrase, token) {
  if (!token) return { ok: false, error: "No GitHub token configured" };
  const body = [
    "## Agent Request",
    "",
    `**Agent:** ${agentName}`,
    `**Trigger phrase:** \`${dispatchPhrase}\``,
    `**Requested via:** VaultSpark Studio Hub → Studio Agents tab`,
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "",
    "---",
    `To run: open \`vaultspark-studio-ops\` in Claude Code and say: *"${dispatchPhrase}"*`,
  ].join("\n");
  try {
    const res = await fetch(`${BASE}/repos/${STUDIO_OPS_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `[Agent Request] ${agentName}`,
        body,
        labels: ["agent-request"],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.message || `GitHub error ${res.status}` };
    }
    const data = await res.json();
    // Bust agent-requests cache so queue refreshes on next render
    try { sessionStorage.removeItem(`${CACHE_PREFIX}agent_requests`); } catch {}
    return { ok: true, url: data.html_url, number: data.number };
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

// Convenience: fetch data for multiple repos in parallel.
export async function fetchAllRepos(repoPaths, token = "", ttlMs = 300000) {
  const results = await Promise.all(
    repoPaths.map((r) => fetchRepoData(r, token, ttlMs).then((d) => ({ repo: r, data: d })))
  );
  return Object.fromEntries(results.map(({ repo, data }) => [repo, data]));
}

// ── Studio Ops integration ────────────────────────────────────────────────────
// Fetches STUDIO_BRAIN.md from vaultspark-studio-ops and parses priority flags.
// Returns { flags: [{ type, text }], agentSummary: string, raw: string } or null.
const STUDIO_OPS_REPO = "VaultSparkStudios/vaultspark-studio-ops";

export async function fetchStudioBrain(token = "", ttlMs = 300000) {
  const key = "studio_brain";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE}/repos/${STUDIO_OPS_REPO}/contents/portfolio/STUDIO_BRAIN.md`, { headers });
    if (!res.ok) { writeCache(key, null); return null; }
    const json = await res.json();
    const raw = atob(json.content.replace(/\n/g, ""));
    const flags = [];
    const flagSection = raw.match(/### Priority flags[\s\S]*?(?=###|$)/);
    if (flagSection) {
      const lines = flagSection[0].split("\n");
      for (const line of lines) {
        const m = line.match(/^-\s*\[(CONFLICT|GAP|STALE|PENDING)\]\s*(.+)/);
        if (m) flags.push({ type: m[1], text: m[2].trim() });
      }
    }
    // Parse archive entries (## Archive > ### YYYY-MM-DD subsections)
    const archive = [];
    const archiveIdx = raw.indexOf("## Archive");
    if (archiveIdx !== -1) {
      const archiveText = raw.slice(archiveIdx + "## Archive".length);
      const entryRegex = /### (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=### \d{4}-\d{2}-\d{2}|$)/g;
      let m;
      while ((m = entryRegex.exec(archiveText)) !== null) {
        const snapshot = m[2].trim();
        // Extract session startup brief as summary if present
        const briefMatch = snapshot.match(/> (.+)/);
        archive.push({ date: m[1], snapshot, summary: briefMatch ? briefMatch[1].trim() : "" });
      }
    }
    const result = { flags, raw, archive };
    writeCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// Fetches open agent-request issues from vaultspark-studio-ops.
// Returns [{ number, title, body, createdAt, daysOld }] or [].
export async function fetchAgentRequests(token = "", ttlMs = 120000) {
  const key = "agent_requests";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const data = await ghFetch(
      `/repos/${STUDIO_OPS_REPO}/issues?labels=agent-request&state=open&per_page=20`,
      token
    );
    if (!Array.isArray(data)) { writeCache(key, []); return []; }
    const result = data.map((issue) => ({
      number:    issue.number,
      title:     issue.title,
      body:      issue.body || "",
      createdAt: issue.created_at,
      daysOld:   Math.floor((Date.now() - new Date(issue.created_at).getTime()) / 86400000),
      url:       issue.html_url,
    }));
    writeCache(key, result);
    return result;
  } catch {
    return [];
  }
}

// Fetches last-commit dates for key portfolio files in studio-ops.
// Returns { [filename]: { lastCommit: ISOString, daysOld: number } }.
const PORTFOLIO_FILES_TO_TRACK = [
  "portfolio/IGNIS_CORE.md",
  "portfolio/WEEKLY_DIGEST.md",
  "portfolio/DEBT_REPORT.md",
  "portfolio/REVENUE_SIGNALS.md",
  "portfolio/COMMUNITY_PULSE.md",
  "portfolio/CONTENT_PIPELINE.md",
  "portfolio/STUDIO_BRAIN.md",
  "portfolio/SEO_REPORT.md",
  "portfolio/PRESS_PIPELINE.md",
  "portfolio/MEDIA_ASSET_AUDIT.md",
  "portfolio/BRAND_AUDIT.md",
  "portfolio/IP_AUDIT.md",
];

export async function fetchPortfolioFreshness(token = "", ttlMs = 3600000) {
  const key = "portfolio_freshness";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const results = await Promise.all(
      PORTFOLIO_FILES_TO_TRACK.map(async (filePath) => {
        try {
          const data = await ghFetch(
            `/repos/${STUDIO_OPS_REPO}/commits?path=${encodeURIComponent(filePath)}&per_page=1`,
            token
          );
          if (!Array.isArray(data) || !data.length) return [filePath, null];
          const lastCommit = data[0].commit.committer.date;
          const daysOld = Math.floor((Date.now() - new Date(lastCommit).getTime()) / 86400000);
          return [filePath, { lastCommit, daysOld }];
        } catch {
          return [filePath, null];
        }
      })
    );
    const result = Object.fromEntries(results);
    writeCache(key, result);
    return result;
  } catch {
    return {};
  }
}

export async function fetchIgnisCore(token = "", ttlMs = 3600000) {
  const key = "ignis_core";
  const cached = readCache(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE}/repos/${STUDIO_OPS_REPO}/contents/portfolio/IGNIS_CORE.md`, { headers });
    if (!res.ok) { writeCache(key, null); return null; }
    const json = await res.json();
    const raw = atob(json.content.replace(/\n/g, ""));
    const phaseMatch = raw.match(/IGNIS Phase:\s*([^\n]+)/i);
    const tableMatch = raw.match(/## Project IGNIS Scores[\s\S]*?\n((?:\|.*\n)+)/i);
    const rows = [];
    if (tableMatch) {
      const lines = tableMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("|") && !/^\|---/.test(line));
      for (const line of lines.slice(1)) {
        const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
        if (cells.length < 5) continue;
        const rawScore = cells[1].replace(/\*\*/g, "").trim();
        const ignisScore = /^\d+$/.test(rawScore) ? Number(rawScore) : null;
        rows.push({
          project: cells[0].replace(/\*\*/g, "").trim(),
          ignisScore,
          grade: cells[2].replace(/\*\*/g, "").trim(),
          delta: cells[3].replace(/\*\*/g, "").trim(),
          note: cells[4].replace(/\*\*/g, "").trim(),
        });
      }
    }
    const result = {
      phase: phaseMatch?.[1]?.trim() || null,
      raw,
      projectScores: rows,
      trackedCount: rows.filter((row) => Number.isFinite(row.ignisScore)).length,
      untrackedCount: rows.filter((row) => !Number.isFinite(row.ignisScore)).length,
    };
    writeCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// ── GitHub Traffic API ────────────────────────────────────────────────────────
// Requires token with repo scope + collaborator/admin access.
// Returns null gracefully on auth failure so UI can hide the section.
export async function fetchRepoTraffic(repoPath, token = "", ttlMs = 300000) {
  if (!token) return null;
  const key = `traffic_${repoPath.replace(/\//g, "_")}`;
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const [views, clones, referrers, paths] = await Promise.all([
      ghFetch(`/repos/${repoPath}/traffic/views`, token),
      ghFetch(`/repos/${repoPath}/traffic/clones`, token),
      ghFetch(`/repos/${repoPath}/traffic/popular/referrers`, token),
      ghFetch(`/repos/${repoPath}/traffic/popular/paths`, token),
    ]);

    // 403/401 = token lacks repo scope or user isn't a collaborator
    if (isError(views) && (views.__status === 403 || views.__status === 401)) return null;

    const data = {
      views: !isError(views) && views
        ? { count: views.count || 0, uniques: views.uniques || 0, daily: views.views || [] }
        : null,
      clones: !isError(clones) && clones
        ? { count: clones.count || 0, uniques: clones.uniques || 0, daily: clones.clones || [] }
        : null,
      referrers: Array.isArray(referrers) ? referrers.slice(0, 10) : [],
      paths: Array.isArray(paths) ? paths.slice(0, 10) : [],
    };
    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}
