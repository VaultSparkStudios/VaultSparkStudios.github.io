# Genius Hit List — Session 328

Generated: 2026-08-24
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **yellow**
- Current SIL: **994/1000**
- CI health: **check gh run list**
- Current focus: Session 328 root-fixed a build:check failure that appeared on an untouched tree: the 4-hourly refresh-live-data cron staged api/funnel-summary.json and stranded the byte-checked .cache/cta-readiness.json derived from it, invisibly, because the commit carries [skip ci]. The deeper finding is that check-publish-cascade-coverage — the gate written to prevent that exact class — passed on the run that shipped it and could never have failed, because it builds its universe from an evidence graph holding 33 nodes and zero under .cache/. That directory is now represented, and removing the staging line makes the gate fail by name. The CTA readiness surface additionally stopped promising a cumulative post-epoch total it never measured; it now reports its rolling-30-day basis, observedThrough, and a distinct no-span verdict, with no floor lowered.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [COHESION] Bind a deterministic visual receipt to every newly published story. R…
Final score: **98**
[S327][SIL][NEWS/P1] Bind a deterministic visual receipt to every newly published story. Record source-master and derivative hashes, compositor safe-zone geometry, and desktop/mobile render evidence in the edition contract so unattended publication proves visual integrity without a paid runtime judge.
Why it matters: Bind a deterministic visual receipt to every newly published story. Re is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [VERIFY] Prove the first privacy-thresholded article measurements from the rep…
Final score: **93**
[S325][SIL:1][NEWS/P1] Prove the first privacy-thresholded article measurements from the repaired publisher. Wait for at least five real browser pageloads on a Desk article, then verify Reader views and measured engaged time replace the honest “Collecting” state without changing the privacy floor or counting UX events as views. The new qualification summary must identify the first qualifying receipt; it currently abstains honestly at zero qualified stories.
Why it matters: Prove the first privacy-thresholded article measurements from the repa was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] Add a Desk visual-diversity memory. Track scene archetype, palette, f…
Final score: **90**
[S327][SIL][NEWS/P2] Add a Desk visual-diversity memory. Track scene archetype, palette, focal arrangement, and satire target across recent editions, then reject repeated visual shorthand even when file hashes differ.
Why it matters: Add a Desk visual-diversity memory. Track scene archetype, palette, fo is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Declare the remaining 17 byte-checked .cache/ artifacts in the eviden…
Final score: **87**
[S328][SIL][INFRA/P1] Declare the remaining 17 byte-checked .cache/ artifacts in the evidence graph. cta-readiness is the precedent, not the cure. Enumerating build:check:steps for --check gates whose source touches .cache/ returns 18; one is now modeled. Either declare each remaining artifact or mark it explicitly exempt in its own source so the exemption travels with the script rather than rotting in a list. Until then the cascade gate remains blind to that directory for 17 artifacts.
Why it matters: Declare the remaining 17 byte-checked .cache/ artifacts in the evidenc is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Surface evidence age on the CTA readiness row. observedThrough is cur…
Final score: **84**
[S328][SIL][OBS/P2] Surface evidence age on the CTA readiness row. observedThrough is currently reported without an age, so a frozen asOf reads as "no post-epoch span yet" rather than "the evidence behind this has not moved". Any age field must stay out of the --check comparison set (wall-clock breaks byte-reproducibility) or be derived from a committed source.
Why it matters: Surface evidence age on the CTA readiness row. observedThrough is curr is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Authorize or decline immutable warm-origin migration. D-S303 reserves…
Final score: **81**
Authorize or decline immutable warm-origin migration. D-S303 reserves the GitHub Pages rollback-origin architecture decision for the founder; the current warm origin still follows mutable main.
Why it matters: Authorize or decline immutable warm-origin migration. D-S303 reserves  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **72**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **66**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **65**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 328-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### LATER

#### 1. [REVENUE] Annual Stripe activation once keys exist
Final score: **65**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 2. [PRODUCT] Field-vitals freshness closure. Surface observed-through/stale-days, …
Final score: **63**
[NEXT][SIL][OBS/P1] Field-vitals freshness closure. Surface observed-through/stale-days, restore a fresh post-S262 RUM window, and bind cohort verdicts to a release SHA so fresh generatedAt can never imply fresh field evidence.
Why it matters: Field-vitals freshness closure. Surface observed-through/stale-days, r is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **63**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### DEFERRED / GATED

#### 1. [PRODUCT] Confirm The Dispatch double opt-in. Click the confirmation message se…
Final score: **93**
Confirm The Dispatch double opt-in. Click the confirmation message sent to the founder mailbox so the first newsletter subscriber becomes confirmed; the agent cannot truthfully count the address before that inbox action.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 2. [PRODUCT] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUr…
Final score: **84**
[S323][ADVISORY] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUrl drift (local steadfast-determination-production.up.railway.app ≠ canonical usemindframe.com) and franchise-architect portfolio-coherence drift. Resolve upstream, not from here.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 3. [AI] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs…
Final score: **82**
[S319][ECOSYSTEM/P2] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs rescore reports every project fresh, so the stale artifact lives in studio-ops and cannot be written from here (CANON-018). Resolve upstream rather than backdating a timestamp.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 4. [PRODUCT] Founder decision: authorize or decline migration of the GitHub Pages …
Final score: **81**
[S318][ROLLBACK/P0] Founder decision: authorize or decline migration of the GitHub Pages warm rollback origin away from mutable main. D-S303 makes this provider architecture founder-scoped. Unchanged from S318.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Ship a pattern-share to studio-ops on two launch-ready latent bugs. T…
Final score: **75**
[S323][ARK] Ship a pattern-share to studio-ops on two launch-ready latent bugs. The registry's canonical live-URL field is runtimeUrl, not liveUrl; and case-sensitive vaultStatus === 'SPARKED' comparisons silently disable SPARKED enforcement portfolio-wide. Both are latent in any sibling that copied the launch-ready / compliance pattern.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **75**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [SECURITY] TT-ENFORCE-REPROBE
Final score: **75**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 8. [VERIFY] Complete the real-provider passkey ceremony. Run node scripts/verify-…
Final score: **74**
Complete the real-provider passkey ceremony. Run node scripts/verify-provider-journey.mjs --live and complete the hardware-key step in the opened browser; CANON-019 reserves passkey enrollment for the founder. This is the only remaining identity leg holding full-site production promotion and is unrelated to the now-live Desk content lane.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Bind a deterministic visual receipt to every newly published story. R…
2. Prove the first privacy-thresholded article measurements from the rep…
3. Add a Desk visual-diversity memory. Track scene archetype, palette, f…
4. Declare the remaining 17 byte-checked .cache/ artifacts in the eviden…
5. Surface evidence age on the CTA readiness row. observedThrough is cur…
6. Authorize or decline immutable warm-origin migration. D-S303 reserves…
7. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
8. Claim-evidence relationship map + agent critique packet. Add stable f…
9. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
10. Annual Stripe activation once keys exist
11. Field-vitals freshness closure. Surface observed-through/stale-days, …
12. Extend proof/depth beyond the three core pages

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
