// Export utilities — JSON and CSV snapshot downloads.
// Accepts the app state object so this module is side-effect free.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "./projectScoring.js";

export function buildExportData(state) {
  const projects = PROJECTS.map((p) => {
    const repoData = state.ghData[p.githubRepo] || null;
    const scoring  = scoreProject(p, repoData, state.sbData, state.socialData);
    return {
      id:            p.id,
      name:          p.name,
      type:          p.type,
      status:        p.status,
      score:         scoring.total,
      grade:         scoring.grade,
      lastCommit:    repoData?.commits?.[0]?.date || null,
      openIssues:    repoData?.repo?.openIssues ?? null,
      openPRs:       repoData?.prs?.length ?? null,
      ciStatus:      repoData?.ciRuns?.[0]?.conclusion || null,
      latestRelease: repoData?.latestRelease?.tag || null,
      stars:         repoData?.repo?.stars ?? null,
    };
  });
  return {
    exported:     new Date().toISOString(),
    version:      "1.0",
    studioScore:  Math.round(projects.reduce((s, p) => s + p.score, 0) / (projects.length || 1)),
    projects,
    scoreHistory: state.scoreHistory,
  };
}

export function downloadJSON(state) {
  const data = buildExportData(state);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `vshub-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadScoreHistoryCSV(state) {
  const history = state.scoreHistory || [];
  if (!history.length) return;
  const projectIds = Object.keys(history[0]?.scores || {});
  const headers = ["date", "studioAvg", ...projectIds];
  const rows = history.map((h) => {
    const vals = projectIds.map((id) => JSON.stringify(h.scores?.[id] ?? ""));
    const avg = projectIds.length
      ? Math.round(projectIds.reduce((s, id) => s + (h.scores?.[id] ?? 0), 0) / projectIds.length)
      : "";
    return [JSON.stringify(h.date || ""), JSON.stringify(avg), ...vals].join(",");
  });
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `vshub-score-history-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(state) {
  const data = buildExportData(state);
  const headers = ["id","name","type","status","score","grade","lastCommit","openIssues","openPRs","ciStatus","latestRelease","stars"];
  const rows = data.projects.map((p) => headers.map((h) => JSON.stringify(p[h] ?? "")).join(","));
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `vshub-snapshot-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
