# Build Check Diagnostics

Generated: 2026-09-19T22:01:31.041Z
Receipt: `24bb38a1b495cb547d4a2c0c` · coverage 502/502 from step 1

Latest: **502/502** passed · failed 0 · total 543.1s
Concentration: **6.8%** in step 388 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 388 | 37.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 301 | 35.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 478 | 29.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 145 | 26.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 19.0s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 262 | 17.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 99 | 14.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 14.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 11.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 399 | 10.3s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
