# Genius Hit List — Session 194

Generated: 2026-06-12
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **971/500**
- CI health: **check gh run list**
- Current focus: S194 goal-chain (/start -> /audit -> /implement -> /closeout): the two silent killers under the measurement apparatus. 5/5 shipped, build:check EXIT 0 end-to-end. (1) funnel-tracking-live-sink-rewire — funnel-tracking.js track() emitted only via gtag (removed S147/S175) so all 31 data-track-event + 13 data-track-view + 3 data-funnel-form interactions produced ZERO data; rewired to /v/rum under a bounded funnel: family (also a privacy upgrade: stopped leaking intent enums to Google) + purged dead googletagmanager hints. (2) og-image-raster-fix — 73 pages' primary og:image was an SVG (blank on FB/X/LinkedIn/Discord/Slack); repointed to static PNG + check-og-images gate. (3) web-share-per-game — share-game.js on game heroes. (4) videogame-schema-gate — locks out fabricated aggregateRating. (5) acquisition-source-breakdown — source:<bucket> channel bucketing. 3 new bounded RUM families + worker-unit coverage (25/25); 2 gates folded into check-proof-surface with zero build:check length.

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

#### 2. [PRODUCT] FUNNEL L3
Final score: **90**
[SIL][P2] FUNNEL L3 — top-CTA tile + ambient.shell engagement rewire. S194 climbed to L2 only. L3: a "top funnel events" block in api/funnel-summary.json rendered on /status/, AND rewire the still-dead window.gtag-guarded engagement events in ambient.shell (scroll_milestone, exit_intent_shown/answered, ignis_lens_opened, visit_depth_upsell_shown) to the /v/rum beacon — same dead-sink class, just in the shell bundle.
Why it matters: FUNNEL L3 is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Confirm S194 ships on prod after deploy. On a real browser (datacente…
Final score: **88**
[S194][VERIFY/P0] Confirm S194 ships on prod after deploy. On a real browser (datacenter curl 403 = benign CF challenge): (a) share a game link to Discord/Slack/X → a real PNG card renders, not a blank rectangle (og-image-raster-fix); (b) /games/call-of-doodie/ hero shows the "↗ Share this game" button and a tap fires Web Share (mobile) or copies the link; (c) DevTools Network → a homepage hero CTA click POSTs funnel:home_hero_play_click to /v/rum (200/204, not dropped). Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm S194 ships on prod after deploy. On a real browser (datacenter shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] OG L3
Final score: **87**
[SIL][P3] OG L3 — per-title PNG pre-rasterizer. S194 repointed 73 pages to static PNGs (correct + zero-cost) but the bespoke per-title /_og/ design is now unused for crawlers. L3: a zero-dependency, package-trust-approved build-time SVG→PNG pre-rasterizer so per-page titled cards work AS PNG without the SVG break.
Why it matters: OG L3 is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] Funnel data is now LIVE
Final score: **81**
[S194→][FEATURE/P2·MEASURE] Funnel data is now LIVE — awaiting signal. funnel-tracking rewire + acquisition-source + per-game share all emit to /v/rum and roll into api/funnel-summary.json (funnelCtas/sources/shares, honest-dark). Traffic-gated like the rest of the funnel; once visits accrue, watch which hero CTA converts, which channel the trickle arrives through, and which game gets shared. No code action — measurement-watch.
Why it matters: Funnel data is now LIVE is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] acquisition-source-breakdown (deferred from S193 audit #2). Bucket vi…
Final score: **81**
[S193→][AI/P1] acquisition-source-breakdown (deferred from S193 audit #2). Bucket visitor referrer (search/social/direct/referral) into api/funnel-summary.json.sources (honest-dark, no URLs/PII). FIRST confirm referrer reaches the /v/rum path (it does NOT today — analytics.js captures it but the RUM beacon doesn't); add referrer-family to beacon + Worker allowlist + rollup (3 ends). Names the one channel worth doubling on a traffic-starved site.
Why it matters: acquisition-source-breakdown (deferred from S193 audit #2). Bucket vis keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 4. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
Final score: **78**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pre-S185 samples aging out. Flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 5. [INTELLIGENCE] Confirm Oracle + Ask IGNIS fixes on prod after deploy. Verify on a re…
Final score: **75**
[S193][VERIFY/P0] Confirm Oracle + Ask IGNIS fixes on prod after deploy. Verify on a real browser (datacenter curl 403s = benign CF challenge): (a) /oracle/ no longer shows "Loading…/—" stuck panels — the IGNIS Cognition hero, velocity chart, and the 7 lower panels are HIDDEN (honest-dark), while the project portfolio list renders live; (b) Ask IGNIS (type "security" / "feedback" / "membership") returns clean prose — NOT S191 goal-chain (/start → /audit…) or [{"theme":...}] JSON; (c) the shell re-stamped so cold-cache load is healthy. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm Oracle + Ask IGNIS fixes on prod after deploy. Verify on a rea keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### LATER

#### 1. [BRAND] Review + publish the forge devlog draft. Re-run node scripts/draft-we…
Final score: **75**
[S189][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. Re-run node scripts/draft-weekly-forge.mjs for SOUL-voice output, then founder reviews + publishes to journal/ to clear the 82d-stale journal warn-gate.
Why it matters: Review + publish the forge devlog draft. Re-run affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [INTELLIGENCE] web-share-per-game (deferred from S193 audit #3). New assets/share-ga…
Final score: **72**
[S193→][GROWTH/P1] web-share-per-game (deferred from S193 audit #3). New assets/share-game.js (Web Share + clipboard fallback) on the 10 game pages, SOUL-voice copy + OG image; allowlist a bounded share:<game>:<outcome> RUM prefix family (use the S192 prefixAllowlist primitive) + keep in rollup-rum-ux. Pattern proven on /oracle/ (line 519). Touches Worker allowlist → wire emit+allowlist+rollup in one change (S189 rule).
Why it matters: web-share-per-game (deferred from S193 audit #3). New assets/share-gam keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [PRODUCT] STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.v…
Final score: **69**
[S192→][OBS/P2] STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.vaultsparkstudios.com (Hetzner) is genuinely DOWN — staging-health honestly reads staging-unreachable until restored. CANON-007 wants a live staging env. Agent-attemptable via hcloud/SSH — preflight before labeling founder.
Why it matters: STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.va is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. FUNNEL L3
3. Confirm S194 ships on prod after deploy. On a real browser (datacente…
4. OG L3
5. Forge Window naming propagation
6. Funnel data is now LIVE
7. acquisition-source-breakdown (deferred from S193 audit #2). Bucket vi…
8. TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
9. Confirm Oracle + Ask IGNIS fixes on prod after deploy. Verify on a re…
10. Review + publish the forge devlog draft. Re-run node scripts/draft-we…
11. web-share-per-game (deferred from S193 audit #3). New assets/share-ga…
12. STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.v…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
