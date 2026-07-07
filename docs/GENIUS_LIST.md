# Genius Hit List — Session 267

Generated: 2026-07-07
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **91/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S267 hardened field RUM truth and uncovered a post-push Worker deploy token-scope gate: CF_WORKER_API_TOKEN lacks Cloudflare R2 bucket permission required by the Worker binding.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [VERIFY] Lighthouse budget tightening in CI
Final score: **86**
[S80][PERF] Lighthouse budget tightening in CI — Performance ≥0.85, A11y ≥0.95, Best Practices ≥0.90, SEO ≥0.95.
Why it matters: Lighthouse budget tightening in CI is a 187-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`



### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **96**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **93**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **93**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **88**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [SECURITY] TT-ENFORCE-REPROBE
Final score: **81**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **78**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [SECURITY] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* ke…
Final score: **78**
[S185][SECURITY/P1] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* keys, 26 counter days/30d). Current local /leaderboards/ July 3 fallback/skeleton sink was fixed with DOM row helpers and propagated; next step is post-deploy soak verification, stale-cluster aging, and any cross-repo handling before founder-device enforce flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder call needed.
Final score: **73**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder call needed.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

## Recommended Build Order

1. Post-push CI confirmation
2. Lighthouse budget tightening in CI

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
