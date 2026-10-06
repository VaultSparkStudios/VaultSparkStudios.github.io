# Build Check Diagnostics

Generated: 2026-10-06T10:43:19.903Z
Receipt: `f144b89a321aa8bf688c316a` · coverage 280/530 from step 1

Latest: **279/280** passed · failed 1 · total 176.1s
Concentration: **15.8%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 27.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 273 | 18.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 115 | 16.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs` |
| 65 | 9.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 8.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 261 | 3.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 33 | 2.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 252 | 2.6s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 106 | 2.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 62 | 1.3s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- Step 280: `node scripts/check-evidence-graph-coverage.mjs --self-test` exited 1
