# Build Check Diagnostics

Generated: 2026-09-17T07:38:15.577Z
Receipt: `80e73ad943dd4a959ddac045` · coverage 249/495 from step 1

Latest: **248/249** passed · failed 1 · total 113.1s
Concentration: **13.2%** in step 103 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 103 | 14.9s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 144 | 14.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 98 | 11.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 9.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 249 | 7.1s | 1 | `node scripts/check-orphan-scripts.mjs --check` |
| 94 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 137 | 2.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 1.7s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 99 | 1.6s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- Step 249: `node scripts/check-orphan-scripts.mjs --check` exited 1
