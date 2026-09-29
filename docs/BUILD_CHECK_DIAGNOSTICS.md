# Build Check Diagnostics

Generated: 2026-09-29T22:25:17.362Z
Receipt: `bb47dbb7fe43ade58d183ff3` · coverage 505/505 from step 1

Latest: **505/505** passed · failed 0 · total 255.9s
Concentration: **10.9%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 27.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 262 | 15.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 481 | 15.3s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 14.7s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 99 | 7.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 7.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 388 | 5.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 250 | 5.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 138 | 4.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 241 | 3.0s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
