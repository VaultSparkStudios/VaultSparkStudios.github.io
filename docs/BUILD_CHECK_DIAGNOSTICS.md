# Build Check Diagnostics

Generated: 2026-10-06T17:54:05.642Z
Receipt: `2d46abf850b830ef886b5f15` · coverage 156/530 from step 1

Latest: **155/156** passed · failed 1 · total 132.2s
Concentration: **23.5%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 31.0s | 1 | `node scripts/check-proof-surface.mjs` |
| 115 | 19.7s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 65 | 10.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 10.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 33 | 3.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 149 | 3.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 106 | 2.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 45 | 1.8s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 62 | 1.7s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 111 | 1.5s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- Step 156: `node scripts/check-proof-surface.mjs` exited 1
