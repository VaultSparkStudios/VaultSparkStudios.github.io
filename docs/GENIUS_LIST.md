# Genius Hit List — Session 215

Generated: 2026-06-22
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **935/500**
- CI health: **check gh run list**
- Current focus: S215 (attended) shipped 8 founder-directed items: footer Projects column propagated to 96 HTML pages (PromoGrind, Velaxis, Atlas, Forge Window, Studio Pulse, Oracle, Obelisk); journal post dates upgraded to day-level on all 10 posts; pathfinder rebuilt (builder pathway + intel signals + New badge + a11y live region); intent-graph gaps filled (projects/journal contexts); games + projects landing pages visual overhaul (ellipse hero gradients, gold-pulse stats, cross-ecosystem bridges); membership/vault-member pages Obelisk framing; schemaVersion fix in generate-push-config.mjs; hetzner.cloud-api phantom blocker resolved. SIL 935.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [BRAND] Draft one Signal Log post from the 10 brainstormed ideas. Agent can s…
Final score: **96**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the 10 brainstormed ideas. Agent can scaffold structure. Founder publishes in own voice.
Why it matters: Draft one Signal Log post from the 10 brainstormed ideas. Agent can sc affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Individual game/project page template improvements
Final score: **93**
[UX/P2·SIL] Individual game/project page template improvements — ~20 pages need immersive-template upgrade. Defer to dedicated arc.
Why it matters: Individual game/project page template improvements is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] First real push notification
Final score: **90**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
Final score: **87**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [BRAND] Publish forge devlog (founder-voice, never auto-published).
Final score: **84**
[CONTENT/P1·FOUNDER] Publish forge devlog (founder-voice, never auto-published).
Why it matters: Publish forge devlog (founder-voice, never auto-published). affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [PRODUCT] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
Final score: **81**
[OPS/P2] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling compliance VOID/SHADOW/Hashmark).
Why it matters: studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling comp is open, local, and unblocked — can ship this session.

#### 5. [BRAND] Publish forge devlog (draft ready; founder-voice, never auto-published).
Final score: **72**
[CONTENT/P1·FOUNDER] Publish forge devlog (draft ready; founder-voice, never auto-published).
Why it matters: Publish forge devlog (draft ready; founder-voice, never auto-published affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [PRODUCT] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
Final score: **69**
[OPS/P2] studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling compliance gaps VOID/SHADOW/Hashmark).
Why it matters: studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling comp is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Confirm Lighthouse CI green on S214 push (TBT fix should move score ≥…
Final score: **68**
[PERF/P2] Confirm Lighthouse CI green on S214 push (TBT fix should move score ≥0.80).
Why it matters: Confirm Lighthouse CI green on S214 push (TBT fix should move score ≥0 is a 215-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…
Final score: **66**
[MEASURE/P3] Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No action until post-epoch field data accrues.
Why it matters: Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No  is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Draft one Signal Log post from the 10 brainstormed ideas. Agent can s…
2. Post-push CI confirmation
3. Individual game/project page template improvements
4. First real push notification
5. Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
6. Forge Window naming propagation
7. Publish forge devlog (founder-voice, never auto-published).
8. studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
9. Publish forge devlog (draft ready; founder-voice, never auto-published).
10. studio-ops: process Ark cargo 01JRK6AH97E0F421A55C54236C (sibling com…
11. Confirm Lighthouse CI green on S214 push (TBT fix should move score ≥…
12. Re-evaluate play-next rotation. Epoch = 2026-06-18; deadCount = 0. No…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
