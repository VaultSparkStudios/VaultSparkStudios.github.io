<!-- generated-by: /implement (session 300) -->
<!-- generated-at: 2026-07-31 -->

# Implementation Plan — S300

**Source:** `docs/AUDIT_2026-07-31.md` (14 items)
**Re-sorted for execution efficiency, not audit priority** — same-axis grouped, foundations before façades, token-cost last.

**Success bar (skill-profile, mandatory):** any *page* change must pass Lighthouse Performance ≥90 mobile, or note an exception. Wave A touches no rendered page — the bar is not triggered until Wave C.

---

## Wave A — deploy/gate layer (audit items 3, 2, 1, 4)

One shared context: `scripts/*deploy*`, `scripts/check-*gate*`, `.github/workflows/pages-deploy.yml`, doctor registry. Ordered so each item's output is trustworthy before the next consumes it.

| # | Audit item | Why this position |
|---|---|---|
| A1 | **3** — probe honesty (declared UA + `UNVERIFIED` ≠ `stale`) | Smallest. A2 reads this probe's output; fix the reading before building the alarm on it. |
| A2 | **2** — doctor `deploy-currency` probe + canon-ownership reachability gate | The alarm that should have fired. Depends on A1 producing an honest verdict. |
| A3 | **1** — content/identity lane split + `check-content-lane-purity` | The root fix. Largest blast radius; lands once A1+A2 can observe whether it worked. |
| A4 | **4** — served-feed content-type gate + `/api/*` fallback routing | Post-deploy verification of what A3 ships. |

## Wave B — data-layer honesty (audit item 7)

| # | Audit item | Why |
|---|---|---|
| B1 | **7** — geo-vitals sampling floor for rendered per-country verdicts | Small, self-contained, build-script only. Kept out of Wave A to keep the deploy-gate diff reviewable. |

## Wave C — page corpus (audit items 5, 6, 9, 10)

One pass over pages, one redirect map, one nav regeneration. **Coherence gate extended BEFORE any copy merge** (audit §5). Lighthouse ≥90 mobile bar applies from here.

| # | Audit item |
|---|---|
| C1 | **5** — membership consolidation (`/vaultsparked`, `/membership-value` → `/membership`) |
| C2 | **6** — `/vault-wall` → `/leaderboards`; de-dup `/ranks` |
| C3 | **9** — telemetry spine (`/nervous-system`, `/studio-pulse` → `/status`) |
| C4 | **10** — member cluster (`/vault-portal` presence-aware entry; `/member` empty state) |

## Wave D — depth + differentiation (audit items 8, 11, 12, 13)

| # | Audit item |
|---|---|
| D1 | **8** — `/proof` public in-browser verifier |
| D2 | **11** — feedback → changelog provenance trace |
| D3 | **12** — progression spine (surface the next action) |
| D4 | **13** — agent capability manifest |

## Wave E — token/efficiency (audit item 14) — LAST by rule

| # | Audit item |
|---|---|
| E1 | **14** — change-scoped gate selector (full set still gates push) |

---

## Founder track (parallel, non-blocking for Waves A–E)

Mint 3 Supabase credentials (access token · management token · PG connection). Releases the **identity** lane only. After A3, does not block content promotion.

---

## Execution Log

| Item | Status | Evidence |
|---|---|---|
| A1 · probe honesty (audit 3) | **SHIPPED** | `OBSERVATION_MAX_AGE_HOURS`; retention frozen from observation stamps so `--check` stays byte-stable. build-deploy-currency 38/38. Live probe succeeded: **391 commits · 6.8d** (was reporting a retained 170/2.7d). |
| A2 · deploy-currency alarm (audit 2) | **SHIPPED** | `check-deploy-currency-gate.mjs` 16/16 + doctor probe `deploy-currency-live`. Doctor now **13/16, 1 blocking**. `check-canon-ownership-reachable.mjs` 18/18 found **4 phantom probe owners, 3 ABSOLUTE-tier**; shipped to studio-ops as Ark pattern-share `01JUQSN8H8A628886D668E56BD`. |
| A3 · content lane (audit 1) | **SHIPPED (not dispatched)** | `check-content-lane-purity.mjs` 52/52. Design corrected mid-flight: all-or-nothing → **partition** (all-or-nothing was dead on arrival, 206/529 impure). Own `confirm_content` input; no hold released; nothing dispatched. |
| A4 · served-feed contract (audit 4) | **SHIPPED** | `check-served-feed-content-type.mjs` 20/20. Live: **62 ok · 9 honest-404 · 0 fail**. Audit severity **corrected** — the 9 return 404, not 200+HTML. |
| B1 · geo confidence (audit 7) | **SHIPPED** | `CONFIDENCE_SAMPLES=20` kept separate from the privacy floor (raising `MIN_SAMPLES` would have destroyed the signal). Reader in `status/index.html` fixed too. build-geo-vitals 20/20. |
| **15** · whole-tree publication | **FOUND, partially mitigated** | Lane barred from widening it. Underlying `git archive HEAD` fix deferred — changes what production serves. |
| **16** · agents.json build cycle | **FOUND, not fixed** | Reorder tried, proved equivalent, reverted. Needs a design change to `agents.json`. |
| C1–C4 · page consolidation | **NOT STARTED** | See note below. |
| D1–D4 · depth | **NOT STARTED** | |
| E1 · scoped gate selector | **NOT STARTED** | |

**Suite:** `build:check` **261/261** (was 257 — 4 gates added). Five audit items shipped, two new defects found.

### Why Wave C was not started (sequencing changed by evidence)

Building A3 surfaced a fact the audit did not have: `membership/`, `members/`, `member/`, `vault-wall/`, `vault-portal/` are all in the shared `SENSITIVE` list **because they render entitlement state**. That has two consequences the plan must absorb:

1. Those consolidations are **auth-adjacent**, not cosmetic — CANON puts membership tier logic behind escalation.
2. They **cannot ride the content lane**, so with production still held they would ship to nobody.

Doing them now would mean taking entitlement-surface risk for zero user-visible benefit while production is frozen. The correct order is: promote → confirm the lane works on real traffic → then consolidate. Recorded rather than silently skipped.
