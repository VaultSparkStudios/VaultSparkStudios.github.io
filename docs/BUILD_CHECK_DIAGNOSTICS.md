# Build Check Diagnostics

Generated: 2026-10-20T17:18:45.987Z
Receipt: `d9690bd36a5c77e87545bd6b` · coverage 545/545 from step 1

Latest: **545/545** passed · failed 0 · total 893.3s
Concentration: **13.4%** in step 168 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 168 | 119.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 127 | 112.9s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs` |
| 1 | 81.6s | 0 | `node --test tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs` |
| 2 | 46.5s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 161 | 30.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 415 | 26.6s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 285 | 22.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 518 | 22.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 77 | 17.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 153 | 17.3s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
