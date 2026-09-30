# Build Check Diagnostics

Generated: 2026-09-30T23:00:03.811Z
Receipt: `a63c8f4bcda8731c3b7359a7` · coverage 506/506 from step 1

Latest: **506/506** passed · failed 0 · total 291.6s
Concentration: **8.0%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 23.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 402 | 16.4s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 104 | 14.5s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 481 | 10.5s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 262 | 10.2s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 60 | 10.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 7.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 388 | 7.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 28 | 3.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 301 | 3.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
