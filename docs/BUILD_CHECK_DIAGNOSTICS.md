# Build Check Diagnostics

Generated: 2026-10-06T17:19:14.617Z
Receipt: `167eadc0d449529302698e50` · coverage 530/530 from step 1

Latest: **530/530** passed · failed 0 · total 524.7s
Concentration: **6.4%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 33.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 115 | 21.7s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 273 | 19.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 505 | 17.3s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 65 | 11.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 11.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 403 | 7.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 261 | 5.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 33 | 4.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 4.2s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |

## Failures

- None.
