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
| | | |
