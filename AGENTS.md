# Agent Instructions — VaultSpark Studios

## Studio identity

- Studio site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
- Studio public URL: `https://vaultsparkstudios.com/`
- Game repos live under: `VaultSparkStudios/`

## Per-game identity (fill in for each game repo)

- Repo name: `__GAME_SLUG__` (lowercase with hyphens — e.g. `dunescape`, `call-of-doodie`)
- Public slug: `__GAME_SLUG__` (same as repo name)
- Public URL: `https://vaultsparkstudios.com/__GAME_SLUG__/`
- Gameplay origin: `https://play-__GAME_SLUG__.vaultsparkstudios.com`
- API origin: `https://api-__GAME_SLUG__.vaultsparkstudios.com`

## Deployment standards

Before making deployment, domain, GitHub Pages, or studio-site integration
changes, read these files first:

- `STUDIO_DEPLOYMENT_STANDARD.md`
- `STUDIO_BACKEND_PLAN.md`
- `DEPLOY_PAGES.md`
- `deploy-pages.template.yml`
- `deploy-backend.docker-compose.template.yml`
- `Caddyfile.studio-backend.template`
- `GAME_LAUNCH_CHECKLIST.template.md`

## Required behavior

- Treat `STUDIO_DEPLOYMENT_STANDARD.md` as the default studio-wide policy
  for all current and future game launches unless the user explicitly overrides it.
- Keep this repo self-sufficient: deployment/domain/workflow context must remain
  understandable from repo files, not just prior chat context.
- **Game repo names are always lowercase with hyphens between words (e.g. `dunescape`, `call-of-doodie`).** This follows GitHub's recommended naming convention.
- **Repo name and public slug are identical.** There is no separate branding alias for the repo — the slug is the canonical identifier everywhere.
- **Games do NOT deploy from their own repo's GitHub Pages.** Each game's bundle
  is synced into THIS repo at the `{slug}/` subfolder via `STUDIO_SITE_TOKEN`.
  The studio site repo owns the canonical public URL for every game.
- Keep public game URLs lowercase and slug-based.
- Keep the studio landing page repo separate from individual game repos.
- Keep frontend Pages deployment separate from backend/runtime deployment.
- `STUDIO_SITE_TOKEN` is required in every game repo's secrets for the sync to work.
- Keep backend/runtime naming on the studio default:
  - `https://play-{slug}.vaultsparkstudios.com`
  - `https://api-{slug}.vaultsparkstudios.com`
- Update `CODEX_HANDOFF_YYYY-MM-DD.md` after deployment-related changes.
- If you create a temporary clone of another repo inside this repo, add it to
  `.git/info/exclude` so it cannot be accidentally staged here.
- Before committing studio-site homepage changes, fetch the latest remote state
  and verify the live site or upstream landing-page file so you are not editing
  against a stale clone.

## Required GitHub variables (per game repo)

| Variable | Example value |
|---|---|
| `GAME_SLUG` | `dunescape` |
| `STUDIO_SITE_BRANCH` | `main` |
| `GAME_SERVICE_ORIGIN` | `https://play-dunescape.vaultsparkstudios.com` |
| `API_DOMAIN` | `api-dunescape.vaultsparkstudios.com` |

## Required GitHub secret (per game repo)

| Secret | Purpose |
|---|---|
| `STUDIO_SITE_TOKEN` | PAT with write access to `VaultSparkStudios.github.io` |

## Standard workflow files (per game repo)

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Typecheck, lint, build on push/PR |
| `.github/workflows/deploy-pages.yml` | Build + sync bundle into studio site |
| `.github/workflows/deploy-backend.yml` | Backend deploy (if game has a runtime) |

## Standard source files (per game repo)

| File | Purpose |
|---|---|
| `vite.config.js` / `vite.config.ts` | Vite config; base uses `VITE_APP_BASE_PATH` env var |
| `scripts/postbuild-pages.mjs` | Copies `dist/index.html` → `dist/404.html` for SPA fallback |
| `docs/STUDIO_DEPLOYMENT_STANDARD.md` | Local copy of studio deployment standard |
| `docs/STUDIO_BACKEND_PLAN.md` | Local copy of studio backend plan |
| `docs/DEPLOY_PAGES.md` | Local copy of Pages deployment reference |
| `docs/templates/` | Local copies of all studio templates |
| `AGENTS.md` | Per-game agent instructions (copied and filled from this template) |
| `CODEX_HANDOFF_YYYY-MM-DD.md` | Deployment handoff doc, updated after each session |

## VaultSpark Studios website integration

- Studio root site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
- Standard game path pattern: `https://vaultsparkstudios.com/{slug}/`
- Standard backend patterns:
  - `https://play-{slug}.vaultsparkstudios.com`
  - `https://api-{slug}.vaultsparkstudios.com`
- Default backend host model:
  - shared studio VPS
  - Docker Compose
  - Caddy
  - shared Postgres
  - shared Redis

## Repo and slug convention

Repo names are lowercase with hyphens. Repo name and public slug are always identical.

| Game | Repo name | Public slug | Public URL |
|---|---|---|---|
| Dunescape | `dunescape` | `dunescape` | `https://vaultsparkstudios.com/dunescape/` |
| VaultFront | `vaultfront` | `vaultfront` | `https://vaultsparkstudios.com/vaultfront/` |
| Call Of Doodie | `call-of-doodie` | `call-of-doodie` | `https://vaultsparkstudios.com/call-of-doodie/` |
| Gridiron GM | `gridiron-gm` | `gridiron-gm` | `https://vaultsparkstudios.com/gridiron-gm/` |

---

## Studio System Template

This section defines the VaultSpark Studios standard for maintaining AI session
memory across hundreds of sessions. Every project and every AI agent operating
in this studio follows this system. Treat it as canon.

### Core principle

Never rely on chat history as the source of truth. Treat each AI session like
a stateless contractor that reads a compact project package, does work, and
writes back updates.

### 1. One canonical project folder

Every project gets a root structure:

```
/{ProjectName}
  /context
  /docs
  /plans
  /specs
  /logs
  /handoffs
  /prompts
  /src
```

The AI never "remembers the project." It reads the project's memory files.

### 2. Five core memory files

Every project maintains five always-updated files.

#### `context/PROJECT_BRIEF.md`

What the project is.

```
# Project Brief

Name: <ProjectName>
Type: <type>
Core fantasy: <one sentence>
Non-goals: <what this is not>

Design pillars:
- <pillar 1>
- <pillar 2>
- <pillar 3>
```

#### `context/CURRENT_STATE.md`

What is true right now.

```
# Current State

Build status:
- <status 1>
- <status 2>

Current priorities:
1. <priority 1>
2. <priority 2>

Known issues:
- <issue 1>
- <issue 2>
```

#### `context/DECISIONS.md`

Why key choices were made.

```
# Decisions

- <decision and rationale>
- <decision and rationale>
```

#### `context/TASK_BOARD.md`

The active queue.

```
# Task Board

## Now
- <active task>

## Next
- <queued task>

## Later
- <backlog item>
```

#### `handoffs/LATEST_HANDOFF.md`

What the next AI session needs in under 60 seconds.

```
# Latest Handoff

Last updated: YYYY-MM-DD

What was completed:
- <item>

What is mid-flight:
- <item>

What to do next:
1. <step>
2. <step>

Important constraints:
- <constraint>
```

### 3. Required session bootstrap prompt

Before any AI starts working, paste this standard bootstrap:

```
You are joining an existing project. Treat the repository files as source
of truth, not prior chat history.

Read in this order:
1. context/PROJECT_BRIEF.md
2. context/CURRENT_STATE.md
3. context/DECISIONS.md
4. context/TASK_BOARD.md
5. handoffs/LATEST_HANDOFF.md

Rules:
- preserve existing functionality unless explicitly told to remove it
- update memory files after making meaningful changes
- explain changes in terms of current architecture
- note assumptions clearly
```

### 4. Every work session ends with a write-back

At the end of each session, the AI must update:

- `context/CURRENT_STATE.md`
- `context/TASK_BOARD.md`
- `handoffs/LATEST_HANDOFF.md`

Without write-back, the system collapses and the next session starts drifting.

Standard closeout format:

```
## Session Closeout

Completed:
- ...

Changed files:
- ...

Open problems:
- ...

Recommended next action:
- ...
```

### 5. Use layered context, not giant dumps

Give the AI only what it needs for the current task.

- Layer 1: project identity
- Layer 2: current state
- Layer 3: active task
- Layer 4: relevant code or spec excerpts only

This keeps the model focused and avoids wasted tokens.

### Operating rhythm

| Session type | Read order | End action |
|---|---|---|
| Planning | brief → decisions → roadmap | update task board |
| Coding | handoff → relevant files → implement | write back state + handoff |
| Debugging | current state → reproduce → root cause | write back findings |
| Creative | brand/style guide → generate | save prompt + output notes |

### File pattern for multi-AI teams

When using multiple AI tools (Claude, ChatGPT, Codex, local) in parallel,
separate stable truth from temporary notes:

```
/context
  PROJECT_BRIEF.md       ← long-lived truth
  CURRENT_STATE.md
  DECISIONS.md

/specs
  <system>.md            ← deep system detail

/handoffs
  HANDOFF_YYYY-MM-DD_CLAUDE.md
  HANDOFF_YYYY-MM-DD_GPT.md
  LATEST_HANDOFF.md      ← session transitions

/logs
  SESSION_LOG.md         ← chronological memory

/prompts
  bootstrap_prompt.md    ← reusable instructions
  coding_prompt.md
```

### Why this works

- `context/` = long-lived truth that survives model resets
- `specs/` = deep system detail loaded only when relevant
- `handoffs/` = session transitions without chat dependency
- `logs/` = chronological audit trail
- `prompts/` = reusable instructions that enforce consistent behavior
