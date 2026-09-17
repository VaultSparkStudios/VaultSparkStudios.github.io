# Build Check Diagnostics

Generated: 2026-09-17T07:14:23.420Z
Receipt: `9d507f71ca5458f7737a1566` · coverage 144/495 from step 1

Latest: **143/144** passed · failed 1 · total 91.3s
Concentration: **16.9%** in step 103 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 103 | 15.4s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 144 | 13.4s | 1 | `node scripts/check-proof-surface.mjs` |
| 98 | 11.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 10.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 129 | 6.8s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 137 | 3.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 94 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 120 | 2.1s | 0 | `node scripts/csp-audit.mjs` |
| 81 | 1.8s | 0 | `node scripts/check-s151-contracts.mjs` |
| 99 | 1.7s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- Step 144: `node scripts/check-proof-surface.mjs` exited 1
