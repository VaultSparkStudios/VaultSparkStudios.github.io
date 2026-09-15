# Build Check Diagnostics

Generated: 2026-09-15T07:01:02.463Z
Receipt: `d22debf198baaa83129865c5` · coverage 144/495 from step 1

Latest: **143/144** passed · failed 1 · total 430.4s
Concentration: **15.2%** in step 94 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 94 | 65.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 103 | 58.9s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 98 | 51.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 99 | 49.4s | 0 | `node scripts/lint-repo.mjs` |
| 81 | 40.6s | 0 | `node scripts/check-s151-contracts.mjs` |
| 144 | 36.5s | 1 | `node scripts/check-proof-surface.mjs` |
| 61 | 27.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 129 | 9.2s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 96 | 5.0s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |
| 112 | 4.5s | 0 | `node scripts/check-press-kit-drift.mjs --check` |

## Failures

- Step 144: `node scripts/check-proof-surface.mjs` exited 1
