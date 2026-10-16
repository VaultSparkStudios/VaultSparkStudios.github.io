# Build Check Diagnostics

Generated: 2026-10-16T05:00:23.027Z
Receipt: `3d1c7f0c0c9e8c8d5921f964` · coverage 537/537 from step 1

Latest: **537/537** passed · failed 0 · total 561.7s
Concentration: **9.5%** in step 119 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 119 | 53.3s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs` |
| 318 | 43.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 160 | 37.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 510 | 22.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 347 | 17.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 114 | 16.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 407 | 15.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 416 | 14.0s | 0 | `node scripts/check-windows-hide.mjs` |
| 153 | 13.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 69 | 11.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |

## Failures

- None.
