# Build Check Diagnostics

Generated: 2026-10-06T17:50:14.133Z
Receipt: `8159d490ac3ed170d1f673de` · coverage 242/530 from step 1

Latest: **241/242** passed · failed 1 · total 262.8s
Concentration: **15.8%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 41.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 115 | 24.8s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 106 | 18.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 65 | 13.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 9.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 149 | 9.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 111 | 7.2s | 0 | `node scripts/lint-repo.mjs` |
| 33 | 4.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 167 | 3.3s | 0 | `node scripts/build-lqip-map.mjs --check` |
| 69 | 2.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- Step 242: `node scripts/check-longtail-visual-proof.mjs` exited 1
