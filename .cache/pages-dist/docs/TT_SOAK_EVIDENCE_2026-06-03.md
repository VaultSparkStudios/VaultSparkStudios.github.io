<!-- generated-by: scripts/probe-tt-soak.mjs -->
<!-- generated-at: 2026-06-03 -->

# Trusted Types Soak Evidence

> Read autonomously via the `cloudflare.studio` token (CANON-019 elevated probe).
> Namespace: RATE_LIMIT (`6fde74ca7f3d462786afbb85c85611e0`) · window: last 30 days · probed: 2026-06-03

## Verdict

VIOLATIONS PRESENT — 2 across 1 day(s); review samples before any enforce step.

## Daily counters (1 day(s), 2 total violation(s))

| Day | Violations |
|---|---|
| 2026-06-03 | 2 |

## Sample reports (2)
- `tt:2026-06-03:0001` → {"schemaVersion":"1.0","ts":"2026-06-03T10:57:24.522Z","type":"trusted-types-report-only","documentUri":"https://vaultsparkstudios.com/vault/tombstones/","referrer":null,"blockedUri":"https://vaultsparkstudios.com/trusted-types-sink","sourceFile":"https://vaultsparkstudios.com/assets/cookie-consent.
- `tt:2026-06-03:0002` → {"schemaVersion":"1.0","ts":"2026-06-03T21:24:51.939Z","type":"trusted-types-report-only","documentUri":null,"referrer":null,"blockedUri":null,"sourceFile":null,"lineNumber":null,"columnNumber":null,"violatedDirective":null,"effectiveDirective":null,"disposition":null,"originalPolicy":null,"cf":{"co

---
*Unblocks the evidence half of TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2). Founder device verify remains before enforce.*
