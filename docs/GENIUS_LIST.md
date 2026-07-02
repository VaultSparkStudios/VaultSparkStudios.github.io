# Genius Hit List — Session 248

Generated: 2026-07-02
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **all-green ✓**
- Current focus: S248 /arc: founder-directed hero recuration — the homepage now leads with the studio's true top projects (Call of Doodie · MindFrame · VEILOS · Vorn · VaultSpark Football GM), replacing the market/betting-adjacent utilities (Velaxis, PromoGrind) that a progress-tie surfaced. Shipped a data-driven editorial spotlight + end-to-end coherence gate, fixed the football-gm hero link (generic /games/ → real page), tightened 3 over-length meta descriptions, and corrected a stale Velaxis catalog note. build/build:check green with blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] play-next conversion autopsy
Final score: **93**
[SIL][ENGAGE/P2] play-next conversion autopsy — instrument the widget's viewport-impression vs click (per-variant play-next:impression RUM event + rollup) before any redesign; 0/37 clicks may be a placement/scroll-depth problem, not copy.
Why it matters: play-next conversion autopsy is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] INP root-fix when CLEAN field data lands
Final score: **84**
[SIL:1][PERF/P1] INP root-fix when CLEAN field data lands — S247 interactionId filter deployed 2026-07-02; re-attempt ~2026-07-09 with data/inp-breakdown.json routeVitals + phase data to fix the dominant route/handler/phase. (externally time-blocked — exempt from skip-count until 2026-07-09)
Why it matters: INP root-fix when CLEAN field data lands is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Content-drift P1 cleanup
Final score: **84**
[CONTENT/P1] Content-drift P1 cleanup — improve Call of Doodie, Gridiron GM, and Velaxis page bodies against check-project-info-drift evidence.
Why it matters: Content-drift P1 cleanup is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Atlas registry freshness reconciliation
Final score: **81**
[OPS/P2] Atlas registry freshness reconciliation — advisory: public canonical atlas is not on the local registry/site mapping; resolve via the owning source or Ark.
Why it matters: Atlas registry freshness reconciliation is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] VEILOS + Vorn hero cover art
Final score: **78**
[SIL][POLISH/P2] VEILOS + Vorn hero cover art — 2 of 5 spotlit tiles fall back to accent gradients; author 2 bespoke SVGs and raster to AVIF/WebP/PNG (sharp, no new deps) for featured-set craft parity with the games.
Why it matters: VEILOS + Vorn hero cover art is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] TASK_BOARD size strategy
Final score: **78**
[HYGIENE/P2] TASK_BOARD size strategy — rotate-taskboard --check-size warns at 297KB with no rotatable blocks; design a safe archival split before it becomes blocking.
Why it matters: TASK_BOARD size strategy is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Post-push CI/deploy confirmation for S246
Final score: **77**
[VERIFY/P1] Post-push CI/deploy confirmation for S246 — verify GitHub Pages, CI beacon, status-proof/build-sha refresh, and live homepage after the pushed commit.
Why it matters: Post-push CI/deploy confirmation for S246 is a 248-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [PRODUCT] Arc profile slug mapping fix verification
Final score: **72**
[SIL][OPS/P1] Arc profile slug mapping fix verification — when Studio Ops processes cargo 01JSF8P1L4A5007257B4E63601, confirm VaultSparkStudios.github.io profiles as website/public-live/SPARKED.
Why it matters: Arc profile slug mapping fix verification is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Status-proof proof text extension
Final score: **66**
[TRUST/P1] Status-proof proof text extension — consider surfacing the exact oldest feed/recovery hint in an agent-readable detail view without crowding homepage copy.
Why it matters: Status-proof proof text extension is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI/deploy confirmation for S245
Final score: **65**
[VERIFY/P1] Post-push CI/deploy confirmation for S245 — after push, verify GitHub Pages deployment, CI beacon, and public status-proof refresh on the pushed commit.
Why it matters: Post-push CI/deploy confirmation for S245 is a 248-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] Closeout brief renderer restore
Final score: **63**
[SIL][OPS/P1] Closeout brief renderer restore — restore or delegate scripts/render-closeout-brief.mjs so future closeouts can render the mandatory impact brief locally.
Why it matters: Closeout brief renderer restore is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. play-next conversion autopsy
2. Forge Window naming propagation
3. INP root-fix when CLEAN field data lands
4. Content-drift P1 cleanup
5. Atlas registry freshness reconciliation
6. VEILOS + Vorn hero cover art
7. TASK_BOARD size strategy
8. Post-push CI/deploy confirmation for S246
9. Arc profile slug mapping fix verification
10. Status-proof proof text extension
11. Post-push CI/deploy confirmation for S245
12. Closeout brief renderer restore

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
