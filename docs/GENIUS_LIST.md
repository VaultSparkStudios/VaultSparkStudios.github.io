# Genius Hit List — Session 207

Generated: 2026-06-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **882/500**
- CI health: **check gh run list**
- Current focus: S207 shipped 9/9 (fixed three non-converting S206 features + prod-wave verification automation + dead-CTA self-heal + Oracle feedback loop + IGNIS graph traversal), then — founder-authorized — executed the founder-only carries: deployed the Worker to prod (wave verified 7/7), created the LIVE Stripe TRIAL50 coupon (50%-off trial now real end-to-end), provisioned the VAPID push credential, and graduated hero v2 to the homepage default (completing the S204 premium visual overhaul; ?hero=classic kill-switch).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Core Web Vitals pass. The ✗ / (field) perf-budget advisory has lingered
Final score: **96**
[PERF/P1] Core Web Vitals pass. The ✗ / (field) perf-budget advisory has lingered — premium is *felt* as speed. Optimize hero cover PNGs (AVIF/responsive), trim critical path, target sub-1.8s LCP, re-measure via RUM.
Why it matters: Core Web Vitals pass. The ✗ / (field) perf-budget advisory has lingere is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Graduate the elite hero treatment (gradient-glass, accent glow, premi…
Final score: **90**
[COHESION/P2] Graduate the elite hero treatment (gradient-glass, accent glow, premium easing) into /games/, /membership/, /studio/, and the Atlas rows so the whole site matches the homepage.
Why it matters: Graduate the elite hero treatment (gradient-glass, accent glow, premiu is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Atlas v2. Hero visual + per-project cover thumbnails + a "moving this…
Final score: **87**
[DEPTH/P3] Atlas v2. Hero visual + per-project cover thumbnails + a "moving this week" live strip.
Why it matters: Atlas v2. Hero visual + per-project cover thumbnails + a "moving this  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the 66d changelog stale warn.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Bespoke OG cards. Atlas + several pages use generic og-home.png; gene…
Final score: **81**
[POLISH/P2] Bespoke OG cards. Atlas + several pages use generic og-home.png; generate bespoke per-page social cards (reuse the sharp SVG→PNG generator). Atlas first.
Why it matters: Bespoke OG cards. Atlas + several pages use generic og-home.png; gener is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
Final score: **81**
[S207][MEASURE/P2] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, check api/dead-ctas.json: if play-next is STILL dead, run node scripts/build-cta-state.mjs --advance to rotate to copy variant 1. If it converts, the retiming win is confirmed. Measurement-watch.
Why it matters: Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, is open, local, and unblocked — can ship this session.

#### 5. [BRAND] Publish forge devlog
Final score: **78**
[S206][CONTENT/P1·FOUNDER] Publish forge devlog — DRAFT COMPLETE. journal/_drafts/forge-week-2026-06-18.md is publish-ready (factual paragraph filled in). Intentionally NOT auto-published: it's a founder-voice essay (the draft tool never auto-publishes by design). Founder: edit the lead paragraph into your own voice + publish to journal/ to clear the 66d changelog warn.
Why it matters: Publish forge devlog affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [BRAND] Obelisk Passport login (5d978cf9)
Final score: **75**
[S207][FOUNDER/PARALLEL] Obelisk Passport login (5d978cf9) — a parallel session's auth-wiring commit (login.html + auth/callback.html). Agent greened its build:check failure (nav-orphan exemptions) without touching the auth flow; auth-flow ownership stays with the founder's Obelisk session. GUARDRAIL (D-S207.8, postmortem): the auth gate must redirect with 302 + Cache-Control: no-store, NEVER 301, and must NEVER gate the public site / apex / (private paths only). A 301 blanket gate misfired this session and cached-301-locked the founder out ~1h.
Why it matters: Obelisk Passport login (5d978cf9) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [VERIFY] Prod-verify the S205 wave on a real browser. (a) /
Final score: **66**
[S205][VERIFY/P0] Prod-verify the S205 wave on a real browser. (a) / — hero stagger on scroll; ?hero=v2 shows simplified variant; signed-in member sees rank + Continue CTA in hero; Studio Now has Vault Momentum chip. (b) /membership/ — paid tiers stagger on scroll; sticky hub tab nav. (c) /oracle/ — ask a question → entity chips appear at bottom; deep-dive link. (d) /vault-member/portal/ — cards elevate on hover, buttons spring-press. (e) /journal/dispatches/ — emoji reactions row below each entry. (f) /changelog/ — SOUL-voice narrative sentences. (g) Visit constellation sequence → unlock toast appears. Never assume push==deploy.
Why it matters: Prod-verify the S205 wave on a real browser. (a) / was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
Final score: **66**
[S205][UX/P1·FOUNDER] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-device review on desktop + mobile. If clean, remove flag-gate and make v2 the default hero. ~30m founder time.
Why it matters: HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devic is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Core Web Vitals pass. The ✗ / (field) perf-budget advisory has lingered
2. Post-push CI confirmation
3. Graduate the elite hero treatment (gradient-glass, accent glow, premi…
4. Atlas v2. Hero visual + per-project cover thumbnails + a "moving this…
5. Forge Window naming propagation
6. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
7. Bespoke OG cards. Atlas + several pages use generic og-home.png; gene…
8. Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
9. Publish forge devlog
10. Obelisk Passport login (5d978cf9)
11. Prod-verify the S205 wave on a real browser. (a) /
12. HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
