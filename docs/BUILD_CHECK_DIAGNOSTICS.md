# Build Check Diagnostics

Generated: 2026-10-10T00:23:19.071Z
Receipt: `19b70d5c94db89541a08187b` · coverage 532/532 from step 1

Latest: **532/532** passed · failed 0 · total 129.0s
Concentration: **13.5%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 17.3s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 507 | 12.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 158 | 11.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 112 | 8.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 67 | 4.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 263 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 405 | 2.6s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 275 | 2.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 505 | 2.3s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 108 | 2.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
