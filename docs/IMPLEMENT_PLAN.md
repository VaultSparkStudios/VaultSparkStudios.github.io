<!-- generated-by: /implement skill v1.0 (S197) -->
<!-- generated-at: 2026-06-14 · session 197 · source: docs/AUDIT_2026-06-14-S197.json -->

# Implement Plan — S197

Sequenced for optimal efficiency (same code surface grouped; foundation before façade).
All three items touch the SPARKED game pages — grouped into one editing pass per file.

## Ground-truth correction (logged before execution)

The audit's headline framing ("the #1 CTA dead-ends on a placeholder") was **too strong** — verification during implement found the SPARKED game pages' heroes ALREADY link to their live builds (call-of-doodie → callofdoodie.wtf; vaultspark-football-gm → /vaultspark-football-gm/, a real League Hub app). The real bug is narrower but still a CANON-031 lying surface: a **stale, redundant "Demo Coming Soon — playable build in active development" section lower on each SPARKED page that directly contradicts the page's own working play links.** gridiron-gm is correctly VAULTED ("Currently Vaulted"), not a bug. Item 1's scope adjusts accordingly; items 1+2 merge into one cohesive per-page section rewrite.

## Wave order

| Seq | # | Slug | Rung | Effort | Why this order |
|----|---|------|------|--------|----------------|
| 1 | 1 | game-play-dead-end-fix | L2 | ~2h | Foundation: kill the self-contradicting "Demo Coming Soon" section on both SPARKED pages; replace with a real Play launch panel; add a coherence gate so a SPARKED page can never show "coming soon" again. |
| 2 | 2 | post-play-membership-bridge | L2 | merged | The replacement Play panel pairs the play CTA with the "save your progress / track your franchise — join free" membership capture in the same edit. |
| 3 | 3 | game-snippet-truncation-fix | L2→L3 | ~1h | Independent metadata pass: tighten 9 over-long meta descriptions to SERP-safe + extend data-deletion; optional per-type gate ceiling. |

## Verify surface

- Per item: `node scripts/check-meta-descriptions.mjs`, the new `check-game-playability-coherence.mjs --self-test`, grep-confirm no "Demo Coming Soon" on SPARKED pages.
- End: `npm run build` (generator cascade) then `npm run build:check` EXIT 0.
- Lighthouse mobile ≥90 is CI-owned (no repo-local runner; edits are link/content/meta only → perf-neutral). Exception noted per profile success bar.
