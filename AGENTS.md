# Agent Instructions — VaultSpark Studios

## Studio identity

* Studio site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
* Studio public URL: `https://vaultsparkstudios.com/`
* Game repos live under: `VaultSparkStudios/`

## Per-game identity (fill in for each game repo)

* Repo name: `\_\_GAME\_SLUG\_\_` (lowercase with hyphens — e.g. `dunescape`, `call-of-doodie`)
* Public slug: `\_\_GAME\_SLUG\_\_` (same as repo name)
* Public URL: `https://vaultsparkstudios.com/\_\_GAME\_SLUG\_\_/`
* Gameplay origin: `https://play-\_\_GAME\_SLUG\_\_.vaultsparkstudios.com`
* API origin: `https://api-\_\_GAME\_SLUG\_\_.vaultsparkstudios.com`

## Deployment standards

Before making deployment, domain, GitHub Pages, or studio-site integration
changes, read these files first:

* `docs/STUDIO\_DEPLOYMENT\_STANDARD.md`
* `docs/STUDIO\_BACKEND\_PLAN.md`
* `docs/DEPLOY\_PAGES.md`
* `docs/templates/deploy-pages.template.yml`
* `docs/templates/deploy-backend.docker-compose.template.yml`
* `docs/templates/Caddyfile.studio-backend.template`
* `docs/templates/GAME\_LAUNCH\_CHECKLIST.template.md`

## Project system standards

Before creating or restructuring project memory, handoffs, canon docs, or
studio operating records, read these files first:

* `docs/STUDIO_PROJECT_SYSTEM.md`
* `docs/STUDIO_PUBLIC_PRIVATE_SPLIT.md`
* `docs/STUDIO_REPO_TOPOLOGY.md`
* `docs/STUDIO_DOCUMENT_AUTHORITY.md`
* `docs/STUDIO_LOCAL_PROJECT_BOOTSTRAP.md`
* `docs/STUDIO_NEW_PROJECT_BOOTSTRAP.md`
* `docs/STUDIO_EXISTING_PROJECT_MIGRATION.md`
* `docs/STUDIO_PROJECT_TYPE_MATRIX.md`
* `docs/templates/project-system/README.md`

## Required behavior

* Treat `STUDIO\_DEPLOYMENT\_STANDARD.md` as the default studio-wide policy
for all current and future game launches unless the user explicitly overrides it.
* Keep this repo self-sufficient: deployment/domain/workflow context must remain
understandable from repo files, not just prior chat context.
* **Game repo names are always lowercase with hyphens between words (e.g. `dunescape`, `call-of-doodie`).** This follows GitHub's recommended naming convention.
* **Repo name and public slug are identical.** There is no separate branding alias for the repo — the slug is the canonical identifier everywhere.
* **Each game deploys its own GitHub Pages directly from its own repo.** Because repo names are lowercase and the org has a custom domain, Pages is automatically served at `vaultsparkstudios.com/{slug}/`. No cross-repo sync or `STUDIO\_SITE\_TOKEN` is required.
* Enable GitHub Pages source as "GitHub Actions" in each game repo's Settings → Pages (one-time setup).
* Keep public game URLs lowercase and slug-based.
* Keep the studio landing page repo separate from individual game repos.
* Keep frontend Pages deployment separate from backend/runtime deployment.
* Keep backend/runtime naming on the studio default:

  * `https://play-{slug}.vaultsparkstudios.com`
  * `https://api-{slug}.vaultsparkstudios.com`
* Update `CODEX\_HANDOFF\_YYYY-MM-DD.md` after deployment-related changes.
* If you create a temporary clone of another repo inside this repo, add it to
`.git/info/exclude` so it cannot be accidentally staged here.
* Before committing studio-site homepage changes, fetch the latest remote state
and verify the live site or upstream landing-page file so you are not editing
against a stale clone.
* Use `docs/templates/project-system/` as the canonical template library for
project memory, handoffs, canon, provenance, brand, and learning records.
* Treat this public repo as the public-safe layer. Sensitive studio-system,
rights, provenance, canon, innovation, approval, and unpublished strategy
materials belong in `vaultspark-studio-ops` or in private project repos.
* For existing projects, prefer additive migration over disruptive
reorganization.
* Must follow the STUDIO SYSTEM TEMPLATE at the bottom of this document and create all files and folders it mentions

## Required GitHub setup (per game repo)

**Settings → Pages:** Set Source to **GitHub Actions** (one-time, enables the deploy).

**Optional variables** (for games with a backend):

|Variable|Example value|
|-|-|
|`GAME\_SERVICE\_ORIGIN`|`https://play-dunescape.vaultsparkstudios.com`|
|`API\_DOMAIN`|`api-dunescape.vaultsparkstudios.com`|

No secrets are required for Pages deployment.

## Standard workflow files (per game repo)

|File|Purpose|
|-|-|
|`.github/workflows/ci.yml`|Typecheck, lint, build on push/PR|
|`.github/workflows/deploy-pages.yml`|Build + deploy the game repo directly to GitHub Pages|
|`.github/workflows/deploy-backend.yml`|Backend deploy (if game has a runtime)|

## Standard source files (per game repo)

|File|Purpose|
|-|-|
|`vite.config.js` / `vite.config.ts`|Vite config; base uses `VITE\_APP\_BASE\_PATH` env var|
|`scripts/postbuild-pages.mjs`|Copies `dist/index.html` → `dist/404.html` for SPA fallback|
|`docs/STUDIO\_DEPLOYMENT\_STANDARD.md`|Local copy of studio deployment standard|
|`docs/STUDIO\_BACKEND\_PLAN.md`|Local copy of studio backend plan|
|`docs/DEPLOY\_PAGES.md`|Local copy of Pages deployment reference|
|`docs/templates/`|Local copies of all studio templates|
|`AGENTS.md`|Per-game agent instructions (copied and filled from this template)|
|`CODEX\_HANDOFF\_YYYY-MM-DD.md`|Deployment handoff doc, updated after each session|

## Vault Member Auth System (Supabase)

Added 2026-03-24. The studio site is the auth hub for all Vault-gated tools.

**Key files:**
- `assets/supabase-client.js` — shared Supabase JS client (`window.VSSupabase`), cross-domain redirect helper (`VSGate`), gated app registry (`VAULT_GATED_APPS`)
- `vault-member/index.html` — Supabase auth replaces localStorage; invite codes required to register
- `supabase-schema.sql` — run once in Supabase SQL Editor to provision tables + RPCs
- `supabase-schema-v2.sql` — run after schema v1; adds promogrind_data, vault_events, subscriptions, game_sessions, award_vault_points RPC, get_member_stats RPC

**Credentials:** `assets/supabase-client.js` has the real credentials at the top. Never commit new credentials — the anon key is safe for browser use.

**Supabase project:** `https://fjnpzjjyhnpmunfoycrp.supabase.co` — shared across all studio games and tools.

## Vault Member Integration Standard (Required for ALL projects)

Every game, tool, app, and platform built under VaultSpark Studios **must** integrate Vault Member features at launch. This is a studio-wide operating standard — not optional.

### Two integration tiers

**Tier 1 — Gated tool** (access restricted to Vault Members only, e.g. PromoGrind):
1. Add entry to `VAULT_GATED_APPS` in `assets/supabase-client.js`
2. Copy `promogrind/src/auth.js` into the tool's `src/` — handles session check + redirect
3. Add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to `.env`
4. Call `checkAuth()` at app startup; it redirects unauthenticated users automatically
5. Add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` as GitHub Actions secrets for the deploy workflow

**Tier 2 — Open game/app** (anyone can use it, Vault Members get extras, e.g. call-of-doodie):
1. Use the shared Supabase project (same URL + anon key)
2. At the point where a meaningful action completes (score submit, level complete, etc.), call `_tryAwardVaultPoints()` — see `call-of-doodie/src/storage.js` for the canonical implementation
3. This function: checks for a non-anonymous vault session → writes to `game_sessions` → calls `award_vault_points` RPC → fails silently if no vault session
4. Non-members are completely unaffected — the function is fire-and-forget

### Points schedule (standard, override per-project if needed)
| Event | Points |
|---|---|
| game_session | 3 pts |
| calculation (tool use) | 5 pts first, 1 pt subsequent |
| ledger_entry | 2 pts |
| daily_login | 3 pts |

### What every project gets automatically
- Vault points accumulate in `vault_members.points`
- Achievements unlock via `award_vault_points` RPC
- Game sessions appear in `game_sessions` table
- Stats show on vault-member dashboard via `get_member_stats` RPC
- No extra UI, no extra auth — transparent to players without accounts

### Adding a new gated tool checklist
1. Add entry to `VAULT_GATED_APPS` in `assets/supabase-client.js`
2. Copy `promogrind/src/auth.js` → new tool's `src/auth.js`
3. Add Supabase env vars to `.env` + GitHub Actions secrets
4. Add `_tryAwardVaultPoints` equivalent for meaningful user actions
5. Wire daily login event on app startup

**Cross-domain token flow:** vault-member sends `access_token` + `refresh_token` via URL hash to the gated tool after login. The tool calls `supabase.auth.setSession()` to establish its session. See `LATEST_HANDOFF.md` for full flow.

## VaultSparked Membership Tier

Added 2026-03-24. VaultSparked is the studio-wide premium membership.

**Plan identifier:** `vault_sparked` in the `subscriptions` table
**Price:** $24.99/month (founding member; may introduce annual discount later)
**Model:** Additive — every new feature, tool, and game perk included automatically; no per-product upsell

**Key decisions:**
- One Stripe account for the entire studio; VaultSparked is the single product
- Future studio features fold in automatically — no new plan needed
- Legacy `pro` plan is treated as equivalent to `vault_sparked` everywhere (do not break existing subscribers)
- No live Stripe activation until LLC + EIN obtained; test mode is safe

**Free vs paid split:**
- Free: core calculators, open games (call-of-doodie, etc.), leaderboards, vault points
- VaultSparked: Live Scanner (arb + +EV), cosmetics/badges, early access to new tools, future edge features

**Stripe setup (when LLC ready):**
1. stripe.com → create account as VaultSpark Studios LLC
2. Products → Add product: VaultSparked $24.99/month recurring
3. Webhooks → Add endpoint: `https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/stripe-webhook`
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
4. `supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_VAULT_SPARKED_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://vaultsparkstudios.com`
5. `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook`

**isPro() rule:** Always accept both `vault_sparked` AND `pro` plans as active subscriptions. Never check for only one.

## VaultSpark Studios website integration

* Studio root site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
* Game deploy path (from game repo via GitHub Pages): `https://vaultsparkstudios.com/{slug}/`
* Studio landing page (authored in studio site repo): `https://vaultsparkstudios.com/games/{slug}/`
* Project landing page (authored in studio site repo): `https://vaultsparkstudios.com/projects/{slug}/`
* Standard backend patterns:

  * `https://play-{slug}.vaultsparkstudios.com`
  * `https://api-{slug}.vaultsparkstudios.com`
* Default backend host model:

  * shared studio VPS
  * Docker Compose
  * Caddy
  * shared Postgres
  * shared Redis

### GitHub Activity Stream

Every game and project landing page includes a live activity feed from the game/project's GitHub repo:

* Endpoint: `https://api.github.com/repos/VaultSparkStudios/{repo}/commits?per_page=5`
* Auth: none (public repos, 60 req/hr rate limit)
* Fallback: static "View on GitHub →" link if fetch fails
* Display: commit message + relative date in a "Recent Updates" section
* Implementation: client-side `fetch()` in the landing page `<script>` block

## Repo and slug convention

Repo names are lowercase with hyphens. Repo name and public slug are always identical.

|Game|Repo name|Public slug|Game deploy URL|Studio landing page URL|
|-|-|-|-|-|
|Dunescape|`dunescape`|`dunescape`|`https://vaultsparkstudios.com/dunescape/`|`https://vaultsparkstudios.com/games/dunescape/`|
|VaultFront|`vaultfront`|`vaultfront`|`https://vaultsparkstudios.com/vaultfront/`|`https://vaultsparkstudios.com/games/vaultfront/`|
|Call Of Doodie|`call-of-doodie`|`call-of-doodie`|`https://vaultsparkstudios.com/call-of-doodie/`|`https://vaultsparkstudios.com/games/call-of-doodie/`|
|Gridiron GM|`gridiron-gm`|`gridiron-gm`|`https://vaultsparkstudios.com/gridiron-gm/`|`https://vaultsparkstudios.com/games/gridiron-gm/`|
|VaultSpark Football GM|`vaultspark-football-gm`|`vaultspark-football-gm`|`https://vaultsparkstudios.com/vaultspark-football-gm/`|`https://vaultsparkstudios.com/games/vaultspark-football-gm/`|

\---

## Studio System Template

This section defines the VaultSpark Studios standard for maintaining AI session
memory across hundreds of sessions. Every project and every AI agent operating
in this studio follows this system. Treat it as canon.

### Core principle

Never rely on chat history as the source of truth. Treat each AI session like
a stateless contractor that reads a compact project package, does work, and
writes back updates.

### 1\. One canonical project folder

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

### 2\. Five core memory files

Every project maintains five always-updated files.

#### `context/PROJECT\_BRIEF.md`

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

#### `context/CURRENT\_STATE.md`

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

#### `context/TASK\_BOARD.md`

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

#### `handoffs/LATEST\_HANDOFF.md`

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

### 3\. Required session bootstrap prompt

Before any AI starts working, paste this standard bootstrap:

```
You are joining an existing project. Treat the repository files as source
of truth, not prior chat history.

Read in this order:
1. context/PROJECT\_BRIEF.md
2. context/CURRENT\_STATE.md
3. context/DECISIONS.md
4. context/TASK\_BOARD.md
5. handoffs/LATEST\_HANDOFF.md

Rules:
- preserve existing functionality unless explicitly told to remove it
- update memory files after making meaningful changes
- explain changes in terms of current architecture
- note assumptions clearly
```

### 4\. Every work session ends with a write-back

At the end of each session, the AI must update:

* `context/CURRENT\_STATE.md`
* `context/TASK\_BOARD.md`
* `handoffs/LATEST\_HANDOFF.md`

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

### 5\. Use layered context, not giant dumps

Give the AI only what it needs for the current task.

* Layer 1: project identity
* Layer 2: current state
* Layer 3: active task
* Layer 4: relevant code or spec excerpts only

This keeps the model focused and avoids wasted tokens.

### Operating rhythm

|Session type|Read order|End action|
|-|-|-|
|Planning|brief → decisions → roadmap|update task board|
|Coding|handoff → relevant files → implement|write back state + handoff|
|Debugging|current state → reproduce → root cause|write back findings|
|Creative|brand/style guide → generate|save prompt + output notes|

### File pattern for multi-AI teams

When using multiple AI tools (Claude, ChatGPT, Codex, local) in parallel,
separate stable truth from temporary notes:

```
/context
  PROJECT\_BRIEF.md       ← long-lived truth
  CURRENT\_STATE.md
  DECISIONS.md

/specs
  <system>.md            ← deep system detail

/handoffs
  HANDOFF\_YYYY-MM-DD\_CLAUDE.md
  HANDOFF\_YYYY-MM-DD\_GPT.md
  LATEST\_HANDOFF.md      ← session transitions

/logs
  SESSION\_LOG.md         ← chronological memory

/prompts
  bootstrap\_prompt.md    ← reusable instructions
  coding\_prompt.md
```

### Why this works

* `context/` = long-lived truth that survives model resets
* `specs/` = deep system detail loaded only when relevant
* `handoffs/` = session transitions without chat dependency
* `logs/` = chronological audit trail
* `prompts/` = reusable instructions that enforce consistent behavior
