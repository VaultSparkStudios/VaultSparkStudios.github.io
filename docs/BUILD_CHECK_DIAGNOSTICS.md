# Build Check Diagnostics

Generated: 2026-10-22T20:50:13.928Z
Receipt: `a86fb4a33d74feb15a2a55a9` · coverage 547/547 from step 1

Latest: **547/547** passed · failed 0 · total 733.5s
Concentration: **20.3%** in step 1 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 1 | 149.0s | 0 | `node --test tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/served-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs` |
| 168 | 121.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 2 | 46.7s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 127 | 41.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs` |
| 287 | 27.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 161 | 15.4s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 77 | 13.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 520 | 12.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 144 | 12.1s | 0 | `node scripts/csp-audit.mjs` |
| 417 | 11.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |

## Failures

- None.
