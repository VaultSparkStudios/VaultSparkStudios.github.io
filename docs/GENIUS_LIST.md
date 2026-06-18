# Genius Hit List — Session 204

Generated: 2026-06-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **85/100**
- Health: **green**
- Current SIL: **981/500**
- CI health: **check gh run list**
- Current focus: Premium overhaul in progress: mission statement rewritten purpose-first + site-wide premium polish layer shipped; hero/portal/consolidation/freshness carried.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] §3 Homepage hero refinement. Hero is overloaded (3 glow circles + spa…
Final score: **96**
[S204][UX/P1·FOUNDER] §3 Homepage hero refinement. Hero is overloaded (3 glow circles + spark burst + chamber vignette + ~1.3s letter-forge). Simplify to one cohesive glow, faster wordmark reveal, modern weight; consolidate repeated CTAs. Flag-gate the swap (?hero= / localStorage) per the mature-surface rule and get founder real-device visual review before graduating. Plan: docs/AUDIT_2026-06-17.md §3 (H1–H6). ~4h.
Why it matters: §3 Homepage hero refinement. Hero is overloaded (3 glow circles + spar is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] §5 Conservative consolidation. Membership cluster (/membership/ + /va…
Final score: **93**
[S204][REDUNDANCY/P2] §5 Conservative consolidation. Membership cluster (/membership/ + /vaultsparked/ + /membership-value/ + /ranks/) → one tabbed hub (Overview · Tiers · Benefits · Ranks); /brand/ + /brand/system/ → one Brand & Design hub. Use Worker Layer 0c 301s (never meta-refresh). Keep member/members, vault-portal, feedback, and all legal pages as-is. Plan: docs/AUDIT_2026-06-17.md §5. ~5h.
Why it matters: §5 Conservative consolidation. Membership cluster (/membership/ + /vau is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] §6 Audience-correctness + freshness sweep. Walk the journey (home→pla…
Final score: **91**
[S204][FRESHNESS/P2] §6 Audience-correctness + freshness sweep. Walk the journey (home→play→join→portal, desktop+mobile); verify status labels match real build state; confirm visitor vs logged-in content is correctly gated; sync game/project counts across home/games/projects/nav. Plan: §6 (F1–F4). ~3h.
Why it matters: §6 Audience-correctness + freshness sweep. Walk the journey (home shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

### NEXT

#### 1. [PRODUCT] §4 Member portal premium + redundancy. Unify portal styling with the …
Final score: **90**
[S204][UX/P2] §4 Member portal premium + redundancy. Unify portal styling with the homepage polish layer; clarify tier-vs-rank; add "next achievable" + cross-game progress; surface referral; wire the dead notification bell; session-expiry feedback. Plan: §4 (M1–M7). ~6h.
Why it matters: §4 Member portal premium + redundancy. Unify portal styling with the h is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Prod-verify the S204 wave. On a real browser (datacenter curl 403 = b…
Final score: **88**
[S204][VERIFY/P0] Prod-verify the S204 wave. On a real browser (datacenter curl 403 = benign CF challenge): (a) /studio/, /, /press/ show the new purpose-first mission statement (no "moment before ignition" / "pressure system"); (b) focus-visible ring on tab-through; (c) buttons have a tactile press; (d) custom scrollbar + branded selection render. Never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
Why it matters: Prod-verify the S204 wave. On a real browser (datacenter curl 403 = be shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [PRODUCT] Add check-mission-statement-coherence.mjs gate. WARN when any mission…
Final score: **81**
[S204][SIL][STRUCT/P3] Add check-mission-statement-coherence.mjs gate. WARN when any mission surface reintroduces retired framing ("moment before ignition", "pressure system", "not a metaphor for storage") outside /universe/ lore. ~45m.
Why it matters: Add check-mission-statement-coherence.mjs gate. WARN when any mission  is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Prod-verify the manifesto wave on a real browser. After deploy: /stud…
Final score: **80**
[S203][VERIFY/P0] Prod-verify the manifesto wave on a real browser. After deploy: /studio/ reads the new 5-movement manifesto (no "cannot be un-sparked" / "We don't build products" anywhere); homepage hero "Vault-Forge" line + "Inside The Vault" panel read the broadened copy; /press/ short bio mentions AI-native intelligence; /universe/ mythology shows the re-seal/reignite beat; /join/ subtext no longer says "game studio". Apex already confirmed serving new /studio/ copy at closeout — re-check the other 4 surfaces. ~10m.
Why it matters: Prod-verify the manifesto wave on a real browser. After deploy: /studi shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

### LATER

#### 1. [PRODUCT] Add check-identity-coherence.mjs gate. WARN (not error) when public m…
Final score: **75**
[S203][SIL][STRUCT/P3] Add check-identity-coherence.mjs gate. WARN (not error) when public marketing prose narrows VaultSpark to "game studio" instead of the canonical "creative studio building games, cinematic worlds, creative tools, and AI-native intelligence." Mirrors how check-game-playability-coherence prevents status drift — this prevents identity drift. Allowlist legal/SEO contexts (privacy, investor, meta keywords). ~45m.
Why it matters: Add check-identity-coherence.mjs gate. WARN (not error) when public ma is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Document the manifesto/identity canon in one place. The studio narrat…
Final score: **72**
[S203][SIL][DOCS/P3] Document the manifesto/identity canon in one place. The studio narrative is now consistent across 7 surfaces but has no single source doc; a short docs/STUDIO_NARRATIVE.md (the manifesto + the FORGE→SPARK→VAULT cycle + the "different forms, one fire" portfolio framing) gives future sessions one place to copy voice from. ~30m.
Why it matters: Document the manifesto/identity canon in one place. The studio narrati affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] Add check-public-note-freshness.mjs gate. Fails build:check if PROJEC…
Final score: **69**
[S202][STRUCT/P3] Add check-public-note-freshness.mjs gate. Fails build:check if PROJECT_STATUS.publicNote is missing or contains session-code patterns (S\d{2,3}). Ensures Nervous System always shows visitor-friendly copy. ~30m.
Why it matters: Add check-public-note-freshness.mjs gate. Fails build:check if PROJECT is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. §3 Homepage hero refinement. Hero is overloaded (3 glow circles + spa…
2. Post-push CI confirmation
3. §5 Conservative consolidation. Membership cluster (/membership/ + /va…
4. §6 Audience-correctness + freshness sweep. Walk the journey (home→pla…
5. §4 Member portal premium + redundancy. Unify portal styling with the …
6. Prod-verify the S204 wave. On a real browser (datacenter curl 403 = b…
7. Forge Window naming propagation
8. Add check-mission-statement-coherence.mjs gate. WARN when any mission…
9. Prod-verify the manifesto wave on a real browser. After deploy: /stud…
10. Add check-identity-coherence.mjs gate. WARN (not error) when public m…
11. Document the manifesto/identity canon in one place. The studio narrat…
12. Add check-public-note-freshness.mjs gate. Fails build:check if PROJEC…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
