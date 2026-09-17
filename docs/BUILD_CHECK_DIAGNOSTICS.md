# Build Check Diagnostics

Generated: 2026-09-17T08:58:35.912Z
Receipt: `7dbc974a65bb1e0f8b961cac` · coverage 145/499 from step 1

Latest: **144/145** passed · failed 1 · total 56.1s
Concentration: **18.9%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 10.6s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 9.6s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 6.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 100 | 2.7s | 0 | `node scripts/lint-repo.mjs` |
| 95 | 2.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 130 | 1.1s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 101 | 1.0s | 0 | `node scripts/validate-module-imports.mjs` |
| 29 | 0.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 66 | 0.7s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
