# Build Check Diagnostics

Generated: 2026-10-14T23:51:06.245Z
Receipt: `db7d53192d1eed7ec772ee57` · coverage 535/535 from step 1

Latest: **535/535** passed · failed 0 · total 346.2s
Concentration: **12.4%** in step 119 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 119 | 43.0s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs` |
| 153 | 37.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 160 | 29.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 509 | 26.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 114 | 21.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 69 | 12.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 265 | 6.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 407 | 6.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 115 | 5.1s | 0 | `node scripts/lint-repo.mjs` |
| 110 | 4.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
