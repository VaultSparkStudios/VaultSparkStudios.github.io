# Build Check Diagnostics

Generated: 2026-09-20T22:36:06.372Z
Receipt: `7863db5b4cd996cf3c6ecfef` · coverage 503/503 from step 1

Latest: **503/503** passed · failed 0 · total 303.3s
Concentration: **9.9%** in step 479 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 479 | 30.1s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 103 | 29.4s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 60 | 29.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 57 | 22.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 98 | 18.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 144 | 16.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 94 | 7.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 99 | 5.9s | 0 | `node scripts/lint-repo.mjs` |
| 249 | 4.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 387 | 4.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |

## Failures

- None.
