# Build Check Diagnostics

Generated: 2026-10-08T17:12:23.485Z
Receipt: `9c1a8d1da79d8d5166e40de8` · coverage 530/530 from step 1

Latest: **530/530** passed · failed 0 · total 841.8s
Concentration: **14.7%** in step 115 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 115 | 123.4s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 156 | 103.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 273 | 31.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 505 | 26.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 65 | 14.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 403 | 14.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 110 | 11.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 111 | 10.4s | 0 | `node scripts/lint-repo.mjs` |
| 502 | 8.8s | 0 | `node scripts/generate-news-art-codex.mjs --self-test` |
| 388 | 8.7s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |

## Failures

- None.
