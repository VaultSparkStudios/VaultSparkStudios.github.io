# Build Check Diagnostics

Generated: 2026-10-06T08:25:56.306Z
Receipt: `f061d22fcca70df000012c68` · coverage 530/530 from step 1

Latest: **530/530** passed · failed 0 · total 278.0s
Concentration: **13.3%** in step 505 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 505 | 37.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 156 | 26.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 273 | 17.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 115 | 14.4s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs` |
| 65 | 7.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 7.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 403 | 6.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 261 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 33 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 252 | 2.5s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
