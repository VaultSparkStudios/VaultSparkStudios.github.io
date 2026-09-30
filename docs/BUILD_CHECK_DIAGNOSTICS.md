# Build Check Diagnostics

Generated: 2026-09-30T21:13:29.825Z
Receipt: `a0cc96705d776d5cbe76fd3a` · coverage 506/506 from step 1

Latest: **506/506** passed · failed 0 · total 425.9s
Concentration: **6.5%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 27.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 262 | 22.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 481 | 19.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 17.3s | 0 | `node --test tests/provision-desk-turnstile.unit.spec.js tests/desk-signup-route.unit.spec.js tests/deploy-desk-dispatch.unit.spec.js tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 60 | 14.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 11.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 388 | 9.8s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 100 | 8.8s | 0 | `node scripts/lint-repo.mjs` |
| 138 | 5.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 57 | 5.1s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
