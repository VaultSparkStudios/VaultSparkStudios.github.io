# Build Check Diagnostics

Generated: 2026-10-01T23:07:54.330Z
Receipt: `0c913f15c9087fbba18edebf` · coverage 506/506 from step 1

Latest: **506/506** passed · failed 0 · total 310.8s
Concentration: **7.7%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 24.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 481 | 16.1s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 12.9s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 262 | 10.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 388 | 9.3s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 99 | 8.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 301 | 8.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 60 | 8.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 250 | 4.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 402 | 3.7s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
