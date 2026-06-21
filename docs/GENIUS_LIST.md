# Genius Hit List — Session 212

Generated: 2026-06-21
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **922/500**
- CI health: **check gh run list**
- Current focus: S212 (autonomous arc continuation) shipped 6 waves: W1 orphan shell cleanup (7 stale build artifacts removed); W2 PWA manifest → bespoke og-home.png + push-dispatch status READY; W3 game quiz personalization (vs_last_game ambient-loader tracker + pre-selected Q1 option + 'Based on your last session' hint + quiz:personalized RUM); W4 IGNIS curated starter prompts (5 SOUL-voice questions, hidden on first query, oracle:starter_click RUM, first-time-visitor guidance); W5 push dispatch KV batch (notify-subscribers.mjs: enumerates vs:push:sub: keys from CF KV via cloudflare.deploy API, fetches subscriptions, dispatches via web-push + npm run push:notify/push:count); W6 changelog notification trigger (notify-changelog-subscribers.mjs: reads changelog-narrative.json, compares against data/last-notified-changelog.json sentinel, dispatches push on new entry + npm run notify:changelog). Worker deployed ac1b2596. RUM allowlist clean (63 allowlisted · 67 call-sites). Doctor blockingFailing 0. SIL 919→922.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [AI] IGNIS starter prompts analytics
Final score: **97**
[AI/P2·SIL] IGNIS starter prompts analytics — extend oracle:starter_click with bounded prompt slug suffix so we learn which starters resonate.
Why it matters: IGNIS starter prompts analytics must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [PRODUCT] First real push notification
Final score: **96**
[PUSH/P1·FOUNDER] First real push notification — run npm run push:count to check subscriber count, then npm run push:notify -- --title "..." --body "..." (founder go-ahead required for first dispatch to real subscribers).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
Final score: **90**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Publish forge devlog (draft ready; founder-voice, never auto-published).
Final score: **87**
[CONTENT/P1·FOUNDER] Publish forge devlog (draft ready; founder-voice, never auto-published).
Why it matters: Publish forge devlog (draft ready; founder-voice, never auto-published affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

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

1. IGNIS starter prompts analytics
2. First real push notification
3. Post-push CI confirmation
4. Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
5. Publish forge devlog (draft ready; founder-voice, never auto-published).
6. Forge Window naming propagation
7. Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…
8. Publish forge devlog. Founder-voice; never auto-published.
9. #7
10. Web-push feature
11. Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
12. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
