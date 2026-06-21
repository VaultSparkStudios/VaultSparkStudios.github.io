# Genius Hit List — Session 213

Generated: 2026-06-21
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **927/500**
- CI health: **check gh run list**
- Current focus: S213 (autonomous arc · IGNIS depth + push segmentation) shipped 5 waves: W2a IGNIS starter analytics (oracle:starter_click:<slug> bounded suffix); W2b IGNIS game-specific starters (vs_last_game → STARTERS_GAME map, 2 game starters prepended for cod/fgm/forge visitors); W2c dynamic no-result fallback (STARTERS_ALL chips + oracle:no_result RUM); W3a push game-context segmentation (push-subscribe.js sends lastGame+route, Worker validates+persists, notify-subscribers.mjs --game filter); W3b push delivery+click tracking (sw.js push:received/push:clicked via fetch beacon); W4 Ark cargo to studio-ops (sibling compliance gaps). Worker deployed abc4f4c3. RUM allowlist 65/68 clean. Doctor blockingFailing 0. SIL 927.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] First real push notification
Final score: **96**
[PUSH/P1·FOUNDER] First real push notification — run npm run push:count to check subscriber count + game breakdown, then npm run push:notify -- --title "..." --body "..." (founder go-ahead required for first dispatch to real subscribers). --game cod for segmented game audience.
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
Final score: **93**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Publish forge devlog (draft ready; founder-voice, never auto-published).
Final score: **90**
[CONTENT/P1·FOUNDER] Publish forge devlog (draft ready; founder-voice, never auto-published).
Why it matters: Publish forge devlog (draft ready; founder-voice, never auto-published affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [PRODUCT] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
Final score: **87**
[OPS/P2] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling compliance gaps VOID/SHADOW/Hashmark).
Why it matters: studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling comp is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…
Final score: **84**
[MEASURE/P3] Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No action until post-epoch field data accrues.
Why it matters: Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No  is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Publish forge devlog. Founder-voice; never auto-published.
Final score: **81**
[CONTENT/P1·FOUNDER] Publish forge devlog. Founder-voice; never auto-published.
Why it matters: Publish forge devlog. Founder-voice; never auto-published. affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [PRODUCT] #7
Final score: **78**
[INFRA/P2] #7 — Web-push feature. VAPID keys are READY (cloudflare.vapid capability = READY, keys in gateway). Remaining: Worker /v/push-subscribe endpoint + assets/push-subscribe.js + push-dispatch.mjs --send live test. Estimated 4h. Deferred to a dedicated session — not trivial enough to close at end-of-session closeout.
Why it matters: #7 is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Web-push feature
Final score: **75**
[INFRA/P2] Web-push feature — VAPID READY; ship the endpoint + subscribe UI + dispatch test. (Carry from S210 #7)
Why it matters: Web-push feature is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
Final score: **72**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue. Epoch set to 2026-06-18 (D-S209.1); deadCount = 0 (honest "insufficient data"). No action until field data shows a verdict.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **69**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. First real push notification
2. Post-push CI confirmation
3. Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
4. Publish forge devlog (draft ready; founder-voice, never auto-published).
5. studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
6. Forge Window naming propagation
7. Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…
8. Publish forge devlog. Founder-voice; never auto-published.
9. #7
10. Web-push feature
11. Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
12. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
