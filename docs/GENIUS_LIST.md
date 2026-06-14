# Genius Hit List — Session 198

Generated: 2026-06-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **968/500**
- CI health: **check gh run list**
- Current focus: S198 /goal chain (context-resumed · 9/11 shipped · build:check EXIT 0). Highest-velocity session since S195. Gamification depth first: rank-preview card + First Climb quest hook on both SPARKED game pages; visit-streak.js daily badge ambient module; vault-journey.js 3-panel membership timeline; oracle velocity-series public API. Then structural repair: D1 save (emitSourceOnce already in analytics.js); D2 scroll-depth+exit-intent rewired from dead gtag to /v/rum engagement: prefix family (closes last major dead-sink class in the ambient bundle); E1 build-cache.mjs shared SHA-256 hash-skip library wired into 3 IGNIS scripts; F1 7th Trusted Types control in security-posture (7/7 verified); F2 BLOCKED (hcloud MISSING — founder needed); G1-L1 data/game-registry.json canonical single source of truth for 8 game slugs + check-game-playability-coherence registry cross-check. 9 commits on main, pushed at closeout.

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

#### 2. [VERIFY] ENGAGEMENT-SIGNAL-VERIFY
Final score: **94**
[S199][OBS/P2] ENGAGEMENT-SIGNAL-VERIFY — awaiting signal. engagement:scroll_25/50/75/100 and engagement:exit_intent_shown/answered now emit to /v/rum from the ambient bundle (S198 D2 rewire — was dead gtag since S147). Once 20+ real-visitor sessions accrue post-deploy, pull api/funnel-summary.json and confirm engagements.* keys are non-zero. No code action — measurement-watch.
Why it matters: ENGAGEMENT-SIGNAL-VERIFY shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 3. [BRAND] GAME-REGISTRY DERIVE-PASS (L2). data/game-registry.json is now the ca…
Final score: **93**
[S198→][STRUCT/P1] GAME-REGISTRY DERIVE-PASS (L2). data/game-registry.json is now the canonical single source of truth (S198 G1-L1 shipped: registry file + coherence gate cross-check). L2: derive the games-index card statuses and nav-dropdown game links from the registry at build time via scripts/derive-game-nav.mjs + scripts/derive-game-index.mjs. The coherence gate already errors on HTML↔registry drift, making derivation structurally safe. ~2h; its own session.
Why it matters: GAME-REGISTRY DERIVE-PASS (L2). data/game-registry.json is now the can affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [VERIFY] Confirm the S198 wave on prod after this push. On a real browser (dat…
Final score: **88**
[S198][VERIFY/P0] Confirm the S198 wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) /games/call-of-doodie/ and /games/vaultspark-football-gm/ — the rank-preview card shows a "📊 Leaderboard sneak peek" block and a "First Climb" quest progress bar with 3 steps; (b) /membership/ shows a Vault Journey 3-panel arc (Forge → Sparked → Vault) above the tier cards; (c) /oracle/ velocity chart renders a 24-week commit sparkline (not blank); (d) visit the site twice in the same day → look for the streak badge; (e) DevTools Network → scroll to 25% and confirm {ux:"engagement:scroll_25"} POSTs to /v/rum (200/204, not dropped). Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S198 wave on prod after this push. On a real browser (data shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] VISIT-STREAK-ANALYTICS. assets/visit-streak.js streak badge is live (…
Final score: **84**
[S199][MEASURE/P3] VISIT-STREAK-ANALYTICS. assets/visit-streak.js streak badge is live (S198 B1) but its uptake is invisible in the funnel. Wire a bounded streak:N RUM event when a visitor opens the badge, feeding a streaks block in rollup-rum-ux.mjs. ~1h.
Why it matters: VISIT-STREAK-ANALYTICS. assets/visit-streak.js streak badge is live (S is open, local, and unblocked — can ship this session.

#### 3. [COHESION] PLAY→JOIN BRIDGE
Final score: **83**
[S197→][MEASURE/P3] PLAY→JOIN BRIDGE — awaiting signal. game_play_click / game_join_from_play now emit as bounded funnel:* to /v/rum from both SPARKED game pages and roll into api/funnel-summary.json. Traffic-gated like the rest of the funnel; once visits accrue, watch the play→join conversion. No code action — measurement-watch.
Why it matters: PLAY is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [SECURITY] STAGING BOX RECOVERY
Final score: **81**
[S198][SECURITY/P2·HUMAN] STAGING BOX RECOVERY — HUMAN ACTION REQUIRED. CANON-019 preflight completed S198: hcloud CLI not installed AND HCLOUD_TOKEN MISSING in secrets gateway. Genuine founder-hardware block. Founder: retrieve HCLOUD_TOKEN from Hetzner Cloud Console → node ../vaultspark-studio-ops/scripts/ops.mjs intake-credentials hcloud (or add to gateway secrets directly). Agent re-attempts hcloud server list → SSH → Caddy restore once READY. Target: website.staging.vaultsparkstudios.com (CANON-007).
Why it matters: STAGING BOX RECOVERY lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 5. [PRODUCT] THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
Final score: **75**
[S195][UX/P2·FOUNDER] THEME TIER-LOCK decision. S195 shipped the non-gating theme identity cue; LOCKING a theme behind a paid/rank tier changes membership value (escalation). Founder: approve/deny a free-rank cosmetic unlock (e.g. Lava at Forge rank), then wire the server-trusted gate.
Why it matters: THEME TIER-LOCK decision. S195 shipped the non-gating theme identity c is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] Confirm the S195+S196+S197 deploy wave on prod after this push. On a …
Final score: **71**
[S197][VERIFY/P0] Confirm the S195+S196+S197 deploy wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) S197 — /games/call-of-doodie/ and /games/vaultspark-football-gm/ no longer show a "Demo Coming Soon" block; the lower "Try It Now" section shows a live "▶ Play Now / Play Beta — It's Free" CTA + a "Save Your Progress / Track Your Franchise — Join Free" button; view-source a game page → meta description ≤160 chars reading as a complete sentence; (b) S196 — paste a game URL + /faq/ into the Facebook Sharing Debugger → each shows a bespoke per-title PNG, and /journal/ source carries a CollectionPage ItemList; (c) S195 — Ask IGNIS multi-turn, hero ember canvas, Studio Now strip, Cmd+K inline answer. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S195+S196+S197 deploy wave on prod after this push. On a r shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] NAV-SHEET 100% FLIP
Final score: **69**
[S195][UX/P1·FOUNDER] NAV-SHEET 100% FLIP — real-device verify. Kill-switch (?nav=classic) + 50% canary shipped. Founder does an iPhone+Android pass on ?nav=sheet; if clean, flip data-nav-sheet-canary to 100%.
Why it matters: NAV-SHEET 100% FLIP was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] Review + publish the forge devlog draft. Re-run node scripts/draft-we…
Final score: **66**
[S189][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. Re-run node scripts/draft-weekly-forge.mjs, founder reviews + publishes to journal/ to clear the 84d-stale journal warn-gate (changelog 62d also stale).
Why it matters: Review + publish the forge devlog draft. Re-run is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. ENGAGEMENT-SIGNAL-VERIFY
3. GAME-REGISTRY DERIVE-PASS (L2). data/game-registry.json is now the ca…
4. Confirm the S198 wave on prod after this push. On a real browser (dat…
5. Forge Window naming propagation
6. VISIT-STREAK-ANALYTICS. assets/visit-streak.js streak badge is live (…
7. PLAY→JOIN BRIDGE
8. STAGING BOX RECOVERY
9. THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
10. Confirm the S195+S196+S197 deploy wave on prod after this push. On a …
11. NAV-SHEET 100% FLIP
12. Review + publish the forge devlog draft. Re-run node scripts/draft-we…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
