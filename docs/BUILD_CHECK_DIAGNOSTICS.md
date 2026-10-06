# Build Check Diagnostics

Generated: 2026-10-06T23:21:28.872Z
Receipt: `277df56f4bf9bbe9c2d16932` · coverage 219/530 from step 1

Latest: **218/219** passed · failed 1 · total 227.9s
Concentration: **14.4%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 32.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 115 | 32.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 110 | 12.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 65 | 11.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 112 | 4.3s | 0 | `node scripts/validate-module-imports.mjs` |
| 33 | 4.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 106 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 149 | 3.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 111 | 2.5s | 0 | `node scripts/lint-repo.mjs` |
| 70 | 1.9s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 219: `node scripts/check-public-contract-health.mjs` exited 1
