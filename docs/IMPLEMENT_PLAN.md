# Implement Plan — S261

1. Ship active TT local-row manifest and manifest-backed guard. DONE.
2. Burn down still-present warm HTML sinks surfaced by the manifest. DONE.
3. Update verifier contracts to accept DOM-built behavior. DONE.
4. Regenerate build/proof artifacts and run full build-check. DONE.

## Execution Log

- `scripts/analyze-tt-violations.mjs` now emits local active/warm/stale row metadata and `.cache/tt-active-local-sinks.json`.
- `scripts/check-active-tt-sinks.mjs` consumes the manifest and retains S260 legacy guards.
- DOM-safe renderers shipped in `api/leaderboard/v1/widget.js`, `assets/ignis-project-block.js`, `assets/changelog-live.js`, `assets/changelog-time-machine.js`, and `games/vaultspark-football-gm/index.html`.
- `scripts/verify-changelog-time-machine.mjs` validates the DOM-built range scrubber contract.
- Verification: `npm run build` EXIT 0; `npm run build:check` EXIT 0 (171/171).
