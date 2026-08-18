# Build Check Diagnostics

Generated: 2026-08-18T05:50:13.276Z
Receipt: `3e2902d9c316394b52e199f1` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 148.9s
Concentration: **18.1%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 27.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 16.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 12.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 281 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 56 | 1.2s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
