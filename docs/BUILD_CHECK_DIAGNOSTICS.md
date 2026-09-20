# Build Check Diagnostics

Generated: 2026-09-20T22:11:25.513Z
Receipt: `58945c60909a06fafac0418a` · coverage 503/503 from step 1

Latest: **503/503** passed · failed 0 · total 182.6s
Concentration: **11.1%** in step 479 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 479 | 20.3s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 144 | 14.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 103 | 10.1s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 98 | 9.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 8.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 387 | 5.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 249 | 4.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 261 | 4.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 477 | 3.9s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 94 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
