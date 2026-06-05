// Digest utilities — Standup and Weekly Digest generators.
// Functions accept (state, logActivity) so they are decoupled from clientApp globals.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "./projectScoring.js";
import { escapeHtml } from "./helpers.js";

// ── Shared modal shell ─────────────────────────────────────────────────────────
function showCopyModal({ id, title, subtitle, text, copyLabel }) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = id;
  el.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:200;
                display:flex; align-items:center; justify-content:center;" id="${id}-backdrop">
      <div role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                  padding:24px; width:min(680px, 90vw); box-shadow:0 24px 80px rgba(0,0,0,0.5);">
        <div style="font-size:13px; font-weight:700; color:var(--silver); margin-bottom:14px;
                    letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
          <span>${escapeHtml(title)}</span>
          ${subtitle ? `<span style="font-size:11px; color:var(--muted); font-weight:400;">${escapeHtml(subtitle)}</span>` : ""}
        </div>
        <pre style="background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
                    padding:14px; font-size:12px; color:var(--text); line-height:1.6;
                    max-height:380px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;
                    font-family:monospace; margin-bottom:14px;">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <div style="display:flex; gap:10px;">
          <button id="${id}-copy-btn" class="btn-primary">${copyLabel}</button>
          <button id="${id}-close-btn" style="font-size:12px; padding:8px 14px; border:1px solid var(--border);
                  border-radius:8px; color:var(--muted); background:none; cursor:pointer;">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById(`${id}-copy-btn`)?.addEventListener("click", () => {
    navigator.clipboard.writeText(text).catch(() => {});
    const btn = document.getElementById(`${id}-copy-btn`);
    if (btn) { btn.textContent = "Copied ✓"; setTimeout(() => { btn.textContent = copyLabel; }, 2000); }
  });
  document.getElementById(`${id}-close-btn`)?.addEventListener("click", () => el.remove());
  document.getElementById(`${id}-backdrop`)?.addEventListener("click", (e) => {
    if (e.target.id === `${id}-backdrop`) el.remove();
  });
}

// ── Standup Generator ─────────────────────────────────────────────────────────
export function generateStandup(state, logActivity) {
  const since24h = Date.now() - 86400000;
  const lines = [];

  for (const p of PROJECTS) {
    const d = state.ghData[p.githubRepo];
    if (!d) continue;
    const recentCommits = (d.commits || []).filter((c) => new Date(c.date).getTime() > since24h);
    if (recentCommits.length > 0) {
      lines.push(`**${p.name}**: ${recentCommits.length} commit${recentCommits.length > 1 ? "s" : ""} — ${recentCommits[0].message.slice(0, 60)}`);
    }
  }

  const openPRTotal = Object.values(state.ghData).reduce((s, d) => s + (d?.prs?.length || 0), 0);
  const failingCI   = PROJECTS.filter((p) => state.ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure");

  const heading = `## Standup — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
  const body    = lines.length ? lines.join("\n") : "No commits in the last 24h.";
  const footer  = [
    openPRTotal > 0 ? `${openPRTotal} PRs open across all projects` : "",
    failingCI.length > 0 ? `⚠ CI failing: ${failingCI.map((p) => p.name).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const text = [heading, body, footer].filter(Boolean).join("\n\n");

  showCopyModal({
    id:        "standup-modal",
    title:     "STANDUP GENERATOR",
    subtitle:  null,
    text,
    copyLabel: "Copy to clipboard",
  });

  logActivity?.("standup", "");
}

// ── Weekly Digest Generator ───────────────────────────────────────────────────
export function generateWeeklyDigest(state, logActivity) {
  const weekMs = 7 * 86400000;
  const since  = Date.now() - weekMs;
  const now    = new Date();
  const date   = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const weekStart = new Date(Date.now() - weekMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekEnd   = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // ── Gather all data ──────────────────────────────────────────────────────
  const scored = PROJECTS.map((p) => {
    const rd = state.ghData[p.githubRepo];
    const sc = scoreProject(p, rd || null, state.sbData, state.socialData);
    return { project: p, score: sc.total, grade: sc.grade, name: p.name };
  }).sort((a, b) => b.score - a.score);

  const studioAvg = Math.round(scored.reduce((s, p) => s + p.score, 0) / (scored.length || 1));
  const topProject = scored[0];
  const bottomProject = scored[scored.length - 1];

  let gainers = [], droppers = [];
  if (state.scoreHistory.length >= 2) {
    const prev = state.scoreHistory[state.scoreHistory.length - 2].scores || {};
    const curr = state.scoreHistory[state.scoreHistory.length - 1].scores || {};
    gainers = PROJECTS.map((p) => ({ name: p.name, delta: (curr[p.id] ?? 0) - (prev[p.id] ?? 0) }))
      .filter((p) => p.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    droppers = PROJECTS.map((p) => ({ name: p.name, delta: (curr[p.id] ?? 0) - (prev[p.id] ?? 0) }))
      .filter((p) => p.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  }

  const failing = PROJECTS.filter((p) => state.ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure");
  const passing = PROJECTS.filter((p) => state.ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "success");

  let commitCount = 0, activeRepos = 0;
  const newReleases = [];
  const projectActivity = [];
  for (const p of PROJECTS) {
    const d = state.ghData[p.githubRepo];
    if (!d) continue;
    const wk = (d.commits || []).filter((c) => new Date(c.date).getTime() > since);
    if (wk.length) {
      commitCount += wk.length;
      activeRepos++;
      projectActivity.push({ name: p.name, commits: wk.length, latest: wk[0].message.slice(0, 60) });
    }
    if (d.latestRelease && new Date(d.latestRelease.publishedAt).getTime() > since)
      newReleases.push({ name: p.name, tag: d.latestRelease.tag });
  }
  projectActivity.sort((a, b) => b.commits - a.commits);

  const stale = PROJECTS.filter((p) => {
    const last = state.ghData[p.githubRepo]?.commits?.[0];
    return last && (Date.now() - new Date(last.date).getTime()) > 14 * 86400000;
  });

  let weekRev = 0;
  const gumroadSales = state.socialData?.gumroadSales;
  if (gumroadSales?.length) {
    weekRev = gumroadSales.filter((s) => new Date(s.createdAt).getTime() > since).reduce((t, s) => t + (s.price || 0), 0);
  }

  // ── Build newsletter ────────────────────────────────────────────────────
  const lines = [];

  // Header
  lines.push(`# VaultSpark Studio — Weekly Digest`);
  lines.push(`**Week of ${weekStart} – ${weekEnd}** · _${date}_`);
  lines.push("");

  // Editorial lead
  const healthWord = studioAvg >= 75 ? "strong" : studioAvg >= 50 ? "steady" : "under pressure";
  const activityNote = commitCount > 0
    ? `${commitCount} commits landed across ${activeRepos} project${activeRepos !== 1 ? "s" : ""}`
    : "a quiet week on the commit front";
  lines.push(`> The studio is looking **${healthWord}** this week with a portfolio average of **${studioAvg}/130**. We saw ${activityNote}${newReleases.length > 0 ? `, along with ${newReleases.length} fresh release${newReleases.length !== 1 ? "s" : ""}` : ""}. Here's everything you need to know.`);
  lines.push("");

  // Portfolio snapshot
  lines.push("---");
  lines.push("## Portfolio Snapshot");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Studio Average | **${studioAvg}/130** |`);
  lines.push(`| Top Performer | ${topProject ? `${topProject.name} (${topProject.score} · ${topProject.grade})` : "—"} |`);
  lines.push(`| Needs Love | ${bottomProject ? `${bottomProject.name} (${bottomProject.score} · ${bottomProject.grade})` : "—"} |`);
  lines.push(`| Active Projects | ${activeRepos} of ${PROJECTS.length} |`);
  lines.push(`| CI Health | ${passing.length} passing · ${failing.length} failing |`);
  if (weekRev > 0) lines.push(`| Revenue (Gumroad) | **$${weekRev.toFixed(2)}** |`);
  lines.push("");

  // Movers & shakers
  if (gainers.length || droppers.length) {
    lines.push("## Movers & Shakers");
    lines.push("");
    if (gainers.length) {
      lines.push("**Rising this week:**");
      for (const g of gainers) lines.push(`- ${g.name} — up **+${g.delta}** points`);
      lines.push("");
    }
    if (droppers.length) {
      lines.push("**Sliding this week:**");
      for (const d of droppers) lines.push(`- ${d.name} — down **${d.delta}** points`);
      lines.push("");
    }
  }

  // Dev activity
  if (projectActivity.length) {
    lines.push("---");
    lines.push("## Development Roundup");
    lines.push("");
    if (commitCount === 0) {
      lines.push("No commits this week — the repos are resting.");
    } else {
      lines.push(`A total of **${commitCount} commits** shipped this week. Here's where the action was:`);
      lines.push("");
      for (const pa of projectActivity.slice(0, 6)) {
        lines.push(`- **${pa.name}** — ${pa.commits} commit${pa.commits !== 1 ? "s" : ""} · _"${pa.latest}"_`);
      }
      if (projectActivity.length > 6) lines.push(`- ...and ${projectActivity.length - 6} more active project${projectActivity.length - 6 !== 1 ? "s" : ""}`);
    }
    lines.push("");
  }

  // Releases
  if (newReleases.length) {
    lines.push("## Fresh Releases");
    lines.push("");
    for (const r of newReleases) lines.push(`- **${r.name}** shipped \`${r.tag}\``);
    lines.push("");
  }

  // CI report
  lines.push("---");
  lines.push("## Build & CI Report");
  lines.push("");
  if (failing.length === 0) {
    lines.push("All green across the board — every project is passing CI.");
  } else {
    lines.push(`${passing.length} project${passing.length !== 1 ? "s" : ""} passing, but **${failing.length} need${failing.length === 1 ? "s" : ""} attention**:`);
    lines.push("");
    for (const p of failing) lines.push(`- **${p.name}** — CI failing`);
  }
  lines.push("");

  // Stale repos
  if (stale.length) {
    lines.push("## On the Shelf");
    lines.push("");
    lines.push(`These projects haven't seen a commit in over two weeks:`);
    lines.push("");
    for (const p of stale) lines.push(`- ${p.name}`);
    lines.push("");
  }

  // Sign-off
  lines.push("---");
  lines.push(`_That's a wrap for this week. Keep shipping._`);
  lines.push(`_— VaultSpark Studio Hub_`);

  const text = lines.join("\n");

  showCopyModal({
    id:        "digest-modal",
    title:     "WEEKLY DIGEST",
    subtitle:  `${weekStart} – ${weekEnd}`,
    text,
    copyLabel: "Copy markdown",
  });

  logActivity?.("weekly_digest", "");
}
