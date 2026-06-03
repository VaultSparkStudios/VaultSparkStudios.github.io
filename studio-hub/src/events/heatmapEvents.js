// Heatmap view event handlers — extracted from clientApp.js

export function bindHeatmapEvents(ctx) {
  const { state, render, scoreProject, PROJECTS, commitVelocity, daysSince } = ctx;

  // Sort columns
  document.querySelectorAll("[data-sort-col]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortCol;
      if (state.heatmapSortKey === key) {
        if (!state.heatmapSortAsc) { state.heatmapSortKey = null; state.heatmapSortAsc = false; }
        else state.heatmapSortAsc = false;
      } else {
        state.heatmapSortKey = key;
        state.heatmapSortAsc = true;
      }
      render();
    });
  });

  // Export CSV
  document.getElementById("heatmap-export-csv")?.addEventListener("click", () => {
    const headers = ["Project","Score","Grade","CI","Issues","PRs","CommitsWeek","LastPush","Sessions7d","Stars","Forks"];
    const csvRows = PROJECTS.map((p) => {
      const d = state.ghData[p.githubRepo] || null;
      const scoring = scoreProject(p, d, state.sbData, state.socialData);
      const ci = d?.ciRuns?.[0];
      const ciVal = !ci ? "" : ci.conclusion === "success" ? "PASS" : ci.conclusion === "failure" ? "FAIL" : ci.conclusion || "";
      const vel = d ? commitVelocity(d.commits).thisWeek : "";
      const stale = daysSince(d?.commits?.[0]?.date);
      const staleVal = stale === Infinity || stale == null ? "" : stale < 1 ? "today" : `${Math.floor(stale)}d`;
      const sessions = state.sbData?.sessions?.[p.supabaseGameSlug]?.week ?? "";
      return [
        p.name, scoring.total, scoring.grade, ciVal,
        d?.repo?.openIssues ?? "", d?.prs?.length ?? "",
        vel, staleVal, sessions, d?.repo?.stars ?? "", d?.repo?.forks ?? "",
      ].map((v) => JSON.stringify(v ?? "")).join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `heatmap-${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  });

  // Column visibility toggles
  document.querySelectorAll("[data-toggle-col]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggleCol;
      if (state.heatmapHiddenCols.has(key)) state.heatmapHiddenCols.delete(key);
      else state.heatmapHiddenCols.add(key);
      render();
    });
  });
}
