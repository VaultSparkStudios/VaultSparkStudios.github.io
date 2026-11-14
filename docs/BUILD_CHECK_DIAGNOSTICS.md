# Build Check Diagnostics

Generated: 2026-11-14T02:56:43.573Z
Receipt: `e14834d9b62057202664e8a6` · coverage 559/559 from step 1

Latest: **559/559** passed · failed 0 · total 565.6s
Concentration: **11.0%** in step 131 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 131 | 62.5s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs tests/oracle-context.unit.spec.mjs` |
| 1 | 46.6s | 0 | `node --test tests/ledger-rotation.unit.spec.mjs tests/staging-archive.unit.spec.mjs tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/news-kicker-clearance.unit.spec.mjs tests/page-sigil-scroll.unit.spec.mjs tests/website-supabase-probe-credential.unit.spec.mjs tests/served-parity.unit.spec.mjs` |
| 2 | 36.7s | 0 | `node --test tests/served-binary-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs tests/metadata-backfill.unit.spec.mjs tests/heartbeat-snapshot.unit.spec.mjs tests/rollback-archive.unit.spec.mjs tests/diagnostic-help.unit.spec.mjs tests/writeback-history.unit.spec.mjs tests/git-capture-capacity.unit.spec.mjs` |
| 172 | 29.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 5 | 26.1s | 0 | `node --test --test-concurrency=1 tests/investor-access.unit.spec.mjs tests/member-access-experience.unit.spec.mjs tests/audience-auth-recovery.unit.spec.mjs tests/session-lock-rotation.unit.spec.mjs` |
| 4 | 22.1s | 0 | `node --test --test-concurrency=1 tests/member-registration-completion.unit.spec.mjs tests/open-member-enrollment.unit.spec.mjs` |
| 6 | 21.4s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 126 | 20.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 524 | 18.9s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 148 | 17.5s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- None.
