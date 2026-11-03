# Build Check Diagnostics

Generated: 2026-11-03T07:17:12.598Z
Receipt: `52d534e5d14b81e9fab29d2a` · coverage 122/548 from step 427

Latest: **122/122** passed · failed 0 · total 46.3s
Concentration: **49.0%** in step 521 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 521 | 22.7s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 519 | 3.0s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 548 | 2.2s | 0 | `node scripts/verify-browser-collection.mjs` |
| 432 | 1.6s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 520 | 0.9s | 0 | `node scripts/generate-vault-narrative.mjs --self-test` |
| 442 | 0.8s | 0 | `node scripts/check-site-integrity.mjs` |
| 518 | 0.7s | 0 | `node scripts/generate-news-art-codex.mjs --self-test` |
| 448 | 0.6s | 0 | `node scripts/check-recovery-process-contract.mjs` |
| 444 | 0.5s | 0 | `node scripts/generate-evidence-hub.mjs --check` |
| 427 | 0.2s | 0 | `node scripts/check-windows-hide.mjs` |

## Failures

- None.
