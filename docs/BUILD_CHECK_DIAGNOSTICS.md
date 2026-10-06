# Build Check Diagnostics

Generated: 2026-10-06T17:07:42.460Z
Receipt: `181d2d6044763198f28f25a4` · coverage 330/530 from step 1

Latest: **329/330** passed · failed 1 · total 294.5s
Concentration: **10.2%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 29.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 115 | 22.7s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 273 | 17.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 110 | 10.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 65 | 9.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 261 | 4.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 252 | 3.8s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 106 | 3.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 33 | 2.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 127 | 1.9s | 0 | `node scripts/check-stale-open-tasks.mjs --check` |

## Failures

- Step 330: `node scripts/test-news-article-layout.mjs` exited 1
