# Implement Plan — Session 181

Source: `docs/AUDIT_2026-06-08-S181.{json,md}`

## Wave 1 — Public Proof

1. `ai-spine-public-health`
   - Add `scripts/build-ai-discovery-health.mjs`.
   - Publish `api/ai-discovery-health.json`.
   - Surface it on `/status/`.
   - Wire generator and check into `package.json`.

## Wave 2 — Runway Hygiene

2. `taskboard-runway-hygiene`
   - Extend `scripts/check-stale-open-tasks.mjs` with runway hygiene detection.
   - Consolidate current runway/founder-action board sections.
   - Verify the gate remains green in `build:check`.
