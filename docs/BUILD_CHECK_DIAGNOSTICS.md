# Build Check Diagnostics

Generated: 2026-09-23T04:26:16.300Z
Receipt: `9d520418f67e2652be0a9629` · coverage 505/505 from step 1

Latest: **505/505** passed · failed 0 · total 274.1s
Concentration: **6.4%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 17.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 481 | 16.1s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 12.0s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 99 | 9.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 8.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 262 | 7.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 28 | 5.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 388 | 5.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 355 | 4.5s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 250 | 4.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
