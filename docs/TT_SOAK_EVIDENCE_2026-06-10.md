<!-- generated-by: scripts/probe-tt-soak.mjs -->
<!-- generated-at: 2026-06-10 -->

# Trusted Types Soak Evidence

> Read autonomously via the `cloudflare.studio` token (CANON-019 elevated probe).
> Namespace: RATE_LIMIT (`6fde74ca7f3d462786afbb85c85611e0`) · window: last 30 days · probed: 2026-06-10

## Verdict

VIOLATIONS PRESENT — 148 across 7 day(s); review samples before any enforce step.

## Daily counters (7 day(s), 148 total violation(s))

| Day | Violations |
|---|---|
| 2026-06-03 | 2 |
| 2026-06-04 | 78 |
| 2026-06-05 | 39 |
| 2026-06-06 | 5 |
| 2026-06-07 | 5 |
| 2026-06-09 | 10 |
| 2026-06-10 | 9 |

## Sample reports (5)
- `tt:2026-06-03:0002` → {"schemaVersion":"1.0","ts":"2026-06-03T21:24:51.939Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co
- `tt:2026-06-04:0001` → {"schemaVersion":"1.0","ts":"2026-06-04T03:16:58.169Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co
- `tt:2026-06-04:0002` → {"schemaVersion":"1.0","ts":"2026-06-04T03:23:20.455Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co
- `tt:2026-06-04:0003` → {"schemaVersion":"1.0","ts":"2026-06-04T03:24:23.239Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co
- `tt:2026-06-04:0004` → {"schemaVersion":"1.0","ts":"2026-06-04T07:20:42.086Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/","lineNumber":15,"columnNumber":126,"v

## Route enforce ladder

| Route | Ready | Observed sample hits | Rollback |
|---|:-:|---:|---|
| `/privacy/` | no | 0 | Remove /privacy/ from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js |
| `/terms/` | no | 0 | Remove /terms/ from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js |

---
*Unblocks the evidence half of TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2). Founder device verify remains before enforce.*
