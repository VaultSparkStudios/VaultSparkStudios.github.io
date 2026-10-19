# Build Check Diagnostics

Generated: 2026-10-19T20:17:30.087Z
Receipt: `5ed5e985994898c1c3cf8b66` · coverage 231/542 from step 1

Latest: **230/231** passed · failed 1 · total 261.1s
Concentration: **19.1%** in step 124 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 124 | 49.9s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs` |
| 165 | 36.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 1 | 25.3s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 74 | 18.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 119 | 15.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 115 | 7.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 79 | 4.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 120 | 4.0s | 0 | `node scripts/lint-repo.mjs` |
| 158 | 3.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 6 | 3.2s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |

## Failures

- Step 231: `node scripts/check-closeout-boundary.mjs` exited 1
