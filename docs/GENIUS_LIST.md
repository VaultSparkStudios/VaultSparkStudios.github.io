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

#### 1. [PRODUCT] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
Final score: **96**
[S207][MEASURE/P2] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, check api/dead-ctas.json: if play-next is STILL dead, run node scripts/build-cta-state.mjs --advance to rotate to copy variant 1. If it converts, the retiming win is confirmed. Measurement-watch.
Why it matters: Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [BRAND] Publish forge devlog
Final score: **93**
[S206][CONTENT/P1·FOUNDER] Publish forge devlog — DRAFT COMPLETE. journal/_drafts/forge-week-2026-06-18.md is publish-ready (factual paragraph filled in). Intentionally NOT auto-published: it's a founder-voice essay (the draft tool never auto-publishes by design). Founder: edit the lead paragraph into your own voice + publish to journal/ to clear the 66d changelog warn.
Why it matters: Publish forge devlog affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [BRAND] Obelisk Passport login (5d978cf9)
Final score: **90**
[S207][FOUNDER/PARALLEL] Obelisk Passport login (5d978cf9) — a parallel session's auth-wiring commit (login.html + auth/callback.html). Agent greened its build:check failure (nav-orphan exemptions) without touching the auth flow; auth-flow ownership stays with the founder's Obelisk session. GUARDRAIL (D-S207.8, postmortem): the auth gate must redirect with 302 + Cache-Control: no-store, NEVER 301, and must NEVER gate the public site / apex / (private paths only). A 301 blanket gate misfired this session and cached-301-locked the founder out ~1h.
Why it matters: Obelisk Passport login (5d978cf9) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [VERIFY] Prod-verify the S205 wave on a real browser. (a) /
Final score: **81**
[S205][VERIFY/P0] Prod-verify the S205 wave on a real browser. (a) / — hero stagger on scroll; ?hero=v2 shows simplified variant; signed-in member sees rank + Continue CTA in hero; Studio Now has Vault Momentum chip. (b) /membership/ — paid tiers stagger on scroll; sticky hub tab nav. (c) /oracle/ — ask a question → entity chips appear at bottom; deep-dive link. (d) /vault-member/portal/ — cards elevate on hover, buttons spring-press. (e) /journal/dispatches/ — emoji reactions row below each entry. (f) /changelog/ — SOUL-voice narrative sentences. (g) Visit constellation sequence → unlock toast appears. Never assume push==deploy.
Why it matters: Prod-verify the S205 wave on a real browser. (a) / was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
Final score: **81**
[S205][UX/P1·FOUNDER] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-device review on desktop + mobile. If clean, remove flag-gate and make v2 the default hero. ~30m founder time.
Why it matters: HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devic is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
Final score: **75**
[S205][INFRA/P2·FOUNDER] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING. scripts/push-dispatch.mjs scaffold ready — exits gracefully with setup instructions. Founder: (1) npx web-push generate-vapid-keys (2) store in secrets/cloudflare.vapid.env (3) add VAPID_PUBLIC_KEY to Worker env (4) node scripts/push-dispatch.mjs --test. Once READY, agent wires the smart-trigger subscriber + notification plumbing. ~2h unblocked.
Why it matters: WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.  is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
Final score: **75**
[S204][VERIFY/P0] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ show purpose-first mission statement; (b) focus-visible ring on tab-through; (c) buttons have tactile press; (d) custom scrollbar + branded selection render. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [PRODUCT] Add check-mission-statement-coherence.mjs gate. WARN when any mission…
Final score: **75**
[S204][SIL][STRUCT/P3] Add check-mission-statement-coherence.mjs gate. WARN when any mission surface reintroduces retired framing outside /universe/ lore. ~45m.
Why it matters: Add check-mission-statement-coherence.mjs gate. WARN when any mission  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Add check-identity-coherence.mjs gate. WARN (not error) when public m…
Final score: **69**
[S203][SIL][STRUCT/P3] Add check-identity-coherence.mjs gate. WARN (not error) when public marketing prose narrows VaultSpark to "game studio" instead of the canonical "creative studio building games, cinematic worlds, creative tools, and AI-native intelligence." Mirrors how check-game-playability-coherence prevents status drift — this prevents identity drift. Allowlist legal/SEO contexts (privacy, investor, meta keywords). ~45m.
Why it matters: Add check-identity-coherence.mjs gate. WARN (not error) when public ma is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Document the manifesto/identity canon in one place. The studio narrat…
Final score: **66**
[S203][SIL][DOCS/P3] Document the manifesto/identity canon in one place. The studio narrative is now consistent across 7 surfaces but has no single source doc; a short docs/STUDIO_NARRATIVE.md (the manifesto + the FORGE→SPARK→VAULT cycle + the "different forms, one fire" portfolio framing) gives future sessions one place to copy voice from. ~30m.
Why it matters: Document the manifesto/identity canon in one place. The studio narrati affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
2. Post-push CI confirmation
3. Publish forge devlog
4. Obelisk Passport login (5d978cf9)
5. Forge Window naming propagation
6. Prod-verify the S205 wave on a real browser. (a) /
7. HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
8. WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
9. Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
10. Add check-mission-statement-coherence.mjs gate. WARN when any mission…
11. Add check-identity-coherence.mjs gate. WARN (not error) when public m…
12. Document the manifesto/identity canon in one place. The studio narrat…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
