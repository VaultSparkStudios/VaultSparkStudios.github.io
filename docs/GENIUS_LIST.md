# Genius Hit List — Session 195

Generated: 2026-06-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **992/500**
- CI health: **check gh run list**
- Current focus: S195 /goal chain (broad expansion audit → 12/13 shipped, 1 deferred · build:check EXIT 0). The frontier moved from repair to making one-shot surfaces LIVING: (1) conversational IGNIS — client-side multi-turn memory + follow-up intent + chips over the existing index, ZERO API cost (CANON-029); (2) forge-immersion — post-LCP capability-gated 2D ember canvas behind the hero (mounts after the LCP entry, FPS+DPR-capped, IO-paused, self-excludes on reduced-motion/Save-Data/low-mem); (3) Studio Now — live presence+ship+cadence strip; (4) you-asked→we-shipped closed-loop panel; (5) Cmd+K inline IGNIS answers. Plus First-Climb quest, theme identity cue, /security/ trust-posture deepen (verdict+uptime), onboarding-arc gtag→/v/rum rewire, nav-sheet kill-switch+50% canary, INP field gate, sitewide BreadcrumbList (29 pages+gate). Three premise-checks corrected the plan (rejected seed-rot false premise; item 8 pivoted obelisk-passport→/security/; INP chain existed minus the gate eval). Two escalation-class remainders (theme tier-lock, nav-sheet 100% flip) flagged for founder.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm S195 expansion wave on prod after deploy. On a real browser (…
Final score: **100**
[S195][VERIFY/P0] Confirm S195 expansion wave on prod after deploy. On a real browser (datacenter curl 403 = benign CF challenge): (a) Ask IGNIS (/ignis/ or /search/) — ask a question, then "tell me more" → answer stays on-thread + follow-up chips appear; (b) homepage hero — an ember field fades in behind the wordmark a moment after load on a capable device, and is ABSENT with reduced-motion on; (c) Studio Now strip renders under the hero; (d) Cmd+K — type "what is membership" → an inline "IGNIS reads:" answer appears above nav results; (e) /ranks/ shows the First Climb quest; (f) /security/ shows the verdict header + uptime card; (g) /changelog/ shows the you-asked→we-shipped panel. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm S195 expansion wave on prod after deploy. On a real browser (d shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] NAV-SHEET 100% FLIP
Final score: **91**
[S195][UX/P1·FOUNDER] NAV-SHEET 100% FLIP — real-device verify. Kill-switch (?nav=classic) + 50% canary shipped. Founder does an iPhone+Android pass on ?nav=sheet; if clean, flip data-nav-sheet-canary to 100% (kill-switch stays as fallback).
Why it matters: NAV-SHEET 100% FLIP shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 4. [PRODUCT] THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
Final score: **90**
[S195][UX/P2·FOUNDER] THEME TIER-LOCK decision. S195 shipped the non-gating theme identity cue; LOCKING a theme behind a paid/rank tier changes membership value (escalation). Founder: approve/deny a free-rank cosmetic unlock (e.g. Lava at Forge rank), then wire the server-trusted gate.
Why it matters: THEME TIER-LOCK decision. S195 shipped the non-gating theme identity c is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] ARTICLE-SCHEMA-JOURNAL. Breadcrumb coverage complete; next JSON-LD ru…
Final score: **84**
[S195][SEO/P3] ARTICLE-SCHEMA-JOURNAL. Breadcrumb coverage complete; next JSON-LD rung is Article/BlogPosting on journal/ + dispatch entries + extend the coverage gate.
Why it matters: ARTICLE-SCHEMA-JOURNAL. Breadcrumb coverage complete; next JSON-LD run is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] ARK-DEAD-GTAG-PATTERN-SHARE. Broadcast the "events fired through remo…
Final score: **81**
[S195][ECOSYSTEM/P2] ARK-DEAD-GTAG-PATTERN-SHARE. Broadcast the "events fired through removed window.gtag = silent no-op" pattern + the /v/rum rewire recipe to CF-Pages siblings via Ark pattern-share. Found in the funnel (S194) AND the onboarding arc (S195) — likely fleet-wide.
Why it matters: ARK-DEAD-GTAG-PATTERN-SHARE. Broadcast the "events fired through remov is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] FUNNEL L3
Final score: **75**
[SIL][P2] FUNNEL L3 — top-CTA tile + ambient.shell engagement rewire. S194 climbed to L2 only. L3: a "top funnel events" block in api/funnel-summary.json rendered on /status/, AND rewire the still-dead window.gtag-guarded engagement events in ambient.shell (scroll_milestone, exit_intent_shown/answered, ignis_lens_opened, visit_depth_upsell_shown) to the /v/rum beacon — same dead-sink class, just in the shell bundle.
Why it matters: FUNNEL L3 is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] OG L3
Final score: **72**
[SIL][P3] OG L3 — per-title PNG pre-rasterizer. S194 repointed 73 pages to static PNGs (correct + zero-cost) but the bespoke per-title /_og/ design is now unused for crawlers. L3: a zero-dependency, package-trust-approved build-time SVG→PNG pre-rasterizer so per-page titled cards work AS PNG without the SVG break.
Why it matters: OG L3 is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] Confirm S194 ships on prod after deploy. On a real browser (datacente…
Final score: **71**
[S194][VERIFY/P0] Confirm S194 ships on prod after deploy. On a real browser (datacenter curl 403 = benign CF challenge): (a) share a game link to Discord/Slack/X → a real PNG card renders, not a blank rectangle (og-image-raster-fix); (b) /games/call-of-doodie/ hero shows the "↗ Share this game" button and a tap fires Web Share (mobile) or copies the link; (c) DevTools Network → a homepage hero CTA click POSTs funnel:home_hero_play_click to /v/rum (200/204, not dropped). Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm S194 ships on prod after deploy. On a real browser (datacenter shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] Funnel data is now LIVE
Final score: **66**
[S194→][FEATURE/P2·MEASURE] Funnel data is now LIVE — awaiting signal. funnel-tracking rewire + acquisition-source + per-game share all emit to /v/rum and roll into api/funnel-summary.json (funnelCtas/sources/shares, honest-dark). Traffic-gated like the rest of the funnel; once visits accrue, watch which hero CTA converts, which channel the trickle arrives through, and which game gets shared. No code action — measurement-watch.
Why it matters: Funnel data is now LIVE is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] acquisition-source-breakdown (deferred from S193 audit #2). Bucket vi…
Final score: **66**
[S193→][AI/P1] acquisition-source-breakdown (deferred from S193 audit #2). Bucket visitor referrer (search/social/direct/referral) into api/funnel-summary.json.sources (honest-dark, no URLs/PII). FIRST confirm referrer reaches the /v/rum path (it does NOT today — analytics.js captures it but the RUM beacon doesn't); add referrer-family to beacon + Worker allowlist + rollup (3 ends). Names the one channel worth doubling on a traffic-starved site.
Why it matters: acquisition-source-breakdown (deferred from S193 audit #2). Bucket vis keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

## Recommended Build Order

1. Confirm S195 expansion wave on prod after deploy. On a real browser (…
2. Post-push CI confirmation
3. NAV-SHEET 100% FLIP
4. THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
5. Forge Window naming propagation
6. ARTICLE-SCHEMA-JOURNAL. Breadcrumb coverage complete; next JSON-LD ru…
7. ARK-DEAD-GTAG-PATTERN-SHARE. Broadcast the "events fired through remo…
8. FUNNEL L3
9. OG L3
10. Confirm S194 ships on prod after deploy. On a real browser (datacente…
11. Funnel data is now LIVE
12. acquisition-source-breakdown (deferred from S193 audit #2). Bucket vi…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
