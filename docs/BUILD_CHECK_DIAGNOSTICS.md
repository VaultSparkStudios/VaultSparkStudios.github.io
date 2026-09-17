# Build Check Diagnostics

Generated: 2026-09-17T08:50:59.244Z
Receipt: `4965ffcd69b22d331491ec39` · coverage 332/499 from step 1

Latest: **331/332** passed · failed 1 · total 96.5s
Concentration: **12.3%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 11.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 9.1s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 61 | 8.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 6.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 250 | 3.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 2.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 301 | 1.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 262 | 1.8s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 29 | 1.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 290 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- Step 332: `node scripts/check-news-copy-quality.mjs` exited 1
