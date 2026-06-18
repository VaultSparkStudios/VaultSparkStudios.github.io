# Genius Hit List — Session 207

Generated: 2026-06-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **905/500**
- CI health: **check gh run list**
- Current focus: S207 autonomous wave shipped: fixed three S206 features that weren't converting — retimed the dead cross-game play-next card (18 shown/0 clicks) to reveal on engagement, retargeted the 50%-off trial offer from the free /join/ page to the paid /vaultsparked/ checkout (honest promo handling), and turned shared Vault Passports into a 'forge your own' signup loop. Plus automated prod-wave verification (closes a 7-deep manual backlog), a self-healing dead-CTA copy rotation, an Oracle feedback themes loop, and IGNIS related-chip graph traversal.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Re-run node scripts/prod-verify-wave.mjs after CF Pages deploys S207.…
Final score: **100**
[S207][VERIFY/P0] Re-run node scripts/prod-verify-wave.mjs after CF Pages deploys S207. Post-deploy the /vault-member/passport/ sentinel ("Forge your own Vault Passport") should flip FAIL → PASS (correctly pending at closeout — committed, not yet deployed). All other S207 surfaces already PASS. Replaces the manual browser-walk for presence/liveness.
Why it matters: Re-run shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [SECURITY] Deploy the Worker with --env production. cloudflare/security-headers-…
Final score: **99**
[S207][INFRA/P1] Deploy the Worker with --env production. cloudflare/security-headers-worker.js added RUM prefixes cta + oracle-feedback + statics passport:inbound/oracle:graph_traverse. Until redeploy those beacons drop at the edge. wrangler deploy --env production ([[feedback_worker_apex_self_loop_outage]]). ~10m.
Why it matters: Deploy the Worker with --env production. cloudflare/security-headers-w lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
Final score: **90**
[S207][MEASURE/P2] Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, check api/dead-ctas.json: if play-next is STILL dead, run node scripts/build-cta-state.mjs --advance to rotate to copy variant 1. If it converts, the retiming win is confirmed. Measurement-watch.
Why it matters: Watch retimed play-next + auto-rotation. Once post-S207 visits accrue, is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [REVENUE] Create the Stripe TRIAL50 coupon (makes 50%-off real end-to-end). Pat…
Final score: **89**
[S207][PRODUCT/P2·FOUNDER] Create the Stripe TRIAL50 coupon (makes 50%-off real end-to-end). Path is now coherent (lands on /vaultsparked/, acknowledges + passes the promo, server-validated). The promotion_code object must exist in Stripe — pricing = founder gate. Until then the path honestly shows "Promo code not found or expired." trial-offer-promo-acknowledgment L3.
Why it matters: Create the Stripe TRIAL50 coupon (makes 50%-off real end-to-end). Path is on the direct checkout path; unblocking it can activate income without building new features.

#### 2. [BRAND] Review + publish forge devlog. node scripts/draft-weekly-forge.mjs → …
Final score: **87**
[S206][CONTENT/P2·FOUNDER] Review + publish forge devlog. node scripts/draft-weekly-forge.mjs → SOUL-voice draft. Clears the 66d changelog stale warn.
Why it matters: Review + publish forge devlog. affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [PRODUCT] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Sc…
Final score: **84**
[S205][INFRA/P2·FOUNDER] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Scaffold scripts/push-dispatch.mjs ready. Founder: (1) npx web-push generate-vapid-keys (2) store in secrets/cloudflare.vapid.env (3) add VAPID_PUBLIC_KEY to Worker env (4) node scripts/push-dispatch.mjs --test.
Why it matters: WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Sca is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Prod-verify the S205 wave on a real browser. (a) /
Final score: **72**
[S205][VERIFY/P0] Prod-verify the S205 wave on a real browser. (a) / — hero stagger on scroll; ?hero=v2 shows simplified variant; signed-in member sees rank + Continue CTA in hero; Studio Now has Vault Momentum chip. (b) /membership/ — paid tiers stagger on scroll; sticky hub tab nav. (c) /oracle/ — ask a question → entity chips appear at bottom; deep-dive link. (d) /vault-member/portal/ — cards elevate on hover, buttons spring-press. (e) /journal/dispatches/ — emoji reactions row below each entry. (f) /changelog/ — SOUL-voice narrative sentences. (g) Visit constellation sequence → unlock toast appears. Never assume push==deploy.
Why it matters: Prod-verify the S205 wave on a real browser. (a) / was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

### LATER

#### 1. [PRODUCT] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
Final score: **72**
[S205][UX/P1·FOUNDER] HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-device review on desktop + mobile. If clean, remove flag-gate and make v2 the default hero. ~30m founder time.
Why it matters: HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devic is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
Final score: **66**
[S205][INFRA/P2·FOUNDER] WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING. scripts/push-dispatch.mjs scaffold ready — exits gracefully with setup instructions. Founder: (1) npx web-push generate-vapid-keys (2) store in secrets/cloudflare.vapid.env (3) add VAPID_PUBLIC_KEY to Worker env (4) node scripts/push-dispatch.mjs --test. Once READY, agent wires the smart-trigger subscriber + notification plumbing. ~2h unblocked.
Why it matters: WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.  is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…
Final score: **66**
[S204][VERIFY/P0] Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ show purpose-first mission statement; (b) focus-visible ring on tab-through; (c) buttons have tactile press; (d) custom scrollbar + branded selection render. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press/ was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. Re-run node scripts/prod-verify-wave.mjs after CF Pages deploys S207.…
2. Deploy the Worker with --env production. cloudflare/security-headers-…
3. Post-push CI confirmation
4. Watch retimed play-next + auto-rotation. Once post-S207 visits accrue…
5. Create the Stripe TRIAL50 coupon (makes 50%-off real end-to-end). Pat…
6. Review + publish forge devlog. node scripts/draft-weekly-forge.mjs → …
7. Forge Window naming propagation
8. WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability MISSING. Sc…
9. Prod-verify the S205 wave on a real browser. (a) /
10. HERO V2 GRADUATION. ?hero=v2 flag-gated + shipped. Founder: real-devi…
11. WEB-PUSH VAPID KEYS REQUIRED. cloudflare.vapid capability is MISSING.…
12. Prod-verify the S204 wave. On a real browser: (a) /studio/, /, /press…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
