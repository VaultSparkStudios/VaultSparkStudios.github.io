# Build Check Diagnostics

Generated: 2026-10-12T05:48:49.189Z
Receipt: `f5d90080220483390a97cb52` · coverage 534/534 from step 1

Latest: **534/534** passed · failed 0 · total 210.2s
Concentration: **11.6%** in step 119 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 119 | 24.3s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 160 | 20.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 509 | 17.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 277 | 14.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 114 | 12.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 69 | 7.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 265 | 4.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 407 | 3.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 110 | 2.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 1 | 2.1s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |

## Failures

- None.
