# Build Check Diagnostics

Generated: 2026-08-28T09:54:09.924Z
Receipt: `6d277aba4e5e359aefc72dff` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 427.4s
Concentration: **18.9%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 80.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 44.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 19.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 133 | 8.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 6.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 6.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 357 | 5.5s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 235 | 5.5s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 294 | 5.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 283 | 4.4s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
