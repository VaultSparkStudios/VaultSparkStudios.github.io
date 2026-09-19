# Build Check Diagnostics

Generated: 2026-09-19T01:29:19.244Z
Receipt: `c5ea6c13f8e908f792579099` · coverage 502/502 from step 1

Latest: **502/502** passed · failed 0 · total 196.7s
Concentration: **11.0%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 21.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 478 | 21.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 15.4s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 99 | 9.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 388 | 5.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 250 | 5.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 476 | 4.4s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 138 | 4.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 262 | 3.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
