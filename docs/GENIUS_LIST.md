# Genius Hit List — Session 206

Generated: 2026-06-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **green**
- Current SIL: **882/500**
- CI health: **check gh run list**
- Current focus: S206 autonomous wave shipped: vault passport (member identity card at /vault-member/passport/), smart trial offer (high-intent conversion panel), oracle feedback form (👎 → text input), ignis prefix cache (returning visitor continuity), 13 parallel build generators, oracle query insights + constellation activity feeds.

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

#### 2. [BRAND] Review + publish forge devlog. node scripts/draft-weekly-forge.mjs → …
Final score: **93**
[S206][CONTENT/P2·FOUNDER] Review + publish forge devlog. node scripts/draft-weekly-forge.mjs → SOUL-voice draft. Clears the 84d journal stale warn.
Why it matters: Review + publish forge devlog. affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Sc…
Final score: **90**
[S205][INFRA/P2·FOUNDER] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Scaffold scripts/push-dispatch.mjs ready. Founder: (1) npx web-push generate-vapid-keys (2) store in secrets/cloudflare.vapid.env (3) add VAPID_PUBLIC_KEY to Worker env (4) node scripts/push-dispatch.mjs --test.
Why it matters: WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Sca is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Prod-verify the S206 wave on a real browser. (a) /vault-member/passport/
Final score: **88**
[S206][VERIFY/P0] Prod-verify the S206 wave on a real browser. (a) /vault-member/passport/ — sign in → rank badge + tenure + achievements card renders; Share Passport copies URL. (b) /ignis/ or /oracle/ — ask question, navigate away, return, ask same prefix → "Continuing from earlier search" teaser appears; 👎 vote → text input form expands. (c) /membership/ — adaptive tier highlight shows (anon = generic, returning = different card pulse). (d) /join/?promo=TRIAL50 — trial offer page resolves. Never assume push==deploy.
Why it matters: Prod-verify the S206 wave on a real browser. (a) /vault-member/passpor shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

### NEXT

#### 1. [AI] IGNIS-GRAPH-DEPTH-L3. Cross-entity traversal: clicking a "Related" ch…
Final score: **88**
[S206][AI/P2] IGNIS-GRAPH-DEPTH-L3. Cross-entity traversal: clicking a "Related" chip renders a sub-panel with 3 matching cards from api/public-intelligence.json (mini-catalog mode in ignis-answer-engine.js). ~4h.
Why it matters: IGNIS-GRAPH-DEPTH-L3. Cross-entity traversal: clicking a "Related" chi must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [PRODUCT] CONSTELLATION-SEQUENCE-ANALYTICS. Add constellation:progress:<id>:<st…
Final score: **87**
[S206][SIL/P3] CONSTELLATION-SEQUENCE-ANALYTICS. Add constellation:progress:<id>:<step> per-page events (beyond the existing constellation:unlock:<id>) so we can see WHERE visitors drop off in each sequence. Fold into rollup-rum-ux. ~1h.
Why it matters: CONSTELLATION-SEQUENCE-ANALYTICS. Add constellation:progress:<id>:<ste is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [VERIFY] Prod-verify the S205 wave on a real browser. (a) /
Final score: **80**
[S205][VERIFY/P0] Prod-verify the S205 wave on a real browser. (a) / — hero stagger on scroll; ?hero=v2 shows simplified variant; signed-in member sees rank + Continue CTA in hero; Studio Now has Vault Momentum chip. (b) /membership/ — paid tiers stagger on scroll; sticky hub tab nav. (c) /oracle/ — ask a question → entity chips appear at bottom; deep-dive link. (d) /vault-member/portal/ — cards elevate on hover, buttons spring-press. (e) /journal/dispatches/ — emoji reactions row below each entry. (f) /changelog/ — SOUL-voice narrative sentences. (g) Visit constellation sequence → unlock toast appears. Never assume push==deploy.
Why it matters: Prod-verify the S205 wave on a real browser. (a) / shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 5. [PRODUCT] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
Final score: **75**
[S205][UX/P1·FOUNDER] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-device review on desktop + mobile. If clean, remove flag-gate and make v2 the default hero. ~30m founder time.
Why it matters: HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devic is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
Final score: **69**
[S205][INFRA/P2·FOUNDER] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING. scripts/push-dispatch.mjs scaffold ready — exits gracefully with setup instructions. Founder: (1) npx web-push generate-vapid-keys (2) store in secrets/cloudflare.vapid.env (3) add VAPID_PUBLIC_KEY to Worker env (4) node scripts/push-dispatch.mjs --test. Once READY, agent wires the smart-trigger subscriber + notification plumbing. ~2h unblocked.
Why it matters: WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.  is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
Final score: **69**
[S204][VERIFY/P0] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ show purpose-first mission statement; (b) focus-visible ring on tab-through; (c) buttons have tactile press; (d) custom scrollbar + branded selection render. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] Add check-mission-statement-coherence.mjs gate. WARN when any mission…
Final score: **69**
[S204][SIL][STRUCT/P3] Add check-mission-statement-coherence.mjs gate. WARN when any mission surface reintroduces retired framing outside /universe/ lore. ~45m.
Why it matters: Add check-mission-statement-coherence.mjs gate. WARN when any mission  is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. Review + publish forge devlog. node scripts/draft-weekly-forge.mjs → …
3. WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Sc…
4. Prod-verify the S206 wave on a real browser. (a) /vault-member/passport/
5. IGNIS-GRAPH-DEPTH-L3. Cross-entity traversal: clicking a "Related" ch…
6. CONSTELLATION-SEQUENCE-ANALYTICS. Add constellation:progress:<id>:<st…
7. Forge Window naming propagation
8. Prod-verify the S205 wave on a real browser. (a) /
9. HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
10. WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
11. Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
12. Add check-mission-statement-coherence.mjs gate. WARN when any mission…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
