# VaultSpark Studios — Pages Deployment Standard

Every game in the studio deploys its frontend bundle directly from its own
game repo using GitHub Pages.

Because all game repo names are lowercase with hyphens (GitHub recommended
convention) and the studio org has a custom domain (`vaultsparkstudios.com`),
GitHub Pages from each game repo is automatically served at:

```
https://vaultsparkstudios.com/{slug}/
```

No token or sync into the studio site repo is required. Repo name and public
slug are always identical.

Backend/runtime deployment is separate and documented in:

- `STUDIO_BACKEND_PLAN.md`

---

## How it works

Each game repo runs `deploy-pages.yml` which:

1. Builds the static client with `VITE_APP_BASE_PATH=/{slug}/`
2. Copies `dist/index.html` → `dist/404.html` for SPA deep-link fallback
3. Uploads the `dist/` folder as a Pages artifact
4. Deploys to GitHub Pages — served at `vaultsparkstudios.com/{slug}/`

The game repo owns and serves its own public URL. No cross-repo sync needed.

---

## Required GitHub Pages setup (per game repo, one-time)

1. Go to repo Settings → Pages
2. Set Source to **GitHub Actions**

No secrets or variables are required for the Pages deploy itself.

---

## Repo and slug convention

Repo names are lowercase with hyphens. Repo name and public slug are always identical.

| Game | Repo name | Public slug | Public URL |
|---|---|---|---|
| Dunescape | `dunescape` | `dunescape` | `https://vaultsparkstudios.com/dunescape/` |
| VaultFront | `vaultfront` | `vaultfront` | `https://vaultsparkstudios.com/vaultfront/` |
| Call Of Doodie | `call-of-doodie` | `call-of-doodie` | `https://vaultsparkstudios.com/call-of-doodie/` |
| Gridiron GM | `gridiron-gm` | `gridiron-gm` | `https://vaultsparkstudios.com/gridiron-gm/` |

---

## Studio site follow-up after first deploy

After the first successful deploy:

1. Add a card for the game in the `Vault-Forged` section of `index.html`
2. Set the card CTA to `/{slug}/`
3. Reuse the existing card template and art class pattern
4. Fetch latest remote state before editing `index.html`
