# Build Check Diagnostics

Generated: 2026-09-17T08:01:31.150Z
Receipt: `c29fd8cefbeeff78308f09b7` · coverage 303/499 from step 1

Latest: **302/303** passed · failed 1 · total 463.7s
Concentration: **17.8%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 82.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 104 | 51.4s | 0 | `node --test tests/founder-presence-absent.unit.spec.js tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js tests/studio-pulse.unit.spec.js tests/desk-wire.unit.spec.js tests/desk-comments.unit.spec.js tests/consent-analytics.unit.spec.js tests/theme-toggle.unit.spec.js tests/nav-toggle.unit.spec.js tests/csrf-token.unit.spec.js tests/turnstile.unit.spec.js tests/page-feedback-payload.unit.spec.js tests/desk-presence.unit.spec.js tests/public-contract-libs.unit.spec.js` |
| 61 | 17.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 12.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 241 | 11.8s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 250 | 11.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 262 | 7.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 234 | 7.3s | 0 | `node scripts/check-image-formats.mjs --strict` |
| 301 | 7.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 215 | 7.0s | 0 | `node scripts/check-studio-content-posture.mjs` |

## Failures

- Step 303: `node scripts/check-content-freshness.mjs` exited 1
