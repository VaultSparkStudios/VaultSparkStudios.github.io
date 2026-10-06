# Build Check Diagnostics

Generated: 2026-10-06T23:10:35.765Z
Receipt: `7cf6405cb5f6cec565f402d1` · coverage 156/530 from step 1

Latest: **155/156** passed · failed 1 · total 163.4s
Concentration: **16.6%** in step 115 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 115 | 27.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 156 | 26.9s | 1 | `node scripts/check-proof-surface.mjs` |
| 65 | 10.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 9.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 149 | 3.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 33 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 106 | 3.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 111 | 1.6s | 0 | `node scripts/lint-repo.mjs` |
| 70 | 1.6s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 62 | 1.5s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- Step 156: `node scripts/check-proof-surface.mjs` exited 1
