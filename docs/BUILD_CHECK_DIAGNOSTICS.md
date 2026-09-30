# Build Check Diagnostics

Generated: 2026-09-30T20:30:44.867Z
Receipt: `0caea6e4530b8dfc44280605` · coverage 505/505 from step 1

Latest: **505/505** passed · failed 0 · total 400.1s
Concentration: **11.8%** in step 104 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 104 | 47.3s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 145 | 25.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 481 | 24.8s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 99 | 14.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 11.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 262 | 11.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 388 | 10.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 100 | 7.5s | 0 | `node scripts/lint-repo.mjs` |
| 250 | 5.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 483 | 4.6s | 0 | `node scripts/lib/build-cache.mjs --self-test` |

## Failures

- None.
