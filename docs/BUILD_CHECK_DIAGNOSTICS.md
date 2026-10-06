# Build Check Diagnostics

Generated: 2026-10-06T09:01:24.565Z
Receipt: `1d26b3e54910f0a11f32af4d` · coverage 156/530 from step 1

Latest: **155/156** passed · failed 1 · total 111.4s
Concentration: **20.3%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 22.6s | 1 | `node scripts/check-proof-surface.mjs` |
| 115 | 17.0s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs` |
| 65 | 8.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 8.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 33 | 2.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 106 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 111 | 1.4s | 0 | `node scripts/lint-repo.mjs` |
| 114 | 1.3s | 0 | `node scripts/check-unit-suite-parity.mjs` |
| 45 | 1.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 108 | 1.1s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |

## Failures

- Step 156: `node scripts/check-proof-surface.mjs` exited 1
