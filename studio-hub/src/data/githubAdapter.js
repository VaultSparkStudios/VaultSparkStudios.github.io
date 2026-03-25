// GitHub REST API adapter
// Fetches live repo data with sessionStorage caching and graceful degradation.
// Adding a new repo: no code changes needed — pass any repoPath to fetchRepoData().

const BASE = "https://api.github.com";
const CACHE_PREFIX = "vshub_gh_";

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

async function ghFetch(path, token) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

// Fetch all meaningful data for one repo in parallel.
// repoPath format: "owner/repo"  e.g. "VaultSparkStudios/call-of-doodie"
export async function fetchRepoData(repoPath, token = "", ttlMs = 300000) {
  const cached = readCache(repoPath, ttlMs);
  if (cached) return cached;

  try {
    const [repo, commits, issues, prs, runs, release] = await Promise.all([
      ghFetch(`/repos/${repoPath}`, token),
      ghFetch(`/repos/${repoPath}/commits?per_page=5`, token),
      ghFetch(`/repos/${repoPath}/issues?state=open&per_page=10&pulls=false`, token),
      ghFetch(`/repos/${repoPath}/pulls?state=open&per_page=10`, token),
      ghFetch(`/repos/${repoPath}/actions/runs?per_page=3`, token),
      ghFetch(`/repos/${repoPath}/releases/latest`, token),
    ]);

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

// Convenience: fetch data for multiple repos in parallel.
export async function fetchAllRepos(repoPaths, token = "", ttlMs = 300000) {
  const results = await Promise.all(
    repoPaths.map((r) => fetchRepoData(r, token, ttlMs).then((d) => ({ repo: r, data: d })))
  );
  return Object.fromEntries(results.map(({ repo, data }) => [repo, data]));
}
