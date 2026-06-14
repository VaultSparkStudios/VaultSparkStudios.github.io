# Genius Hit List — Session 197

Generated: 2026-06-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **958/500**
- CI health: **check gh run list**
- Current focus: S197 /goal chain (walk-the-journey audit → 3/3 shipped · build:check EXIT 0). Broke the 11-session measurement-polish loop by walking the actual primary user journey: both SPARKED game pages (call-of-doodie, vaultspark-football-gm) carried a stale "Demo Coming Soon" section contradicting their own live "Play Now" hero links — a CANON-031 lying surface on the studio's flagship conversion+share pages. Shipped: (1) live Play panels replacing the contradiction + a check-game-playability-coherence gate (7/7); (2) play→join membership bridge at the play moment (bounded funnel:* to /v/rum); (3) all 13 truncating game/listing meta descriptions made SERP-safe + a 160-char game-page ceiling gate. Rejected 3 speculative items on verification. PROJECT_STATUS was stale at 195 (S196 partial closeout) — corrected to 197.

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

#### 2. [COHESION] PLAY→JOIN BRIDGE
Final score: **95**
[S197→][MEASURE/P3] PLAY→JOIN BRIDGE — awaiting signal. game_play_click / game_join_from_play now emit as bounded funnel:* to /v/rum from both SPARKED game pages and roll into api/funnel-summary.json. Traffic-gated like the rest of the funnel; once visits accrue, watch the play→join conversion. No code action — measurement-watch.
Why it matters: PLAY is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [BRAND] GAME-REGISTRY SINGLE-SOURCE (item 1 L3, deferred). Game status lives …
Final score: **93**
[S197→][UX/P2] GAME-REGISTRY SINGLE-SOURCE (item 1 L3, deferred). Game status lives in 4 disconnected places (nav dropdown, games-index card, data/game-affinity.json, the game page body) — that disconnection is what let a SPARKED title show "Demo Coming Soon". Create data/game-registry.json (slug → {status, playUrl, embeddable}) as the single source; derive nav/index/affinity/page status + play links from it at build; have check-game-playability-coherence.mjs cross-check all 4 surfaces against it. ~6h structural refactor — its own session. The S197 coherence gate already blocks the specific contradiction class in the interim.
Why it matters: GAME-REGISTRY SINGLE-SOURCE (item 1 L3, deferred). Game status lives i affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [VERIFY] Confirm the S195+S196+S197 deploy wave on prod after this push. On a …
Final score: **88**
[S197][VERIFY/P0] Confirm the S195+S196+S197 deploy wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) S197 — /games/call-of-doodie/ and /games/vaultspark-football-gm/ no longer show a "Demo Coming Soon" block; the lower "Try It Now" section shows a live "▶ Play Now / Play Beta — It's Free" CTA + a "Save Your Progress / Track Your Franchise — Join Free" button; view-source a game page → meta description ≤160 chars reading as a complete sentence; (b) S196 — paste a game URL + /faq/ into the Facebook Sharing Debugger → each shows a bespoke per-title PNG, and /journal/ source carries a CollectionPage ItemList; (c) S195 — Ask IGNIS multi-turn, hero ember canvas, Studio Now strip, Cmd+K inline answer. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S195+S196+S197 deploy wave on prod after this push. On a r shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
Final score: **87**
[S195][UX/P2·FOUNDER] THEME TIER-LOCK decision. S195 shipped the non-gating theme identity cue; LOCKING a theme behind a paid/rank tier changes membership value (escalation). Founder: approve/deny a free-rank cosmetic unlock (e.g. Lava at Forge rank), then wire the server-trusted gate.
Why it matters: THEME TIER-LOCK decision. S195 shipped the non-gating theme identity c is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [VERIFY] NAV-SHEET 100% FLIP
Final score: **81**
[S195][UX/P1·FOUNDER] NAV-SHEET 100% FLIP — real-device verify. Kill-switch (?nav=classic) + 50% canary shipped. Founder does an iPhone+Android pass on ?nav=sheet; if clean, flip data-nav-sheet-canary to 100%.
Why it matters: NAV-SHEET 100% FLIP was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 4. [PRODUCT] Review + publish the forge devlog draft. Re-run node scripts/draft-we…
Final score: **78**
[S189][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. Re-run node scripts/draft-weekly-forge.mjs, founder reviews + publishes to journal/ to clear the 84d-stale journal warn-gate (changelog 62d also stale).
Why it matters: Review + publish the forge devlog draft. Re-run is open, local, and unblocked — can ship this session.

#### 5. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
Final score: **78**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pre-S185 samples aging out. Flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [PRODUCT] STAGING BOX RECOVERY. website.staging.vaultsparkstudios.com (Hetzner)…
Final score: **75**
[S192→][OBS/P2] STAGING BOX RECOVERY. website.staging.vaultsparkstudios.com (Hetzner) genuinely DOWN — staging-health reads staging-unreachable. CANON-007 wants a live staging env. Agent-attemptable via hcloud/SSH — preflight before labeling founder.
Why it matters: STAGING BOX RECOVERY. website.staging.vaultsparkstudios.com (Hetzner)  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] ARK-DEAD-GTAG-PATTERN-SHARE
Final score: **69**
[S196][ECOSYSTEM/P2·FOUNDER] ARK-DEAD-GTAG-PATTERN-SHARE — approval needed. Fleet broadcast DENIED by the auto-mode classifier (outbound ark ship --to '*' under founder identity needs explicit intent). Cargo payload drafted + ready. Founder: approve or scope to named CF-Pages sibling slugs.
Why it matters: ARK-DEAD-GTAG-PATTERN-SHARE is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Confirm S195 expansion wave on prod after deploy. On a real browser (…
Final score: **63**
[S195][VERIFY/P0] Confirm S195 expansion wave on prod after deploy. On a real browser (datacenter curl 403 = benign CF challenge): (a) Ask IGNIS (/ignis/ or /search/) — ask a question, then "tell me more" → answer stays on-thread + follow-up chips appear; (b) homepage hero — an ember field fades in behind the wordmark a moment after load on a capable device, and is ABSENT with reduced-motion on; (c) Studio Now strip renders under the hero; (d) Cmd+K — type "what is membership" → an inline "IGNIS reads:" answer appears above nav results; (e) /ranks/ shows the First Climb quest; (f) /security/ shows the verdict header + uptime card; (g) /changelog/ shows the you-asked→we-shipped panel. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm S195 expansion wave on prod after deploy. On a real browser (d was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. PLAY→JOIN BRIDGE
3. GAME-REGISTRY SINGLE-SOURCE (item 1 L3, deferred). Game status lives …
4. Confirm the S195+S196+S197 deploy wave on prod after this push. On a …
5. THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
6. Forge Window naming propagation
7. NAV-SHEET 100% FLIP
8. Review + publish the forge devlog draft. Re-run node scripts/draft-we…
9. TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
10. STAGING BOX RECOVERY. website.staging.vaultsparkstudios.com (Hetzner)…
11. ARK-DEAD-GTAG-PATTERN-SHARE
12. Confirm S195 expansion wave on prod after deploy. On a real browser (…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
