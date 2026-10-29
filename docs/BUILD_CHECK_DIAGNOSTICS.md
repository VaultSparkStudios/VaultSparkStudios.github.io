# Build Check Diagnostics

Generated: 2026-10-29T20:27:20.610Z
Receipt: `6aa38ca2d893f5e0761460ea` · coverage 548/548 from step 1

Latest: **548/548** passed · failed 0 · total 914.6s
Concentration: **14.7%** in step 1 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 1 | 134.3s | 0 | `node --test tests/ledger-rotation.unit.spec.mjs tests/staging-archive.unit.spec.mjs tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/news-kicker-clearance.unit.spec.mjs tests/served-parity.unit.spec.mjs` |
| 145 | 104.2s | 0 | `node scripts/csp-audit.mjs` |
| 2 | 101.2s | 0 | `node --test tests/served-binary-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs tests/metadata-backfill.unit.spec.mjs tests/heartbeat-snapshot.unit.spec.mjs tests/rollback-archive.unit.spec.mjs tests/diagnostic-help.unit.spec.mjs` |
| 3 | 66.3s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 162 | 57.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 169 | 53.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 128 | 52.4s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs` |
| 288 | 37.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 124 | 24.3s | 0 | `node scripts/lint-repo.mjs` |
| 521 | 17.9s | 0 | `node scripts/ingest-news-art.mjs --self-test` |

## Failures

- None.
