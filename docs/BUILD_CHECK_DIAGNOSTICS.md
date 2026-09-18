# Build Check Diagnostics

Generated: 2026-09-18T01:05:39.597Z
Receipt: `f42dcd0049cc175f946a3a99` · coverage 145/502 from step 1

Latest: **144/145** passed · failed 1 · total 75.9s
Concentration: **19.9%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 15.1s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 11.3s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 9.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 7.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 138 | 2.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 100 | 2.1s | 0 | `node scripts/lint-repo.mjs` |
| 58 | 1.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 29 | 1.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 130 | 1.1s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
