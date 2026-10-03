# Build Check Diagnostics

Generated: 2026-10-03T17:11:03.819Z
Receipt: `ce9944c0ede9deaddf7cfb7d` · coverage 110/521 from step 412

Latest: **110/110** passed · failed 0 · total 127.1s
Concentration: **12.7%** in step 496 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 496 | 16.2s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 412 | 10.0s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 427 | 8.1s | 0 | `node scripts/check-recovery-process-contract.mjs` |
| 443 | 4.5s | 0 | `node scripts/build-launch-age.mjs --self-test` |
| 494 | 3.5s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 423 | 3.1s | 0 | `node scripts/generate-evidence-hub.mjs --check` |
| 413 | 3.0s | 0 | `node scripts/build-changelog-narrative.mjs --check` |
| 421 | 2.8s | 0 | `node scripts/check-site-integrity.mjs` |
| 440 | 2.7s | 0 | `node scripts/build-hero-portfolio.mjs --self-test` |
| 414 | 2.3s | 0 | `node scripts/build-intent-map.mjs --check` |

## Failures

- None.
