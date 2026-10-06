# Build Check Diagnostics

Generated: 2026-10-06T09:09:52.280Z
Receipt: `3101d11862f410294ddb0c94` · coverage 156/530 from step 1

Latest: **155/156** passed · failed 1 · total 109.4s
Concentration: **20.9%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 22.8s | 1 | `node scripts/check-proof-surface.mjs` |
| 115 | 19.7s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs` |
| 65 | 7.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 7.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 106 | 2.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 33 | 2.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 1.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 62 | 1.2s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 97 | 1.1s | 0 | `node scripts/check-changelog-reaction-hydration.mjs --self-test` |
| 132 | 1.0s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- Step 156: `node scripts/check-proof-surface.mjs` exited 1
