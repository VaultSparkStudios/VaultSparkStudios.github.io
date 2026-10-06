# Build Check Diagnostics

Generated: 2026-10-06T18:59:35.092Z
Receipt: `8e1c257323b3bb60cfb60fc5` · coverage 530/530 from step 1

Latest: **530/530** passed · failed 0 · total 541.1s
Concentration: **8.4%** in step 156 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 156 | 45.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 273 | 37.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 303 | 31.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 115 | 27.5s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs` |
| 106 | 22.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 505 | 17.9s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 314 | 13.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 417 | 12.6s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 65 | 12.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 403 | 10.3s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |

## Failures

- None.
