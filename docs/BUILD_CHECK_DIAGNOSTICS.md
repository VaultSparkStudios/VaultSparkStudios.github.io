# Build Check Diagnostics

Generated: 2026-09-17T08:40:33.403Z
Receipt: `80f00f14c3f54cdc828775c3` · coverage 145/499 from step 1

Latest: **144/145** passed · failed 1 · total 54.4s
Concentration: **23.3%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 12.7s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 9.2s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 6.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 95 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 130 | 0.9s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 100 | 0.8s | 0 | `node scripts/lint-repo.mjs` |
| 29 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 66 | 0.7s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 134 | 0.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
