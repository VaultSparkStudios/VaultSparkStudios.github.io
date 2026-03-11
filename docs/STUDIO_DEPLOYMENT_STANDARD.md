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
  - `dunescape`
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

| Repo name | Public slug | Public URL |
|---|---|---|
| `vaultfront` | `vaultfront` | `https://vaultsparkstudios.com/vaultfront/` |
| `dunescape` | `dunescape` | `https://vaultsparkstudios.com/dunescape/` |
| `call-of-doodie` | `call-of-doodie` | `https://vaultsparkstudios.com/call-of-doodie/` |
| `gridiron-gm` | `gridiron-gm` | `https://vaultsparkstudios.com/gridiron-gm/` |

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
- `https://play-dunescape.vaultsparkstudios.com`
- `https://api-dunescape.vaultsparkstudios.com`

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

- `GAME_SLUG` — lowercase public slug (e.g. `dunescape`)
- `GAME_SERVICE_ORIGIN` — e.g. `https://play-dunescape.vaultsparkstudios.com`
- `API_DOMAIN` — e.g. `api-dunescape.vaultsparkstudios.com`
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

Every launched game gets a card in the `Vault-Forged` section of the studio site.

Required card fields:

- title
- status
- one-sentence pitch
- three meta tags
- one primary CTA
- canonical path slug
- card-art theme class

Rules:

- reuse the existing `Vault-Forged` card template
- keep the CTA singular and clear
- keep copy concise
- do not introduce per-game bespoke card markup unless the entire section is being redesigned
- before committing studio-site changes, fetch the latest remote state and
  verify the live landing page or current upstream `index.html` so changes are
  applied against the real current site, not a stale clone

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
