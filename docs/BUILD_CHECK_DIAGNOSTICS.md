# Build Check Diagnostics

Generated: 2026-09-19T01:19:55.233Z
Receipt: `806c099a6b111b025a7b4907` · coverage 502/502 from step 1

Latest: **502/502** passed · failed 0 · total 141.5s
Concentration: **11.8%** in step 478 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 478 | 16.7s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 145 | 12.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 11.0s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 99 | 9.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 4.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 388 | 3.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 476 | 3.3s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 138 | 2.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 262 | 2.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
