# Genius Hit List — Session 260

Generated: 2026-07-06
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **check gh run list**
- Current focus: S260 /arc shipped active Trusted Types sink burn-down for hero ticker, Gridiron GM, and leaderboards, added an active-sink regression gate, cleared task-board rotation warning, and passed build-check 171/171.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm remote CI/deploy green for S260 tip. Read the actual GitHub r…
Final score: **100**
[S260][VERIFY/P1] Confirm remote CI/deploy green for S260 tip. Read the actual GitHub run/deploy beacon after push; do not equate local build:check with remote green.
Why it matters: Confirm remote CI/deploy green for S260 tip. Read the actual GitHub ru shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [SECURITY] TT post-deploy soak reprobe. After this push deploys, run the TT prob…
Final score: **99**
[S260][SECURITY/P1] TT post-deploy soak reprobe. After this push deploys, run the TT probe/analyzer again and compare fresh active buckets; only consider enforcement when fresh soak evidence is near-zero plus founder device verification is complete.
Why it matters: TT post-deploy soak reprobe. After this push deploys, run the TT probe lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [VERIFY] Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.v…
Final score: **89**
[S259][IDENTITY/P1] Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.verify has RP keys/endpoints, wire the server-side bridge through the secrets gateway, add provider-session soak proof, and only then consider flipping default provider truth.
Why it matters: Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.ve shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

### NEXT

#### 1. [PRODUCT] play-next conversion redesign
Final score: **81**
[ENGAGE/P1] play-next conversion redesign — once the honest window has data — S249 fixed the impression metric (IntersectionObserver true-viewport play-next:shown; epoch bumped 2026-07-02). Let ~1 week of honest viewport-view vs click data accrue, THEN decide placement vs copy vs retire from a trustworthy denominator (the 37/0 was a dishonest trigger-fire count).
Why it matters: play-next conversion redesign is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Generalize active-sink guards from specific TT rows to freshness-rank…
Final score: **78**
[S260][SIL][PROCESS/P2] Generalize active-sink guards from specific TT rows to freshness-ranked input. First step: teach the analyzer to emit a machine-readable active-local row list that a guard can consume without hardcoded file/line memories.
Why it matters: Generalize active-sink guards from specific TT rows to freshness-ranke is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Atlas registry freshness reconciliation
Final score: **78**
[OPS/P2] Atlas registry freshness reconciliation — advisory: public canonical atlas is not on the local registry/site mapping; resolve via the owning source or Ark (studio-ops-owned canonical description still empty).
Why it matters: Atlas registry freshness reconciliation is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **75**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [PRODUCT] INP root-fix when CLEAN field data lands
Final score: **72**
[SIL:2⛔][PERF/P1] INP root-fix when CLEAN field data lands — S247 interactionId filter deployed 2026-07-02; re-attempt ~2026-07-09 with data/inp-breakdown.json routeVitals + phase data to fix the dominant route/handler/phase. (externally time-blocked — exempt from skip-count until 2026-07-09)
Why it matters: INP root-fix when CLEAN field data lands is open, local, and unblocked — can ship this session.

### LATER

#### 1. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **72**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **72**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys acr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **67**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure  must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

## Recommended Build Order

1. Confirm remote CI/deploy green for S260 tip. Read the actual GitHub r…
2. TT post-deploy soak reprobe. After this push deploys, run the TT prob…
3. Post-push CI confirmation
4. Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.v…
5. play-next conversion redesign
6. Generalize active-sink guards from specific TT rows to freshness-rank…
7. Atlas registry freshness reconciliation
8. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
9. INP root-fix when CLEAN field data lands
10. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
11. TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
12. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
