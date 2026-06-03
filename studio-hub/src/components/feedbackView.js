// Feedback review surface — aggregates micro-feedback + exit-intent signal
// from Supabase `page_feedback` and the client-side `vs_micro_feedback_v1`
// localStorage ledger into a single operator view. Closes the write-only
// feedback loop flagged in the S98 audit.
//
// Render contract matches other views: synchronous string return, reading
// state.feedbackData / state.feedbackLoading. Fetch is kicked off by
// loadFeedbackData(state, render) on first activation.

import { getHubRuntimeConfig } from "../config/runtimeConfig.js";

const PAGE_SIZE = 200;

function fetchLocal() {
  try {
    const raw = localStorage.getItem("vs_micro_feedback_v1");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function loadFeedbackData(state, render) {
  if (state.feedbackLoading) return;
  state.feedbackLoading = true;
  if (render) render();

  const cfg = getHubRuntimeConfig();
  const url = cfg.supabaseUrl;
  const key = cfg.supabaseAnonKey || cfg.publishableKey;
  let remote = { ok: false, reason: "no-key", rows: [] };
  if (url && key) {
    try {
      const res = await fetch(
        `${url}/rest/v1/page_feedback?select=page,type,answer,referrer,created_at&order=created_at.desc&limit=${PAGE_SIZE}`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        remote = { ok: true, rows: Array.isArray(rows) ? rows : [] };
      } else {
        remote = { ok: false, reason: `status-${res.status}`, rows: [] };
      }
    } catch {
      remote = { ok: false, reason: "fetch-error", rows: [] };
    }
  }
  state.feedbackData = { remote, local: fetchLocal(), loadedAt: Date.now() };
  state.feedbackLoading = false;
  if (render) render();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function aggregate(rows) {
  const byPage = new Map();
  const byAnswer = new Map();
  for (const r of rows) {
    const p = r.page || "unknown";
    byPage.set(p, (byPage.get(p) || 0) + 1);
    const a = r.answer || "unspecified";
    byAnswer.set(a, (byAnswer.get(a) || 0) + 1);
  }
  const top = [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const ans = [...byAnswer.entries()].sort((a, b) => b[1] - a[1]);
  return { top, ans, total: rows.length };
}

export function renderFeedbackView(state) {
  if (state.feedbackLoading) {
    return `<section class="vshub-view"><header class="vshub-view__head"><h1>Feedback Signal</h1><p class="vshub-view__sub">Loading feedback…</p></header></section>`;
  }
  if (!state.feedbackData) {
    return `<section class="vshub-view"><header class="vshub-view__head"><h1>Feedback Signal</h1><p class="vshub-view__sub">Click <button type="button" data-action="load-feedback" class="btn-ghost">Load</button> to fetch recent entries.</p></header></section>`;
  }

  const { remote, local } = state.feedbackData;
  const rows = [
    ...remote.rows,
    ...local.map((e) => ({ page: e.page, type: e.type, answer: e.answer, created_at: e.ts ? new Date(e.ts).toISOString() : null })),
  ];
  const agg = aggregate(rows);
  const diag = remote.ok
    ? `<span style="color:var(--accent,#7EC9FF);">Supabase feed live &middot; ${remote.rows.length} rows</span>`
    : `<span style="color:#fbbf24;">Supabase read unavailable (${esc(remote.reason)}) &middot; showing ${local.length} local-only rows</span>`;
  const topPages = agg.top.length
    ? agg.top.map(([p, n]) => `<tr><td style="font-family:monospace;font-size:0.82rem;">${esc(p)}</td><td style="text-align:right;font-weight:600;">${n}</td></tr>`).join("")
    : `<tr><td colspan="2" style="color:var(--muted);padding:1rem 0;">No feedback yet.</td></tr>`;
  const answers = agg.ans.length
    ? agg.ans.map(([a, n]) => `<tr><td><strong>${esc(a)}</strong></td><td style="text-align:right;font-weight:600;">${n}</td></tr>`).join("")
    : `<tr><td colspan="2" style="color:var(--muted);">No answers yet.</td></tr>`;
  const recent = rows.slice(0, 30).map((r) => {
    const when = r.created_at ? new Date(r.created_at).toLocaleString() : "";
    return `<tr><td style="font-family:monospace;font-size:0.8rem;">${esc(r.page)}</td><td>${esc(r.type || "exit_intent")}</td><td><strong>${esc(r.answer)}</strong></td><td style="color:var(--muted);font-size:0.8rem;">${esc(when)}</td></tr>`;
  }).join("") || `<tr><td colspan="4" style="color:var(--muted);padding:1rem 0;">No entries.</td></tr>`;

  // One-line CSV export data URL so the operator can pull everything into a
  // spreadsheet without a round-trip to Supabase Studio.
  var csvRows = [['page','type','answer','created_at'].join(',')].concat(
    rows.map(function (r) {
      return ['page','type','answer','created_at'].map(function (k) {
        var v = String(r[k] == null ? '' : r[k]).replace(/"/g, '""');
        return /[",\n]/.test(v) ? '"' + v + '"' : v;
      }).join(',');
    })
  );
  var csvHref = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
  var csvName = 'vaultspark-feedback-' + new Date().toISOString().slice(0, 10) + '.csv';

  return `
    <section class="vshub-view vshub-view--feedback">
      <header class="vshub-view__head">
        <h1>Feedback Signal</h1>
        <p class="vshub-view__sub">Micro-feedback + exit-intent answers from the public site. ${diag}</p>
        <p class="vshub-view__actions" style="margin-top:0.5rem;">
          <a href="${csvHref}" download="${csvName}" class="btn-ghost" style="font-size:0.82rem;">Export CSV (${rows.length} rows)</a>
        </p>
      </header>
      <div class="vshub-grid-2">
        <div class="vshub-card">
          <h3>Top pages by feedback volume</h3>
          <table class="vshub-table"><thead><tr><th>Page</th><th style="text-align:right;">Entries</th></tr></thead><tbody>${topPages}</tbody></table>
        </div>
        <div class="vshub-card">
          <h3>Answer distribution</h3>
          <table class="vshub-table"><thead><tr><th>Answer</th><th style="text-align:right;">Count</th></tr></thead><tbody>${answers}</tbody></table>
        </div>
      </div>
      <div class="vshub-card" style="margin-top:1.25rem;">
        <h3>Recent entries (latest ${Math.min(30, rows.length)})</h3>
        <table class="vshub-table"><thead><tr><th>Page</th><th>Type</th><th>Answer</th><th>When</th></tr></thead><tbody>${recent}</tbody></table>
      </div>
    </section>
  `;
}
