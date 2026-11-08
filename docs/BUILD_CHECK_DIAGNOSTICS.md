# Build Check Diagnostics

Generated: 2026-11-08T13:19:10.727Z
Receipt: `c18b4a9c2a52d9bf447fdca7` · coverage 549/549 from step 1

Latest: **549/549** passed · failed 0 · total 483.5s
Concentration: **10.5%** in step 2 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 2 | 50.8s | 0 | `node --test tests/served-binary-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs tests/metadata-backfill.unit.spec.mjs tests/heartbeat-snapshot.unit.spec.mjs tests/rollback-archive.unit.spec.mjs tests/diagnostic-help.unit.spec.mjs tests/writeback-history.unit.spec.mjs tests/git-capture-capacity.unit.spec.mjs` |
| 129 | 46.3s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs` |
| 3 | 43.9s | 0 | `node --test --test-concurrency=1 tests/og-template-fit.unit.spec.mjs tests/contact-share-draft.unit.spec.mjs tests/member-registration-completion.unit.spec.mjs tests/open-member-enrollment.unit.spec.mjs tests/investor-access.unit.spec.mjs tests/member-access-experience.unit.spec.mjs tests/audience-auth-recovery.unit.spec.mjs tests/session-lock-rotation.unit.spec.mjs` |
| 1 | 43.1s | 0 | `node --test tests/ledger-rotation.unit.spec.mjs tests/staging-archive.unit.spec.mjs tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/news-kicker-clearance.unit.spec.mjs tests/page-sigil-scroll.unit.spec.mjs tests/served-parity.unit.spec.mjs` |
| 170 | 35.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 4 | 27.2s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 522 | 16.7s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 124 | 15.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 79 | 12.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 289 | 7.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
