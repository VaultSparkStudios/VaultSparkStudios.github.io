# Latest AI Tooling — S134 Incorporation Research

Researched: 2026-05-17 · WebSearch
Researcher: Claude Opus 4.7 (vaultsparkstudios.github.io session)

---

## Anthropic (May 2026)

### Claude Opus 4.7 — generally available

- **+13%** on coding benchmark vs Opus 4.6; solves 4 tasks neither 4.6 nor Sonnet 4.6 could
- **98.5%** on visual-acuity benchmark (vs 54.5% for Opus 4.6) — major leap for computer-use / vision agents
- **Code quality:** cuts wrapper functions + fallback scaffolding; fixes its own code as it goes
- **Strict instruction following** improved, faster median latency

### Claude Sonnet 4.6 — frontier reasoning, cheaper form factor

- Matches Opus 4.6 on OfficeQA (enterprise document comprehension)
- **+10 points** on bug-finding vs Sonnet 4.5 — *"becomes the default for code that ships"*
- Increasingly capable on hard agentic problems usually reserved for Opus

### Claude Code (May 2026)

- Broader **plugin support**, smarter MCP + model handling
- Reliability fixes across terminal, worktree, and sub-agent workflows
- Restored links/images in tool outputs

### Agent SDK & Skills

- Agent SDK now exposes the same loop Claude Code uses, programmable in Python + TypeScript
- Hooks: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`
- **Skills** are modular: claude.ai = individual, API = workspace-wide, Claude Code = per-project + plugin-shareable
- **Managed Agents:** hosted REST API where Anthropic runs the agent + sandbox; reference by ID across sessions

---

## OpenAI (May 2026)

### Codex Mobile (May 14, 2026)

- Codex inside ChatGPT mobile app (iOS + Android) — review, approve, steer threads from anywhere
- Expanded SSH, hooks, access tokens, HIPAA support
- **Codex sandbox for Windows** — firewall-backed net blocking, dedicated setup + runner binaries, tighter file-write controls
- Sub-agents use readable path-based addresses (`/root/agent_a`), structured inter-agent messaging, agent listing for multi-agent v2 workflows

### Agents SDK (next evolution)

- TypeScript SDK
- Sandbox agents + open-source harness
- Configurable memory
- Codex-like filesystem tools
- Standardized integrations

### Models

- **GPT-5.5** rolling out to Plus/Pro/Business/Enterprise (ChatGPT + Codex)
- **GPT-5.5 Pro** rolling out to Pro/Business/Enterprise

---

## Recommended VaultSpark incorporations

Ranked by leverage × shipability. All routed through existing capability gateway (CANON-012).

### 🔥 Highest leverage (ship this sprint or next)

1. **Opus 4.7 vision for IGNIS visual evidence pipeline** — 98.5% visual acuity unlocks IGNIS reading site screenshots/recordings for UX truth-audit. Add capability `anthropic.vision.acuity-tier` and route IGNIS truth-audit through it. **Effort:** S
2. **Sonnet 4.6 as `code-that-ships` default** — flip studio-ops MODEL_ROUTING T2 default from current Sonnet to 4.6. **Effort:** XS · single-line registry update + propagate
3. **Managed Agents for the Studio Oracle backend** — when the ECOSYSTEM_STATE.json publisher needs a long-running agent (collect from 28 sibling repos, aggregate, publish), Managed Agents is the correct host. Define agent once, reference by ID, no infra to manage. **Effort:** M
4. **Agent Skills for `/audit` + `/implement`** — both already exist as Claude Code skills; package as **workspace-wide Agent Skills** so they're available from Claude API too (not just Claude Code). Enables IGNIS to invoke `/audit` programmatically. **Effort:** M

### 📈 Strong (ship within 2 sprints)

5. **Codex Mobile parity for founder reviews** — the founder reviews PRs from phone. Codex mobile + GPT-5.5 makes "approve from couch" real. Wire `gh pr review` capability through. **Effort:** S
6. **Codex Windows sandbox for high-risk migrations** — when running destructive migrations (force-push, db reset, secret rotation), run the agent inside the new Codex Windows sandbox vs unsandboxed Bash. **Effort:** M
7. **Hook standardization** — adopt the canonical Claude Code hook names (PreToolUse, PostToolUse, etc.) across all hooks the studio currently wires. **Effort:** S
8. **GPT-5.5 + Opus 4.7 cross-rater for the ultraReview path** — `/ultrareview` already runs multi-agent. Add GPT-5.5 as a second-vote model when Opus 4.7 and Sonnet 4.6 disagree. **Effort:** M

### 💡 Strategic (queue for ecosystem-level work)

9. **IGNIS as a Managed Agent** — once IGNIS is stable on a public-facing surface (Ecosystem Oracle is the candidate), host it as a Managed Agent so `vault-oracle` can stream from it without per-session Claude API setup. **Effort:** L
10. **Cross-repo skill propagation via Plugins** — package `studio-start`, `studio-closeout`, `audit`, `implement`, `oracle-pull` as a **Claude Code Plugin** distributed to every Studio agent terminal. Replaces per-repo `.claude/skills/` symlinks. **Effort:** M
11. **Vision-pipeline for Voidfall manuscript scoring** — Opus 4.7's vision lift makes manuscript-image analysis (handwritten notes, diagrams, cover comps) viable. Voidfall + Scriptorium consumers. **Effort:** L
12. **Mobile-first founder twin via Codex iOS** — the Founder Twin auto-approval policy (S113) is currently Claude Code-only. Codex Mobile makes mobile founder-twin viable. **Effort:** L

### 🚫 Skip / defer

- **GPT-5.5 Pro** — premium tier; current studio doesn't have a workload that justifies the premium over Opus 4.7 yet
- **Generic Anthropic SDK migration** — current code paths are stable; no functional reason to migrate beyond model-ID bumps

---

## What we shipped this session (S134) using current tooling

- IGNIS project block widget on every project page (no AI call — reads cached IGNIS output)
- `/oracle/` page (no AI call — reads cached IGNIS output)
- Cross-repo specs drafted in Markdown (no AI call)
- Per-project IGNIS voice quotations (hand-synthesized in IGNIS narrator style by this session's Claude Opus 4.7, baked to JSON, regeneratable via the IGNIS_PROJECT_VOICES_SPEC pathway)

All cost-free relative to existing Max plan. No new API spend introduced.

---

## Sources

- [Claude Opus 4.7](https://www.anthropic.com/claude/opus)
- [Claude Sonnet 4.6](https://www.anthropic.com/claude/sonnet)
- [Anthropic Release Notes — May 2026](https://releasebot.io/updates/anthropic)
- [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
- [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
- [OpenAI Codex changelog](https://developers.openai.com/codex/changelog)
- [Introducing GPT-5.5](https://openai.com/index/introducing-gpt-5-5/)
- [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)
- [The next evolution of the Agents SDK](https://openai.com/index/the-next-evolution-of-the-agents-sdk/)
