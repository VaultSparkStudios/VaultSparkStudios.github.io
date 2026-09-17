# Build Check Diagnostics

Generated: 2026-09-17T20:02:53.539Z
Receipt: `608624811991bdcd5b4575bf` · coverage 500/500 from step 1

Latest: **500/500** passed · failed 0 · total 226.2s
Concentration: **9.2%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 20.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 476 | 20.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 15.7s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 61 | 14.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 11.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 386 | 6.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 250 | 5.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 474 | 4.6s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 95 | 4.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 262 | 2.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
