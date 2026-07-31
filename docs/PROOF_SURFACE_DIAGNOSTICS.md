# Proof Surface Diagnostics

Generated: 2026-07-31T07:59:18.933Z
Receipt: `beef8f25574e43a9e363c438` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 18.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 4 | blocking | 0.6s | 0 | `node scripts/build-security-posture.mjs --check` |
| 16 | blocking | 0.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 0.5s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 79 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 6 | blocking | 0.4s | 0 | `node scripts/check-proof-feed-generators.mjs --self-test` |
| 75 | advisory | 0.4s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 5 | blocking | 0.3s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
