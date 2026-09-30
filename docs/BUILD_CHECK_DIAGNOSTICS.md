# Build Check Diagnostics

Generated: 2026-09-30T15:29:50.231Z
Receipt: `40cdcfb2125c905e873c142a` · coverage 505/505 from step 1

Latest: **505/505** passed · failed 0 · total 533.6s
Concentration: **6.3%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 33.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 21.4s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 138 | 20.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 481 | 19.8s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 60 | 13.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 10.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 262 | 9.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 388 | 8.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 301 | 6.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 28 | 5.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
