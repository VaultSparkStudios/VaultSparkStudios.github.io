// AI-Generated Project Prescriptions (#21)
// Calls Claude API (claude-haiku-4-5) with project signals to produce a short,
// actionable recommendation. Key stored in localStorage credentials only.
// Cache: 12h per project to avoid burning API budget.

const CACHE_KEY = "vshub_ai_prescriptions";
const CACHE_TTL_MS = 12 * 3600000; // 12 hours
const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 120;

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

// Returns cached prescription string for projectId, or null if stale/missing.
export function getCachedPrescription(projectId) {
  const cache = loadCache();
  const entry = cache[projectId];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.text;
}

// Clears all cached prescriptions (e.g. after a sync when scores change).
export function invalidatePrescriptionCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// Clears the cached prescription for a single project.
export function invalidatePrescriptionFor(projectId) {
  try {
    const cache = loadCache();
    delete cache[projectId];
    saveCache(cache);
  } catch {}
}

// Fetches a prescription from Claude for a single project.
// scoring: result of scoreProject(). repoData: GitHub adapter data.
// Returns { ok: true, text: "..." } or { ok: false, error: "..." }.
export async function fetchPrescription(project, scoring, repoData, claudeApiKey) {
  if (!claudeApiKey) return { ok: false, error: "No Claude API key configured" };

  const cached = getCachedPrescription(project.id);
  if (cached) return { ok: true, text: cached, cached: true };

  const signals = [
    `Score: ${scoring.total}/100 (${scoring.grade})`,
    `Dev Health: ${scoring.pillars.development.score}/30 — ${(scoring.pillars.development.signals || []).slice(0,2).join(", ")}`,
    `Engagement: ${scoring.pillars.engagement.score}/25 — ${(scoring.pillars.engagement.signals || []).slice(0,2).join(", ")}`,
    `Momentum: ${scoring.pillars.momentum.score}/25 — ${(scoring.pillars.momentum.signals || []).slice(0,2).join(", ")}`,
    `Risk: ${scoring.pillars.risk.score}/20 — ${(scoring.pillars.risk.signals || []).slice(0,2).join(", ")}`,
    repoData?.repo?.openIssues != null ? `Open issues: ${repoData.repo.openIssues}` : null,
    repoData?.prs?.length ? `Open PRs: ${repoData.prs.length}` : null,
    repoData?.commits?.[0]?.date ? `Last commit: ${new Date(repoData.commits[0].date).toLocaleDateString()}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are a concise technical advisor for an indie game studio.

Project: ${project.name} (${project.type}, status: ${project.status})
${signals}

In exactly 2 sentences: what is the single most impactful action this project should take RIGHT NOW to improve its health score? Be specific and actionable. No fluff.`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message || `API ${res.status}` };
    }
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return { ok: false, error: "Empty response from Claude" };

    // Cache result
    const cache = loadCache();
    cache[project.id] = { ts: Date.now(), text };
    saveCache(cache);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Automated Devlog Draft (#22) ─────────────────────────────────────────────
// Generates a weekly devlog entry from recent commit summaries.
const DEVLOG_CACHE_KEY = "vshub_devlog_drafts";
const DEVLOG_CACHE_TTL_MS = 24 * 3600000; // 24h

function loadDevlogCache() {
  try { return JSON.parse(localStorage.getItem(DEVLOG_CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveDevlogCache(cache) {
  try { localStorage.setItem(DEVLOG_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export function getCachedDevlogDraft(projectId) {
  const entry = loadDevlogCache()[projectId];
  if (!entry) return null;
  if (Date.now() - entry.ts > DEVLOG_CACHE_TTL_MS) return null;
  return entry.text;
}

export function invalidateDevlogDraft(projectId) {
  try {
    const cache = loadDevlogCache();
    delete cache[projectId];
    saveDevlogCache(cache);
  } catch {}
}

export async function fetchDevlogDraft(project, repoData, claudeApiKey) {
  if (!claudeApiKey) return { ok: false, error: "No Claude API key configured" };

  const cached = getCachedDevlogDraft(project.id);
  if (cached) return { ok: true, text: cached, cached: true };

  const commits = (repoData?.commits || []).slice(0, 10);
  if (!commits.length) return { ok: false, error: "No recent commits to summarise" };

  const commitList = commits
    .map((c) => `- ${c.message?.split("\n")[0]?.slice(0, 80) || "(no message)"} (${new Date(c.date).toLocaleDateString()})`)
    .join("\n");

  const prompt = `You are writing a short weekly devlog for an indie game studio blog.

Project: ${project.name} (${project.type}, status: ${project.status})
Recent commits:
${commitList}

Write a 3–4 sentence devlog entry in a casual, first-person developer voice. Summarise what was built or fixed, why it matters, and what comes next. Do not mention commit hashes or technical jargon. No markdown.`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message || `API ${res.status}` };
    }
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return { ok: false, error: "Empty response from Claude" };

    const cache = loadDevlogCache();
    cache[project.id] = { ts: Date.now(), text };
    saveDevlogCache(cache);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Fetches prescriptions for the N lowest-scoring projects.
// Returns { [projectId]: { ok, text } }
export async function fetchTopPrescriptions(projects, allScores, ghData, claudeApiKey, maxProjects = 3) {
  if (!claudeApiKey) return {};
  // Sort by score ascending (worst first)
  const sorted = [...allScores].sort((a, b) => a.scoring.total - b.scoring.total);
  const targets = sorted.slice(0, maxProjects);
  const results = {};
  // Sequential to avoid hammering the API
  for (const { project, scoring } of targets) {
    const repoData = ghData[project.githubRepo] || null;
    results[project.id] = await fetchPrescription(project, scoring, repoData, claudeApiKey);
  }
  return results;
}
