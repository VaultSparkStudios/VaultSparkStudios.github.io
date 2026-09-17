# Build Check Diagnostics

Generated: 2026-09-17T07:48:04.141Z
Receipt: `efff839262d1351c44556cb6` · coverage 296/499 from step 1

Latest: **295/296** passed · failed 1 · total 187.6s
Concentration: **12.5%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 23.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 104 | 22.6s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 145 | 21.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 99 | 10.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 6.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 95 | 5.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 250 | 4.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 130 | 3.1s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 66 | 3.0s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 101 | 2.6s | 0 | `node scripts/validate-module-imports.mjs` |

## Failures

- Step 296: `node scripts/check-active-tt-sinks.mjs` exited 1
