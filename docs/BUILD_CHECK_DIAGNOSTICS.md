# Build Check Diagnostics

Generated: 2026-09-10T07:52:35.171Z
Receipt: `85b58744a238ea52cee2183a` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 144.4s
Concentration: **11.9%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 17.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 6.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 298 | 6.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 98 | 6.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 368 | 6.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 259 | 4.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 247 | 4.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 344 | 2.8s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 95 | 2.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 287 | 1.9s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
