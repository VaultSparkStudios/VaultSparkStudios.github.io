<!-- generated-by: /implement S184 (tt-enforce-reprobe) -->
<!-- date: 2026-06-10 -->

# Trusted-Types Enforcement Readiness — 2026-06-10 (S184)

> Probe re-run for the S180 carry **TT-ENFORCE-REPROBE** (due ~2026-06-12).
> Sources: `docs/TT_SOAK_EVIDENCE_2026-06-10.md` · `docs/TT_BURNDOWN_2026-06-10.md`.

## Verdict: 🟡 AMBER — DO NOT FLIP YET

The S176 default-policy bridge is doing its job (counting, not blocking — the
site is not broken), but the 30-day window still shows **148 violations across 7
active days**. Flipping `require-trusted-types-for 'script'` from report-only to
**enforce** today would break the sinks below for real users. Enforcement
readiness requires the soak to reach **near-zero new clusters**; it has not.

| Day | Violations |
|---|--:|
| 2026-06-04 | 78 |
| 2026-06-05 | 39 |
| 2026-06-10 | 9 |
| 2026-06-09 | 10 |
| others (06-03/06/07) | 12 |

## Top sinks blocking the flip (burn these down first)

| Hits | Sink |
|--:|---|
| 30 | `journal/dispatches/:364` — recurring top sink (resurfaced; was burned down S174) |
| 11 | `assets/home-idle-loader.js:16` |
| 11 | `vaultspark-football-gm/lib/appCore.js:995` (game subrepo) |
| 9  | `vaultspark-football-gm/lib/appCore.js:1146` (game subrepo) |
| 7  | `assets/schema-injector.js:23` |
| 5  | `assets/ambient.shell-*.js:337` |
| 4  | `assets/ambient.shell-*.js:367` |
| 8  | PARSE-BLIND (pre-fix intake rows — no fields survived normalization) |

## Action plan before the next reprobe

1. **First-party sinks** (agent-attemptable): route `home-idle-loader.js:16`,
   `schema-injector.js:23`, and the two `ambient.shell` sinks through a **named
   Trusted-Types policy** instead of the default catch-all. These are our code.
2. **`journal/dispatches:364`** — recurring; re-investigate why it resurfaced
   after the S174 burndown (likely a regenerated dispatch template re-introducing
   an `innerHTML`/`insertAdjacentHTML` path). This single sink is ~20% of volume.
3. **`vaultspark-football-gm/appCore.js`** — cross-repo (game subproject). Ship
   an **Ark cargo** (`pattern-share`) to the football-gm slug rather than editing
   the sibling directly (CANON-018). Not website-fixable here.
4. Re-run: `node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs`.
   When the trailing 7-day count is ~0, escalate the flip.

## The flip (founder-device gated — SOUL #3)

When clean, the enforce flip is a **founder real-device verification**, not an
autonomous agent action (SOUL non-negotiable #3). The agent prepares; the founder
confirms on a real device that no legitimate script path breaks under enforcement.

---
*Reprobe complete. Carry stays OPEN with this dated evidence — verdict AMBER, not the clean GREEN the flip requires.*
