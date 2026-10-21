# Build Check Diagnostics

Generated: 2026-10-21T15:08:29.252Z
Receipt: `6c523a801a5de0b1355aa590` · coverage 545/545 from step 1

Latest: **545/545** passed · failed 0 · total 1324.6s
Concentration: **15.7%** in step 161 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 161 | 208.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 168 | 160.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 1 | 158.7s | 0 | `node --test tests/deploy-parity.unit.spec.mjs tests/served-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs` |
| 2 | 97.2s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 127 | 79.0s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs` |
| 144 | 62.0s | 0 | `node scripts/csp-audit.mjs` |
| 77 | 35.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 415 | 26.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 518 | 23.5s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 285 | 20.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
