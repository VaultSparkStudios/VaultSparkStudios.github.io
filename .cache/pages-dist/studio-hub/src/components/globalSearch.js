// Global Search (#11) — Cmd+K / Ctrl+K modal
// Searches projects (name, type, status), scores, notes, agents across all hub data.
// Purely client-side; operates on in-memory state passed at open-time.

let _activeCtx = null;

// ── Result builders ───────────────────────────────────────────────────────────

function buildResults(query, ctx) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { PROJECTS, allScores, ghData, navigate } = ctx;
  const results = [];

  // Projects
  for (const p of PROJECTS) {
    const score = allScores?.find((s) => s.project.id === p.id)?.scoring;
    const nameMatch    = p.name.toLowerCase().includes(q);
    const typeMatch    = p.type?.toLowerCase().includes(q);
    const statusMatch  = p.status?.toLowerCase().includes(q);
    const scoreMatch   = score && String(score.total).includes(q);
    const gradeMatch   = score && score.grade?.toLowerCase().includes(q);

    if (nameMatch || typeMatch || statusMatch || scoreMatch || gradeMatch) {
      results.push({
        type: "project",
        label: p.name,
        sub: score ? `${score.total} — ${score.grade} · ${p.type}` : p.type,
        icon: "◈",
        color: p.color || "var(--cyan)",
        action: () => navigate(`project:${p.id}`),
        score: nameMatch ? 10 : 5,
      });
    }

    // Notes
    try {
      const notes = JSON.parse(localStorage.getItem("vshub_notes") || "{}");
      const note = notes[p.id];
      if (note && note.toLowerCase().includes(q)) {
        results.push({
          type: "note",
          label: `Note: ${p.name}`,
          sub: note.slice(0, 80) + (note.length > 80 ? "…" : ""),
          icon: "📝",
          color: "var(--muted)",
          action: () => navigate(`project:${p.id}`),
          score: 6,
        });
      }
    } catch {}

    // Action queue
    try {
      const queue = JSON.parse(localStorage.getItem("vshub_action_queue") || "{}");
      const items = queue[p.id] || [];
      for (const item of (Array.isArray(items) ? items : [])) {
        if (item.text?.toLowerCase().includes(q)) {
          results.push({
            type: "action",
            label: `Action: ${p.name}`,
            sub: item.text.slice(0, 80),
            icon: "▸",
            color: "var(--cyan)",
            action: () => navigate(`project:${p.id}`),
            score: 4,
          });
        }
      }
    } catch {}
  }

  // Views
  const VIEWS = [
    { id: "studio-hub",   label: "Studio Hub",        icon: "⬡", sub: "Main dashboard" },
    { id: "heatmap",      label: "Heatmap",            icon: "▦", sub: "Score grid" },
    { id: "compare",      label: "Compare",            icon: "⇌", sub: "Side-by-side comparison" },
    { id: "timeline",     label: "Portfolio Timeline", icon: "⏱", sub: "Chronological feed" },
    { id: "social",       label: "Social Accounts",    icon: "◎", sub: "YouTube · Reddit · Bluesky" },
    { id: "agents",       label: "Studio Agents",      icon: "◉", sub: "Agent roster + dispatch" },
    { id: "agent-commands",label:"Agent Commands",     icon: "◈", sub: "Protocols + governance" },
    { id: "settings",     label: "Settings",           icon: "⚙", sub: "Credentials · Scoring · Display" },
    { id: "ambient",      label: "Ambient Mode",       icon: "◌", sub: "Fullscreen ambient display" },
    { id: "ticketing",    label: "Ticketing",          icon: "◻", sub: "Studio issue tracker" },
  ];
  for (const v of VIEWS) {
    if (v.label.toLowerCase().includes(q) || v.sub.toLowerCase().includes(q) || v.id.includes(q)) {
      results.push({
        type: "view",
        label: v.label,
        sub: v.sub,
        icon: v.icon,
        color: "var(--text)",
        action: () => navigate(v.id),
        score: 3,
      });
    }
  }

  // Scores — "score above N", "grade A", etc.
  if (q.startsWith("score") || q.startsWith("grade") || /^\d{2,3}$/.test(q)) {
    const threshold = parseInt(q.replace(/\D/g, ""), 10);
    if (!isNaN(threshold) && allScores) {
      for (const { project, scoring } of allScores) {
        if (Math.abs(scoring.total - threshold) <= 5) {
          results.push({
            type: "score",
            label: `${project.name} — ${scoring.total}`,
            sub: `Grade ${scoring.grade} · near ${threshold}`,
            icon: "●",
            color: scoring.gradeColor || "var(--cyan)",
            action: () => navigate(`project:${project.id}`),
            score: 7,
          });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10);
}

// ── Natural Language Hub Query (#12) ─────────────────────────────────────────
// Query prefixed with "?" triggers a Claude API call for studio-wide intelligence.
const NLQ_MODEL = "claude-haiku-4-5-20251001";
const NLQ_API   = "https://api.anthropic.com/v1/messages";

async function handleNLQ(query, ctx) {
  const { claudeApiKey, allScores = [], navigate } = ctx;
  if (!claudeApiKey) {
    return [{
      type: "nlq", label: "Claude API key not configured",
      sub: "Add key in Settings → Credentials → Claude API Key",
      icon: "◈", color: "var(--red)", action: () => navigate("settings"), score: 10,
    }];
  }

  // Build a concise portfolio summary for context
  const portfolioCtx = allScores.map(({ project: p, scoring: s }) =>
    `${p.name} (${p.type}, ${p.status}): score ${s.total} ${s.grade}`
  ).join("\n");

  const prompt = `You are a concise studio ops assistant for VaultSpark, an indie game studio.

Current portfolio:
${portfolioCtx}

Question: ${query.slice(1).trim()}

Answer in 1-2 sentences. Be specific and data-driven. If listing projects, name them.`;

  try {
    const res = await fetch(NLQ_API, {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: NLQ_MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "No response";
    return [{ type: "nlq", label: "AI Answer", sub: text, icon: "◈", color: "var(--cyan)", action: () => {}, score: 10 }];
  } catch (err) {
    return [{ type: "nlq", label: "NLQ Error", sub: err.message, icon: "◈", color: "var(--red)", action: () => {}, score: 10 }];
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function getModal() { return document.getElementById("global-search-modal"); }
function getInput() { return document.getElementById("global-search-input"); }
function getResultsList() { return document.getElementById("global-search-results"); }

function renderResults(results) {
  const list = getResultsList();
  if (!list) return;
  if (!results.length) {
    list.innerHTML = `<div style="padding:12px 16px; font-size:12px; color:var(--muted); text-align:center;">No results</div>`;
    return;
  }
  list.innerHTML = results.map((r, i) => `
    <div class="gs-result" data-idx="${i}" tabindex="0"
         style="display:flex; align-items:center; gap:12px; padding:10px 16px;
                border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer;
                transition:background 0.1s;">
      <span style="color:${r.color}; font-size:16px; flex-shrink:0; width:20px; text-align:center;">${r.icon}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; color:var(--text); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.label}</div>
        <div style="font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.sub}</div>
      </div>
      <span style="font-size:10px; color:var(--border); flex-shrink:0; text-transform:uppercase; letter-spacing:0.05em;">${r.type}</span>
    </div>
  `).join("");

  // Bind click handlers
  list.querySelectorAll(".gs-result").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.idx);
      results[idx]?.action();
      closeSearch();
    });
    el.addEventListener("mouseenter", () => setActive(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { el.click(); }
    });
  });
}

function setActive(el) {
  getResultsList()?.querySelectorAll(".gs-result").forEach((r) => {
    r.style.background = r === el ? "rgba(105,179,255,0.08)" : "";
  });
}

function moveSelection(dir) {
  const items = [...(getResultsList()?.querySelectorAll(".gs-result") || [])];
  if (!items.length) return;
  const active = items.findIndex((el) => el.style.background !== "");
  const next = (active + dir + items.length) % items.length;
  items.forEach((el, i) => { el.style.background = i === next ? "rgba(105,179,255,0.08)" : ""; });
  items[next]?.scrollIntoView({ block: "nearest" });
}

function activateSelected() {
  const active = getResultsList()?.querySelector(".gs-result[style*='rgba(105']");
  active?.click();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function openSearch(ctx) {
  _activeCtx = ctx;
  const modal = getModal();
  if (!modal) return;
  modal.style.display = "flex";
  const input = getInput();
  if (input) { input.value = ""; input.focus(); }
  renderResults([]);
}

export function closeSearch() {
  const modal = getModal();
  if (modal) modal.style.display = "none";
  _activeCtx = null;
}

export function initGlobalSearch() {
  // Inject modal HTML once
  if (document.getElementById("global-search-modal")) return;

  const modal = document.createElement("div");
  modal.id = "global-search-modal";
  modal.style.cssText = `
    display:none; position:fixed; inset:0; z-index:9000;
    background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
    align-items:flex-start; justify-content:center; padding-top:12vh;
  `;
  modal.innerHTML = `
    <div style="width:min(560px, 92vw); background:var(--card); border:1px solid rgba(105,179,255,0.2);
                border-radius:12px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,0.5);">
      <div style="display:flex; align-items:center; gap:10px; padding:12px 16px;
                  border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="color:var(--muted); font-size:16px;">⌕</span>
        <input id="global-search-input" type="text" placeholder="Search projects, views… or ? ask Claude"
               autocomplete="off" spellcheck="false"
               style="flex:1; background:transparent; border:none; outline:none; font-size:14px;
                      color:var(--text); font-family:inherit;" />
        <kbd style="font-size:10px; color:var(--muted); background:rgba(255,255,255,0.05);
                    border:1px solid var(--border); border-radius:4px; padding:2px 6px;">Esc</kbd>
      </div>
      <div id="global-search-results" style="max-height:360px; overflow-y:auto;"></div>
      <div style="padding:8px 16px; border-top:1px solid rgba(255,255,255,0.04);
                  display:flex; gap:16px; font-size:10px; color:var(--muted);">
        <span>↑↓ navigate</span><span>↵ open</span><span>Esc close</span>
        <span style="margin-left:auto; color:rgba(122,231,199,0.5);">? + query = ask Claude</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Input handler
  const input = modal.querySelector("#global-search-input");
  let _nlqTimer = null;
  input.addEventListener("input", () => {
    if (!_activeCtx) return;
    const q = input.value;
    // NLQ mode: query starts with "?"
    if (q.startsWith("?") && q.length > 2) {
      renderResults([{ type: "nlq", label: "Asking Claude…", sub: q.slice(1).trim(), icon: "◈", color: "var(--muted)", action: () => {}, score: 10 }]);
      clearTimeout(_nlqTimer);
      _nlqTimer = setTimeout(async () => {
        const results = await handleNLQ(q, _activeCtx);
        renderResults(results);
      }, 600); // 600ms debounce
    } else {
      clearTimeout(_nlqTimer);
      renderResults(buildResults(q, _activeCtx));
    }
  });

  // Keyboard nav inside input
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape")    { closeSearch(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); moveSelection(-1); return; }
    if (e.key === "Enter")     { activateSelected(); return; }
  });

  // Click outside to close
  modal.addEventListener("click", (e) => { if (e.target === modal) closeSearch(); });
}
