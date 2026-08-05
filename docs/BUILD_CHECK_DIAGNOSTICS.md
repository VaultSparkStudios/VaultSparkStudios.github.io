# Build Check Diagnostics

Generated: 2026-08-05T04:49:10.093Z
Receipt: `d8c54d49f0cfc96c2a254484` · coverage 275/275 from step 1

Latest: **275/275** passed · failed 0 · total 604.5s
Concentration: **11.2%** in step 126 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 126 | 67.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 47 | 42.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 212 | 20.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 20 | 17.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 79 | 12.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 221 | 7.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 255 | 6.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 250 | 6.2s | 0 | `node scripts/inject-speakable-jsonld.mjs --check` |
| 207 | 5.7s | 0 | `node scripts/check-base-href-resolution.mjs` |
| 245 | 5.3s | 0 | `node scripts/build-status-proof.mjs --check` |

## Failures

- None.
