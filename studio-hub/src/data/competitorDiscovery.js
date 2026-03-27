// Competitor auto-discovery — uses PROJECTS as baseline to find similar repos via GitHub Search API
// User-initiated only (respects rate limits). Results cached in sessionStorage.

import { PROJECTS } from "./studioRegistry.js";
import { fetchCompetitorSearch } from "./githubAdapter.js";

// ── Curated search hints per project (higher quality than auto-extracted keywords) ──
const DISCOVERY_HINTS = {
  "call-of-doodie":   "multiplayer shooter browser game javascript",
  "gridiron-gm":      "football manager simulation game",
  "football-gm":      "football gm simulation javascript",
  "dunescape":        "survival game open world javascript",
  "vaultfront":       "strategy game territory conquest",
  "vaultspark-forge": "crafting building sandbox game",
  "the-exodus":       "survival narrative adventure game",
  "voidfall":         "space action roguelike game",
  "promogrind":       "marketing promotion automation tool",
  "mindframe":        "AI productivity framework tool",
  "cryptomatrix-pro": "crypto portfolio analytics dashboard",
  "statsforge":       "sports analytics statistics platform",
  "vorn":             "AI agent social platform marketplace",
};

// ── Stopwords for fallback keyword extraction ────────────────────────────────
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "in", "on", "to", "is", "it",
  "with", "by", "from", "as", "at", "this", "that", "be", "are", "was", "were",
  "vaultspark", "studios", "internal",
]);

function extractKeywords(description) {
  if (!description) return "";
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 5)
    .join(" ");
}

function buildSearchQuery(project, ghData) {
  const hint = DISCOVERY_HINTS[project.id];
  const keywords = hint || extractKeywords(project.description);
  if (!keywords) return null;

  const lang = ghData?.[project.githubRepo]?.repo?.language;
  const langFilter = lang ? ` language:${lang}` : "";
  return `${keywords}${langFilter} stars:>50`;
}

// ── Priority ordering: games first (most likely to have competitors), then tools, then platforms ──
const TYPE_PRIORITY = { game: 0, tool: 1, platform: 2, infrastructure: 3 };

export async function discoverCompetitors(ghData, token, dismissedSet = new Set(), manualSet = new Set()) {
  const candidates = PROJECTS
    .filter((p) => p.type !== "infrastructure" && p.status !== "archived")
    .sort((a, b) => (TYPE_PRIORITY[a.type] ?? 9) - (TYPE_PRIORITY[b.type] ?? 9));

  // Build unique queries — cap at 5 to respect rate limits
  const searches = [];
  const seen = new Set();
  for (const p of candidates) {
    if (searches.length >= 5) break;
    const q = buildSearchQuery(p, ghData);
    if (!q || seen.has(q)) continue;
    seen.add(q);
    searches.push({ project: p, query: q });
  }

  const allResults = [];
  const repoSeen = new Set();

  // Run searches sequentially (search API is more rate-limited than REST)
  for (const { project, query } of searches) {
    try {
      const results = await fetchCompetitorSearch(query, token);
      if (!results?.items) continue;

      for (const item of results.items) {
        const fullName = item.full_name;
        // Skip own repos
        if (fullName.startsWith("VaultSparkStudios/")) continue;
        // Skip already tracked or dismissed
        if (manualSet.has(fullName) || dismissedSet.has(fullName)) continue;

        if (repoSeen.has(fullName)) {
          // Merge matched project into existing entry
          const existing = allResults.find((r) => r.full_name === fullName);
          if (existing && !existing.matchedProjects.includes(project.name)) {
            existing.matchedProjects.push(project.name);
          }
          continue;
        }

        repoSeen.add(fullName);
        allResults.push({
          full_name: fullName,
          description: item.description || "",
          stars: item.stargazers_count ?? 0,
          forks: item.forks_count ?? 0,
          language: item.language || null,
          pushedAt: item.pushed_at || null,
          topics: item.topics || [],
          matchedProjects: [project.name],
          source: "auto",
        });
      }
    } catch {
      // Skip failed searches silently
    }
  }

  // Sort by stars descending
  allResults.sort((a, b) => b.stars - a.stars);

  return {
    discovered: allResults,
    searchesRun: searches.length,
    totalFound: allResults.length,
    fetchedAt: new Date().toISOString(),
  };
}
