# Build Check Diagnostics

Generated: 2026-10-13T07:17:03.740Z
Receipt: `ae0a7231db99958f788cdb3a` · coverage 534/534 from step 1

Latest: **534/534** passed · failed 0 · total 186.4s
Concentration: **13.1%** in step 160 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 160 | 24.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 119 | 18.9s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs` |
| 509 | 11.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 114 | 8.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 277 | 7.8s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 69 | 7.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 407 | 4.8s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 265 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 110 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 507 | 2.1s | 0 | `node scripts/generate-news-art.mjs --self-test` |

## Failures

- None.
