<!-- generated-by: scripts/probe-tt-soak.mjs -->
<!-- generated-at: 2026-07-04 -->

# Trusted Types Soak Evidence

> Read autonomously via the `cloudflare.studio` token (CANON-019 elevated probe).
> Namespace: RATE_LIMIT (`6fde74ca7f3d462786afbb85c85611e0`) · window: last 30 days · probed: 2026-07-04

## Verdict

VIOLATIONS PRESENT — 369 across 26 day(s); review samples before any enforce step.

## Daily counters (26 day(s), 369 total violation(s))

| Day | Violations |
|---|---|
| 2026-06-05 | 39 |
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
- `tt:2026-06-05:0001` → {"schemaVersion":"1.0","ts":"2026-06-05T01:10:22.572Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co
- `tt:2026-06-05:0002` → {"schemaVersion":"1.0","ts":"2026-06-05T02:44:45.864Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co
- `tt:2026-06-05:0003` → {"schemaVersion":"1.1","ts":"2026-06-05T05:13:54.144Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/games/vaultspark-football-gm/","referrer":"https://www.google.com/","blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparks
- `tt:2026-06-05:0004` → {"schemaVersion":"1.1","ts":"2026-06-05T05:13:55.136Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/games/vaultspark-football-gm/","referrer":"https://www.google.com/","blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparks
- `tt:2026-06-05:0005` → {"schemaVersion":"1.1","ts":"2026-06-05T05:13:55.798Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/games/vaultspark-football-gm/","referrer":"https://www.google.com/","blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparks

## Route enforce ladder

| Route | Ready | Observed sample hits | Rollback |
|---|:-:|---:|---|
| `/privacy/` | no | 0 | Remove /privacy/ from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js |
| `/terms/` | no | 0 | Remove /terms/ from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js |

---
*Unblocks the evidence half of TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2). Founder device verify remains before enforce.*
