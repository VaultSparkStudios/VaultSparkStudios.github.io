# Build Check Diagnostics

Generated: 2026-11-11T20:06:00.310Z
Receipt: `f55424562d178335ac21f945` · coverage 424/553 from step 130

Latest: **424/424** passed · failed 0 · total 661.5s
Concentration: **11.9%** in step 170 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 170 | 78.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 146 | 68.7s | 0 | `node scripts/csp-audit.mjs` |
| 551 | 40.4s | 0 | `node --test tests/oracle-stream.unit.spec.mjs` |
| 522 | 30.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 552 | 17.5s | 0 | `node --test tests/desk-email-art.unit.spec.mjs` |
| 268 | 17.4s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 163 | 14.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 330 | 14.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 549 | 12.7s | 0 | `node scripts/verify-browser-collection.mjs` |
| 501 | 11.9s | 0 | `node scripts/build-desk-dispatch-digest.mjs --self-test` |

## Failures

- None.
