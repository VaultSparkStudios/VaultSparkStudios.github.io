# Build Check Diagnostics

Generated: 2026-09-21T03:32:30.646Z
Receipt: `a33d62e61d8ee2ba89933411` · coverage 504/504 from step 1

Latest: **504/504** passed · failed 0 · total 236.4s
Concentration: **8.3%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 19.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 480 | 18.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 104 | 14.0s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js tests/shell-assets.unit.spec.js` |
| 99 | 12.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 11.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 388 | 7.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 250 | 5.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 478 | 4.4s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 262 | 4.2s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
