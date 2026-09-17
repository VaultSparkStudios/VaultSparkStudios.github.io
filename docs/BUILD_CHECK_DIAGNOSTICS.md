# Build Check Diagnostics

Generated: 2026-09-17T11:26:17.808Z
Receipt: `c0dd7119ea72c7011db7db0d` · coverage 499/499 from step 1

Latest: **499/499** passed · failed 0 · total 114.8s
Concentration: **10.6%** in step 475 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 475 | 12.1s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 145 | 11.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 7.9s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 473 | 3.0s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 385 | 2.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 2.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 262 | 1.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
