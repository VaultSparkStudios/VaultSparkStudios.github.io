# Genius Hit List — Session 316

Generated: 2026-08-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **90/100**
- Health: **yellow**
- Current SIL: **972/1000**
- CI health: **check gh run list**
- Current focus: S316 root-caused a three-layer coupled defect on the public /status/ surface: a blind git-depth gate permitted a shallow CI checkout, the shallow checkout made the deploy-currency probe publish a false diverged state, and a producer/reader field mismatch hid that false alarm behind a permanent neutral Unverified tile. All three are fixed at the root and the gate is mutation-proven against the real tree; re-probed from a complete clone, production is content-current. A fourth defect made the E2E compliance gate fail only when production was healthy. Three local-ahead surfaces regressed by inbound propagation were restored and reported upstream via Ark.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] Reader-signal → Director's Report closure. After the held Worker rele…
Final score: **93**
[NEXT][SIL][NEWS/P1] Reader-signal → Director's Report closure. After the held Worker release is legitimately promotable, aggregate per-story/per-illustration signals with minimum samples and render “N reader signals / insufficient sample” plus a public “You asked → The Desk changed/filed” receipt. No ranking may use absent or tiny data.
Why it matters: Reader-signal is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **90**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Field-vitals freshness closure. Surface observed-through/stale-days, …
Final score: **87**
[NEXT][SIL][OBS/P1] Field-vitals freshness closure. Surface observed-through/stale-days, restore a fresh post-S262 RUM window, and bind cohort verdicts to a release SHA so fresh generatedAt can never imply fresh field evidence.
Why it matters: Field-vitals freshness closure. Surface observed-through/stale-days, r is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Confirm CI publishes the corrected deploy-currency state. S316 fixed …
Final score: **86**
[SIL][OBS/P1] Confirm CI publishes the corrected deploy-currency state. S316 fixed the shallow-clone false diverged and re-probed from a full local clone (content-current, 515 behind, shell matched), but the corrected feed has not yet been produced by CI. Verify the next scheduled uptime-probe run emits state: content-current with honesty.historyComplete: true — that is the first proof fetch-depth: 0 works in the environment that actually publishes.
Why it matters: Confirm CI publishes the corrected deploy-currency state. S316 fixed t is a 316-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`


### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **90**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [SECURITY] TT-ENFORCE-REPROBE
Final score: **90**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **87**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [PRODUCT] Merge render-startup-brief.mjs two-way, driven from studio-ops. This …
Final score: **84**
[SIL][OPS/P1] Merge render-startup-brief.mjs two-way, driven from studio-ops. This repo's renderer carries lib/startup-evidence.mjs + the shared revenue-freshness resolver; upstream's carries brief-preflight + semantic-fingerprint. Neither is a superset, so every propagation clobbers one side (S316 restored the local one and removed five now-orphaned upstream libs). Ship the merge upstream so the cycle ends rather than replaying.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [VERIFY] Main-domain Cloudflare Web Analytics activation receipt. Obtain the n…
Final score: **83**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Obtain the narrow Account Settings permission required by the RUM Site Info API, enable/verify the vaultsparkstudios.com site tag, and publish only the public-safe tag/coverage state—not the credential. Until then, main-project Web Analytics remains unobserved, never inferred from ecosystem totals.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **66**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [VERIFY] NAV-SHEET DEVICE VERIFY. assets/vaultsparked-proof.js was already del…
Final score: **65**
[S180][FOUNDER/DEVICE] NAV-SHEET DEVICE VERIFY. assets/vaultsparked-proof.js was already deleted and verified in S186; the only remaining action is the real founder-device nav-sheet behavior check required by SOUL #3. No deletion work remains.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [VERIFY] nav-sheet device verify (mobile bottom-sheet default-swap
Final score: **63**
[S180][FOUNDER] nav-sheet device verify (mobile bottom-sheet default-swap — real-device confirmation).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Post-push CI confirmation
2. Reader-signal → Director's Report closure. After the held Worker rele…
3. Claim-evidence relationship map + agent critique packet. Add stable f…
4. Field-vitals freshness closure. Surface observed-through/stale-days, …
5. Confirm CI publishes the corrected deploy-currency state. S316 fixed …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
