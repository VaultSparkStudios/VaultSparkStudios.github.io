// Agent Commands — Studio OS reference page
// All agent protocols, roles, governance scoring, and Studio OS file map in one place.

export function renderAgentCommandsView() {
  const card = (title, accent, body) => `
    <div class="panel" style="margin-bottom:20px; border-color:${accent}40;">
      <div class="panel-header" style="border-bottom-color:${accent}30;">
        <span class="panel-title" style="color:${accent};">${title}</span>
      </div>
      <div class="panel-body" style="padding:16px 18px;">
        ${body}
      </div>
    </div>
  `;

  const pill = (text, color) =>
    `<span style="display:inline-block; background:${color}18; color:${color}; border:1px solid ${color}40;
      font-size:10px; font-weight:700; letter-spacing:0.05em; padding:2px 8px; border-radius:10px; margin-right:4px;">${text}</span>`;

  const fileRow = (path, when, required = true) => `
    <tr>
      <td style="font-family:monospace; font-size:11px; color:var(--text); padding:5px 8px 5px 0; white-space:nowrap;">
        ${required ? "" : '<span style="opacity:0.4;">○ </span>'}<code style="background:var(--border); padding:2px 5px; border-radius:3px;">${path}</code>
      </td>
      <td style="font-size:11px; color:var(--muted); padding:5px 0 5px 8px; line-height:1.4;">${when}</td>
    </tr>
  `;

  const stepList = (steps) => `
    <ol style="margin:0; padding-left:18px; list-style:decimal;">
      ${steps.map(s => `<li style="margin-bottom:6px; font-size:12px; color:var(--text); line-height:1.5;">${s}</li>`).join("")}
    </ol>
  `;

  const roleRow = (name, trigger, purpose, score) => `
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:8px 10px 8px 0; font-size:12px; font-weight:700; color:var(--text); white-space:nowrap;">${name}</td>
      <td style="padding:8px 8px; font-size:11px; font-family:monospace; color:var(--gold);">${trigger}</td>
      <td style="padding:8px 8px; font-size:11px; color:var(--muted);">${purpose}</td>
      <td style="padding:8px 0 8px 8px; font-size:11px; color:var(--green); white-space:nowrap;">${score}</td>
    </tr>
  `;

  return `
    <div class="main-content" style="max-width:900px; margin:0 auto;">

      <!-- Header -->
      <div style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <h1 style="font-size:22px; font-weight:800; margin:0; letter-spacing:-0.02em;">Agent Commands</h1>
          <span style="font-size:11px; color:var(--muted); background:var(--border); padding:3px 10px; border-radius:10px;">Studio OS Reference</span>
        </div>
        <p style="margin:8px 0 0; font-size:13px; color:var(--muted); line-height:1.5;">
          Complete reference for all agent commands, protocols, roles, and governance scoring.
          Open any project in Claude Code and use these commands to activate the Studio OS.
        </p>
      </div>

      <!-- Quick Reference -->
      ${card("QUICK REFERENCE", "var(--green)", `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div style="background:var(--border); border-radius:8px; padding:14px 16px;">
            <div style="font-size:22px; font-family:monospace; font-weight:800; color:var(--green); margin-bottom:6px;">start</div>
            <div style="font-size:12px; color:var(--muted); line-height:1.5;">
              Reads all context files and outputs a Startup Brief. Always use this at the beginning of any session.
            </div>
            <div style="margin-top:10px; font-size:11px; color:var(--text); opacity:0.6;">
              Handled by: <code>prompts/start.md</code>
            </div>
          </div>
          <div style="background:var(--border); border-radius:8px; padding:14px 16px;">
            <div style="font-size:22px; font-family:monospace; font-weight:800; color:var(--gold); margin-bottom:6px;">closeout</div>
            <div style="font-size:12px; color:var(--muted); line-height:1.5;">
              Writes back all context files, runs Self-Improvement Loop, and updates Creative Direction Record.
            </div>
            <div style="margin-top:10px; font-size:11px; color:var(--text); opacity:0.6;">
              Handled by: <code>prompts/closeout.md</code>
            </div>
          </div>
        </div>
        <div style="margin-top:12px; font-size:11px; color:var(--muted); background:var(--border); padding:8px 12px; border-radius:6px;">
          These commands are defined in each project's <code>prompts/</code> folder.
          They activate as soon as you say the word — no extra syntax needed.
        </div>
      `)}

      <!-- Start Protocol -->
      ${card("START PROTOCOL", "var(--blue)", `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Read order</div>
            ${stepList([
              "<code>AGENTS.md</code> — role rules and enforcement",
              "<code>context/PROJECT_BRIEF.md</code> — what the project is",
              "<code>context/SOUL.md</code> — identity, non-negotiables",
              "<code>context/BRAIN.md</code> — strategic mental model",
              "<code>context/CURRENT_STATE.md</code> — live snapshot",
              "<code>context/DECISIONS.md</code> — key decisions with rationale",
              "<code>context/TASK_BOARD.md</code> — now / next / blocked / later",
              "<code>context/LATEST_HANDOFF.md</code> — authoritative handoff",
              "<code>context/SELF_IMPROVEMENT_LOOP.md</code> — last scores + open brainstorm",
              "Task-specific files (only after all above)",
            ])}
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Startup output</div>
            <div style="font-size:12px; color:var(--muted); line-height:1.8;">
              Agent replies with a <strong style="color:var(--text);">Startup Brief</strong> covering:<br>
              • Project identity<br>
              • Current state<br>
              • Active priorities + any <code style="color:var(--gold);">[SIL]</code> escalations<br>
              • Last audit scores + trajectory<br>
              • Recommended next move<br>
              • Blockers or ambiguities
            </div>
            <div style="margin-top:12px; padding:10px 12px; background:var(--border); border-radius:6px; font-size:11px; color:var(--gold);">
              ⚠ If a <code>[SIL]</code> item on the task board was skipped 2+ sessions in a row,
              the agent escalates it to <strong>Now</strong> and flags it in the brief.
            </div>
          </div>
        </div>
      `)}

      <!-- Closeout Protocol -->
      ${card("CLOSEOUT PROTOCOL", "var(--gold)", `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:16px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Write-back order</div>
            ${stepList([
              "<code>context/CURRENT_STATE.md</code> — updated state",
              "<code>context/TASK_BOARD.md</code> — updated tasks",
              "<code>context/LATEST_HANDOFF.md</code> — new handoff",
              "<code>logs/WORK_LOG.md</code> — session entry appended",
              "<code>context/DECISIONS.md</code> — if decisions made",
              "<span style='color:var(--green); font-weight:700;'>context/SELF_IMPROVEMENT_LOOP.md</span> — MANDATORY: score + brainstorm + commit",
              "<span style='color:var(--gold); font-weight:700;'>docs/CREATIVE_DIRECTION_RECORD.md</span> — MANDATORY: append any human direction given this session",
              "Any other project files whose truth changed",
            ])}
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Closeout output</div>
            <div style="font-size:12px; color:var(--muted); line-height:1.8;">
              Agent replies with a <strong style="color:var(--text);">Session Closeout</strong> covering:<br>
              • What was completed<br>
              • Files changed<br>
              • Validation status<br>
              • SIL summary (scores, win, gap, brainstorm)<br>
              • Open problems<br>
              • Recommended next action<br>
              • Files to read first next session
            </div>
          </div>
        </div>
      `)}

      <!-- Creative Direction Record -->
      ${card("CREATIVE DIRECTION RECORD (CDR)", "var(--gold)", `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div>
            <div style="margin-bottom:10px; padding:10px 12px; background:#ffc87418; border:1px solid #ffc87440; border-radius:6px; font-size:12px; font-weight:700; color:var(--gold);">
              ADDITIVE ONLY — Never edit or delete prior entries.
            </div>
            <div style="font-size:12px; color:var(--muted); line-height:1.6; margin-bottom:12px;">
              Lives at <code>docs/CREATIVE_DIRECTION_RECORD.md</code> in every project repo.
              This is the permanent IP-protection ledger of all human creative direction.
            </div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Agent appends an entry when human gives:</div>
            <div style="font-size:12px; color:var(--text); line-height:1.8;">
              • Any creative direction (features, feel, scope)<br>
              • Feature assignments or explicit goals<br>
              • Brand, tone, visual, or quality guidance<br>
              • Canon-affecting decisions<br>
              • Naming decisions<br>
              • Any "do this / don't do this" instruction
            </div>
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">When it gets updated</div>
            <div style="font-size:12px; color:var(--muted); line-height:1.8; margin-bottom:12px;">
              <strong style="color:var(--text);">During the session</strong> — immediately when the human gives direction<br>
              <strong style="color:var(--text);">At closeout</strong> — step 7 of the write-back order reviews the session
              and appends any direction that was given but not yet recorded
            </div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Agents must NOT</div>
            <div style="font-size:12px; color:var(--red); line-height:1.8;">
              • Add entries without human input<br>
              • Modify or delete existing entries<br>
              • Skip CDR even for "small" directions<br>
              • Infer direction — only record what was explicitly said
            </div>
            <div style="margin-top:12px; padding:8px 12px; background:var(--border); border-radius:6px; font-size:11px; color:var(--muted);">
              The CDR is enforced at closeout via <code>prompts/closeout.md</code> step 7 in every project repo.
            </div>
          </div>
        </div>
      `)}

      <!-- Self-Improvement Loop -->
      ${card("SELF-IMPROVEMENT LOOP (SIL)", "var(--green)", `
        <div style="margin-bottom:16px; font-size:12px; color:var(--muted);">
          Runs at every closeout. Accumulates in <code>context/SELF_IMPROVEMENT_LOOP.md</code>. Never deleted — entries build over time.
          The loop repeats forever — each session scores, reflects, and commits improvements.
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:16px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Scoring rubric (0–10 each)</div>
            <table style="width:100%; border-collapse:collapse;">
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 8px 6px 0; font-size:12px; font-weight:700; color:var(--blue);">Dev Health</td>
                <td style="padding:6px 0; font-size:11px; color:var(--muted);">Code quality, CI status, test coverage, tech debt</td>
              </tr>
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 8px 6px 0; font-size:12px; font-weight:700; color:var(--gold);">Creative Alignment</td>
                <td style="padding:6px 0; font-size:11px; color:var(--muted);">Adherence to SOUL.md + CDR — vision still intact?</td>
              </tr>
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 8px 6px 0; font-size:12px; font-weight:700; color:var(--green);">Momentum</td>
                <td style="padding:6px 0; font-size:11px; color:var(--muted);">Commit velocity, feature progress, milestone progress</td>
              </tr>
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 8px 6px 0; font-size:12px; font-weight:700; color:var(--salmon);">Engagement</td>
                <td style="padding:6px 0; font-size:11px; color:var(--muted);">Community, player, or user feedback signals</td>
              </tr>
              <tr>
                <td style="padding:6px 8px 6px 0; font-size:12px; font-weight:700; color:var(--text);">Process Quality</td>
                <td style="padding:6px 0; font-size:11px; color:var(--muted);">Handoff freshness, Studio OS compliance, file accuracy</td>
              </tr>
            </table>
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Loop steps at closeout</div>
            ${stepList([
              "Score all 5 categories (0–10, max 50)",
              "Compare to prior scores — note ↑ ↓ → per category",
              "Name 1 top win and 1 top gap",
              "Brainstorm 3–5 innovative solutions or features",
              "Commit 1–2 brainstorm items to TASK_BOARD labeled <code>[SIL]</code>",
              "Append entry to SELF_IMPROVEMENT_LOOP.md",
            ])}
            <div style="margin-top:10px; padding:8px 12px; background:var(--border); border-radius:6px; font-size:11px; color:var(--gold);">
              <code>[SIL]</code> items skipped 2+ sessions auto-escalate to <strong>Now</strong> at the next startup check.
            </div>
          </div>
        </div>
      `)}

      <!-- Governance Scoring -->
      ${card("GOVERNANCE SCORING — RISK PILLAR BONUS", "var(--purple, #c084fc)", `
        <div style="margin-bottom:14px; font-size:12px; color:var(--muted); line-height:1.5;">
          Studio OS compliance adds up to <strong style="color:#c084fc;">+5 points</strong> to the Risk pillar,
          pushing the project total max from <strong>100 → 105</strong> and unlocking <strong style="color:#c084fc;">S-tier</strong> grade.
          The hub reads SIL content and CDR content on every sync — not just file existence.
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:14px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left; padding:6px 8px 6px 0; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted);">Condition</th>
              <th style="text-align:right; padding:6px 0 6px 8px; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted);">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:7px 8px 7px 0; font-size:12px; color:var(--text);">All 13 Studio OS files present</td>
              <td style="text-align:right; padding:7px 0 7px 8px; font-size:13px; font-weight:800; color:var(--green);">+3</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:7px 8px 7px 0; font-size:12px; color:var(--text);">9–12/13 files present</td>
              <td style="text-align:right; padding:7px 0 7px 8px; font-size:13px; font-weight:800; color:var(--gold);">+1</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:7px 8px 7px 0; font-size:12px; color:var(--text);">SIL has an entry in the last 14 days</td>
              <td style="text-align:right; padding:7px 0 7px 8px; font-size:13px; font-weight:800; color:var(--green);">+1</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:7px 8px 7px 0; font-size:12px; color:var(--text);">CDR has real human entries (beyond onboarding)</td>
              <td style="text-align:right; padding:7px 0 7px 8px; font-size:13px; font-weight:800; color:var(--green);">+1</td>
            </tr>
            <tr>
              <td style="padding:7px 8px 7px 0; font-size:12px; color:var(--red);">No Studio OS files at all</td>
              <td style="text-align:right; padding:7px 0 7px 8px; font-size:13px; font-weight:800; color:var(--red);">−2</td>
            </tr>
          </tbody>
        </table>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
          ${[
            { grade: "S", label: "100–105", color: "#c084fc", note: "Full governance" },
            { grade: "A+", label: "85–99", color: "#6ae3b2", note: "High compliance" },
            { grade: "A", label: "75–84", color: "#6ae3b2", note: "" },
            { grade: "B+", label: "65–74", color: "#69b3ff", note: "" },
            { grade: "B", label: "55–64", color: "#69b3ff", note: "" },
            { grade: "C+/C", label: "35–54", color: "#ffc874", note: "" },
          ].map(g => `
            <div style="background:${g.color}12; border:1px solid ${g.color}30; border-radius:6px; padding:8px 10px; text-align:center;">
              <div style="font-size:18px; font-weight:900; color:${g.color};">${g.grade}</div>
              <div style="font-size:10px; color:var(--muted);">${g.label}</div>
              ${g.note ? `<div style="font-size:9px; color:${g.color}; margin-top:2px;">${g.note}</div>` : ""}
            </div>
          `).join("")}
        </div>
      `)}

      <!-- Agent Roles -->
      ${card("AGENT ROLES — 22 ROLES ACTIVE", "var(--blue)", `
        <div style="margin-bottom:16px; font-size:12px; color:var(--muted); line-height:1.6;">
          22 agent roles operate across VaultSpark Studio OS — 6 automated via GitHub Actions, 16 manual/triggered.
          Role definitions live in <code>vaultspark-studio-ops/agents/</code>.
          Full profiles, trigger instructions, and score impact for every agent are in the
          <a href="#" onclick="window.dispatchEvent(new CustomEvent('navigate',{detail:'agents'})); return false;"
             style="color:var(--blue); text-decoration:none; font-weight:700;">Studio Agents tab →</a>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:8px;">Automated (6) — GitHub Actions</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              ${[
                ["🔒", "Studio OS Enforcer", "Daily 08:00 UTC"],
                ["🔧", "Technical Debt Watchdog", "Daily 09:00 UTC"],
                ["📊", "Studio Weekly Digest", "Monday 07:00 UTC"],
                ["🧠", "Agent Coordinator", "After Weekly Digest"],
                ["🎬", "Media Asset Tracker", "Monthly 1st"],
                ["⚖️", "Legal & IP Monitor", "Monthly 1st"],
              ].map(([icon, name, when]) => `
                <div style="display:flex; align-items:center; gap:8px; padding:5px 8px; background:var(--border); border-radius:5px;">
                  <span style="font-size:12px;">${icon}</span>
                  <span style="font-size:11px; color:var(--text); flex:1;">${name}</span>
                  <span style="font-size:10px; color:var(--green); font-family:monospace;">${when}</span>
                </div>
              `).join("")}
            </div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--gold); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:8px;">Manual / Triggered (16) — Claude Code sessions</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              ${[
                ["🤖", "Project Agent", "start / closeout"],
                ["📥", "Intake Agent", "Project ticket"],
                ["🧠", "Cross-Project Intelligence", "Weekly"],
                ["📣", "Social Content Pipeline", "Weekly Mon"],
                ["👥", "Community Intelligence", "Weekly Wed"],
                ["📖", "Narrative Continuity", "Monthly"],
                ["🎮", "Playtesting & Analytics", "Weekly Thu"],
                ["💰", "Revenue Scout", "Weekly Fri"],
                ["🏦", "Funding & Investor Scout", "Monthly"],
                ["🚀", "Release Coordinator", "On demand"],
                ["🌐", "Website Content Agent", "Monthly"],
                ["🔍", "SEO Intelligence Agent", "Bi-weekly"],
                ["📰", "Press & Coverage Scout", "Weekly"],
                ["✍️", "Devlog Production Agent", "Weekly"],
                ["🎨", "Brand Consistency Watchdog", "Monthly"],
                ["🤝", "Partnership Scout", "Monthly"],
              ].map(([icon, name, when]) => `
                <div style="display:flex; align-items:center; gap:8px; padding:5px 8px; background:var(--border); border-radius:5px;">
                  <span style="font-size:12px;">${icon}</span>
                  <span style="font-size:11px; color:var(--text); flex:1;">${name}</span>
                  <span style="font-size:10px; color:var(--gold); font-family:monospace;">${when}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div style="padding:10px 12px; background:var(--border); border-radius:6px; font-size:11px; color:var(--muted); line-height:1.6;">
          All agents read <code>portfolio/STUDIO_BRAIN.md</code> before acting. Agent Coordinator synthesizes all portfolio outputs into STUDIO_BRAIN.md weekly.
          Requires <code>ORG_PAT</code> secret in studio-ops for automated agents.
          Manual agents: open <code>vaultspark-studio-ops</code> in Claude Code and say the agent's trigger phrase.
        </div>
      `)}

      <!-- Studio OS File Map -->
      ${card("STUDIO OS FILE MAP — 13 REQUIRED FILES", "var(--text)", `
        <div style="margin-bottom:12px; font-size:12px; color:var(--muted);">
          Every repo must have all 13 files. The hub checks compliance via GitHub API on each sync.
          Missing files reduce the governance bonus and trigger Enforcer issues.
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left; padding:5px 8px 5px 0; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted);">File</th>
              <th style="text-align:left; padding:5px 0 5px 8px; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted);">When to update</th>
            </tr>
          </thead>
          <tbody>
            ${fileRow("AGENTS.md", "Role rules, read order, SIL + CDR enforcement — update when protocols change")}
            ${fileRow("context/PROJECT_BRIEF.md", "When project scope or purpose changes")}
            ${fileRow("context/SOUL.md", "When creative identity or non-negotiables change")}
            ${fileRow("context/BRAIN.md", "When strategic mental model or heuristics change")}
            ${fileRow("context/CURRENT_STATE.md", "Every closeout — when shipped behavior changes")}
            ${fileRow("context/TASK_BOARD.md", "Every closeout — when tasks complete or new ones are added")}
            ${fileRow("context/LATEST_HANDOFF.md", "Every closeout — primary handoff to next session")}
            ${fileRow("context/DECISIONS.md", "When a meaningful decision is made")}
            ${fileRow("context/SELF_IMPROVEMENT_LOOP.md", "Every closeout — append scored audit + brainstorm entry")}
            ${fileRow("docs/CREATIVE_DIRECTION_RECORD.md", "When human gives any creative direction (additive only)")}
            ${fileRow("prompts/start.md", "When startup protocol changes")}
            ${fileRow("prompts/closeout.md", "When closeout protocol changes")}
            ${fileRow("logs/WORK_LOG.md", "Every closeout — append session entry")}
          </tbody>
        </table>
        <div style="margin-top:12px; padding:8px 12px; background:var(--border); border-radius:6px; font-size:11px; color:var(--muted);">
          Templates for all files: <code>vaultspark-studio-ops/docs/templates/project-system/</code>
          &nbsp;·&nbsp;
          Onboarding protocol: <code>vaultspark-studio-ops/docs/STUDIO_HUB_ONBOARDING.md</code>
        </div>
      `)}

    </div>
  `;
}
