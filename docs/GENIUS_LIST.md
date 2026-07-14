# Genius Hit List — Session 279

Generated: 2026-07-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **89/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S279 ran the full arc and CORRECTED an S278 mis-diagnosis. S278 read the Lighthouse-red as a render-blocking-script problem on /ranks/; pulling the actual CI median LHRs proved otherwise — /ranks/ had TBT 0 / FCP 0.9s / SI 0.9s all perfect, and the sole drag was CLS 0.291 (score 0.41, 25% of perf weight). And /community/ had already self-recovered to 0.89 (the '0.81<0.82' carry was stale). Root cause of the /ranks/ CLS: rank-quest.js always mounts a fixed 3-step box into [data-rank-quest] post-paint ABOVE the ladder, plus the Fame Wall filled from Supabase above it — both shoved the ladder down. Fixed by reserving the rank-quest mount height per-viewport (462px/381px, deterministic 3-step box) + relocating the Fame Wall to the end of <main> (below the fold). Verified 0.2994→0.0006 under faithful throttling. Built the exact missing capability S278 named as next-milestone: scripts/measure-throttled-vitals.mjs — a dependency-free Playwright CDP-throttled (Moto-G 4x CPU + slow-4G) CLS/LCP harness (self-test 9/9) that reproduces CI's CLS exactly (proved it against the CI LHR). Closed the CLS-gate coverage hole (added /ranks/,/join/,/vault-wall/). Deleted a dead orphan (fetch-studio-feed.mjs — an S275 phantom-done). Proactive throttled sweep of all 11 gate routes: all clean (class contained). build:check 204/204 EXIT 0, doctor blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm the /ranks/ CLS fix flips its Lighthouse trust tier green in …
Final score: **100**
[S279][VERIFY/P1] Confirm the /ranks/ CLS fix flips its Lighthouse trust tier green in the next CI run. Locally proven 0.0006 under throttle (projected perf ~0.96); the 0.81→0.82 flip is only *confirmed* by CI Lighthouse. This is the top next-session item.
Why it matters: Confirm the /ranks/ CLS fix flips its Lighthouse trust tier green in t shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VIT…
Final score: **90**
[SIL][OBS/P4] Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VITALS.json in the npm script) so the next session sees last-known throttled numbers without re-running.
Why it matters: Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VITA is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
Final score: **84**
[S277][PERF/P2] Homepage LCP measured pass (genius #1, honest-deferred with evidence). / 0.74 vs 0.76 floor. S277 confirmed the LCP element is fine (164ms local unthrottled); the only lever is the FOUC-risky 47KB render-blocking inline-CSS split on the brand-anchor homepage. Needs a dedicated throttled-Lighthouse before/after + multi-viewport FOUC session. Guarded by check-home-critical-css-contract.mjs. Floor NOT lowered (CANON-031).
Why it matters: Homepage LCP measured pass (genius #1, honest-deferred with evidence). was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] Wire measure-throttled-vitals --self-test into build:check (fast, no …
Final score: **81**
[SIL][AUTOMATION/P3] Wire measure-throttled-vitals --self-test into build:check (fast, no browser) — check the cmd.exe 8191-char ceiling before appending a step.
Why it matters: Wire measure-throttled-vitals --self-test into build:check (fast, no b is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…
Final score: **81**
[S276][PERF/P2] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs 0.74 perf median vs 0.76 floor; /games/ 0.78 vs 0.80. LCP element is a 5.2KB AVIF already preloaded fetchpriority=high — the only lever is the 47KB render-blocking inline-CSS split (36% coverage-unused but conditional → unsafe to strip). Needs critical-CSS re-extraction + deferred load + throttled before/after Lighthouse + multi-viewport FOUC check. Floor intentionally NOT lowered (CANON-031, D-S276.3).
Why it matters: Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`


### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **93**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **90**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **90**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [VERIFY] Homepage LCP measured pass
Final score: **88**
[S279][PERF/P2] Homepage LCP measured pass — sharpened honest-deferral. The throttled harness proved the homepage's APPLIED LCP is fine (~1.7s); the CI 5.8s is Lantern's *simulated* render-blocking penalty. The 47KB inline-CSS split is the confirmed lever but stays FOUC-risky on the brand anchor — needs real headless Lighthouse before/after + multi-viewport FOUC on a preview deploy. Floor NOT lowered (CANON-031). Founder-device gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **85**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [SECURITY] TT-ENFORCE-REPROBE
Final score: **78**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **75**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [SECURITY] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* ke…
Final score: **75**
[S185][SECURITY/P1] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* keys, 26 counter days/30d). Current local /leaderboards/ July 3 fallback/skeleton sink was fixed with DOM row helpers and propagated; next step is post-deploy soak verification, stale-cluster aging, and any cross-repo handling before founder-device enforce flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

## Recommended Build Order

1. Confirm the /ranks/ CLS fix flips its Lighthouse trust tier green in …
2. Post-push CI confirmation
3. Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VIT…
4. Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
5. Wire measure-throttled-vitals --self-test into build:check (fast, no …
6. Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
