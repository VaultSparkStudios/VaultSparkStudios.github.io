# Build Check Diagnostics

Generated: 2026-09-18T00:02:06.267Z
Receipt: `e25258d093774a4eb1681f71` · coverage 327/500 from step 1

Latest: **326/327** passed · failed 1 · total 390.4s
Concentration: **20.3%** in step 301 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 301 | 79.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 145 | 40.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 250 | 23.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 104 | 17.0s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 262 | 15.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 99 | 10.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 8.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 290 | 7.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 292 | 5.3s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 258 | 5.0s | 0 | `node scripts/check-evidence-graph.mjs` |

## Failures

- Step 327: `node scripts/build-news-freshness.mjs --check` exited 1
