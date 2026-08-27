# Build Check Diagnostics

Generated: 2026-08-27T08:35:44.313Z
Receipt: `4197f3ec05f9b4cc2ca553e5` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 875.7s
Concentration: **22.7%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 199.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 66.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 154 | 27.7s | 0 | `node scripts/inject-main-content-id.mjs --check` |
| 152 | 24.7s | 0 | `node scripts/inject-lqip.mjs --check` |
| 61 | 22.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 15.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 235 | 15.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 228 | 12.1s | 0 | `node scripts/check-image-formats.mjs --strict` |
| 133 | 10.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 232 | 9.8s | 0 | `node scripts/check-play-cta-registry-sync.mjs` |

## Failures

- None.
