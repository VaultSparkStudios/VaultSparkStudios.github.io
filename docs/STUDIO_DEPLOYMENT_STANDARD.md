# VaultSpark Studios Deployment Standard

This document defines the default deployment structure for all VaultSpark
Studios games.

It exists to keep future launches consistent across:

- repository naming
- public URL structure
- GitHub Pages deployment
- backend domain naming
- landing-page integration
- handoff and operational documentation

## Core model

Use a hub-and-spoke structure.

- Hub:
  - `vaultsparkstudios.com`
  - studio landing page
  - shared brand/navigation/discovery
- Spokes:
  - one repo per game
  - one static frontend bundle per game
  - optional dedicated backend per game

The studio site is the presentation/distribution layer.
Each game repo is the product/source layer.
Each backend service is the runtime layer.

Do not collapse those roles into one repository.

Each game repo must still remain self-sufficient.

That means every game repo should carry enough local documentation to explain:

- the studio-wide URL and backend naming standards
- the backend runtime hosting pattern
- the GitHub Pages deployment pattern
- the studio-site integration pattern
- the current game's public URL and backend origins
- the required variables, secrets, and workflows

The studio repo is canonical, but no game repo should rely on chat history or
external tribal knowledge to understand the studio deployment model.

## Repository standard

Keep one repo per game plus one studio-site repo.

- Studio site repo:
  - `VaultSparkStudios.github.io`
- Game repos (lowercase with hyphens — GitHub recommended convention):
  - `vaultfront`
  - `solara`
  - `call-of-doodie`
  - `gridiron-gm`

Rules:

- repo names are always lowercase with hyphens between words (GitHub recommended)
- repo name and public slug are always identical — there is no separate branding alias
- each game repo deploys its own GitHub Pages directly; no cross-repo sync required
- because repo names are lowercase and the org has a custom domain, GitHub Pages
  from each game repo is automatically served at `vaultsparkstudios.com/{slug}/`
- do not use the studio-site repo as the gameplay source repo
- every game repo must keep local copies of the studio deployment standard,
  templates, and handoff references so the repo remains self-sufficient

## Public URL standard

Every game gets a slug. The slug is identical to the repo name.

| Repo name | Public slug | Game deploy URL | Studio landing page |
|---|---|---|---|
| `vaultfront` | `vaultfront` | `https://vaultsparkstudios.com/vaultfront/` | `https://vaultsparkstudios.com/games/vaultfront/` |
| `solara` | `solara` | `https://vaultsparkstudios.com/solara/` | `https://vaultsparkstudios.com/games/solara/` |
| `call-of-doodie` | `call-of-doodie` | `https://vaultsparkstudios.com/call-of-doodie/` | `https://vaultsparkstudios.com/games/call-of-doodie/` |
| `gridiron-gm` | `gridiron-gm` | `https://vaultsparkstudios.com/gridiron-gm/` | `https://vaultsparkstudios.com/games/gridiron-gm/` |
| `vaultspark-football-gm` | `vaultspark-football-gm` | `https://vaultsparkstudios.com/vaultspark-football-gm/` | `https://vaultsparkstudios.com/games/vaultspark-football-gm/` |

Two URL layers exist per game:

- **Game deploy URL** (`/{slug}/`): served from the game's own GitHub Pages deployment. Owned by the game repo. Never changes after launch.
- **Studio landing page URL** (`/games/{slug}/`): authored and maintained in `VaultSparkStudios.github.io`. Rich marketing content, feature lists, GitHub activity stream, dual CTAs.

For projects (non-game tools, studio initiatives):

- **Direct URL**: the tool or app's live URL
- **Project landing page URL** (`/projects/{slug}/`): authored in `VaultSparkStudios.github.io`

Rules:

- slugs are always lowercase with hyphens, never underscores
- repo name and slug are always identical
- keep the slug stable once launched
- treat the slug as the canonical public identifier

## Backend domain standard

Use per-game backend subdomains once a game is live or operationally distinct.

Recommended pattern:

- gameplay/socket origin:
  - `https://play-{slug}.vaultsparkstudios.com`
- API origin:
  - `https://api-{slug}.vaultsparkstudios.com`

Examples:

- `https://play-vaultfront.vaultsparkstudios.com`
- `https://api-vaultfront.vaultsparkstudios.com`
- `https://play-solara.vaultsparkstudios.com`
- `https://api-solara.vaultsparkstudios.com`

Rules:

- use one naming convention across all games
- do not mix `vaultfront-api` for one project and `api-vaultfront` for another
- split gameplay/socket traffic from general API traffic unless there is a strong reason not to

## Frontend deployment standard

Every game frontend must build correctly under a subpath.

Required production values:

- `VITE_APP_BASE_PATH=/{slug}/`
- `VITE_CANONICAL_URL=https://vaultsparkstudios.com/{slug}/`
- `VITE_OG_IMAGE_URL=https://vaultsparkstudios.com/{slug}/images/cover.png`
- `VITE_DOMAIN=vaultsparkstudios.com`
- `VITE_GAME_SERVICE_ORIGIN=https://play-{slug}.vaultsparkstudios.com`
- `API_DOMAIN=api-{slug}.vaultsparkstudios.com`

Rules:

- every game must support GitHub Pages subpath hosting
- every game must generate SPA deep-link fallback `404.html`
- every game must avoid hardcoding `/` as the production client root

## GitHub workflow standard

Each game repo should have:

1. `ci.yml`
   - typecheck
   - lint
   - tests

2. `deploy-pages.yml`
   - build static client with `VITE_APP_BASE_PATH=/{slug}/`
   - copy `index.html` to `404.html` for SPA deep-link fallback
   - upload `dist/` as a GitHub Pages artifact
   - deploy to GitHub Pages — served at `vaultsparkstudios.com/{slug}/`
   - no cross-repo sync or `STUDIO_SITE_TOKEN` required

3. `deploy-backend.yml` if the game has a dedicated runtime/backend

Rules:

- the public slug in the build path matches the repo name exactly
- enable GitHub Pages source as "GitHub Actions" in each game repo's settings (one-time)
- frontend deploy and backend deploy must be separate workflows
- do not couple Pages publishing to backend rollout
- studio-site publishing must update only the target `/{slug}/` subfolder

## Temporary clone safety standard

When a temporary clone of another repo is created inside a game repo for
inspection or patching, it must not be staged into the parent game repo.

Rules:

- never use `git add .` blindly in a dirty multi-repo workspace
- add temporary clone paths to `.git/info/exclude` in the parent repo
- commit temporary clones only from within their own repo context
- treat temporary clone directories as operational scratch space, not project files

## GitHub variables and secrets standard

Per game repo, define the same variable names.

Variables:

- `GAME_SLUG` — lowercase public slug (e.g. `solara`)
- `GAME_SERVICE_ORIGIN` — e.g. `https://play-solara.vaultsparkstudios.com`
- `API_DOMAIN` — e.g. `api-solara.vaultsparkstudios.com`
- `STUDIO_SITE_BRANCH` — branch to push bundle into (typically `main`)

Secrets:

- `STUDIO_SITE_TOKEN` — PAT with write access to `VaultSparkStudios.github.io`
- backend deploy credentials
- game-specific API/auth secrets

Rules:

- keep variable names identical across all game repos
- only values change per game
- `STUDIO_SITE_TOKEN` is required for every game that publishes via the studio site sync model

## Landing-page integration standard

### Catalog cards (games/index.html and projects/index.html)

Every game and project gets a card in the relevant catalog page.

Required card fields:
- title
- status badge
- one-sentence pitch
- meta tags (genre/type)
- **two CTAs** (dual-CTA pattern):
  - Primary: "Play Now" (games) or "View App" / "View Platform" / "View Pipeline" (projects) → links to the deploy/live URL
  - Secondary: "More Info" → links to the studio landing page at `/games/{slug}/` or `/projects/{slug}/`

Rules:
- every game and project gets a card regardless of stage (live, beta, dev, or concept)
- in-dev and concept cards show appropriate status badges and have "More Info" linking to a landing page that explains the project
- keep the primary CTA label contextually accurate (not all projects say "View App")
- before committing studio-site changes, fetch the latest remote state and verify the live landing page

### Studio landing pages (/games/{slug}/ and /projects/{slug}/)

Every game and project gets a dedicated landing page regardless of development stage.

Required landing page sections:
1. **Hero** — game/project name, status badge, eyebrow label, dual-action buttons (Play Now + Track/Join)
2. **Feature block** — full description, feature list with ▸ bullets, genre/type meta tags
3. **Side panel** — stat grid (4 key numbers), game info block (genre, platform, save system, price, status, developer), Vault Member CTA block
4. **Recent Updates** — GitHub activity stream (see below)

Asset path rule: landing pages at `/games/{slug}/` and `/projects/{slug}/` use `../../assets/` (two levels up from root).

### GitHub Activity Stream

Every landing page includes a live "Recent Updates" section populated from the GitHub API.

Implementation:
```javascript
fetch('https://api.github.com/repos/VaultSparkStudios/{repo}/commits?per_page=5')
  .then(r => r.json())
  .then(commits => { /* render commit messages + relative dates */ })
  .catch(() => { /* show static fallback link to GitHub */ });
```

Rules:
- always include a graceful fallback (static "View on GitHub →" link) for rate-limit or fetch failures
- display: commit message (truncated at 80 chars) + relative date
- do not require authentication — public repos only
- rate limit is 60 req/hr unauthenticated — acceptable for a marketing page

### URL migration rule

When a game landing page moves from `/{slug}/` to `/games/{slug}/`:
- replace the old `/{slug}/index.html` with a lightweight redirect page:
  ```html
  <meta http-equiv="refresh" content="0; url=/games/{slug}/" />
  <link rel="canonical" href="https://vaultsparkstudios.com/games/{slug}/" />
  ```
- GitHub Pages has no server-side redirects — this is the only option
- update all internal nav/footer links to the new path
- update sitemap.xml

## Per-game launch checklist

Before launch, every game must have:

1. subpath-safe frontend
2. canonical URL configured
3. OG image under the game path
4. SPA fallback
5. studio-site card
6. backend origins configured
7. legal/attribution reviewed
8. analytics verified
9. mobile smoke test
10. hard-refresh deep-link test
11. studio-site remote/live verification completed before homepage changes are committed

Reusable template:

- `docs/templates/GAME_LAUNCH_CHECKLIST.template.md`
- `docs/STUDIO_BACKEND_PLAN.md`
- `docs/templates/deploy-backend.docker-compose.template.yml`
- `docs/templates/Caddyfile.studio-backend.template`

## Handoff standard

Each game repo should maintain:

- `CODEX_HANDOFF_YYYY-MM-DD.md`

It should include:

- deployment status
- repo remotes
- public frontend URL
- backend origins
- workflow names
- required secrets/variables
- known issues
- last validation commands

Rules:

- update the handoff after deployment-related changes
- treat the handoff as operational memory, not marketing copy
- record any temporary clone paths or staging-exclusion safeguards if they were
  needed during deployment work

## Future-game defaults

For a new game named `Shadow Rift`:

- repo name (lowercase with hyphens):
  - `shadow-rift`
- public slug (identical to repo name):
  - `shadow-rift`
- studio site subfolder:
  - `VaultSparkStudios.github.io/shadow-rift/`
- public URL:
  - `https://vaultsparkstudios.com/shadow-rift/`
- gameplay origin:
  - `https://play-shadow-rift.vaultsparkstudios.com`
- API origin:
  - `https://api-shadow-rift.vaultsparkstudios.com`
- `GAME_SLUG` repo variable:
  - `shadow-rift`

## Non-negotiable governance rules

- one studio site
- one repo per game
- one stable slug per game
- one Pages subfolder per game
- one backend origin pair per game
- one reusable deployment workflow pattern across all games
- one self-sufficient documentation set per game repo

This is the default unless there is a specific technical reason to deviate.
