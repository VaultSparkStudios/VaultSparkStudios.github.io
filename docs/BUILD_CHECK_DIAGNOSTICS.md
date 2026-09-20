# Build Check Diagnostics

Generated: 2026-09-20T22:56:20.389Z
Receipt: `ceb82d02840241356a3a8ed0` · coverage 503/503 from step 1

Latest: **503/503** passed · failed 0 · total 155.4s
Concentration: **10.6%** in step 479 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 479 | 16.5s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 144 | 14.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 103 | 11.3s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 98 | 10.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 6.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 249 | 4.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 387 | 3.8s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 261 | 3.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 477 | 3.1s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 94 | 2.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
