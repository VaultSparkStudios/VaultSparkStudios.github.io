// Hub modal dialogs — extracted from clientApp.js for code quality
// Each export takes a `ctx` object: { state, render, getProjectById, scoreProject }

export function showOnboardingModal(ctx) {
  const { state, render } = ctx;
  const existing = document.getElementById("onboarding-modal");
  if (existing) { existing.remove(); return; }
  const el = document.createElement("div");
  el.id = "onboarding-modal";
  el.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:200;
                display:flex; align-items:center; justify-content:center;" id="onboarding-modal-backdrop">
      <div role="dialog" aria-modal="true" aria-label="Setup guide" style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                  padding:28px 32px; width:min(560px, 92vw); box-shadow:0 24px 80px rgba(0,0,0,0.5); max-height:80vh; overflow-y:auto;">
        <div style="font-size:15px; font-weight:800; color:var(--cyan); margin-bottom:6px; letter-spacing:0.03em;">Setup Guide</div>
        <div style="font-size:12px; color:var(--muted); margin-bottom:20px;">Get live data in 3 steps.</div>
        ${[
          {
            step: "1", title: "GitHub Token (required)",
            body: `Create a read-only fine-grained PAT at <strong>github.com/settings/tokens</strong>. Select your VaultSpark org, grant read access to: Repositories (metadata, code, commits, pull requests, actions). Paste it in Settings → API Credentials.`,
            color: "var(--cyan)",
          },
          {
            step: "2", title: "YouTube API Key (optional)",
            body: `Visit <strong>console.cloud.google.com</strong>, create a project, enable YouTube Data API v3, and create an API key. Free quota: 10,000 units/day. Paste it in Settings → API Credentials.`,
            color: "var(--blue)",
          },
          {
            step: "3", title: "Gumroad Token (optional)",
            body: `Go to <strong>Gumroad → Settings → Advanced → Access Tokens</strong>. Create a token with read access. Paste it in Settings → API Credentials for product + revenue data.`,
            color: "var(--gold)",
          },
        ].map(({ step, title, body, color }) => `
          <div style="display:flex; gap:14px; margin-bottom:20px;">
            <div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.06);
                        border:1px solid ${color}; display:flex; align-items:center; justify-content:center;
                        font-size:13px; font-weight:800; color:${color}; flex-shrink:0;">${step}</div>
            <div>
              <div style="font-size:13px; font-weight:700; color:var(--text); margin-bottom:4px;">${title}</div>
              <div style="font-size:12px; color:var(--muted); line-height:1.6;">${body}</div>
            </div>
          </div>
        `).join("")}
        <div style="padding:12px 14px; background:rgba(122,231,199,0.06); border:1px solid rgba(122,231,199,0.15); border-radius:8px; margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; color:var(--cyan); margin-bottom:4px;">Pre-configured (no setup needed)</div>
          <div style="font-size:11px; color:var(--muted); line-height:1.7;">
            ✓ Supabase — studio analytics<br>
            ✓ Reddit — public API, no auth<br>
            ✓ Bluesky — AT Protocol, no auth
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="onboarding-go-settings-btn" style="font-size:12px; padding:8px 16px; background:rgba(122,231,199,0.1);
                  border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer; flex:1;">
            → Open Settings
          </button>
          <button id="onboarding-modal-close" style="font-size:12px; padding:8px 14px; border:1px solid var(--border);
                  border-radius:8px; color:var(--muted); background:none; cursor:pointer;">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById("onboarding-modal-close")?.addEventListener("click", () => el.remove());
  document.getElementById("onboarding-modal-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "onboarding-modal-backdrop") el.remove(); });
  document.getElementById("onboarding-go-settings-btn")?.addEventListener("click", () => {
    el.remove();
    state.activeView = "settings";
    render();
  });
}

export function showScoreModal(projectId, ctx) {
  const { state, getProjectById, scoreProject } = ctx;
  const project = getProjectById(projectId);
  if (!project) return;
  const repoData   = state.ghData[project.githubRepo] || null;
  const compliance = state.contextFiles?.[project.id]?.studioOsCompliance || null;
  const scoring    = scoreProject(project, repoData, state.sbData, state.socialData, compliance);
  const riskMax    = scoring.pillars.risk.max;
  const pillars    = [
    { key: "development", label: "Development",  max: 30,      color: "#69b3ff" },
    { key: "engagement",  label: "Engagement",   max: 25,      color: "#7ae7c7" },
    { key: "momentum",    label: "Momentum",     max: 25,      color: "#ffc874" },
    { key: "risk",        label: "Risk",         max: riskMax, color: "#6ae3b2" },
  ];
  const el = document.createElement("div");
  el.id = "score-modal";
  el.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:200;
                display:flex; align-items:center; justify-content:center;" id="score-modal-backdrop">
      <div role="dialog" aria-modal="true" aria-label="Score explanation" style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                  padding:24px; width:min(480px, 92vw); box-shadow:0 24px 80px rgba(0,0,0,0.5);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <div>
            <div style="font-size:14px; font-weight:700; color:var(--text);">${project.name}</div>
            <div style="font-size:11px; color:var(--muted);">Score explanation</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:32px; font-weight:800; color:${scoring.gradeColor}; line-height:1;">${scoring.total}</div>
            <div style="font-size:14px; font-weight:700; color:${scoring.gradeColor};">${scoring.grade}</div>
          </div>
        </div>
        <div style="height:4px; background:rgba(255,255,255,0.07); border-radius:2px; margin-bottom:20px; overflow:hidden;">
          <div style="width:${scoring.total}%; height:100%; background:${scoring.gradeColor}; border-radius:2px;"></div>
        </div>
        ${pillars.map(({ key, label, max, color }) => {
          const p = scoring.pillars[key];
          const pct = Math.round((p.score / max) * 100);
          return `
            <div style="margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span style="font-size:12px; font-weight:700; color:${color};">${label}</span>
                <span style="font-size:12px; font-weight:700; color:${color};">${p.score}/${max}</span>
              </div>
              <div style="height:5px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden; margin-bottom:5px;">
                <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
              </div>
              <div style="font-size:11px; color:var(--muted); line-height:1.5;">
                ${p.signals.length ? p.signals.join(" · ") : "No signals"}
              </div>
            </div>
          `;
        }).join("")}
        <div style="margin-top:12px; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px;">
          <div style="font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:7px;">Grade Thresholds</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${[
              { grade: "S",  min: 100, color: "#c084fc" },
              { grade: "A+", min: 85,  color: "#6ae3b2" },
              { grade: "A",  min: 75,  color: "#6ae3b2" },
              { grade: "B+", min: 65,  color: "#69b3ff" },
              { grade: "B",  min: 55,  color: "#69b3ff" },
              { grade: "C+", min: 45,  color: "#ffc874" },
              { grade: "C",  min: 35,  color: "#ffc874" },
              { grade: "D",  min: 25,  color: "#ff9478" },
              { grade: "F",  min: 0,   color: "#f87171" },
            ].map((g) => `
              <span title="${g.grade} = ≥${g.min}" style="
                font-size:11px; font-weight:700; padding:2px 7px; border-radius:5px;
                color:${g.color}; background:${g.color}18; border:1px solid ${g.color}30;
                ${scoring.grade === g.grade ? "box-shadow:0 0 0 1px " + g.color + "60;" : ""}
              ">${g.grade} ≥${g.min}</span>
            `).join("")}
          </div>
        </div>
        <button id="score-modal-close" style="width:100%; margin-top:10px; font-size:12px; padding:9px;
          background:none; border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById("score-modal-close")?.addEventListener("click", () => el.remove());
  document.getElementById("score-modal-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "score-modal-backdrop") el.remove(); });
}
