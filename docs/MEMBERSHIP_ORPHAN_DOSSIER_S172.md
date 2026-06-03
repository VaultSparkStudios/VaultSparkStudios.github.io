<!-- generated-by: /implement S172 · membership-orphan-dossier -->
<!-- generated-at: 2026-06-03 -->

# Membership Orphan Dossier — S172

> Forensic decision dossier for the 3 feature-bearing orphan assets flagged by
> `check-orphan-assets.mjs` since S163. Git history was squashed to a fresh
> root on 2026-06-03 (public-repo sanitization), so evidence is content-based:
> mount points, consumer references, and successor analysis.

## Verdicts at a glance

| Asset | Verdict | Status | Evidence strength |
|---|---|---|---|
| `assets/membership-interview.js` | **REWIRE** | ✅ done (S172) | Conclusive |
| `assets/vault-sdk.js` | **KEEP** (external consumers) | ✅ allowlisted (S172) | Conclusive |
| `assets/vaultsparked-proof.js` | **RETIRE** (superseded) | ⏳ founder yes/no | Conclusive |

---

## 1 · membership-interview.js — REWIRE ✅ (done this session)

**What it is:** 3-turn AI tier-recommendation interview on `/membership/` (228
lines). Calls `ask-ignis` with `mode: "interview"`, anonymous-friendly, capped
under the onboarding-interview budget, graceful fallback to `/vaultsparked/`
on outage.

**Evidence of accidental severance:** the mount div
`<div id="mem-interview-mount" data-fallback="/vaultsparked/">` is **still
present** in `membership/index.html`, but the script lost its entry in the
`membership-idle-loader.js` manifest (its 5 sibling idle modules survived).
A deliberate retirement would have removed the mount too.

**Action taken:** re-added to the idle-loader manifest — same loading
discipline as its siblings (idle-time, not eager). SOUL #2 satisfied: the
feature is fully built, budget-governed, and now reachable again.

**Founder follow-up (one check):** open `/membership/` on a real device,
confirm the "Take 30-second interview" affordance renders and the IGNIS
onboarding-interview budget cap is still active in the edge function.

## 2 · vault-sdk.js — KEEP ✅ (allowlisted this session)

**What it is:** the cross-project membership SDK (`window.VaultSDK`, 377
lines) — entitlement gates + auth handoff for sibling project sites.

**Evidence it is not an orphan:** `PromoGrind` references `/vault-sdk.js` in
its shipped HTML (`dist-cap/index.html:158`). This repo's reference graph only
scans this repo, so external consumers are invisible to the checker by design.

**Action taken:** added to `ALLOW_ABSENT` in `check-orphan-assets.mjs` with a
provenance comment pointing here. Deleting this file would break sibling
projects in production.

**Founder follow-up:** none required. Optional hygiene: inventory which other
project sites load the SDK (grep sibling repos for `vault-sdk`).

## 3 · vaultsparked-proof.js — RETIRE (founder yes/no remains)

**What it is:** 29-line social-proof counter that fills `vs-proof-members`,
`vs-proof-sparked`, `vs-proof-challenges` on `/vaultsparked/`.

**Evidence it is superseded:** `assets/live-proof.js` — which `/vaultsparked/`
**already loads** — writes the exact same three IDs (live-proof.js:103-113)
plus rank-distribution bars and animated counts. The page works today without
vaultsparked-proof.js; re-wiring it would double-write the same DOM nodes.

**Recommendation:** delete the file. Zero user-visible change (it isn't loaded
anywhere); the successor covers every ID it wrote. This stays behind the
standing founder-confirm gate for membership-surface deletions (SOUL #2) —
a 30-second yes/no with this dossier as evidence.

---

## Why the original founder gate is now closeable

The S163 flag said "all lost their page wiring but are feature-bearing" —
true, but undiagnosed. The diagnosis: one accidental loader severance
(rewired), one false positive from cross-repo blindness (allowlisted), one
superseded duplicate (retire on confirm). The P1 collapses to a single
delete-confirmation.
