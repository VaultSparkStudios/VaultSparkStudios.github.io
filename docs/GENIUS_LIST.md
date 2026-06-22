# Genius Hit List — Session 214

Generated: 2026-06-22
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **green**
- Current SIL: **929/500**
- CI health: **check gh run list**
- Current focus: S214 (autonomous arc · Lighthouse TBT fix + mobile audit) shipped 5 waves: W1 housekeeping (3 orphan shells −175KB; push:count=0 verified); W2 propagate-nav 99 pages + STARTUP_BRIEF refresh; W3 Lighthouse perf fix (supabase-public.js defer + 4 scripts idle-loaded via requestIdleCallback — targets CI 0.76→0.80+ regression); W4 oracle rater honest reject (already shipped S189+S206); W5 CANON-041 mobile tap-target audit (5 buttons →44px). Doctor blockingFailing 0. SIL 929.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] First real push notification
Final score: **96**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count → npm run push:notify -- --game cod (founder go-ahead required).
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

#### 4. [BRAND] Publish forge devlog (founder-voice, never auto-published).
Final score: **90**
[CONTENT/P1·FOUNDER] Publish forge devlog (founder-voice, never auto-published).
Why it matters: Publish forge devlog (founder-voice, never auto-published). affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [PRODUCT] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
Final score: **87**
[OPS/P2] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling compliance VOID/SHADOW/Hashmark).
Why it matters: studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling comp is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [BRAND] Publish forge devlog (draft ready; founder-voice, never auto-published).
Final score: **81**
[CONTENT/P1·FOUNDER] Publish forge devlog (draft ready; founder-voice, never auto-published).
Why it matters: Publish forge devlog (draft ready; founder-voice, never auto-published affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [PRODUCT] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
Final score: **78**
[OPS/P2] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling compliance gaps VOID/SHADOW/Hashmark).
Why it matters: studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling comp is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…
Final score: **75**
[MEASURE/P3] Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No action until post-epoch field data accrues.
Why it matters: Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No  is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] Confirm Lighthouse CI green on next push (CI will re-run with deferre…
Final score: **74**
[PERF/P2] Confirm Lighthouse CI green on next push (CI will re-run with deferred scripts in place).
Why it matters: Confirm Lighthouse CI green on next push (CI will re-run with deferred is a 214-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [BRAND] Publish forge devlog. Founder-voice; never auto-published.
Final score: **72**
[CONTENT/P1·FOUNDER] Publish forge devlog. Founder-voice; never auto-published.
Why it matters: Publish forge devlog. Founder-voice; never auto-published. affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] #7
Final score: **69**
[INFRA/P2] #7 — Web-push feature. VAPID keys are READY (cloudflare.vapid capability = READY, keys in gateway). Remaining: Worker /v/push-subscribe endpoint + assets/push-subscribe.js + push-dispatch.mjs --send live test. Estimated 4h. Deferred to a dedicated session — not trivial enough to close at end-of-session closeout.
Why it matters: #7 is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. First real push notification
2. Post-push CI confirmation
3. Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
4. Publish forge devlog (founder-voice, never auto-published).
5. studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
6. Forge Window naming propagation
7. Publish forge devlog (draft ready; founder-voice, never auto-published).
8. studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
9. Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…
10. Confirm Lighthouse CI green on next push (CI will re-run with deferre…
11. Publish forge devlog. Founder-voice; never auto-published.
12. #7

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
