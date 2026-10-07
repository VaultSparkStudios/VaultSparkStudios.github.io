# Build Check Diagnostics

Generated: 2026-10-07T15:38:06.711Z
Receipt: `469028dd72b0b7300133c72e` · coverage 530/530 from step 1

Latest: **530/530** passed · failed 0 · total 899.5s
Concentration: **10.3%** in step 65 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 65 | 92.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 156 | 58.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 149 | 56.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 115 | 48.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 106 | 35.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 273 | 28.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 111 | 25.4s | 0 | `node scripts/lint-repo.mjs` |
| 110 | 21.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 505 | 18.7s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 70 | 12.1s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- None.
