# Build Check Diagnostics

Generated: 2026-10-13T00:26:36.692Z
Receipt: `2518b472ab27dc616601ad09` · coverage 534/534 from step 1

Latest: **534/534** passed · failed 0 · total 227.1s
Concentration: **13.5%** in step 160 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 160 | 30.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 119 | 21.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 110 | 17.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 509 | 13.5s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 277 | 12.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 114 | 8.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 69 | 6.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 153 | 4.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 407 | 4.3s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 265 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
