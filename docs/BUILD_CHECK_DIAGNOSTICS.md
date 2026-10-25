# Build Check Diagnostics

Generated: 2026-10-25T18:07:50.661Z
Receipt: `7c55d78e6d077fd0bc26ab74` · coverage 380/547 from step 168

Latest: **380/380** passed · failed 0 · total 784.3s
Concentration: **19.8%** in step 168 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 168 | 155.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 287 | 36.8s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 417 | 20.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 520 | 19.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 431 | 17.4s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 257 | 12.5s | 0 | `node scripts/check-image-formats.mjs --strict` |
| 261 | 11.2s | 0 | `node scripts/check-local-references.mjs` |
| 328 | 8.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 319 | 8.7s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 447 | 7.4s | 0 | `node scripts/check-recovery-process-contract.mjs` |

## Failures

- None.
