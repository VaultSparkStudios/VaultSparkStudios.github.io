# Build Check Diagnostics

Generated: 2026-09-17T08:17:20.636Z
Receipt: `0c09908ef52ac123eeb9c143` · coverage 145/499 from step 1

Latest: **144/145** passed · failed 1 · total 116.2s
Concentration: **21.2%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 24.7s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 23.8s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 61 | 10.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 10.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 138 | 3.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 101 | 2.9s | 0 | `node scripts/validate-module-imports.mjs` |
| 100 | 2.6s | 0 | `node scripts/lint-repo.mjs` |
| 130 | 2.6s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 134 | 1.6s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
