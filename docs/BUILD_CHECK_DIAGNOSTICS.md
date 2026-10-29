# Build Check Diagnostics

Generated: 2026-10-29T19:41:10.529Z
Receipt: `b1496f80db3d8cc665d0935b` · coverage 404/548 from step 145

Latest: **404/404** passed · failed 0 · total 1077.1s
Concentration: **26.5%** in step 169 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 169 | 285.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 162 | 260.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 145 | 125.8s | 0 | `node scripts/csp-audit.mjs` |
| 288 | 61.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 521 | 19.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 418 | 19.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 180 | 12.8s | 0 | `node scripts/build-lqip-map.mjs --check` |
| 267 | 9.9s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 403 | 7.6s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |
| 548 | 7.6s | 0 | `node scripts/verify-browser-collection.mjs` |

## Failures

- None.
