# Build Check Diagnostics

Generated: 2026-09-18T00:53:19.406Z
Receipt: `b42ca6c48344bed55c702351` · coverage 145/502 from step 1

Latest: **144/145** passed · failed 1 · total 81.6s
Concentration: **17.9%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 14.6s | 1 | `node scripts/check-proof-surface.mjs` |
| 104 | 13.3s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 9.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 7.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 138 | 5.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 3.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 100 | 2.0s | 0 | `node scripts/lint-repo.mjs` |
| 58 | 1.7s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 101 | 1.2s | 0 | `node scripts/validate-module-imports.mjs` |
| 29 | 1.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- Step 145: `node scripts/check-proof-surface.mjs` exited 1
