# Build Check Diagnostics

Generated: 2026-09-17T10:22:16.329Z
Receipt: `ea66e17d0e88a743c89b982f` · coverage 104/499 from step 1

Latest: **103/104** passed · failed 1 · total 33.2s
Concentration: **23.6%** in step 104 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 104 | 7.8s | 1 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 99 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 95 | 2.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 0.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 66 | 0.7s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 100 | 0.6s | 0 | `node scripts/lint-repo.mjs` |
| 58 | 0.6s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 101 | 0.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 65 | 0.3s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- Step 104: `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` exited 1
