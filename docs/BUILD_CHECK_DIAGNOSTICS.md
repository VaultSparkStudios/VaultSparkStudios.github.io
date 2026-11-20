# Build Check Diagnostics

Generated: 2026-11-20T06:05:06.396Z
Receipt: `0e5c3b5d9c4cdaf241d6d130` · coverage 560/562 from step 3

Latest: **560/560** passed · failed 0 · total 828.9s
Concentration: **16.4%** in step 148 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 148 | 135.9s | 0 | `node scripts/csp-audit.mjs` |
| 131 | 93.5s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/desk-confirmation-email.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/public-form-rate-limit.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/after-paint.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js tests/s368-wave0-security.unit.spec.mjs tests/s368-noai-scope.unit.spec.mjs tests/s368-agent-action-scope.unit.spec.mjs tests/membership-tiers.unit.spec.mjs tests/s368-membership-checkout.unit.spec.mjs tests/portal-logic.unit.spec.mjs tests/s368-ask-vault.unit.spec.mjs tests/css-transport.unit.spec.mjs tests/recent-ships.unit.spec.js tests/local-audit-adapters.unit.spec.mjs tests/browser-collection.unit.spec.mjs tests/rank-report-integrity.unit.spec.mjs tests/theme-capture-receipt.unit.spec.mjs tests/oracle-context.unit.spec.mjs` |
| 172 | 43.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 5 | 37.3s | 0 | `node --test --test-concurrency=1 tests/investor-access.unit.spec.mjs tests/member-access-experience.unit.spec.mjs tests/audience-auth-recovery.unit.spec.mjs tests/session-lock-rotation.unit.spec.mjs` |
| 6 | 35.7s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 126 | 30.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 524 | 27.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 4 | 27.2s | 0 | `node --test --test-concurrency=1 tests/member-registration-completion.unit.spec.mjs tests/open-member-enrollment.unit.spec.mjs` |
| 81 | 19.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 279 | 10.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
