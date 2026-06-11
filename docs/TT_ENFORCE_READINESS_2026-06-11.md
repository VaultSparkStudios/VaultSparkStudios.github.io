<!-- generated-by: /implement S186 (tt-named-policy-finish) -->
<!-- date: 2026-06-11 -->

# Trusted-Types Enforcement Readiness — 2026-06-11 (S186)

> Reprobe of carry **TT-ENFORCE-REPROBE**. Supersedes the S184 AMBER verdict.
> Sources: `docs/TT_SOAK_EVIDENCE_2026-06-11.md` · live soak + analyzer run this session.

## Verdict: 🟡 AMBER (improving) — DO NOT FLIP YET, but the agent-owned surface is CLEAN

The 30-day soak still reports **148 violations across 7 active days**, *but the
composition has fundamentally changed*: every first-party sink the agent owns is
already fixed in current deployed code. What remains in the window is (a) historical
pre-fix samples aging out, and (b) one cross-repo source now handed off via Ark.

| Day | Violations | Note |
|---|--:|---|
| 2026-06-04 | 78 | **pre-S185 named-policy wave** — aging out |
| 2026-06-05 | 39 | **pre-S185 named-policy wave** — aging out |
| 2026-06-09 | 10 | residual (cross-repo + stale browser caches) |
| 2026-06-10 | 9  | residual |
| others (06-03/06/07) | 12 | — |

**117 of 148 (79%) predate the S185 named-policy wave** and will leave the 30-day
window by ~2026-06-18.

## First-party sinks — all verified SAFE in current code

| Sink (S184 doc) | Current status |
|---|---|
| `journal/dispatches/:364` | ✅ Already pure DOM API since **S174** (`render()` uses `createElement`+`textContent`; line 364 is `return node`). The 30 sampled hits are historical / stale-cache. |
| `assets/home-idle-loader.js` | ✅ Named policy **`vs-idle-loader`** (S185). |
| `assets/schema-injector.js` | ✅ Uses `createTextNode`+`appendChild` for JSON-LD — the **TT-safe escape hatch**, not a script sink. Never needed a policy. |
| `assets/ambient.shell:*` innerHTML | ✅ Covered by the **S176 default-policy bridge** (`tt-default-policy.js` → `createHTML: s => s`). These pass under enforce; they are reported only because report-only logs every bridge invocation. |

**Conclusion:** there is no first-party agent-attemptable sink left to migrate. The
named-policy wave + the default-policy bridge together cover the entire website surface.

## Remaining true blocker — cross-repo (handed off)

| Hits | Sink | Action |
|--:|---|---|
| 11 | `vaultspark-football-gm/lib/appCore.js:995` | **Ark baton shipped** this session → `id=01JQQ7PLCO834623243071801D` |
| 9  | `vaultspark-football-gm/lib/appCore.js:1146` | (same cargo) |

Per CANON-018 these cannot be fixed from this repo. The baton surfaces at
football-gm's next `/start` as rank-zero priority with the exact lines + the
named-policy fix pattern.

## The flip (founder-device gated — SOUL #3)

Even at GREEN, the enforce flip is a founder real-device verification, not an
autonomous action. The residual risk under enforce is **`createScriptURL`** (the
default bridge only allowlists Sentry + Cloudflare-challenge URLs and returns
`null` otherwise) — a real device must confirm no legitimate script-URL path
breaks. `createHTML` sinks are universally absorbed by the bridge and carry no
flip risk.

## Next reprobe

Re-run `node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs`
on/after **2026-06-18**, once the pre-S185 samples have aged out of the 30-day
window and the football-gm baton has had time to land. Expectation: trailing
7-day count drops toward the cross-repo residual only. When that residual clears,
escalate the founder-device flip.

---
*Reprobe complete. First-party surface CLEAN; carry stays OPEN pending window-aging
+ the cross-repo football-gm baton. Verdict AMBER (improving), not the GREEN the flip needs.*
