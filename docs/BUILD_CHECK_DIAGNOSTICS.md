# Build Check Diagnostics

Generated: 2026-10-24T06:12:54.810Z
Receipt: `10b87b4119c932f10338e517` · coverage 547/547 from step 1

Latest: **547/547** passed · failed 0 · total 594.1s
Concentration: **21.3%** in step 1 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 1 | 126.6s | 0 | `node --test tests/staging-archive.unit.spec.mjs tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/served-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs tests/metadata-backfill.unit.spec.mjs tests/heartbeat-snapshot.unit.spec.mjs tests/rollback-archive.unit.spec.mjs` |
| 168 | 55.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 2 | 50.7s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 127 | 49.2s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs` |
| 287 | 22.0s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 520 | 15.8s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 77 | 15.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 122 | 13.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 417 | 12.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 9 | 5.2s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |

## Failures

- None.
