# Innovation Pack

> Generated: 2026-07-27 · 4 ranked candidates

Second-order genius list — drawn from brainstorm orphans, TODO markers, newly-shipped-but-unpolished code, SIL regressions, capability-map gaps, and cross-repo silence.

## Ranked candidates

| # | Source | Score | Title | Next action |
|---|---|---:|---|---|
| 1 | polish | 25 | Polish scripts/build-release-proof.mjs | Write a smoke test |
| 2 | polish | 20 | Polish scripts/build-agents-json.mjs | Write a smoke test |
| 3 | polish | 20 | Polish scripts/build-deploy-currency.mjs | Write a smoke test |
| 4 | polish | 20 | Polish scripts/build-status-proof.mjs | Write a smoke test |

## Rationale

**1. Polish scripts/build-release-proof.mjs** — no test · missing Usage header
**2. Polish scripts/build-agents-json.mjs** — no test
**3. Polish scripts/build-deploy-currency.mjs** — no test
**4. Polish scripts/build-status-proof.mjs** — no test

## Live premise verification + execution (S296)

- **#1 rejected as a phantom — win:** `build-release-proof.mjs` already owns an isolated derivation self-test and the blocking build runs it. Adding another smoke test would duplicate evidence.
- **#2 shipped at L3:** `build-agents-json.mjs --self-test` now proves the canonical discovery spine, public/internal filtering, brand-anchor routing, external fallback, unresolvable-project omission, and feed URL safety (7/7). The blocking gate runs it before drift verification.
- **#3 rejected as a phantom — win:** `build-deploy-currency.mjs` already owns a comprehensive self-test and the blocking gate runs it before `--check`.
- **#4 shipped at L3:** `build-status-proof.mjs --self-test` now injects deterministic feed fixtures and proves present/fresh/stale/honest-dark/missing semantics plus trust-score arithmetic (9/9). The blocking gate runs it before structural drift verification.
- **Second-order compound shipped:** build diagnostics now enforce a duration-qualified concentration ratchet: one step cannot consume over 30% of a successful gate while also taking at least 45 seconds. This permanently detects the exact serial-bottleneck class exposed by the former 59-second portfolio supply-chain scan without punishing small fast suites.

**Exhaustion verdict:** all four generated premises were evaluated against live code; both real items shipped, both phantom items were explicitly rejected, and the new concentration candidate shipped. No generated candidate remains actionable.
