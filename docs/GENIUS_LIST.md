# Genius Hit List — Session 205

Generated: 2026-06-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **green**
- Current SIL: **985/500**
- CI health: **check gh run list**
- Current focus: S205 autonomous wave shipped: engagement depth (constellation challenges, entity chips in IGNIS answers, dispatch reactions, vault-momentum score), membership consolidation (tab nav + Worker 301s), portal premium polish, hero v2 flag-gated. Next: prod-verify S205 wave + hero v2 graduation (founder real-device).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Prod-verify the S205 wave on a real browser. (a) /
Final score: **97**
[S205][VERIFY/P0] Prod-verify the S205 wave on a real browser. (a) / — hero stagger on scroll; ?hero=v2 shows simplified variant; signed-in member sees rank + Continue CTA in hero; Studio Now has Vault Momentum chip. (b) /membership/ — paid tiers stagger on scroll; sticky hub tab nav. (c) /oracle/ — ask a question → entity chips appear at bottom; deep-dive link. (d) /vault-member/portal/ — cards elevate on hover, buttons spring-press. (e) /journal/dispatches/ — emoji reactions row below each entry. (f) /changelog/ — SOUL-voice narrative sentences. (g) Visit constellation sequence → unlock toast appears. Never assume push==deploy.
Why it matters: Prod-verify the S205 wave on a real browser. (a) / shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
Final score: **90**
[S205][UX/P1·FOUNDER] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-device review on desktop + mobile. If clean, remove flag-gate and make v2 the default hero. ~30m founder time.
Why it matters: HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devic is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
Final score: **89**
[S204][VERIFY/P0] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ show purpose-first mission statement; (b) focus-visible ring on tab-through; (c) buttons have tactile press; (d) custom scrollbar + branded selection render. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
Final score: **84**
[S205][INFRA/P2·FOUNDER] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING. scripts/push-dispatch.mjs scaffold ready — exits gracefully with setup instructions. Founder: (1) npx web-push generate-vapid-keys (2) store in secrets/cloudflare.vapid.env (3) add VAPID_PUBLIC_KEY to Worker env (4) node scripts/push-dispatch.mjs --test. Once READY, agent wires the smart-trigger subscriber + notification plumbing. ~2h unblocked.
Why it matters: WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Add check-mission-statement-coherence.mjs gate. WARN when any mission…
Final score: **84**
[S204][SIL][STRUCT/P3] Add check-mission-statement-coherence.mjs gate. WARN when any mission surface reintroduces retired framing outside /universe/ lore. ~45m.
Why it matters: Add check-mission-statement-coherence.mjs gate. WARN when any mission  is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Prod-verify the manifesto wave on a real browser. After deploy: /stud…
Final score: **78**
[S203][VERIFY/P0] Prod-verify the manifesto wave on a real browser. After deploy: /studio/ reads the new 5-movement manifesto (no "cannot be un-sparked" / "We don't build products" anywhere); homepage hero "Vault-Forge" line + "Inside The Vault" panel read the broadened copy; /press/ short bio mentions AI-native intelligence; /universe/ mythology shows the re-seal/reignite beat; /join/ subtext no longer says "game studio". Apex already confirmed serving new /studio/ copy at closeout — re-check the other 4 surfaces. ~10m.
Why it matters: Prod-verify the manifesto wave on a real browser. After deploy: /studi was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 5. [PRODUCT] Add check-identity-coherence.mjs gate. WARN (not error) when public m…
Final score: **78**
[S203][SIL][STRUCT/P3] Add check-identity-coherence.mjs gate. WARN (not error) when public marketing prose narrows VaultSpark to "game studio" instead of the canonical "creative studio building games, cinematic worlds, creative tools, and AI-native intelligence." Mirrors how check-game-playability-coherence prevents status drift — this prevents identity drift. Allowlist legal/SEO contexts (privacy, investor, meta keywords). ~45m.
Why it matters: Add check-identity-coherence.mjs gate. WARN (not error) when public ma is open, local, and unblocked — can ship this session.

### LATER

#### 1. [BRAND] Document the manifesto/identity canon in one place. The studio narrat…
Final score: **75**
[S203][SIL][DOCS/P3] Document the manifesto/identity canon in one place. The studio narrative is now consistent across 7 surfaces but has no single source doc; a short docs/STUDIO_NARRATIVE.md (the manifesto + the FORGE→SPARK→VAULT cycle + the "different forms, one fire" portfolio framing) gives future sessions one place to copy voice from. ~30m.
Why it matters: Document the manifesto/identity canon in one place. The studio narrati affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] Add check-public-note-freshness.mjs gate. Fails build:check if PROJEC…
Final score: **72**
[S202][STRUCT/P3] Add check-public-note-freshness.mjs gate. Fails build:check if PROJECT_STATUS.publicNote is missing or contains session-code patterns (S\d{2,3}). Ensures Nervous System always shows visitor-friendly copy. ~30m.
Why it matters: Add check-public-note-freshness.mjs gate. Fails build:check if PROJECT is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic…
Final score: **69**
[S202][DOCS/P3] Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic import() on Windows requires file:// URL scheme; bare absolute paths fail silently. Future scripts hitting the secrets gateway must use pathToFileURL(secretsPath).href. ~15m.
Why it matters: Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic  is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Prod-verify the S205 wave on a real browser. (a) /
2. Post-push CI confirmation
3. HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
4. Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
5. Forge Window naming propagation
6. WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
7. Add check-mission-statement-coherence.mjs gate. WARN when any mission…
8. Prod-verify the manifesto wave on a real browser. After deploy: /stud…
9. Add check-identity-coherence.mjs gate. WARN (not error) when public m…
10. Document the manifesto/identity canon in one place. The studio narrat…
11. Add check-public-note-freshness.mjs gate. Fails build:check if PROJEC…
12. Document pathToFileURL pattern in docs/INTERNAL_TOOLS.md. ESM dynamic…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
