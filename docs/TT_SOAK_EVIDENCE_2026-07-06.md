<!-- generated-by: scripts/probe-tt-soak.mjs -->
<!-- generated-at: 2026-07-06 -->

# Trusted Types Soak Evidence

> Read autonomously via the `cloudflare.studio` token (CANON-019 elevated probe).
> Namespace: RATE_LIMIT (`6fde74ca7f3d462786afbb85c85611e0`) · window: last 30 days · probed: 2026-07-06

## Verdict

VIOLATIONS PRESENT — 330 across 25 day(s); review samples before any enforce step.

## Daily counters (25 day(s), 330 total violation(s))

| Day | Violations |
|---|---|
| 2026-06-06 | 5 |
| 2026-06-07 | 5 |
| 2026-06-09 | 10 |
| 2026-06-10 | 9 |
| 2026-06-11 | 11 |
| 2026-06-12 | 21 |
| 2026-06-13 | 23 |
| 2026-06-14 | 8 |
| 2026-06-15 | 16 |
| 2026-06-16 | 13 |
| 2026-06-17 | 7 |
| 2026-06-18 | 20 |
| 2026-06-19 | 17 |
| 2026-06-20 | 17 |
| 2026-06-21 | 38 |
| 2026-06-22 | 12 |
| 2026-06-23 | 39 |
| 2026-06-24 | 15 |
| 2026-06-25 | 1 |
| 2026-06-26 | 3 |
| 2026-06-27 | 13 |
| 2026-06-30 | 16 |
| 2026-07-01 | 7 |
| 2026-07-02 | 3 |
| 2026-07-03 | 1 |

## Sample reports (5)
- `tt:2026-06-06:0001` → {"schemaVersion":"1.1","ts":"2026-06-06T10:22:33.020Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/leaderboards/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/assets/theme-toggle.shell-
- `tt:2026-06-06:0002` → {"schemaVersion":"1.1","ts":"2026-06-06T10:22:34.824Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/leaderboards/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/assets/ambient-feature.she
- `tt:2026-06-06:0003` → {"schemaVersion":"1.1","ts":"2026-06-06T10:22:37.559Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/leaderboards/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/assets/vault-cta.js","line
- `tt:2026-06-06:0004` → {"schemaVersion":"1.1","ts":"2026-06-06T10:22:39.142Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/leaderboards/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/leaderboards/","lineNumber
- `tt:2026-06-06:0005` → {"schemaVersion":"1.1","ts":"2026-06-06T22:05:02.294Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5

## Route enforce ladder

| Route | Ready | Observed sample hits | Rollback |
|---|:-:|---:|---|
| `/privacy/` | no | 0 | Remove /privacy/ from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js |
| `/terms/` | no | 0 | Remove /terms/ from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js |

---
*Unblocks the evidence half of TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2). Founder device verify remains before enforce.*
