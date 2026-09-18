# Build Check Diagnostics

Generated: 2026-09-18T19:45:04.593Z
Receipt: `a8d71017c6bdf81799adc892` · coverage 502/502 from step 1

Latest: **502/502** passed · failed 0 · total 155.0s
Concentration: **12.0%** in step 478 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 478 | 18.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 13.6s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 145 | 13.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 99 | 10.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 6.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 4.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 476 | 3.7s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 138 | 3.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 388 | 3.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 2.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
