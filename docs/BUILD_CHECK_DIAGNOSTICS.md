# Build Check Diagnostics

Generated: 2026-09-18T20:10:04.915Z
Receipt: `94692bcf4e46696ed86ef663` · coverage 502/502 from step 1

Latest: **502/502** passed · failed 0 · total 139.5s
Concentration: **12.9%** in step 478 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 478 | 18.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 145 | 12.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 11.0s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 9.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 4.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 476 | 3.9s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 388 | 3.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 262 | 1.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
