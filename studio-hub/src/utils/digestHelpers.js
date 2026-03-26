// Digest utilities — Standup and Weekly Digest generators.
// Functions accept (state, logActivity) so they are decoupled from clientApp globals.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "./projectScoring.js";

// ── Shared modal shell ─────────────────────────────────────────────────────────
function showCopyModal({ id, title, subtitle, text, copyLabel }) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = id;
  el.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:200;
                display:flex; align-items:center; justify-content:center;" id="${id}-backdrop">
      <div style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                  padding:24px; width:min(680px, 90vw); box-shadow:0 24px 80px rgba(0,0,0,0.5);">
        <div style="font-size:13px; font-weight:700; color:var(--silver); margin-bottom:14px;
                    letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
          <span>${title}</span>
          ${subtitle ? `<span style="font-size:11px; color:var(--muted); font-weight:400;">${subtitle}</span>` : ""}
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
  const date   = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const lines = [`# VaultSpark Studio — Weekly Digest`, `_${date}_`, ""];

  // Score changes
  const scored = PROJECTS.map((p) => {
    const rd = state.ghData[p.githubRepo];
    const sc = scoreProject(p, rd || null, state.sbData, state.socialData);
    return { project: p, score: sc.total, grade: sc.grade };
  }).sort((a, b) => b.score - a.score);

  lines.push("## Portfolio Health");
  const studioAvg = Math.round(scored.reduce((s, p) => s + p.score, 0) / (scored.length || 1));
  lines.push(`Overall studio average: **${studioAvg}/100**`);

  // Top movers
  if (state.scoreHistory.length >= 2) {
    const prev = state.scoreHistory[state.scoreHistory.length - 2].scores || {};
    const curr = state.scoreHistory[state.scoreHistory.length - 1].scores || {};
    const gainers = PROJECTS.map((p) => ({ name: p.name, delta: (curr[p.id] ?? 0) - (prev[p.id] ?? 0) }))
      .filter((p) => p.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    const droppers = PROJECTS.map((p) => ({ name: p.name, delta: (curr[p.id] ?? 0) - (prev[p.id] ?? 0) }))
      .filter((p) => p.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
    if (gainers.length) { lines.push(""); lines.push("**Top movers (↑):** " + gainers.map((g) => `${g.name} +${g.delta}`).join(", ")); }
    if (droppers.length) lines.push("**Needs attention (↓):** " + droppers.map((d) => `${d.name} ${d.delta}`).join(", "));
  }

  // CI status
  const failing = PROJECTS.filter((p) => state.ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure");
  const passing = PROJECTS.filter((p) => state.ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "success");
  lines.push(""); lines.push("## CI Status");
  lines.push(`✓ Passing: ${passing.length} · ✗ Failing: ${failing.length}`);
  if (failing.length) lines.push(`Failed builds: ${failing.map((p) => p.name).join(", ")}`);

  // Commits this week
  lines.push(""); lines.push("## Development Activity");
  let commitCount = 0, activeRepos = 0;
  const newReleases = [];
  for (const p of PROJECTS) {
    const d = state.ghData[p.githubRepo];
    if (!d) continue;
    const wk = (d.commits || []).filter((c) => new Date(c.date).getTime() > since);
    if (wk.length) { commitCount += wk.length; activeRepos++; }
    if (d.latestRelease && new Date(d.latestRelease.publishedAt).getTime() > since)
      newReleases.push(`${p.name} ${d.latestRelease.tag}`);
  }
  lines.push(`Commits this week: **${commitCount}** across ${activeRepos} projects`);
  if (newReleases.length) lines.push(`New releases: ${newReleases.join(", ")}`);

  // Stale repos
  const stale = PROJECTS.filter((p) => {
    const last = state.ghData[p.githubRepo]?.commits?.[0];
    return last && (Date.now() - new Date(last.date).getTime()) > 14 * 86400000;
  });
  if (stale.length) {
    lines.push(""); lines.push("## Needs Attention");
    lines.push(`Inactive 14+ days: ${stale.map((p) => p.name).join(", ")}`);
  }

  // Revenue
  const gumroadSales = state.socialData?.gumroadSales;
  if (gumroadSales?.length) {
    const weekRev = gumroadSales.filter((s) => new Date(s.createdAt).getTime() > since).reduce((t, s) => t + (s.price || 0), 0);
    if (weekRev > 0) {
      lines.push(""); lines.push("## Revenue");
      lines.push(`Gumroad this week: **$${weekRev.toFixed(2)}**`);
    }
  }

  const text = lines.join("\n");

  showCopyModal({
    id:        "digest-modal",
    title:     "WEEKLY DIGEST",
    subtitle:  date,
    text,
    copyLabel: "Copy markdown",
  });

  logActivity?.("weekly_digest", "");
}
