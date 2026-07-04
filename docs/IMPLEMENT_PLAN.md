# Implement Plan — S256

| Item | Status | Evidence |
|---|---|---|
| cta-impression-contract-expansion | shipped | `assets/proof-conversion-line.js` now gates `proof-line:shown` behind 50% viewport visibility; `scripts/check-cta-impression-contracts.mjs` covers play-next + proof-line. |
| build-check-runner-diagnostics | shipped | `scripts/run-build-check.mjs` writes `api/build-check-diagnostics.json` + `docs/BUILD_CHECK_DIAGNOSTICS.md` and self-tests the public-safe summary contract. |
| slow-gate-visibility-loop | shipped-second-order | Full diagnostics show `check-proof-surface.mjs` is the slowest gate; future optimization now has source-of-truth timing instead of console archaeology. |

## Execution Log

- 2026-07-04 · shipped · focused checks passed.
- 2026-07-04 · verified · `npm run build` EXIT 0.
- 2026-07-04 · verified · `npm run build:check` EXIT 0 (`167/167`).
- 2026-07-04 · verified · `node scripts/run-build-check.mjs --check-diagnostics` EXIT 0 (`167/167`).
