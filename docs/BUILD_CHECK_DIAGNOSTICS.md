# Build Check Diagnostics

Generated: 2026-09-17T19:46:12.541Z
Receipt: `1470b5a6beeae715fe0fbc56` · coverage 499/499 from step 1

Latest: **499/499** passed · failed 0 · total 209.8s
Concentration: **9.8%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 20.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 18.6s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 475 | 15.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 61 | 13.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 11.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 250 | 5.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 4.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 385 | 4.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 473 | 4.2s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 262 | 3.2s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
