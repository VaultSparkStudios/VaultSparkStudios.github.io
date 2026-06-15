# Genius Hit List — Session 202

Generated: 2026-06-15
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **982/500**
- CI health: **check gh run list**
- Current focus: S202 bug-fix session. vault-climbers RLS unblocked (service role key via secrets gateway + pathToFileURL fix + rank_name column removed + public_profile filter). vault-rank-bar.js rank_name silent select error fixed. Nervous System page rewritten for visitors (stripDevTalk + humanVerdict/humanSurface translation + publicNote/publicNextStep fields + Source contracts panel removed). TASK_BOARD stale task flipped. build:check EXIT 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Add check-public-note-freshness.mjs gate. Fails build:check if PROJEC…
Final score: **96**
[S202][STRUCT/P3] Add check-public-note-freshness.mjs gate. Fails build:check if PROJECT_STATUS.publicNote is missing or contains session-code patterns (S\d{2,3}). Ensures Nervous System always shows visitor-friendly copy. ~30m.
Why it matters: Add check-public-note-freshness.mjs gate. Fails build:check if PROJECT is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] Confirm vault-climbers strip on prod. After CF Pages deploys from 46b…
Final score: **94**
[S202][VERIFY/P0] Confirm vault-climbers strip on prod. After CF Pages deploys from 46b1784c: homepage → vault-climbers strip should appear with 5 members (VaultSpark, vaulteternalqa, OneKingdom, Voidfall, DreadSpike) and their ranks. If still hidden, check api/rank-climbers.json is current on prod (curl https://vaultsparkstudios.com/api/rank-climbers.json) and confirm strip hidden attr is removed when climbers > 0. Never assume push==deploy.
Why it matters: Confirm vault-climbers strip on prod. After CF Pages deploys from 46b1 shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 4. [PRODUCT] Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic…
Final score: **93**
[S202][DOCS/P3] Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic import() on Windows requires file:// URL scheme; bare absolute paths fail silently. Future scripts hitting the secrets gateway must use pathToFileURL(secretsPath).href. ~15m.
Why it matters: Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] UNIVERSE DEPTH MAP
Final score: **84**
[S201→][DEPTH/P2·FOUNDER] UNIVERSE DEPTH MAP — needs founder-verified lore edges. Interactive node-graph of game/project/lore connections. Net-new /universe/ + universe-graph.json; lore/canon edges require founder review ([[feedback_handcurated_truth_needs_founder_review]]). Carried from AUDIT_2026-06-15 #4. ~8h.
Why it matters: UNIVERSE DEPTH MAP is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] Complete the membership-value, brand→press, and member-IA merges. S20…
Final score: **81**
[S200→][REDUNDANCY/P3] Complete the membership-value, brand→press, and member-IA merges. S200 shipped the cross-links (L1); the full 301 merges + nav-dropdown dedupe + /member/ retirement still pending (need Worker Layer 0c propagation + a /member/ usage audit). From AUDIT_2026-06-15 #12/#14/#15.
Why it matters: Complete the membership-value, brand keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 4. [VERIFY] Confirm the S200 visual wave on prod after this push. On a real brows…
Final score: **78**
[S200][VERIFY/P0] Confirm the S200 visual wave on prod after this push. On a real browser (datacenter curl 403 = benign CF challenge): (a) /games/ cards show bespoke cover art, not bare radial gradients; (b) /oracle/ renders a 60-day heatmap grid + ≥2 smart-insight cards (NOT "Loading 60-day grid…"); (c) homepage in light mode → hero glows are clearly visible; (d) homepage "Every initiative. One vault." strip shows live live/forge/sealed counts; (e) oracle/studio-pulse/nervous-system each show the "Studio Intelligence" suite nav with the current page highlighted. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm the S200 visual wave on prod after this push. On a real browse was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [VERIFY] Confirm S201 wave on prod. On a real browser (datacenter curl 403 = b…
Final score: **77**
[S201][VERIFY/P0] Confirm S201 wave on prod. On a real browser (datacenter curl 403 = benign CF challenge): (a) /journal/dispatches/ — sign in → classified section reveals 3 session-intelligence entries with rank note; (b) /ranks/ or /vault-member/ (signed-in) → "Share Rank" button appears bottom-right, tapping opens Web Share or copies to clipboard; (c) /ignis/ — ask 2+ questions → "Synthesize my session →" button appears, clicking opens SESSION DIGEST card with topic list + deduped source chips; (d) /pathways/builders/ and others render correctly from data-driven source. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Confirm S201 wave on prod. On a real browser (datacenter curl 403 = be shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [VERIFY] ENGAGEMENT-SIGNAL-VERIFY
Final score: **69**
[S199][OBS/P2] ENGAGEMENT-SIGNAL-VERIFY — awaiting signal. engagement:scroll_25/50/75/100 and engagement:exit_intent_shown/answered now emit to /v/rum from the ambient bundle (S198 D2 rewire — was dead gtag since S147). Once 20+ real-visitor sessions accrue post-deploy, pull api/funnel-summary.json and confirm engagements.* keys are non-zero. No code action — measurement-watch.
Why it matters: ENGAGEMENT-SIGNAL-VERIFY was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 2. [COHESION] PLAY→JOIN BRIDGE
Final score: **65**
[S197→][MEASURE/P3] PLAY→JOIN BRIDGE — awaiting signal. game_play_click / game_join_from_play now emit as bounded funnel:* to /v/rum from both SPARKED game pages and roll into api/funnel-summary.json. Traffic-gated like the rest of the funnel; once visits accrue, watch the play→join conversion. No code action — measurement-watch.
Why it matters: PLAY is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [SECURITY] STAGING BOX RECOVERY
Final score: **63**
[S198][SECURITY/P2·HUMAN] STAGING BOX RECOVERY — HUMAN ACTION REQUIRED. CANON-019 preflight completed S198: hcloud CLI not installed AND HCLOUD_TOKEN MISSING in secrets gateway. Genuine founder-hardware block. Founder: retrieve HCLOUD_TOKEN from Hetzner Cloud Console → node ../vaultspark-studio-ops/scripts/ops.mjs intake-credentials hcloud (or add to gateway secrets directly). Agent re-attempts hcloud server list → SSH → Caddy restore once READY. Target: website.staging.vaultsparkstudios.com (CANON-007).
Why it matters: STAGING BOX RECOVERY lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Add check-public-note-freshness.mjs gate. Fails build:check if PROJEC…
2. Post-push CI confirmation
3. Confirm vault-climbers strip on prod. After CF Pages deploys from 46b…
4. Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic…
5. Forge Window naming propagation
6. UNIVERSE DEPTH MAP
7. Complete the membership-value, brand→press, and member-IA merges. S20…
8. Confirm the S200 visual wave on prod after this push. On a real brows…
9. Confirm S201 wave on prod. On a real browser (datacenter curl 403 = b…
10. ENGAGEMENT-SIGNAL-VERIFY
11. PLAY→JOIN BRIDGE
12. STAGING BOX RECOVERY

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
