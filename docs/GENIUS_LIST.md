# Genius Hit List — Session 210

Generated: 2026-06-20
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **913/500**
- CI health: **check gh run list**
- Current focus: S210 (autonomous /goal arc) shipped 6 items: IGNIS contextual chips (PAGE_QUERIES map for 9 pathname groups, pre-populated at mount() before first keystroke), loading trust animation (rAF count-up 'Searching N FORGE units…' during cold fetch, cancelled on resolve), offline fallback (renderOfflineFallback shows cached prefix-LRU + retry); returning-visitor signal strip (slim dismissible strip on homepage for vs_visit_count >= 2, reads changelog-narrative.json newer than vs_last_visit_ts); OG-image uniqueness gate (check-og-images checkOgUniqueness, ERROR on generic og-image.png on non-root pages, self-test 9/9, fixed vault-member og); build-SHA beacon (generate-build-sha writes api/build-sha.json + check-pages-deploy verifies post-push, closes CANON-036 blind spot); nav-dropdown catalog-derivation (NAV_GAMES+NAV_PROJECTS arrays + buildStatusSections in propagate-nav, 99 pages propagated, check-nav-catalog-sync 4/4). Honest deferral: web-push #7 (VAPID READY, 4h engineering). build:check EXIT 0, doctor blockingFailing 0. SIL 913.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] #7
Final score: **96**
[INFRA/P2] #7 — Web-push feature. VAPID keys are READY (cloudflare.vapid capability = READY, keys in gateway). Remaining: Worker /v/push-subscribe endpoint + assets/push-subscribe.js + push-dispatch.mjs --send live test. Estimated 4h. Deferred to a dedicated session — not trivial enough to close at end-of-session closeout.
Why it matters: #7 is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Web-push feature
Final score: **93**
[INFRA/P2] Web-push feature — VAPID READY; ship the endpoint + subscribe UI + dispatch test. (Carry from S210 #7)
Why it matters: Web-push feature is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
Final score: **90**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue. Epoch set to 2026-06-18 (D-S209.1); deadCount = 0 (honest "insufficient data"). No action until field data shows a verdict.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped…
Final score: **81**
[HONESTY/P3] Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped X sitewide" claims and assert each against a real gate before the commit lands — deepest root cause of the S207→S208 false-claim class. Complex (NL-claim → gate mapping); the footer-aware vocab gate already covers the SEALED instance.
Why it matters: Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped  is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] OG-not-generic guard. No non-home page references another page's besp…
Final score: **78**
[HONESTY/P3] OG-not-generic guard. No non-home page references another page's bespoke OG card. Low marginal value now (instance fixed; check-og-images already catches broken/missing OG). Fold into an existing wired check if revisited.
Why it matters: OG-not-generic guard. No non-home page references another page's bespo is open, local, and unblocked — can ship this session.

#### 5. [BRAND] Derive the nav "Projects" + "Games" dropdowns from the catalog. The l…
Final score: **72**
[NO-REDUNDANCY/P1] Derive the nav "Projects" + "Games" dropdowns from the catalog. The last hardcoded project-list fragility. Needs a catalog∪extra-paged merge (the nav lists non-catalog paged projects: signal-log, vault-pipeline, ideaforge, statvault, canon, the-living-protocol) — defer rather than ship half-done (would drop those).
Why it matters: Derive the nav "Projects" + "Games" dropdowns from the catalog. The la affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [PRODUCT] Fold the OG-not-generic guard into an existing wired check. A gate as…
Final score: **72**
[HONESTY/P1] Fold the OG-not-generic guard into an existing wired check. A gate asserting no non-home page references another page's bespoke og:image card. check-og-images.mjs already validates per-page OG presence; extend it (or check-proof-surface orchestrator) — do NOT add a new build:check && segment (chain is near the cmd.exe length limit, [[feedback_buildcheck_cmdexe_length_limit]]). Carried from S208.
Why it matters: Fold the OG-not-generic guard into an existing wired check. A gate ass is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
Final score: **66**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue. The recency epoch (D-S209.1) gives the retimed copy a clean window; if it's STILL dead on post-epoch data, build-cta-state --advance rotates to variant 1. No code action until data accrues.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Graduate the homepage hero glow to /games/, /membership/, /studio/ be…
Final score: **65**
[COHESION/P2·FOUNDER-REVIEW] Graduate the homepage hero glow to /games/, /membership/, /studio/ behind a flag, then founder real-device verify (mature-surface rule, [[feedback_flag_gated_ux_swap]]). Atlas-rows slice already done.
Why it matters: Graduate the homepage hero glow to /games/, /membership/, /studio/ beh is a 210-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

## Recommended Build Order

1. #7
2. Post-push CI confirmation
3. Web-push feature
4. Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
5. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
6. Forge Window naming propagation
7. Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped…
8. OG-not-generic guard. No non-home page references another page's besp…
9. Derive the nav "Projects" + "Games" dropdowns from the catalog. The l…
10. Fold the OG-not-generic guard into an existing wired check. A gate as…
11. Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
12. Graduate the homepage hero glow to /games/, /membership/, /studio/ be…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
