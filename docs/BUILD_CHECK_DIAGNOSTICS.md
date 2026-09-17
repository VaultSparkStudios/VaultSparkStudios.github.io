# Build Check Diagnostics

Generated: 2026-09-17T09:21:25.348Z
Receipt: `00c8eff3274d662698175d7d` · coverage 499/499 from step 1

Latest: **499/499** passed · failed 0 · total 177.5s
Concentration: **33.0%** in step 475 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 475 | 58.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 145 | 12.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 9.2s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 61 | 7.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 7.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 473 | 3.6s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 250 | 3.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 385 | 2.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 262 | 1.8s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
