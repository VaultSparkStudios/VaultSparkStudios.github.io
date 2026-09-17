# Build Check Diagnostics

Generated: 2026-09-17T19:33:33.878Z
Receipt: `77e6bb5707ffbf8f181bbf2e` · coverage 145/499 from step 1

Latest: **144/145** passed · failed 1 · total 127.7s
Concentration: **25.5%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 32.5s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 19.8s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 14.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 10.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 95 | 5.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 138 | 3.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 130 | 2.0s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 100 | 1.9s | 0 | `node scripts/lint-repo.mjs` |
| 134 | 1.6s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 121 | 1.5s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
