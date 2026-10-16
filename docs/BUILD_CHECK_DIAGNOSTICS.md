# Build Check Diagnostics

Generated: 2026-10-16T15:21:27.061Z
Receipt: `e6bf8f6d3311ab1ec6feaf4e` · coverage 537/537 from step 1

Latest: **537/537** passed · failed 0 · total 352.1s
Concentration: **14.4%** in step 119 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 119 | 50.8s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs` |
| 160 | 41.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 510 | 21.1s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 114 | 15.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 277 | 11.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 153 | 9.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 69 | 8.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 265 | 7.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 421 | 6.5s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 318 | 6.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
