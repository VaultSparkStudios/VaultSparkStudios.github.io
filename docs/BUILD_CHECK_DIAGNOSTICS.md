# Build Check Diagnostics

Generated: 2026-09-17T07:28:24.638Z
Receipt: `a5fb1d5bbd46deedb7e0a27a` · coverage 144/495 from step 1

Latest: **143/144** passed · failed 1 · total 93.2s
Concentration: **18.7%** in step 144 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 144 | 17.4s | 1 | `node scripts/check-proof-surface.mjs` |
| 103 | 15.1s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 98 | 10.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 9.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 129 | 6.8s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 137 | 5.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 94 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 120 | 2.3s | 0 | `node scripts/csp-audit.mjs` |
| 81 | 1.2s | 0 | `node scripts/check-s151-contracts.mjs` |
| 99 | 1.1s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- Step 144: `node scripts/check-proof-surface.mjs` exited 1
