# Build Check Diagnostics

Generated: 2026-09-30T22:17:21.025Z
Receipt: `0cf7880c671c19f4b54d6c00` · coverage 506/506 from step 1

Latest: **506/506** passed · failed 0 · total 597.1s
Concentration: **7.6%** in step 388 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 388 | 45.3s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 104 | 33.5s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 145 | 24.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 60 | 17.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 373 | 14.8s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |
| 262 | 14.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 301 | 12.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 481 | 12.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 99 | 11.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 402 | 7.7s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
