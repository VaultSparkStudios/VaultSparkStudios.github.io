# Build Check Diagnostics

Generated: 2026-09-23T03:28:45.984Z
Receipt: `998e32593ab55c203092f907` · coverage 505/505 from step 1

Latest: **505/505** passed · failed 0 · total 612.0s
Concentration: **8.9%** in step 60 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 60 | 54.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 145 | 35.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 24.7s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 481 | 24.1s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 95 | 18.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 99 | 15.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 28 | 12.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 57 | 8.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 262 | 8.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 250 | 7.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
