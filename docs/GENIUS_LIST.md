# Genius Hit List — Session 217

Generated: 2026-06-23
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **green**
- Current SIL: **947/500**
- CI health: **check gh run list**
- Current focus: S217 (founder-directed) shipped 5 items: homepage Studio Now data fix (ship-receipts + heartbeat + founder-presence regenerated; S215/S216 events added to events.ndjson); games/index.html visual card overhaul (per-game --card-accent CSS vars, sheen animation, spring lift, cinematic vignette, accent glow, status badge colors); projects/index.html same overhaul via :has() selectors for 13 projects; index.html homepage hero tile sheen + color-mix glow; build:check fix (ANTHROPIC_API export + orphan shell). SIL 947.

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

#### 3. [BRAND] Draft one Signal Log post from the 10 brainstormed ideas. Founder pub…
Final score: **93**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the 10 brainstormed ideas. Founder publishes in own voice.
Why it matters: Draft one Signal Log post from the 10 brainstormed ideas. Founder publ affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [BRAND] Publish forge devlog (founder-voice, never auto-published).
Final score: **90**
[CONTENT/P1·FOUNDER] Publish forge devlog (founder-voice, never auto-published).
Why it matters: Publish forge devlog (founder-voice, never auto-published). affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

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

#### 3. [PRODUCT] studio-ops: process Ark cargos 01JRK6AH97E0F421A55C54236C (S213) + 01…
Final score: **84**
[OPS/P2] studio-ops: process Ark cargos 01JRK6AH97E0F421A55C54236C (S213) + 01JRONES0VE96C6C4554516536 + 01JRONIRFF246105D9994172D4 (S216 sibling compliance).
Why it matters: studio-ops: process Ark cargos 01JRK6AH97E0F421A55C54236C (S213) + 01J is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] welcome-back-telemetry
Final score: **78**
[UX/P2·SIL] welcome-back-telemetry — add vs_welcome_back_shown RUM event in game-welcome-back.js; wire to Worker prefixAllowlist.
Why it matters: welcome-back-telemetry is open, local, and unblocked — can ship this session.

#### 5. [BRAND] Draft one Signal Log post from the 10 brainstormed ideas. Agent can s…
Final score: **72**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the 10 brainstormed ideas. Agent can scaffold structure. Founder publishes in own voice.
Why it matters: Draft one Signal Log post from the 10 brainstormed ideas. Agent can sc affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [VERIFY] Confirm Lighthouse CI green on cumulative S214–S216 pushes (TBT fix t…
Final score: **71**
[PERF/P2] Confirm Lighthouse CI green on cumulative S214–S216 pushes (TBT fix target ≥0.80).
Why it matters: Confirm Lighthouse CI green on cumulative S214–S216 pushes (TBT fix ta is a 217-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] Individual game/project page template improvements
Final score: **69**
[UX/P2·SIL] Individual game/project page template improvements — ~20 pages need immersive-template upgrade. Defer to dedicated arc.
Why it matters: Individual game/project page template improvements is open, local, and unblocked — can ship this session.

#### 3. [COHESION] individual-page ecosystem-bridge links
Final score: **68**
[UX/P3·SIL] individual-page ecosystem-bridge links — make bridge links page-specific (related game/project) using public-intelligence.json instead of 4 hardcoded links.
Why it matters: individual-page ecosystem-bridge links is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

## Recommended Build Order

1. First real push notification
2. Post-push CI confirmation
3. Draft one Signal Log post from the 10 brainstormed ideas. Founder pub…
4. Publish forge devlog (founder-voice, never auto-published).
5. Re-evaluate play-next rotation once post-2026-06-18 impressions accrue.
6. Forge Window naming propagation
7. studio-ops: process Ark cargos 01JRK6AH97E0F421A55C54236C (S213) + 01…
8. welcome-back-telemetry
9. Draft one Signal Log post from the 10 brainstormed ideas. Agent can s…
10. Confirm Lighthouse CI green on cumulative S214–S216 pushes (TBT fix t…
11. Individual game/project page template improvements
12. individual-page ecosystem-bridge links

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
