# Build Check Diagnostics

Generated: 2026-08-28T07:41:40.795Z
Receipt: `ad042136eec2f3ed433591cb` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 556.2s
Concentration: **28.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 158.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 50.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 30.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 17.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 12.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 96 | 9.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 97 | 5.7s | 0 | `node scripts/lint-repo.mjs` |
| 29 | 5.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 5.1s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 125 | 3.9s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
