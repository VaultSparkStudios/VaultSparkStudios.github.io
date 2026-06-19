# Genius Hit List — Session 208

Generated: 2026-06-19
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **green**
- Current SIL: **925/500**
- CI health: **check gh run list**
- Current focus: S208 (autonomous /goal arc) finished the work S207's closeout falsely claimed done: S207 said 'SEALED retired + purged sitewide' but the footer status legend still rendered '⬡ SEALED — Vault sealed' on 89 pages + a whole sealed-vault component used it as a status badge. Completed the real SEALED→VAULTED purge (legend root-fixed in propagate-nav + re-propagated to 90 pages, sealed-vault-row + studio-pulse-live badges/captions migrated, generator + prose swept) and HARDENED the vocabulary gate so it scans the footer for retired status vocab (it stripped the footer before — that's why the lie went undetected). Also: killed the perf-budget PHANTOM (the lingering '/ desktop LCP 13060ms' advisory was a rolling-3 median dragged by two 26-day-old, already-fixed S161 incident traces; added a staleness horizon so resolved-incident samples expire — real RUM p75 is 976ms); shipped AVIF+WebP covers (~93% smaller) via image-set()+@supports on hero + games; repointed Atlas OG to its bespoke card; Atlas v2 cover thumbnails. build:check EXIT 0, doctor blockingFailing 0.

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

#### 2. [PRODUCT] Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped…
Final score: **93**
[HONESTY/P3] Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped X sitewide" claims and assert each against a real gate before the commit lands — deepest root cause of the S207→S208 false-claim class. Complex (NL-claim → gate mapping); the footer-aware vocab gate already covers the SEALED instance.
Why it matters: Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] OG-not-generic guard. No non-home page references another page's besp…
Final score: **90**
[HONESTY/P3] OG-not-generic guard. No non-home page references another page's bespoke OG card. Low marginal value now (instance fixed; check-og-images already catches broken/missing OG). Fold into an existing wired check if revisited.
Why it matters: OG-not-generic guard. No non-home page references another page's bespo is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

### NEXT

#### 1. [BRAND] Derive the nav "Projects" + "Games" dropdowns from the catalog. The l…
Final score: **84**
[NO-REDUNDANCY/P1] Derive the nav "Projects" + "Games" dropdowns from the catalog. The last hardcoded project-list fragility. Needs a catalog∪extra-paged merge (the nav lists non-catalog paged projects: signal-log, vault-pipeline, ideaforge, statvault, canon, the-living-protocol) — defer rather than ship half-done (would drop those).
Why it matters: Derive the nav "Projects" + "Games" dropdowns from the catalog. The la affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
Final score: **81**
[S207][MEASURE/P2] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, check api/dead-ctas.json: if play-next is STILL dead, run node scripts/build-cta-state.mjs --advance to rotate to copy variant 1. If it converts, the retiming win is confirmed. Measurement-watch.
Why it matters: Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Publish forge devlog
Final score: **78**
[S206][CONTENT/P1·FOUNDER] Publish forge devlog — DRAFT COMPLETE. journal/_drafts/forge-week-2026-06-18.md is publish-ready (factual paragraph filled in). Intentionally NOT auto-published: it's a founder-voice essay (the draft tool never auto-publishes by design). Founder: edit the lead paragraph into your own voice + publish to journal/ to clear the 66d changelog warn.
Why it matters: Publish forge devlog affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [VERIFY] Graduate the homepage hero glow to /games/, /membership/, /studio/ be…
Final score: **77**
[COHESION/P2·FOUNDER-REVIEW] Graduate the homepage hero glow to /games/, /membership/, /studio/ behind a flag, then founder real-device verify (mature-surface rule, [[feedback_flag_gated_ux_swap]]). Atlas-rows slice already done.
Why it matters: Graduate the homepage hero glow to /games/, /membership/, /studio/ beh is a 208-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### LATER

#### 1. [BRAND] Obelisk Passport login (5d978cf9)
Final score: **75**
[S207][FOUNDER/PARALLEL] Obelisk Passport login (5d978cf9) — a parallel session's auth-wiring commit (login.html + auth/callback.html). Agent greened its build:check failure (nav-orphan exemptions) without touching the auth flow; auth-flow ownership stays with the founder's Obelisk session. GUARDRAIL (D-S207.8, postmortem): the auth gate must redirect with 302 + Cache-Control: no-store, NEVER 301, and must NEVER gate the public site / apex / (private paths only). A 301 blanket gate misfired this session and cached-301-locked the founder out ~1h.
Why it matters: Obelisk Passport login (5d978cf9) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [VERIFY] Prod-verify the S205 wave on a real browser. (a) /
Final score: **66**
[S205][VERIFY/P0] Prod-verify the S205 wave on a real browser. (a) / — hero stagger on scroll; ?hero=v2 shows simplified variant; signed-in member sees rank + Continue CTA in hero; Studio Now has Vault Momentum chip. (b) /membership/ — paid tiers stagger on scroll; sticky hub tab nav. (c) /oracle/ — ask a question → entity chips appear at bottom; deep-dive link. (d) /vault-member/portal/ — cards elevate on hover, buttons spring-press. (e) /journal/dispatches/ — emoji reactions row below each entry. (f) /changelog/ — SOUL-voice narrative sentences. (g) Visit constellation sequence → unlock toast appears. Never assume push==deploy.
Why it matters: Prod-verify the S205 wave on a real browser. (a) / was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
Final score: **66**
[S205][UX/P1·FOUNDER] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-device review on desktop + mobile. If clean, remove flag-gate and make v2 the default hero. ~30m founder time.
Why it matters: HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devic is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped…
3. OG-not-generic guard. No non-home page references another page's besp…
4. Forge Window naming propagation
5. Derive the nav "Projects" + "Games" dropdowns from the catalog. The l…
6. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
7. Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
8. Publish forge devlog
9. Graduate the homepage hero glow to /games/, /membership/, /studio/ be…
10. Obelisk Passport login (5d978cf9)
11. Prod-verify the S205 wave on a real browser. (a) /
12. HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
