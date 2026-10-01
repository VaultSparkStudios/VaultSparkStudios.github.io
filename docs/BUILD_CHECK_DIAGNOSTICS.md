# Build Check Diagnostics

Generated: 2026-10-01T22:50:29.768Z
Receipt: `98304d54d34f7730c6af6745` · coverage 506/506 from step 1

Latest: **506/506** passed · failed 0 · total 266.3s
Concentration: **9.7%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 25.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 262 | 20.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 104 | 10.5s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 481 | 9.5s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 60 | 8.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 7.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 250 | 5.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 388 | 5.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 241 | 3.9s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 301 | 3.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
