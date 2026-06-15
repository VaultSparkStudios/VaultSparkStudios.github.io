# Genius Hit List — Session 200

Generated: 2026-06-15
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **976/500**
- CI health: **check gh run list**
- Current focus: S200 founder visual-elevation audit (/implement full plan one pass · 12/15 shipped · build:check EXIT 0). Bespoke game cover art (build-game-covers.mjs → 8 SVG→PNG tiles, sharp, zero deps) over gradient fallback + dead Gridiron-Play card removed + forge CTAs standardized; Oracle data-viz root-cause fixed (heatmap+insights fetched gitignored /ignis/output/* → public api/ecosystem-velocity.json fallback, verified rendering); homepage theme-aware light-mode glows + hero parallax + live initiative counts (home-initiative-counter.js) + Heartbeat folded into Recent Ships; tier-aware portal header accent + Browse-Members link; Studio Intelligence suite nav across oracle/studio-pulse/nervous-system; membership-value→membership + brand↔press cross-links. Deferred 3 (universe map #4 founder-lore-gated, pathways merge #11 Worker-301, FAQ #13). Fixed pre-existing gate debt (RUM static-list, S199 SIL arithmetic).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm the S200 visual wave on prod after this push. On a real brows…
Final score: **100**
[S200][VERIFY/P0] Confirm the S200 visual wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) /games/ cards show bespoke cover art, not bare radial gradients; (b) /oracle/ renders a 60-day heatmap grid + ≥2 smart-insight cards (NOT "Loading 60-day grid…"); (c) homepage in light mode → hero glows are clearly visible; (d) homepage "Every initiative. One vault." strip shows live live/forge/sealed counts; (e) oracle/studio-pulse/nervous-system each show the "Studio Intelligence" suite nav with the current page highlighted. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S200 visual wave on prod after this push. On a real browse shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [AI] UNIVERSE DEPTH MAP
Final score: **94**
[S200→][DEPTH/P2·FOUNDER] UNIVERSE DEPTH MAP — needs founder-verified lore edges. Interactive node-graph of game/project/lore connections (reuse the constellation renderer from the oracle fix). Net-new /universe/ graph + universe-graph.json; lore/canon edges require founder review ([[feedback_handcurated_truth_needs_founder_review]]) before publish. Carried from AUDIT_2026-06-15 #4. ~8h.
Why it matters: UNIVERSE DEPTH MAP must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [PRODUCT] MERGE 6 pathways/* pages → one filterable /pathways/. The six pathway…
Final score: **93**
[S200→][REDUNDANCY/P2] MERGE 6 pathways/* pages → one filterable /pathways/. The six pathways/{players,builders,investors,supporters,press,lore}/index.html are byte-identical 165-line templates. Data-drive from one source + collapse to /pathways/?audience= with filters + 301 the six subfolders via Worker Layer 0c (+ tests/redirects.spec.js case). Carried from AUDIT_2026-06-15 #11 (deferred: needs Worker-301 propagation + content extraction). ~3h.
Why it matters: MERGE 6 pathways/* pages is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] FAQ data-driven + search + category tabs. Move /faq/ entries to data/…
Final score: **87**
[S200→][TEXT-ORG/P3] FAQ data-driven + search + category tabs. Move /faq/ entries to data/faq.json, render client-side with search + category filters, keep FAQPage schema generated from the JSON. Carried from AUDIT_2026-06-15 #13. ~2h.
Why it matters: FAQ data-driven + search + category tabs. Move /faq/ entries to data/f is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] Complete the membership-value, brand→press, and member-IA merges. S20…
Final score: **87**
[S200→][REDUNDANCY/P3] Complete the membership-value, brand→press, and member-IA merges. S200 shipped the cross-links (L1); the full 301 merges + nav-dropdown dedupe + /member/ retirement still pending (need Worker Layer 0c propagation + a /member/ usage audit). From AUDIT_2026-06-15 #12/#14/#15.
Why it matters: Complete the membership-value, brand keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [VERIFY] ENGAGEMENT-SIGNAL-VERIFY
Final score: **80**
[S199][OBS/P2] ENGAGEMENT-SIGNAL-VERIFY — awaiting signal. engagement:scroll_25/50/75/100 and engagement:exit_intent_shown/answered now emit to /v/rum from the ambient bundle (S198 D2 rewire — was dead gtag since S147). Once 20+ real-visitor sessions accrue post-deploy, pull api/funnel-summary.json and confirm engagements.* keys are non-zero. No code action — measurement-watch.
Why it matters: ENGAGEMENT-SIGNAL-VERIFY shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 5. [VERIFY] WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + de…
Final score: **77**
[S199][STRUCT/P2] WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + derive-game-index.mjs as CI gates (--check fails on drift) but npm run build does not auto-apply them. Add derive-game-nav.mjs --apply && derive-game-index.mjs --apply into npm run build so every build auto-syncs all HTML pages from game-registry. ~30m.
Why it matters: WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + der shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [VERIFY] Confirm the S199 wave on prod after this push. On a real browser: (a)…
Final score: **71**
[S199][VERIFY/P0] Confirm the S199 wave on prod after this push. On a real browser: (a) Ask IGNIS a question, close the page, return — history chips appear ("Continue your research: [prior query]"); (b) /oracle/ velocity chart shows 4 real weeks (W22–W25), not 22 blank bars; (c) /ranks/ or /vault-member/ (signed-in) → velocity chip "At your pace: [NextRank] in ~N weeks" visible bottom-right; (d) trigger any CSP violation (e.g., inline eval) → check Worker KV for csp: keys via Cloudflare dashboard; (e) share any game page URL to Discord/Slack → bespoke PNG card renders. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S199 wave on prod after this push. On a real browser: (a)  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [COHESION] PLAY→JOIN BRIDGE
Final score: **68**
[S197→][MEASURE/P3] PLAY→JOIN BRIDGE — awaiting signal. game_play_click / game_join_from_play now emit as bounded funnel:* to /v/rum from both SPARKED game pages and roll into api/funnel-summary.json. Traffic-gated like the rest of the funnel; once visits accrue, watch the play→join conversion. No code action — measurement-watch.
Why it matters: PLAY is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [SECURITY] STAGING BOX RECOVERY
Final score: **66**
[S198][SECURITY/P2·HUMAN] STAGING BOX RECOVERY — HUMAN ACTION REQUIRED. CANON-019 preflight completed S198: hcloud CLI not installed AND HCLOUD_TOKEN MISSING in secrets gateway. Genuine founder-hardware block. Founder: retrieve HCLOUD_TOKEN from Hetzner Cloud Console → node ../vaultspark-studio-ops/scripts/ops.mjs intake-credentials hcloud (or add to gateway secrets directly). Agent re-attempts hcloud server list → SSH → Caddy restore once READY. Target: website.staging.vaultsparkstudios.com (CANON-007).
Why it matters: STAGING BOX RECOVERY lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Confirm the S200 visual wave on prod after this push. On a real brows…
2. Post-push CI confirmation
3. UNIVERSE DEPTH MAP
4. MERGE 6 pathways/* pages → one filterable /pathways/. The six pathway…
5. FAQ data-driven + search + category tabs. Move /faq/ entries to data/…
6. Complete the membership-value, brand→press, and member-IA merges. S20…
7. Forge Window naming propagation
8. ENGAGEMENT-SIGNAL-VERIFY
9. WIRE DERIVE SCRIPTS INTO BUILD. S199 shipped derive-game-nav.mjs + de…
10. Confirm the S199 wave on prod after this push. On a real browser: (a)…
11. PLAY→JOIN BRIDGE
12. STAGING BOX RECOVERY

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
