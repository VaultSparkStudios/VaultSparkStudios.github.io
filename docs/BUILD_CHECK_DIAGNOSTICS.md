# Build Check Diagnostics

Generated: 2026-09-18T22:28:57.603Z
Receipt: `6f3558b28829adba2b8f31d8` · coverage 502/502 from step 1

Latest: **502/502** passed · failed 0 · total 312.8s
Concentration: **10.9%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 34.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 145 | 21.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 478 | 18.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 15.8s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 11.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 66 | 10.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 101 | 9.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 29 | 6.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 95 | 6.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 58 | 5.3s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
