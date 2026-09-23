# Build Check Diagnostics

Generated: 2026-09-23T02:35:34.651Z
Receipt: `fa64e575a02aa08460f9206e` · coverage 504/504 from step 1

Latest: **504/504** passed · failed 0 · total 515.3s
Concentration: **9.0%** in step 60 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 60 | 46.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 104 | 24.9s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 145 | 20.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 480 | 20.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 99 | 15.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 12.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 388 | 10.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 262 | 8.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 64 | 6.6s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 101 | 6.6s | 0 | `node scripts/validate-module-imports.mjs` |

## Failures

- None.
