# Build Check Diagnostics

Generated: 2026-09-17T18:47:55.794Z
Receipt: `1cf7326fde4191105aad58f2` · coverage 145/499 from step 1

Latest: **144/145** passed · failed 1 · total 123.7s
Concentration: **19.3%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 23.9s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 21.2s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 61 | 12.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 11.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 4.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 138 | 4.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 134 | 1.9s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 58 | 1.8s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 130 | 1.7s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
