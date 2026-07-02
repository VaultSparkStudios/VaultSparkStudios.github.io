# Genius Hit List — Session 250

Generated: 2026-07-02
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **check gh run list**
- Current focus: S250 /arc: root-fixed a RED CI that had been failing silently across the last 4 runs / two closeouts (S248+S249). S249 added the VEILOS + Vorn hero covers but never committed the regenerated data/lqip-map.json, so `build-lqip-map --check` failed in CI (compliance job → E2E Test Suite workflow RED) while local build:check passed off a transient in-tree regeneration — the exact S231 'local-green/CI-red' trap. Regenerated the map with the coverage-preserving write (227 reused, 2 encoded — platform-safe, minimal 2-key diff), --check now in-sync (229 images), and rotated TASK_BOARD to clear the advisory size warning. Audit's other 4 genius items verified LIVE and honestly deferred/closed (play-next & INP time-blocked on honest data; Atlas studio-ops-owned; TASK_BOARD strategy already automated).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] play-next conversion redesign
Final score: **93**
[ENGAGE/P1] play-next conversion redesign — once the honest window has data — S249 fixed the impression metric (IntersectionObserver true-viewport play-next:shown; epoch bumped 2026-07-02). Let ~1 week of honest viewport-view vs click data accrue, THEN decide placement vs copy vs retire from a trustworthy denominator (the 37/0 was a dishonest trigger-fire count).
Why it matters: play-next conversion redesign is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Atlas registry freshness reconciliation
Final score: **90**
[OPS/P2] Atlas registry freshness reconciliation — advisory: public canonical atlas is not on the local registry/site mapping; resolve via the owning source or Ark (studio-ops-owned canonical description still empty).
Why it matters: Atlas registry freshness reconciliation is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] TASK_BOARD size strategy
Final score: **87**
[SIL][HYGIENE/P2] TASK_BOARD size strategy — rotate-taskboard --check-size warns at ~297KB; S247 fixed the rotation predicate (300→129KB) but the board has regrown; monitor and rotate stale S24x blocks before it becomes blocking.
Why it matters: TASK_BOARD size strategy is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] INP root-fix when CLEAN field data lands
Final score: **84**
[SIL:2⛔][PERF/P1] INP root-fix when CLEAN field data lands — S247 interactionId filter deployed 2026-07-02; re-attempt ~2026-07-09 with data/inp-breakdown.json routeVitals + phase data to fix the dominant route/handler/phase. (externally time-blocked — exempt from skip-count until 2026-07-09)
Why it matters: INP root-fix when CLEAN field data lands is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **81**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **75**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [VERIFY] Post-push CI/deploy confirmation for S249
Final score: **74**
[VERIFY/P1] Post-push CI/deploy confirmation for S249 — verify GitHub Pages, CI beacon, status-proof/build-sha refresh, and live homepage after the pushed commit.
Why it matters: Post-push CI/deploy confirmation for S249 is a 250-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [BRAND] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
Final score: **72**
[S188][SIL] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently passes with the nav-sheet: dynamic prefix covering its 4 entries. If a future RUM name is added to the Worker but never emitted, the gate WARNs (dead config) — periodically clear dead entries so the allowlist stays an honest map of live instrumentation.
Why it matters: RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently p affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [VERIFY] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
Final score: **68**
[S188][VERIFY/P0] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form renders + submits on a NON-home page (e.g. /faq/, /games/call-of-doodie/) — a real test subscriber lands via Kit; (b) Discord + Community Hub show in the Studio nav dropdown sitewide; (c) proof-line:{shown,click} + studio-dispatch:subscribe + play-next:* land in /v/rum; (d) call-of-doodie hero promise line renders. Verify via pages.dev origin + a prod path — never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]). Shell hash rotated this session → confirm cold-cache load is healthy.
Why it matters: Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form  is a 62-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [BRAND] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
Final score: **66**
[S187][UX/P2] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pages (narrative hero + screenshot + single CTA + voice copy). 4h; next session.
Why it matters: FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pa affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
Final score: **66**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm appCore.js baton + pre-S185 samples to age out. Reprobe ~2026-06-18; flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm  lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. play-next conversion redesign
3. Atlas registry freshness reconciliation
4. TASK_BOARD size strategy
5. INP root-fix when CLEAN field data lands
6. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
7. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
8. Post-push CI/deploy confirmation for S249
9. RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
10. Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
11. FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
12. TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
