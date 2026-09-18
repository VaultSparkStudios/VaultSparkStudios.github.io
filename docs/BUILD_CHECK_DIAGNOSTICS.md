# Build Check Diagnostics

Generated: 2026-09-18T19:30:27.799Z
Receipt: `f3d16de4a3d71ade627332fa` · coverage 25/502 from step 478

Latest: **25/25** passed · failed 0 · total 24.3s
Concentration: **90.2%** in step 478 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 478 | 21.9s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 483 | 0.1s | 0 | `node scripts/probe-canonical-destinations.mjs --self-test` |
| 479 | 0.1s | 0 | `node scripts/inject-game-push-cta.mjs --self-test` |
| 482 | 0.1s | 0 | `node scripts/pre-push-scan.mjs --self-test` |
| 501 | 0.1s | 0 | `node scripts/plan-build-check.mjs --self-test` |
| 480 | 0.1s | 0 | `node scripts/lib/build-cache.mjs --self-test` |
| 492 | 0.1s | 0 | `node scripts/run-attention-release-gate.mjs --self-test` |
| 488 | 0.1s | 0 | `node scripts/pull-cloudflare-analytics.mjs --self-test` |
| 490 | 0.1s | 0 | `node scripts/read-link-failure-receipts.mjs --self-test` |
| 502 | 0.1s | 0 | `node scripts/run-impacted-checks.mjs --self-test` |

## Failures

- None.
