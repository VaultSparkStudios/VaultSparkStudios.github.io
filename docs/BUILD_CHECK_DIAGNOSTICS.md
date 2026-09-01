# Build Check Diagnostics

Generated: 2026-09-01T13:40:32.263Z
Receipt: `50ecc566cdab62765210318c` · coverage 32/378 from step 207

Latest: **31/32** passed · failed 1 · total 22.3s
Concentration: **25.9%** in step 236 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 236 | 5.8s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 210 | 1.6s | 0 | `node scripts/check-studio-content-posture.mjs` |
| 208 | 1.0s | 0 | `node scripts/check-intelligence-style-contract.mjs --strict` |
| 237 | 1.0s | 0 | `node scripts/check-nav-orphans.mjs` |
| 233 | 0.9s | 0 | `node scripts/check-play-cta-registry-sync.mjs` |
| 220 | 0.8s | 0 | `node scripts/check-news-ai-disclosure.mjs` |
| 231 | 0.8s | 0 | `node scripts/check-base-href-resolution.mjs` |
| 211 | 0.8s | 0 | `node scripts/check-longtail-studio-posture.mjs --self-test` |
| 221 | 0.7s | 0 | `node scripts/news-draft-edition.mjs --self-test` |
| 229 | 0.7s | 0 | `node scripts/check-image-formats.mjs --strict` |

## Failures

- Step 238: `node scripts/check-orphan-pages.mjs` exited 2
