# Codex Handoff - 2026-03-10

## Repo
- Name: `VaultSparkStudios.github.io`
- Remote: `https://github.com/VaultSparkStudios/VaultSparkStudios.github.io.git`

## Deployment/docs status
- Added `docs/` and `docs/templates/` copies so `AGENTS.md` points at real in-repo paths.
- Fetched `origin/main` and verified the upstream homepage before editing the local landing-page file.
- Updated the homepage card for `VaultSpark Football GM` from a launch stub to a client-beta playable state.
- Replaced the existing `vaultspark-football-gm/` launch stub with the current built static bundle from `VaultSpark-Football-GM/static/`.

## Existing VaultSpark Football GM studio integration
- Home card already exists in `index.html`.
- Published path exists at `/vaultspark-football-gm/`.
- The local studio checkout now contains the generated Pages bundle for the game.

## Next required studio-side actions
- Before any future homepage/card edit: fetch latest remote and verify live/upstream `index.html` again.
- Configure/push the Studio repo changes to GitHub when ready.
