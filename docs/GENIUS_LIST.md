# Genius Hit List — Session 280

Generated: 2026-07-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **87/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S280 ran the full arc and root-fixed the one RED CI gate the S279 closeout had reported green. The S279 chore commit's Lighthouse CI actually hard-failed check-lighthouse-route-tiers: a single fresh run measured homepage / perf 0.72 < 0.76 floor. Ground-truthed it: the /ranks/ CLS fix from S279 WORKED (0.81→0.96 ✓, the whole point); the homepage's true median is 0.77–0.79 across 50 committed trend runs, and the throttled harness proved the APPLIED LCP is 1.2s — the CI 5.6s is Lantern's simulated render-blocking penalty. So the RED was single-run lab noise on the one route the tier config explicitly calls 'lab-volatile', flicking a median-of-3 below a razor-thin floor. Root-fix (NOT floor-lowering): flag longtail labVolatile:true and corroborate a fresh-CI floor breach against the committed trend — advisory only when ≥3 recent runs median ≥ floor; a persistent breach still hard-fails (D-S280.1). Hardened with a second-order advisory-streak tripwire: recurring sub-floor (≥2 of 5) refuses the downgrade and hard-fails, so a slow bleed can't hide (D-S280.2). Self-test 9/9. Also shipped: committed throttled-vitals evidence snapshot (docs/THROTTLED_VITALS.json + verify:vitals:evidence script), wired measure-throttled-vitals --self-test into build:check, and corrected a phantom CANON-019 block (supabase.admin is READY, wishlist gate is founder-optics not credential — D-S280.3). Regenerated feed-drift artifacts (you-asked-shipped, citation, ship-receipts, llms-shards). Then the newly-honest gate surfaced a REAL pre-existing intermittent /games/ accessibility 0.94<0.95 (catalog tier, correctly hard-failed) — root-fixed three sitewide a11y bugs instead of exempting them (D-S280.4): removed an invalid role="group" on the genome-strip link (aria-allowed-role), made the PWA install banner entrance transform-only so its gold button never audits mid-fade (color-contrast 3.37→11:1), and shipped scripts/inject-main-content-id.mjs — a build-time injector (self-test 7/7, --check gate) that stamped the missing #main-content skip target onto 26 pages (skip-link). build:check EXIT 0, doctor blockingFailing 0.

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

#### 2. [PRODUCT] Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VIT…
Final score: **93**
[SIL][OBS/P4] Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VITALS.json in the npm script) so the next session sees last-known throttled numbers without re-running.
Why it matters: Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VITA is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
Final score: **87**
[S277][PERF/P2] Homepage LCP measured pass (genius #1, honest-deferred with evidence). / 0.74 vs 0.76 floor. S277 confirmed the LCP element is fine (164ms local unthrottled); the only lever is the FOUC-risky 47KB render-blocking inline-CSS split on the brand-anchor homepage. Needs a dedicated throttled-Lighthouse before/after + multi-viewport FOUC session. Guarded by check-home-critical-css-contract.mjs. Floor NOT lowered (CANON-031).
Why it matters: Homepage LCP measured pass (genius #1, honest-deferred with evidence). was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] Wire measure-throttled-vitals --self-test into build:check (fast, no …
Final score: **84**
[SIL][AUTOMATION/P3] Wire measure-throttled-vitals --self-test into build:check (fast, no browser) — check the cmd.exe 8191-char ceiling before appending a step.
Why it matters: Wire measure-throttled-vitals --self-test into build:check (fast, no b is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…
Final score: **77**
[S276][PERF/P2] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs 0.74 perf median vs 0.76 floor; /games/ 0.78 vs 0.80. LCP element is a 5.2KB AVIF already preloaded fetchpriority=high — the only lever is the 47KB render-blocking inline-CSS split (36% coverage-unused but conditional → unsafe to strip). Needs critical-CSS re-extraction + deferred load + throttled before/after Lighthouse + multi-viewport FOUC check. Floor intentionally NOT lowered (CANON-031, D-S276.3).
Why it matters: Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs is a 4-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`


### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **90**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **87**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **87**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [PRODUCT] Wishlist "N waiting" momentum
Final score: **84**
[S280→][PRODUCT/P2·FOUNDER] Wishlist "N waiting" momentum — CANON-019 phantom cleared (D-S280.3). supabase.admin is READY (2/2) — NOT credential-blocked. Real gate: founder public-optics call (low counts backfire on unreleased-game surfaces). De-gating design: floor-thresholded display (only surface counts ≥ a momentum-positive minimum). Next session can ship the pipeline once the founder sets the optics policy.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [VERIFY] Homepage LCP measured pass
Final score: **83**
[S279][PERF/P2] Homepage LCP measured pass — sharpened honest-deferral. The throttled harness proved the homepage's APPLIED LCP is fine (~1.7s); the CI 5.8s is Lantern's *simulated* render-blocking penalty. The 47KB inline-CSS split is the confirmed lever but stays FOUC-risky on the brand anchor — needs real headless Lighthouse before/after + multi-viewport FOUC on a preview deploy. Floor NOT lowered (CANON-031). Founder-device gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **82**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [SECURITY] TT-ENFORCE-REPROBE
Final score: **75**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **72**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Post-push CI confirmation
2. Commit a throttled-vitals evidence snapshot (--out docs/THROTTLED_VIT…
3. Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
4. Wire measure-throttled-vitals --self-test into build:check (fast, no …
5. Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
