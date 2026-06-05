// prReviewView.js — PR Review Dashboard
// Aggregates open pull request stats across all registered repos.

import { PROJECTS } from "../data/studioRegistry.js";
import { escapeHtml } from "../utils/helpers.js";

function daysBetween(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function ageColor(days) {
  if (days > 14) return "var(--red, #f87171)";
  if (days >= 7) return "var(--gold, #ffc874)";
  return "var(--green, #6ee7b7)";
}

function ageBgColor(days) {
  if (days > 14) return "rgba(248,113,113,0.08)";
  if (days >= 7) return "rgba(255,200,116,0.08)";
  return "rgba(110,231,183,0.06)";
}

function labelBadge(label) {
  const name = typeof label === "string" ? label : label?.name || "";
  const color = (typeof label === "object" && label?.color) ? `#${label.color}` : "var(--muted)";
  return `<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;border:1px solid ${color};color:${color};margin-right:3px;line-height:1.4;">${escapeHtml(name)}</span>`;
}

function summaryCard(label, value, accent = "var(--cyan)") {
  return `
    <div style="background:var(--card, var(--panel));border:1px solid var(--border);border-radius:10px;
                padding:16px 20px;min-width:140px;flex:1;display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
      <div style="font-size:28px;font-weight:700;color:${accent};line-height:1.1;">${value}</div>
    </div>`;
}

export function renderPrReviewView(state) {
  const { ghData = {} } = state;

  // Collect all open PRs across repos
  const allPrs = [];
  for (const p of PROJECTS) {
    const repo = p.githubRepo;
    if (!repo) continue;
    const rd = ghData[repo];
    const prs = rd?.pullRequests;
    if (!Array.isArray(prs)) continue;
    for (const pr of prs) {
      allPrs.push({ ...pr, projectName: p.name, projectColor: p.color, repo });
    }
  }

  // Stats
  const total = allPrs.length;
  const drafts = allPrs.filter((pr) => pr.draft).length;
  const ages = allPrs.map((pr) => daysBetween(pr.createdAt));
  const avgAge = total > 0 ? (ages.reduce((a, b) => a + b, 0) / total).toFixed(1) : "0";
  const stale = ages.filter((d) => d > 14).length;

  // Sort by age descending by default
  const sorted = [...allPrs].sort((a, b) => daysBetween(b.createdAt) - daysBetween(a.createdAt));

  const summaryHtml = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${summaryCard("Open PRs", total, "var(--cyan)")}
      ${summaryCard("Avg Age", `${avgAge}d`, "var(--text)")}
      ${summaryCard("Drafts", drafts, "var(--muted)")}
      ${summaryCard("Stale (>14d)", stale, stale > 0 ? "var(--red, #f87171)" : "var(--green, #6ee7b7)")}
    </div>`;

  let tableRows = "";
  if (sorted.length === 0) {
    tableRows = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted);">No open pull requests found. Data loads from GitHub on sync.</td></tr>`;
  } else {
    for (const pr of sorted) {
      const age = daysBetween(pr.createdAt);
      const lastActivityDays = daysBetween(pr.updatedAt);
      const hasActivity = pr.updatedAt && pr.updatedAt !== pr.createdAt;
      const activityNote = hasActivity
        ? `<span style="font-size:10px;color:var(--muted);">last activity ${lastActivityDays}d ago</span>`
        : "";
      const draftBadge = pr.draft
        ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:var(--border);color:var(--muted);margin-left:4px;">Draft</span>`
        : "";
      const labels = Array.isArray(pr.labels)
        ? pr.labels.map(labelBadge).join("")
        : "";

      tableRows += `
        <tr style="border-bottom:1px solid var(--border);background:${ageBgColor(age)};">
          <td style="padding:10px 12px;white-space:nowrap;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${pr.projectColor};margin-right:6px;vertical-align:middle;"></span>
            ${escapeHtml(pr.projectName)}
          </td>
          <td style="padding:10px 12px;">
            <a href="${escapeHtml(pr.url || "#")}" target="_blank" rel="noopener"
               style="color:var(--cyan);text-decoration:none;">${escapeHtml(pr.title || "Untitled")}</a>
            ${draftBadge}
          </td>
          <td style="padding:10px 12px;color:var(--text);font-size:12px;">${escapeHtml(pr.author || "unknown")}</td>
          <td style="padding:10px 12px;white-space:nowrap;">
            <span style="color:${ageColor(age)};font-weight:600;">${age}d</span>
            <br>${activityNote}
          </td>
          <td style="padding:10px 12px;">${labels || `<span style="color:var(--muted);font-size:11px;">—</span>`}</td>
        </tr>`;
    }
  }

  return `
    <div class="main-panel" style="padding:28px 32px;max-width:1200px;">
      <h2 style="margin:0 0 4px;font-size:22px;color:var(--text);">PR Review Dashboard</h2>
      <p style="margin:0 0 20px;font-size:13px;color:var(--muted);">Open pull requests across all ${PROJECTS.length} repos</p>

      ${summaryHtml}

      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:10px;background:var(--panel);">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);text-align:left;">
              <th style="padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Project</th>
              <th style="padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Pull Request</th>
              <th style="padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Author</th>
              <th style="padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Age</th>
              <th style="padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Labels</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>`;
}
