# Build Check Diagnostics

Generated: 2026-08-07T23:00:22.897Z
Receipt: `e1df2bcb78bcb116b087fcc4` · coverage 283/283 from step 1

Latest: **283/283** passed · failed 0 · total 294.9s
Concentration: **17.8%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 52.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 21.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 7.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 202 | 6.2s | 0 | `node scripts/check-studio-content-posture.mjs` |
| 213 | 6.1s | 0 | `node scripts/check-image-formats.mjs --strict` |
| 224 | 4.7s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 229 | 4.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 222 | 4.0s | 0 | `node scripts/check-orphan-pages.mjs` |
| 146 | 3.9s | 0 | `node scripts/inject-lqip.mjs --check` |
| 28 | 3.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
