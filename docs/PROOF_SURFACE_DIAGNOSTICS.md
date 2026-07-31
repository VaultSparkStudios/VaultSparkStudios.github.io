# Proof Surface Diagnostics

Generated: 2026-07-31T21:05:23.369Z
Receipt: `7dde0df2e0c8b2ad2a48eb88` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 31.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 41 | blocking | 1.0s | 0 | `node scripts/derive-game-index.mjs --check` |
| 52 | blocking | 0.8s | 0 | `node scripts/check-decision-currency.mjs` |
| 9 | blocking | 0.8s | 0 | `node scripts/check-og-images.mjs` |
| 2 | blocking | 0.8s | 0 | `node scripts/build-public-status.mjs --check` |
| 42 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 17 | blocking | 0.7s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 30 | blocking | 0.7s | 0 | `node scripts/build-portfolio-counts.mjs --check` |
| 3 | blocking | 0.7s | 0 | `node scripts/build-security-posture.mjs --self-test` |
| 15 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
