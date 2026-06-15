# Genius Hit List — Session 199

Generated: 2026-06-15
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **975/500**
- CI health: **check gh run list**
- Current focus: S199 /goal chain (12/12 shipped · build:check EXIT 0). Full structural + observability pass: CSP violation reporting endpoint (/v/csp-report Worker route + report-uri in WORKER_CSP); game-registry L2 (derive-game-nav.mjs + derive-game-index.mjs — 91 HTML pages derived from registry, navOrder added, wired in check-proof-surface); stale-shell cleanup (13 orphaned *.shell-*.js files deleted + --check gate); IGNIS query memory upgraded to L2 ({query,ts} objects, max 10, show 5, backwards-compatible); membership rank velocity (vault-rank-bar.js now fetches created_at, computes velocity, shows 'At your pace: ~N weeks' chip on /ranks/+/vault-member/); oracle velocity window repair (leading-zero trim on chart); pwa-install + visit-streak + funnel-gtag dead-sink x2 all rewired to /v/rum; build-cache velocity script; Ark sig failures root-caused (all 111 from vaultspark-forge pattern-share — logged to DECISIONS.md, fix needs studio-ops). All 12 audit items complete.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] ENGAGEMENT-SIGNAL-VERIFY
Final score: **97**
[S199][OBS/P2] ENGAGEMENT-SIGNAL-VERIFY — awaiting signal. engagement:scroll_25/50/75/100 and engagement:exit_intent_shown/answered now emit to /v/rum from the ambient bundle (S198 D2 rewire — was dead gtag since S147). Once 20+ real-visitor sessions accrue post-deploy, pull api/funnel-summary.json and confirm engagements.* keys are non-zero. No code action — measurement-watch.
Why it matters: ENGAGEMENT-SIGNAL-VERIFY shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + de…
Final score: **94**
[S199][STRUCT/P2] WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + derive-game-index.mjs as CI gates (--check fails on drift) but npm run build does not auto-apply them. Add derive-game-nav.mjs --apply && derive-game-index.mjs --apply into npm run build so every build auto-syncs all HTML pages from game-registry. ~30m.
Why it matters: WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + der shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] Confirm the S199 wave on prod after this push. On a real browser: (a)…
Final score: **88**
[S199][VERIFY/P0] Confirm the S199 wave on prod after this push. On a real browser: (a) Ask IGNIS a question, close the page, return — history chips appear ("Continue your research: [prior query]"); (b) /oracle/ velocity chart shows 4 real weeks (W22–W25), not 22 blank bars; (c) /ranks/ or /vault-member/ (signed-in) → velocity chip "At your pace: [NextRank] in ~N weeks" visible bottom-right; (d) trigger any CSP violation (e.g., inline eval) → check Worker KV for csp: keys via Cloudflare dashboard; (e) share any game page URL to Discord/Slack → bespoke PNG card renders. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S199 wave on prod after this push. On a real browser: (a)  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [VERIFY] Confirm the S198 wave on prod after this push. On a real browser (dat…
Final score: **86**
[S198][VERIFY/P0] Confirm the S198 wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) /games/call-of-doodie/ and /games/vaultspark-football-gm/ — the rank-preview card shows a "📊 Leaderboard sneak peek" block and a "First Climb" quest progress bar with 3 steps; (b) /membership/ shows a Vault Journey 3-panel arc (Forge → Sparked → Vault) above the tier cards; (c) visit the site twice in the same day → look for the streak badge; (d) DevTools Network → scroll to 25% and confirm {ux:"engagement:scroll_25"} POSTs to /v/rum (200/204, not dropped). Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S198 wave on prod after this push. On a real browser (data shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

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
Final score: **66**
[S197][VERIFY/P0] Confirm the S195+S196+S197 deploy wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) S197 — /games/call-of-doodie/ and /games/vaultspark-football-gm/ no longer show a "Demo Coming Soon" block; the lower "Try It Now" section shows a live "▶ Play Now / Play Beta — It's Free" CTA + a "Save Your Progress / Track Your Franchise — Join Free" button; view-source a game page → meta description ≤160 chars reading as a complete sentence; (b) S196 — paste a game URL + /faq/ into the Facebook Sharing Debugger → each shows a bespoke per-title PNG, and /journal/ source carries a CollectionPage ItemList; (c) S195 — Ask IGNIS multi-turn, hero ember canvas, Studio Now strip, Cmd+K inline answer. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S195+S196+S197 deploy wave on prod after this push. On a r was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] Review + publish the forge devlog draft. Re-run node scripts/draft-we…
Final score: **66**
[S189][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. Re-run node scripts/draft-weekly-forge.mjs, founder reviews + publishes to journal/ to clear the 84d-stale journal warn-gate (changelog 62d also stale).
Why it matters: Review + publish the forge devlog draft. Re-run is open, local, and unblocked — can ship this session.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
Final score: **66**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pre-S185 samples aging out. Flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. ENGAGEMENT-SIGNAL-VERIFY
2. Post-push CI confirmation
3. WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + de…
4. Confirm the S199 wave on prod after this push. On a real browser: (a)…
5. Confirm the S198 wave on prod after this push. On a real browser (dat…
6. Forge Window naming propagation
7. PLAY→JOIN BRIDGE
8. STAGING BOX RECOVERY
9. THEME TIER-LOCK decision. S195 shipped the non-gating theme identity …
10. Confirm the S195+S196+S197 deploy wave on prod after this push. On a …
11. Review + publish the forge devlog draft. Re-run node scripts/draft-we…
12. TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
