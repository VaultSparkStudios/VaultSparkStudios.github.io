# Build Check Diagnostics

Generated: 2026-09-23T05:37:10.559Z
Receipt: `3c7ede096992d8b8f2dfa4b8` · coverage 505/505 from step 1

Latest: **505/505** passed · failed 0 · total 383.9s
Concentration: **7.7%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 29.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 481 | 21.8s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 16.0s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 99 | 15.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 12.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 7.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 28 | 7.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 262 | 6.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 388 | 5.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 5.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
