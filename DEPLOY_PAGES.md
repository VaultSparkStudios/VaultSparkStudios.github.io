# VaultSpark Studios — Pages Deployment Standard

Every game in the studio deploys its frontend bundle into this repo
(`VaultSparkStudios/VaultSparkStudios.github.io`) at a lowercase slug path.

This decouples the public URL from the game repo name. The repo may be
capitalized (`Dunescape`); the public URL is always lowercase
(`/dunescape/`).

Backend/runtime deployment is separate and documented in:

- `STUDIO_BACKEND_PLAN.md`

---

## How it works

Each game repo runs `deploy-pages.yml` which:

1. Builds the static client with `VITE_APP_BASE_PATH=/{slug}/` (lowercase)
2. Copies `dist/index.html` → `dist/404.html` for SPA deep-link fallback
3. Checks out this studio site repo using `STUDIO_SITE_TOKEN`
4. Syncs the built bundle into `/{slug}/` (lowercase subfolder here)
5. Commits and pushes — GitHub Pages serves it at `vaultsparkstudios.com/{slug}/`

The studio site repo is always the canonical host. The game repo name casing
does not affect the public URL.

---

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

---

## Slug and repo name convention

Repo names are lowercase with hyphens. Repo name and public slug are always identical.

| Game | Repo name | Public slug | Public URL |
|---|---|---|---|
| Dunescape | `dunescape` | `dunescape` | `https://vaultsparkstudios.com/dunescape/` |
| VaultFront | `vaultfront` | `vaultfront` | `https://vaultsparkstudios.com/vaultfront/` |
| Call Of Doodie | `call-of-doodie` | `call-of-doodie` | `https://vaultsparkstudios.com/call-of-doodie/` |
| Gridiron GM | `gridiron-gm` | `gridiron-gm` | `https://vaultsparkstudios.com/gridiron-gm/` |

---

## Studio site follow-up after first deploy

After the bundle is synced for the first time:

1. Add a card for the game in the `Vault-Forged` section of `index.html`
2. Set the card CTA to `/{slug}/` (lowercase)
3. Reuse the existing card template and art class pattern
4. Fetch latest remote state before editing `index.html`
