# Build Check Diagnostics

Generated: 2026-10-13T22:12:53.282Z
Receipt: `5bb635fe07ceb9d460311716` · coverage 534/534 from step 1

Latest: **534/534** passed · failed 0 · total 490.7s
Concentration: **9.4%** in step 160 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 160 | 46.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 509 | 38.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 407 | 28.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 119 | 28.6s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs` |
| 114 | 13.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 277 | 12.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 69 | 9.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 421 | 8.3s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 392 | 5.5s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |
| 436 | 5.1s | 0 | `node scripts/check-recovery-process-contract.mjs` |

## Failures

- None.
