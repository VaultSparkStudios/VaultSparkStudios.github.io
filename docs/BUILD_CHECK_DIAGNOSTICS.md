# Build Check Diagnostics

Generated: 2026-10-20T20:39:52.253Z
Receipt: `dc2b018234349f3a219f2934` · coverage 545/545 from step 1

Latest: **545/545** passed · failed 0 · total 1410.1s
Concentration: **6.4%** in step 127 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 127 | 90.0s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs` |
| 168 | 85.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 415 | 78.7s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 1 | 74.3s | 0 | `node --test tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs` |
| 429 | 68.5s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 326 | 57.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 40.8s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 365 | 37.5s | 0 | `node scripts/check-news-claim-parity.mjs` |
| 411 | 36.7s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 518 | 32.7s | 0 | `node scripts/ingest-news-art.mjs --self-test` |

## Failures

- None.
