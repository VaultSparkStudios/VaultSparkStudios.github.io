# Genius Hit List — Session 209

Generated: 2026-06-19
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **green**
- Current SIL: **901/500**
- CI health: **check gh run list**
- Current focus: S209 (autonomous /goal arc) root-fixed a recurring false conversion signal: the play-next CTA has read 'dead' (18 shown / 0 clicks) every session since S207, but the detector (check-dead-ctas <- rollup-rum-ux families[]) summed impressions over the whole 30-day window with no floor at the CTA's last material change. The card was retimed S207 (2026-06-18) and the funnel data only reaches 2026-06-14, so all 18 impressions are the pre-retiming variant — the new copy has zero measured impressions yet was judged dead on the old one's data. Added a per-family recency 'epoch' to deriveSummary() (play-next=2026-06-18, surfaced as 'since'); deadCount -> 0 (honest 'insufficient post-retiming data'). Shipped with a control self-test proving the epoch flips the count (18 raw -> 6 windowed). Same class as the S208 perf-budget staleness phantom. Also synced api/citation.json (uptime 88->89) and resynced these SIL fields, which had drifted from the SIL.md ledger. build:check EXIT 0, doctor blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped…
Final score: **93**
[HONESTY/P3] Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped X sitewide" claims and assert each against a real gate before the commit lands — deepest root cause of the S207→S208 false-claim class. Complex (NL-claim → gate mapping); the footer-aware vocab gate already covers the SEALED instance.
Why it matters: Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] OG-not-generic guard. No non-home page references another page's besp…
Final score: **90**
[HONESTY/P3] OG-not-generic guard. No non-home page references another page's bespoke OG card. Low marginal value now (instance fixed; check-og-images already catches broken/missing OG). Fold into an existing wired check if revisited.
Why it matters: OG-not-generic guard. No non-home page references another page's bespo is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

### NEXT

#### 1. [BRAND] Derive the nav "Projects" + "Games" dropdowns from the catalog. The l…
Final score: **84**
[NO-REDUNDANCY/P1] Derive the nav "Projects" + "Games" dropdowns from the catalog. The last hardcoded project-list fragility. Needs a catalog∪extra-paged merge (the nav lists non-catalog paged projects: signal-log, vault-pipeline, ideaforge, statvault, canon, the-living-protocol) — defer rather than ship half-done (would drop those).
Why it matters: Derive the nav "Projects" + "Games" dropdowns from the catalog. The la affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] Fold the OG-not-generic guard into an existing wired check. A gate as…
Final score: **81**
[HONESTY/P1] Fold the OG-not-generic guard into an existing wired check. A gate asserting no non-home page references another page's bespoke og:image card. check-og-images.mjs already validates per-page OG presence; extend it (or check-proof-surface orchestrator) — do NOT add a new build:check && segment (chain is near the cmd.exe length limit, [[feedback_buildcheck_cmdexe_length_limit]]). Carried from S208.
Why it matters: Fold the OG-not-generic guard into an existing wired check. A gate ass is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Graduate the homepage hero glow to /games/, /membership/, /studio/ be…
Final score: **77**
[COHESION/P2·FOUNDER-REVIEW] Graduate the homepage hero glow to /games/, /membership/, /studio/ behind a flag, then founder real-device verify (mature-surface rule, [[feedback_flag_gated_ux_swap]]). Atlas-rows slice already done.
Why it matters: Graduate the homepage hero glow to /games/, /membership/, /studio/ beh is a 209-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 5. [PRODUCT] Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
Final score: **75**
[MEASURE/P3] Re-evaluate play-next rotation once post-2026-06-18 impressions accrue. The recency epoch (D-S209.1) gives the retimed copy a clean window; if it's STILL dead on post-epoch data, build-cta-state --advance rotates to variant 1. No code action until data accrues.
Why it matters: Re-evaluate play-next rotation once post-2026-06-18 impressions accrue is open, local, and unblocked — can ship this session.

### LATER

#### 1. [BRAND] Publish forge devlog
Final score: **72**
[S206][CONTENT/P1·FOUNDER] Publish forge devlog — DRAFT COMPLETE. journal/_drafts/forge-week-2026-06-18.md is publish-ready (factual paragraph filled in). Intentionally NOT auto-published: it's a founder-voice essay (the draft tool never auto-publishes by design). Founder: edit the lead paragraph into your own voice + publish to journal/ to clear the 66d changelog warn.
Why it matters: Publish forge devlog affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Obelisk Passport login (5d978cf9)
Final score: **69**
[S207][FOUNDER/PARALLEL] Obelisk Passport login (5d978cf9) — a parallel session's auth-wiring commit (login.html + auth/callback.html). Agent greened its build:check failure (nav-orphan exemptions) without touching the auth flow; auth-flow ownership stays with the founder's Obelisk session. GUARDRAIL (D-S207.8, postmortem): the auth gate must redirect with 302 + Cache-Control: no-store, NEVER 301, and must NEVER gate the public site / apex / (private paths only). A 301 blanket gate misfired this session and cached-301-locked the founder out ~1h.
Why it matters: Obelisk Passport login (5d978cf9) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [BRAND] Derive the nav Projects/Games dropdowns from the catalog. Blocked on …
Final score: **66**
[BRAND/P2] Derive the nav Projects/Games dropdowns from the catalog. Blocked on the catalog∪extra-paged merge design (the nav lists non-catalog paged projects) — premature derivation drifts ([[feedback_derive_dont_hardcode_public_surfaces]]). Design the merge first, then derive. Carried from S208.
Why it matters: Derive the nav Projects/Games dropdowns from the catalog. Blocked on t affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. Post-push CI confirmation
2. Closeout-claim verifier (stretch). Parse a closeout's "purged/shipped…
3. OG-not-generic guard. No non-home page references another page's besp…
4. Forge Window naming propagation
5. Derive the nav "Projects" + "Games" dropdowns from the catalog. The l…
6. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
7. Fold the OG-not-generic guard into an existing wired check. A gate as…
8. Graduate the homepage hero glow to /games/, /membership/, /studio/ be…
9. Re-evaluate play-next rotation once post-2026-06-18 impressions accru…
10. Publish forge devlog
11. Obelisk Passport login (5d978cf9)
12. Derive the nav Projects/Games dropdowns from the catalog. Blocked on …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
