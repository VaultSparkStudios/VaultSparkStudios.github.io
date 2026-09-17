# Build Check Diagnostics

Generated: 2026-09-17T10:24:44.213Z
Receipt: `07053cd7769c63b2318255cd` · coverage 145/499 from step 1

Latest: **144/145** passed · failed 1 · total 54.0s
Concentration: **19.4%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 10.5s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 8.9s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 6.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 95 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 130 | 0.9s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 100 | 0.8s | 0 | `node scripts/lint-repo.mjs` |
| 134 | 0.8s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 66 | 0.7s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
