// Agents View — roster and profiles for all 23 VaultSpark Studio OS agents

const AGENTS = [
  {
    id: "project-agent",
    name: "Project Agent",
    emoji: "🤖",
    color: "#6ae3b2",
    trigger: "start / closeout",
    schedule: "Every session",
    purpose: "Per-project session agent. Reads all context files, executes work, writes full closeout including SIL and CDR.",
    inputs: ["AGENTS.md", "context/* (all 8 files)", "SELF_IMPROVEMENT_LOOP.md"],
    outputs: ["CURRENT_STATE.md", "TASK_BOARD.md", "LATEST_HANDOFF.md", "WORK_LOG.md", "SELF_IMPROVEMENT_LOOP.md", "CREATIVE_DIRECTION_RECORD.md"],
    scoreImpact: ["All 5 pillars", "Governance +5"],
    howToUse: 'Say "start" at the beginning of any project session. Say "closeout" when done.',
    automated: false,
  },
  {
    id: "enforcer",
    name: "Studio OS Enforcer",
    emoji: "🔒",
    color: "#f87171",
    trigger: "Daily 08:00 UTC",
    schedule: "Daily",
    purpose: "Audits all org repos for Studio OS compliance (13 required files). Creates GitHub issues for violations. Auto-closes issues when resolved.",
    inputs: ["GitHub repo file trees (all 19 repos)", "PROJECT_REGISTRY.json"],
    outputs: ["GitHub issues labeled studio-os-violation"],
    scoreImpact: ["Risk: +3 governance bonus when fully compliant", "Risk: −2 penalty when no Studio OS"],
    howToUse: "Runs automatically. Manual: Actions tab → Studio OS Enforcer → Run workflow. Requires ORG_PAT secret.",
    automated: true,
    workflowFile: ".github/workflows/studio-os-enforcer.yml",
    cron: "0 8 * * *",
  },
  {
    id: "debt-watchdog",
    name: "Technical Debt Watchdog",
    emoji: "🔧",
    color: "#fb923c",
    trigger: "Daily 09:00 UTC",
    schedule: "Daily",
    purpose: "Scores technical debt across all repos (0–100). Flags CI failures, stale PRs, TODO/FIXME density, commit staleness. Creates labeled issues for high-debt repos.",
    inputs: ["GitHub CI runs", "Open PRs", "Commit history", "Open issues"],
    outputs: ["GitHub issues labeled tech-debt", "portfolio/DEBT_REPORT.md"],
    scoreImpact: ["Dev Health SIL category", "Risk pillar (CI + stale PRs already signal)"],
    howToUse: 'Runs automatically. Manual: "Run debt watchdog" in studio-ops session. Requires ORG_PAT secret.',
    automated: true,
    workflowFile: ".github/workflows/tech-debt-watchdog.yml",
    cron: "0 9 * * *",
  },
  {
    id: "weekly-digest",
    name: "Studio Weekly Digest",
    emoji: "📊",
    color: "#69b3ff",
    trigger: "Monday 07:00 UTC",
    schedule: "Weekly",
    purpose: "Reads all WORK_LOG and SIL entries from the past 7 days. Generates a studio-wide executive brief with highlights, watch list, and cross-project insights.",
    inputs: ["logs/WORK_LOG.md (all projects)", "context/SELF_IMPROVEMENT_LOOP.md (all projects)", "PROJECT_REGISTRY.json"],
    outputs: ["portfolio/WEEKLY_DIGEST.md", "portfolio/SOCIAL_DRAFTS.md (draft posts)"],
    scoreImpact: ["SIL — Process Quality", "Informs all human decisions"],
    howToUse: 'Runs automatically. Manual: "Generate weekly digest" in studio-ops session.',
    automated: true,
    workflowFile: ".github/workflows/weekly-digest.yml",
    cron: "0 7 * * 1",
  },
  {
    id: "intake",
    name: "Intake Agent",
    emoji: "📥",
    color: "#a78bfa",
    trigger: "Project ticket submitted",
    schedule: "On demand",
    purpose: "Processes new project onboarding tickets from the Hub Ticketing view. Verifies Studio OS compliance, bootstraps missing files, creates registry PR.",
    inputs: ["GitHub issue YAML body", "Project GitHub repo (API check)", "PROJECT_REGISTRY.json"],
    outputs: ["Comment on intake issue", "Draft PR to add project to hub + registry"],
    scoreImpact: ["Enables hub scoring for new projects"],
    howToUse: 'Submit a listing request ticket via Hub → Ticketing. Or: "Run intake for issue #NNN" in studio-ops.',
    automated: false,
    dispatchPhrase: "Run intake for issue #NNN",
  },
  {
    id: "xpi",
    name: "Cross-Project Intelligence",
    emoji: "🧠",
    color: "#c084fc",
    trigger: "Weekly / manual",
    schedule: "Weekly",
    purpose: "Reads SELF_IMPROVEMENT_LOOP.md from every project. Synthesizes studio-wide score patterns, trending ideas, and strategic recommendations. Writes STUDIO_INTELLIGENCE.md.",
    inputs: ["context/SELF_IMPROVEMENT_LOOP.md (all projects)", "PROJECT_REGISTRY.json"],
    outputs: ["portfolio/STUDIO_INTELLIGENCE.md"],
    scoreImpact: ["Informs BRAIN.md updates", "Process Quality SIL"],
    howToUse: '"Run XPI analysis" or "Synthesize studio patterns" in studio-ops session.',
    automated: false,
    dispatchPhrase: "Run XPI analysis",
  },
  {
    id: "social-content",
    name: "Social Content Pipeline",
    emoji: "📣",
    color: "#38bdf8",
    trigger: "Weekly / when Engagement drops",
    schedule: "Weekly (Monday)",
    purpose: "Converts active project work into a coordinated content production plan across TikTok, YouTube, Reddit, Bluesky, Instagram, X, and Pinterest. All content approved by human before posting.",
    inputs: ["CURRENT_STATE.md + LATEST_HANDOFF.md (active projects)", "SOUL.md (brand alignment)", "Social platform data (Hub)"],
    outputs: ["docs/CONTENT_PLAN.md (per project)", "portfolio/CONTENT_PIPELINE.md"],
    scoreImpact: ["Engagement pillar +", "SIL — Engagement score"],
    howToUse: '"Run content pipeline for {project}" or "Generate this week\'s content plan".',
    automated: false,
    dispatchPhrase: "Run content pipeline for [project]",
  },
  {
    id: "community-intelligence",
    name: "Community Intelligence",
    emoji: "👥",
    color: "#4ade80",
    trigger: "Weekly Wednesday",
    schedule: "Weekly",
    purpose: "Aggregates player/user feedback from Reddit, GitHub Issues, Discord, and YouTube. Clusters themes, scores signal strength, and surfaces BRAIN.md updates. Flags SOUL drift.",
    inputs: ["GitHub Issues (Hub data)", "Reddit / social feeds (Hub)", "BRAIN.md + SOUL.md"],
    outputs: ["docs/COMMUNITY_SIGNALS.md (per project)", "portfolio/COMMUNITY_PULSE.md"],
    scoreImpact: ["Engagement pillar (issue sentiment)", "SIL — Creative Alignment (drift flag)"],
    howToUse: '"Run community intelligence for {project}" or "What is the community saying?".',
    automated: false,
    dispatchPhrase: "Run community intelligence for [project]",
  },
  {
    id: "narrative-continuity",
    name: "Narrative Continuity",
    emoji: "📖",
    color: "#f472b6",
    trigger: "Monthly / after CDR entries",
    schedule: "Monthly + reactive",
    purpose: "Reads SOUL.md, CDR, and canon files across all game projects. Detects creative drift, canon conflicts between sessions, and inter-project universe contradictions.",
    inputs: ["SOUL.md", "CREATIVE_DIRECTION_RECORD.md", "PROJECT_BRIEF.md", "Canon files (CANON.md, FRANCHISE_BIBLE.md, etc.)"],
    outputs: ["docs/CONTINUITY_REPORT.md (per project)", "portfolio/CONTINUITY_MAP.md"],
    scoreImpact: ["SIL — Creative Alignment (primary signal)", "Long-term IP risk reduction"],
    howToUse: '"Check narrative continuity for {project}" or "Has this project drifted from its SOUL?".',
    automated: false,
    dispatchPhrase: "Check narrative continuity for [project]",
  },
  {
    id: "playtesting",
    name: "Playtesting & Analytics",
    emoji: "🎮",
    color: "#fbbf24",
    trigger: "Weekly Thursday",
    schedule: "Weekly",
    purpose: "Reads Supabase session data per game and turns raw play counts into actionable insights — engagement trends, drop-off points, feature adoption. Correlates with recent releases.",
    inputs: ["Supabase sessions (Hub — sbData)", "WORK_LOG.md (release correlation)", "SOUL.md (alignment check)"],
    outputs: ["docs/PLAYTESTING_INSIGHTS.md (per game)"],
    scoreImpact: ["Engagement pillar (most direct game signal)", "SIL — Engagement score"],
    howToUse: '"Run playtesting analysis for {game}" or "Why did sessions drop last week on {game}?".',
    automated: false,
    dispatchPhrase: "Run playtesting analysis for [game]",
  },
  {
    id: "revenue-scout",
    name: "Revenue Scout",
    emoji: "💰",
    color: "#34d399",
    trigger: "Weekly Friday",
    schedule: "Weekly",
    purpose: "Monitors Gumroad sales and product performance. Correlates revenue with releases and content activity. Identifies highest-ROI opportunities and pricing recommendations.",
    inputs: ["Gumroad API (Hub social feed)", "WORK_LOG.md", "CONTENT_PIPELINE.md"],
    outputs: ["portfolio/REVENUE_SIGNALS.md"],
    scoreImpact: ["Momentum pillar (revenue = momentum)", "Engagement (Gumroad followers)"],
    howToUse: '"Run revenue analysis" or "What\'s our best-performing product this month?".',
    automated: false,
    dispatchPhrase: "Run revenue analysis",
  },
  {
    id: "funding-investor",
    name: "Funding & Investor Scout",
    emoji: "🏦",
    color: "#ffc874",
    trigger: "Monthly",
    schedule: "Monthly",
    purpose: "Two tracks: (1) Monitors game dev grants and matches them to projects. (2) Builds and maintains the investor pipeline for vaultsparkstudios.com/investor-portal — pitch materials, lead tracking, outreach prep.",
    inputs: ["PROJECT_REGISTRY.json", "PROJECT_BRIEF.md (all projects)", "REVENUE_SIGNALS.md", "COMMUNITY_PULSE.md"],
    outputs: ["portfolio/FUNDING_OPPORTUNITIES.md", "portfolio/INVESTOR_PIPELINE.md", "portfolio/PITCH_MATERIALS/"],
    scoreImpact: ["Risk pillar (funding = risk reduction)", "SIL — Momentum (active pursuit)"],
    howToUse: '"Update investor pipeline", "Generate pitch for {project}", "What grants is {project} eligible for?".',
    automated: false,
    dispatchPhrase: "Update investor pipeline",
    investorPortal: "https://vaultsparkstudios.com/investor-portal",
  },
  {
    id: "release-coordinator",
    name: "Release Coordinator",
    emoji: "🚀",
    color: "#818cf8",
    trigger: "Release ticket",
    schedule: "On demand",
    purpose: "Coordinates release events — checks readiness (CI, blockers, handoff freshness), generates release notes from WORK_LOG, creates GitHub release, updates PROJECT_STATUS.json.",
    inputs: ["CURRENT_STATE.md", "TASK_BOARD.md", "WORK_LOG.md", "CI status"],
    outputs: ["GitHub release", "Updated PROJECT_STATUS.json", "Updated PORTFOLIO_CARD.md"],
    scoreImpact: ["Momentum pillar (release = strongest signal)", "Risk (readiness gate)"],
    howToUse: '"Coordinate release for {project}" in a project or studio-ops session.',
    automated: false,
    dispatchPhrase: "Coordinate release for [project]",
  },
  {
    id: "agent-coordinator",
    name: "Agent Coordinator",
    emoji: "🧠",
    color: "#c084fc",
    trigger: "After Weekly Digest (Mon) + daily 10:00 UTC",
    schedule: "Daily (Option D active)",
    purpose: "Hive brain orchestrator. Reads ALL agent portfolio outputs, detects conflicts, writes STUDIO_BRAIN.md — the shared truth document every other agent reads before acting. Makes all agents smarter by giving them unified context.",
    inputs: ["All portfolio/ files", "Open agent-request GitHub Issues", "PROJECT_REGISTRY.json"],
    outputs: ["portfolio/STUDIO_BRAIN.md"],
    scoreImpact: ["Process Quality: +1 (STUDIO_BRAIN.md fresh)", "Risk: conflicts caught early", "All pillars: shared context improves agent accuracy"],
    howToUse: "Runs automatically: daily 10:00 UTC + after Weekly Digest on Mondays. Manual: Actions tab → Agent Coordinator → Run workflow.",
    automated: true,
    workflowFile: ".github/workflows/agent-coordinator.yml",
    cron: "0 10 * * *",
  },
  {
    id: "website-content-agent",
    name: "Website Content Agent",
    emoji: "🌐",
    color: "#38bdf8",
    trigger: "Monthly / on release",
    schedule: "Monthly",
    purpose: "Owns all vaultsparkstudios.com copy. Reads SOUL.md and CURRENT_STATE.md per project and generates accurate copy drafts for homepage, project pages, and about section. All output is draft — human approves before anything goes live.",
    inputs: ["context/SOUL.md (all projects)", "context/CURRENT_STATE.md", "context/PROJECT_BRIEF.md", "docs/CREATIVE_DIRECTION_RECORD.md", "portfolio/STUDIO_BRAIN.md", "portfolio/SEO_REPORT.md"],
    outputs: ["portfolio/WEBSITE_COPY_DRAFTS.md"],
    scoreImpact: ["Engagement: +3 when website copy is current and accurate", "Creative Alignment: CDR-aware copy keeps brand consistent"],
    howToUse: 'Say "run website content agent" in a studio-ops session. Read STUDIO_BRAIN.md first, then all relevant SOUL.md files, then draft WEBSITE_COPY_DRAFTS.md entries.',
    automated: false,
    dispatchPhrase: "Run website content agent",
  },
  {
    id: "seo-intelligence-agent",
    name: "SEO Intelligence Agent",
    emoji: "🔍",
    color: "#4ade80",
    trigger: "Bi-weekly",
    schedule: "Bi-weekly",
    purpose: "Search discoverability intelligence. Audits website meta tags, identifies keyword opportunities, tracks backlink signals. NEVER writes copy — produces recommendations only for Website Content Agent and human. Read-only on all content files.",
    inputs: ["portfolio/WEBSITE_COPY_DRAFTS.md", "portfolio/REVENUE_SIGNALS.md", "portfolio/COMMUNITY_PULSE.md", "portfolio/STUDIO_BRAIN.md", "portfolio/PROJECT_REGISTRY.json"],
    outputs: ["portfolio/SEO_REPORT.md"],
    scoreImpact: ["Engagement: +2 when SEO report active and recommendations incorporated"],
    howToUse: 'Say "run SEO intelligence agent" in a studio-ops session. Audit WEBSITE_COPY_DRAFTS.md and public site pages, then append to SEO_REPORT.md.',
    automated: false,
    dispatchPhrase: "Run SEO intelligence agent",
  },
  {
    id: "press-coverage-scout",
    name: "Press & Coverage Scout",
    emoji: "📰",
    color: "#fb923c",
    trigger: "On release / weekly scan",
    schedule: "Weekly",
    purpose: "Builds and maintains the press pipeline. Identifies target outlets, tracks review copy status, monitors organic coverage. Especially critical for Vorn (needs AI/tech press, not just gaming press). Human sends all outreach — agent prepares and tracks.",
    inputs: ["portfolio/PROJECT_REGISTRY.json", "portfolio/STUDIO_BRAIN.md", "portfolio/WEEKLY_DIGEST.md", "portfolio/REVENUE_SIGNALS.md"],
    outputs: ["portfolio/PRESS_PIPELINE.md"],
    scoreImpact: ["Engagement: +2 when press pipeline active with recent entries", "Momentum: press coverage drives visibility and community growth"],
    howToUse: 'Say "run press scout" in a studio-ops session. Check for recent releases or milestone announcements, identify relevant outlets, update PRESS_PIPELINE.md.',
    automated: false,
    dispatchPhrase: "Run press scout",
  },
  {
    id: "devlog-production-agent",
    name: "Devlog Production Agent",
    emoji: "✍️",
    color: "#a78bfa",
    trigger: "Weekly / on milestone",
    schedule: "Weekly",
    purpose: "Synthesizes WORK_LOG entries, SIL wins/gaps, and milestone completions into publishable devlog drafts in the SOUL.md voice of each project. Dev logs are the highest-converting indie content — this agent drafts them from data that already exists.",
    inputs: ["logs/WORK_LOG.md (all projects)", "context/SELF_IMPROVEMENT_LOOP.md", "context/SOUL.md", "context/CURRENT_STATE.md", "portfolio/STUDIO_BRAIN.md"],
    outputs: ["portfolio/DEVLOG_DRAFTS/[project-id]-[date].md"],
    scoreImpact: ["Engagement: high impact when drafts are published", "Creative Alignment: SOUL.md voice-matched drafts keep narrative consistent"],
    howToUse: 'Say "draft devlog for [project]" in a studio-ops session. Read the project WORK_LOG + SIL, synthesize in SOUL.md voice, write to portfolio/DEVLOG_DRAFTS/.',
    automated: false,
    dispatchPhrase: "Draft devlog for [project]",
  },
  {
    id: "media-asset-tracker",
    name: "Media Asset Tracker",
    emoji: "🎬",
    color: "#f59e0b",
    trigger: "Monthly / on launch approach",
    schedule: "Monthly",
    purpose: "Audits every active project for media asset completeness: trailer, screenshots, press kit, store page assets, GIFs. Flags launch risks when a project approaching a milestone is missing critical media. Prevents the silent launch-killer.",
    inputs: ["GitHub repo file trees (all repos)", "context/CURRENT_STATE.md", "GitHub milestones", "portfolio/STUDIO_BRAIN.md"],
    outputs: ["portfolio/MEDIA_ASSET_AUDIT.md"],
    scoreImpact: ["Momentum: +2 when all active projects have complete media sets", "Risk: launch risk flags caught early"],
    howToUse: "Runs automatically. Manual: Actions tab → Media Asset Tracker → Run workflow.",
    automated: true,
    workflowFile: ".github/workflows/media-asset-tracker.yml",
    cron: "30 9 1 * *",
  },
  {
    id: "brand-consistency-watchdog",
    name: "Brand Consistency Watchdog",
    emoji: "🎨",
    color: "#ec4899",
    trigger: "Monthly / on CDR entry",
    schedule: "Monthly",
    purpose: "Audits all agent-generated content against SOUL.md voice and CDR entries for each project. Catches brand drift before it reaches the public. Never writes to CDR (human-only) — only flags violations in BRAND_AUDIT.md for human and responsible agent to correct.",
    inputs: ["context/SOUL.md (all projects)", "docs/CREATIVE_DIRECTION_RECORD.md (READ ONLY)", "portfolio/WEBSITE_COPY_DRAFTS.md", "portfolio/CONTENT_PIPELINE.md", "portfolio/DEVLOG_DRAFTS/"],
    outputs: ["portfolio/BRAND_AUDIT.md"],
    scoreImpact: ["Creative Alignment: +2 when brand audit is clean", "All pillars: consistent brand improves all external signals"],
    howToUse: 'Say "run brand watchdog" in a studio-ops session. Read SOUL.md and CDR for each project, audit all portfolio content, flag violations in BRAND_AUDIT.md.',
    automated: false,
    dispatchPhrase: "Run brand watchdog",
  },
  {
    id: "partnership-scout",
    name: "Partnership & Collab Scout",
    emoji: "🤝",
    color: "#34d399",
    trigger: "Monthly",
    schedule: "Monthly",
    purpose: "Proactive deal flow. Scans for game jam opportunities, publisher open calls, cross-studio collab potential, and marketplace featuring opportunities that fit active projects. Human evaluates and pursues — agent builds and maintains the pipeline.",
    inputs: ["portfolio/PROJECT_REGISTRY.json", "portfolio/STUDIO_BRAIN.md", "portfolio/REVENUE_SIGNALS.md", "portfolio/COMMUNITY_PULSE.md", "context/SOUL.md (all projects)"],
    outputs: ["portfolio/PARTNERSHIP_PIPELINE.md"],
    scoreImpact: ["Momentum: partnership opportunities converted = milestone acceleration", "Engagement: collab content drives cross-audience growth"],
    howToUse: 'Say "run partnership scout" in a studio-ops session. Check game jam calendars, publisher programs, platform featuring. Update PARTNERSHIP_PIPELINE.md.',
    automated: false,
    dispatchPhrase: "Run partnership scout",
  },
  {
    id: "repo-scanner",
    name: "Repo Scanner",
    emoji: "🔭",
    color: "#67e8f9",
    trigger: "Weekly Monday 06:00 UTC",
    schedule: "Weekly",
    purpose: "Scans all VaultSparkStudios org repos and compares against PROJECT_REGISTRY.json. Flags any repo not in the registry by opening a studio-ops issue with repo metadata pre-filled for human review and intake. Prevents new projects from going dark.",
    inputs: ["GitHub org repo list (API)", "portfolio/PROJECT_REGISTRY.json"],
    outputs: ["GitHub issues labeled repo-scanner (one per unregistered repo)"],
    scoreImpact: ["Registry completeness — every project scored = better portfolio intelligence"],
    howToUse: "Runs automatically every Monday before Enforcer. Manual: Actions → Repo Scanner → Run workflow. Review opened issues and run Intake Agent on any confirmed new projects.",
    automated: true,
    workflowFile: ".github/workflows/repo-scanner.yml",
    cron: "0 6 * * 1",
  },
  {
    id: "legal-ip-monitor",
    name: "Legal & IP Monitor",
    emoji: "⚖️",
    color: "#94a3b8",
    trigger: "Monthly / on naming CDR entry",
    schedule: "Monthly",
    purpose: "Audits all repos for LICENSE file presence, scans dependency licenses for compliance issues, and flags CDR naming decisions for trademark review. Informational only — not legal advice. Catches launch-blocking IP issues before they become expensive.",
    inputs: ["GitHub repo trees (LICENSE files, package.json)", "docs/CREATIVE_DIRECTION_RECORD.md (all repos)", "context/PROJECT_BRIEF.md", "portfolio/STUDIO_BRAIN.md"],
    outputs: ["portfolio/IP_AUDIT.md"],
    scoreImpact: ["Risk: +2 when IP audit clean and current", "Prevents launch-blocking issues"],
    howToUse: "Runs automatically. Manual: Actions tab → Legal & IP Monitor → Run workflow. Output is informational — always consult a lawyer before acting.",
    automated: true,
    workflowFile: ".github/workflows/legal-ip-monitor.yml",
    cron: "0 10 1 * *",
  },
];

export function renderAgentsView(agentRequests = [], agentRunHistory = {}) {
  const pill = (text, color) =>
    `<span style="display:inline-block; background:${color}20; color:${color}; border:1px solid ${color}40;
      font-size:10px; font-weight:700; letter-spacing:0.04em; padding:2px 7px; border-radius:10px;">${text}</span>`;

  const agentCard = (a) => {
    // Run history for automated agents — matched by workflow name
    let runBadge = "";
    if (a.automated && Object.keys(agentRunHistory).length) {
      const run = agentRunHistory[a.name];
      const nextRun = nextCronRun(a.cron);
      if (run) {
        const ago = run.runAt ? timeAgo(run.runAt) : null;
        const conclusionColor = run.conclusion === "success" ? "var(--green)"
          : run.conclusion === "failure" ? "var(--red)"
          : "var(--gold)";
        const conclusionIcon = run.conclusion === "success" ? "✓"
          : run.conclusion === "failure" ? "✗"
          : "⟳";
        const streak = run.streak ?? null;
        const streakBadge = streak != null && streak >= 3
          ? `<span style="font-size:10px; color:var(--green); padding:2px 8px; border:1px solid rgba(110,231,183,0.3); border-radius:8px;">🔥 ${streak}-run streak</span>`
          : "";
        // Sparkline: pass/fail dots for last 7 runs
        const sparkline = run.history?.length > 0
          ? `<span style="display:inline-flex; align-items:center; gap:2px; padding:2px 6px; border:1px solid var(--border); border-radius:8px;" title="Last ${run.history.length} runs (oldest→newest)">${
              run.history.map(h => {
                const c = h.conclusion === "success" ? "#6ae3b2"
                        : h.conclusion === "failure" ? "#f87171"
                        : "#ffc874";
                return `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${c};"></span>`;
              }).join("")
            }</span>`
          : "";
        runBadge = `
          <a href="${run.url}" target="_blank" rel="noopener"
             style="font-size:10px; color:${conclusionColor}; text-decoration:none; display:flex; align-items:center; gap:4px;
                    background:${conclusionColor}15; border:1px solid ${conclusionColor}30; border-radius:8px; padding:2px 8px;">
            <span>${conclusionIcon}</span>
            <span>${ago ? `last run ${ago}` : "ran recently"}</span>
          </a>
          ${sparkline}
          ${nextRun ? `<span style="font-size:10px; color:var(--muted); padding:2px 8px; border:1px solid var(--border); border-radius:8px;">next ${nextRun}</span>` : ""}
          ${streakBadge}`;
      } else {
        runBadge = `
          <span style="font-size:10px; color:var(--muted); padding:2px 8px; border:1px solid var(--border); border-radius:8px;">no runs yet</span>
          ${nextRun ? `<span style="font-size:10px; color:var(--muted); padding:2px 8px; border:1px solid var(--border); border-radius:8px;">next ${nextRun}</span>` : ""}`;
      }
    }
    // Dispatch button for manual agents with a dispatchPhrase
    if (!a.automated && a.dispatchPhrase) {
      runBadge = `
        <button data-action="dispatch-agent" data-agent-id="${a.id}" data-agent-name="${a.name}" data-phrase="${a.dispatchPhrase}"
          style="font-size:10px; color:#c084fc; background:rgba(192,132,252,0.1); border:1px solid rgba(192,132,252,0.3);
                 border-radius:8px; padding:2px 10px; cursor:pointer; margin-left:auto;">
          Request Run →
        </button>`;
    }
    return `
    <div class="panel" style="margin-bottom:16px; border-color:${a.color}40; transition:border-color 0.15s;">
      <div class="panel-header" style="border-bottom-color:${a.color}25; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <span style="font-size:18px;">${a.emoji}</span>
        <span class="panel-title" style="color:${a.color}; font-size:13px;">${a.name}</span>
        ${a.automated ? pill("AUTOMATED", a.color) : pill("MANUAL", "var(--muted)")}
        ${runBadge}
        <span style="font-size:11px; color:var(--muted); ${(!a.automated && a.dispatchPhrase) ? "" : "margin-left:auto;"}">${a.trigger}</span>
      </div>
      <div class="panel-body" style="padding:14px 16px;">
        <p style="margin:0 0 12px; font-size:12px; color:var(--muted); line-height:1.6;">${a.purpose}</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:5px;">Inputs</div>
            <ul style="margin:0; padding-left:14px; list-style:disc;">
              ${a.inputs.map(i => `<li style="font-size:11px; color:var(--text); margin-bottom:2px;">${i}</li>`).join("")}
            </ul>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:5px;">Outputs</div>
            <ul style="margin:0; padding-left:14px; list-style:disc;">
              ${a.outputs.map(o => `<li style="font-size:11px; color:var(--text); margin-bottom:2px; font-family:${o.includes('/') || o.includes('.') ? 'monospace' : 'inherit'};">${o}</li>`).join("")}
            </ul>
          </div>
        </div>

        <div style="display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap;">
          <div style="flex:1; min-width:200px;">
            <div style="font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:5px;">Score impact</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              ${a.scoreImpact.map(s => pill(s, a.color)).join("")}
            </div>
          </div>
          <div style="flex:2; min-width:260px;">
            <div style="font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:5px;">How to use</div>
            <div style="font-size:11px; color:var(--text); line-height:1.5;">${a.howToUse}</div>
            ${a.workflowFile ? `<div style="margin-top:4px; font-size:10px; color:var(--muted);">Workflow: <code>${a.workflowFile}</code></div>` : ""}
            ${a.investorPortal ? `<div style="margin-top:4px; font-size:11px;"><a href="${a.investorPortal}" target="_blank" rel="noopener" style="color:${a.color};">${a.investorPortal}</a></div>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
  };

  // need timeAgo for run history badges
  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // Compute next UTC run time from a 5-field cron expression.
  // Handles: "MM HH * * *" (daily), "MM HH * * N" (weekly), "MM HH D * *" (monthly 1st).
  function nextCronRun(cron) {
    if (!cron) return null;
    const [minS, hourS, domS, , dowS] = cron.split(" ");
    const min  = parseInt(minS,  10);
    const hour = parseInt(hourS, 10);
    const now  = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, min, 0));

    if (domS !== "*") {
      // Monthly — next 1st of month at HH:MM UTC
      const dom = parseInt(domS, 10);
      next.setUTCDate(dom);
      if (next <= now) {
        next.setUTCMonth(next.getUTCMonth() + 1);
        next.setUTCDate(dom);
      }
    } else if (dowS !== "*") {
      // Weekly — next occurrence of weekday (0=Sun…6=Sat)
      const target = parseInt(dowS, 10);
      const current = next.getUTCDay();
      let daysAhead = (target - current + 7) % 7;
      if (daysAhead === 0 && next <= now) daysAhead = 7;
      next.setUTCDate(next.getUTCDate() + daysAhead);
    } else {
      // Daily
      if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    }

    const diffMs = next - now;
    const diffH  = Math.floor(diffMs / 3600000);
    if (diffH < 1)  return "in <1h";
    if (diffH < 24) return `in ${diffH}h`;
    const days = Math.floor(diffH / 24);
    return `in ${days}d`;
  }

  const automatedAgents = AGENTS.filter(a => a.automated);
  const manualAgents = AGENTS.filter(a => !a.automated);

  return `
    <div class="main-content" style="max-width:900px; margin:0 auto;">

      <!-- Header -->
      <div style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <h1 style="font-size:22px; font-weight:800; margin:0; letter-spacing:-0.02em;">Studio Agents</h1>
          <span style="font-size:11px; color:var(--muted); background:var(--border); padding:3px 10px; border-radius:10px;">${AGENTS.length} Roles Active</span>
        </div>
        <p style="margin:8px 0 0; font-size:13px; color:var(--muted); line-height:1.5;">
          All agent roles operating within VaultSpark Studio OS.
          Role definitions live in <code>vaultspark-studio-ops/agents/</code>.
          Automated agents run on schedule via GitHub Actions — requires <code>ORG_PAT</code> secret.
        </p>
      </div>

      <!-- Stats strip -->
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px;">
        ${[
          { label: "Total Agents", value: AGENTS.length, color: "var(--text)" },
          { label: "Automated", value: automatedAgents.length, color: "var(--green)" },
          { label: "Manual / Triggered", value: manualAgents.length, color: "var(--gold)" },
          { label: "Max Score Bonus", value: "+5 pts", color: "#c084fc" },
        ].map(s => `
          <div style="background:var(--border); border-radius:8px; padding:12px 14px; text-align:center;">
            <div style="font-size:22px; font-weight:900; color:${s.color};">${s.value}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">${s.label}</div>
          </div>
        `).join("")}
      </div>

      <!-- Automated agents -->
      <div style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:0.08em;">Automated</span>
        <span style="font-size:11px; color:var(--muted);">— run on schedule via GitHub Actions</span>
      </div>
      ${automatedAgents.map(agentCard).join("")}

      <!-- Manual / triggered agents -->
      <div style="margin:20px 0 8px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:700; color:var(--gold); text-transform:uppercase; letter-spacing:0.08em;">Manual / Triggered</span>
        <span style="font-size:11px; color:var(--muted);">— run in Claude Code sessions</span>
      </div>
      ${manualAgents.map(agentCard).join("")}

      <!-- Agent-request queue -->
      ${agentRequests.length > 0 ? `
      <div style="margin:24px 0 8px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:700; color:#c084fc; text-transform:uppercase; letter-spacing:0.08em;">Agent Requests</span>
        <span style="font-size:11px; color:var(--muted);">— open tickets awaiting agent action</span>
        <span style="margin-left:auto; font-size:11px; font-weight:700; color:#c084fc;">${agentRequests.length}</span>
      </div>
      <div class="panel" style="margin-bottom:24px; border-color:rgba(192,132,252,0.25);">
        <div class="panel-body" style="padding:10px 16px; display:flex; flex-direction:column; gap:2px;">
          ${agentRequests.map(r => {
            const age = r.daysOld ?? Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000);
            const ageColor = age >= 7 ? "var(--gold)" : "var(--muted)";
            const ageStr = age === 0 ? "today" : age === 1 ? "1 day ago" : `${age} days ago`;
            return `
            <div style="display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:#c084fc; font-size:12px; flex-shrink:0;">↻</span>
              <span style="flex:1; font-size:12px; color:var(--text);">${r.title}</span>
              <span style="font-size:11px; color:${ageColor}; flex-shrink:0;">${ageStr}</span>
              <a href="${r.url}" target="_blank" rel="noopener"
                style="font-size:10px; color:#c084fc; text-decoration:none; flex-shrink:0; padding:2px 8px;
                       border:1px solid rgba(192,132,252,0.3); border-radius:8px;">
                #${r.number}
              </a>
            </div>`;
          }).join("")}
        </div>
      </div>
      ` : ""}

      <!-- Setup note -->
      <div class="panel" style="margin-top:8px; border-color:rgba(110,231,183,0.2);">
        <div class="panel-body" style="padding:14px 16px;">
          <div style="font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:8px;">Automated agent setup (one-time)</div>
          <div style="font-size:12px; color:var(--muted); line-height:1.7;">
            1. Go to <strong style="color:var(--text);">github.com/VaultSparkStudios/vaultspark-studio-ops</strong> → Settings → Secrets and variables → Actions<br>
            2. Add secret <code>ORG_PAT</code> — a GitHub Personal Access Token with <code>repo</code> scope for all VaultSparkStudios repos<br>
            3. All seven automated workflows activate immediately: Repo Scanner (Mon 06:00), Enforcer (daily 08:00), Watchdog (daily 09:00), Weekly Digest (Mon 07:00), Agent Coordinator (daily 10:00 + after Digest), Media Asset Tracker (monthly), Legal &amp; IP Monitor (monthly)<br>
            4. Manual trigger anytime: Actions tab → select workflow → Run workflow
          </div>
        </div>
      </div>

    </div>
  `;
}
