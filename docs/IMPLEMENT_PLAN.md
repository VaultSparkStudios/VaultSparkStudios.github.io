# Implement Plan — S245

Source audit: `docs/AUDIT_2026-07-01-S245.json`

## Wave Order

1. **closeout-brief-renderer-restore** — restore missing protocol renderer and shared library.
2. **status-proof-proof-detail-extension** — deepen homepage proof text from status-proof summary.
3. **proof-detail-regression-guard** — extend S98 smoke assertions.
4. **skill-brief-smoke-gate** — extend startup smoke module import checks.
5. **arc-profile-mismatch-cargo** — ship Ark cargo to Studio Ops instead of editing the sibling repo.

## Execution Log

- `closeout-brief-renderer-restore` — shipped: `scripts/render-closeout-brief.mjs`, `scripts/lib/skill-brief.mjs`, `scripts/lib/insight-voice-linter.mjs`.
- `status-proof-proof-detail-extension` — shipped: `assets/showcase-spine.js` adds oldest-feed age and seed-risk status.
- `proof-detail-regression-guard` — shipped: `scripts/smoke-s98-scripts.mjs` asserts proof-detail wiring.
- `skill-brief-smoke-gate` — shipped: `scripts/smoke-startup-scripts.mjs` imports restored brief modules.
- `arc-profile-mismatch-cargo` — shipped as Ark cargo `01JSF8P1L4A5007257B4E63601`; no sibling tree edit.
