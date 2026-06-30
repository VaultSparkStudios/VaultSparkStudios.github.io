<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-30 · session 240 · source: docs/AUDIT_2026-06-30.json -->

# Implement Plan — AUDIT_2026-06-30 S240

Sequenced for optimal efficiency: fix source-of-truth startup defects first, harden Worker stream safety, then remove stale observability noise and ship cross-repo cargo.

## Wave 1 — Gateway Truth
- **secrets-capability-map-resolution** — shipped. `scripts/lib/secrets.mjs` finds the reachable Studio Ops `CAPABILITY_MAP.json` when local public-repo map is absent.
- **startup-gateway-readiness-guard** — shipped. `scripts/smoke-startup-scripts.mjs` now fails a known capability resolving as 0/0 instead of skipping.
- **capability-probe-readonly-sibling-map** — shipped. `scripts/probe-capability.mjs` reads sibling capability maps but writes probe stamps only to local maps.

## Wave 2 — Worker Stream Safety
- **worker-generic-html-clone-buffer** — shipped. `cloudflare/security-headers-worker.js` buffers non-nonce HTML before cache clone writes.
- **worker-buffering-regression-gate** — shipped. `scripts/check-worker-rewriter-safety.mjs` now guards both HTMLRewriter streams and generic HTML fallback buffering.

## Wave 3 — Brief and Genius Truth
- **startup-human-pressure-block** — shipped. `docs/STARTUP_BRIEF.md` validates with a rendered no-pressure empty state.
- **genius-list-source-truth-suppression** — shipped. `scripts/generate-genius-list.mjs` suppresses resolved carries and prefers fresh `api/ci-status.json` over stale embedded public-intelligence CI status.

## Wave 4 — Cross-Repo and Deferrals
- **sibling-compliance-ark-cargo** — shipped. Ark repo-question cargo `01JSBCK3UUC2D00FAD6994D009` sent to `studio-ops`.
- **honest-deferrals** — recorded. INP has zero samples; push dispatch has zero subscribers and requires founder go-ahead; public voice and HMAC seed remain founder-gated.

Final verification target: focused syntax/self-tests, Worker unit tests, startup smoke, `npm run build:check`, doctor blockingFailing 0, staged secret scan, direct main push.
