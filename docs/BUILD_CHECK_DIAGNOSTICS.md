# Build Check Diagnostics

Generated: 2026-10-09T17:42:38.366Z
Receipt: `cee914c8afb88f1043e21107` · coverage 531/531 from step 1

Latest: **531/531** passed · failed 0 · total 118.7s
Concentration: **12.7%** in step 116 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 116 | 15.1s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 506 | 11.5s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 157 | 10.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 111 | 7.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 66 | 4.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 262 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 504 | 2.2s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 404 | 2.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 274 | 1.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 418 | 0.9s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
