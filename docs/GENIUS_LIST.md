# Genius Hit List — Session 282

Generated: 2026-07-15
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **93/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S282 recovered S281's cut-off closeout (write-back was complete but never pushed; claims verified REAL — build:check 207/207, doctor blockingFailing 0 — not phantom-green), then root-fixed four gates that lied, all one defect class: a check whose verdict depends on an input that is not reproducible where the check runs. (1) The lab-volatile tolerance gap on the trend-latest path — S281's deferred fix, shipped: corroborate the latest entry against the PRECEDING runs, with callers required to PROVE the corroborator excludes the run under test or the gate fails closed; floor NOT lowered; self-test 9 to 16; proved against the pre-fix script as control on a CI-faithful harness 4/4, and shipped while e2e was GREEN so it is provably not a gate hacked green (D-S282.1). (2) The events ledger had been silently reading ZERO for 13 days: one glued line made a whole-file try/catch reader return [] for all 892 records, hidden because the heartbeat generator prefers the sibling ledger and quietly fell back — the public homepage was under-reporting our own shipping activity (pulses30d 5 to 6). Root-fixed at four layers plus a new check-ndjson-integrity gate (15/15) (D-S282.2). (3) check-startup-meter-freshness: the inherited carry's premise was BACKWARDS — it is a local-red, not a CI trap, because CI has no session lock and so reports the default limit that matches the brief; fixed to compare like-for-like only, 7 to 13 (D-S282.3). (4) The tests signal had no producer and said passing anyway: 186/186 was hand-typed and frozen since 2026-07-08 while build:check grew to 209, with the staleness guard sitting inside the dead branch that could never run; now derived from api/build-check-diagnostics.json, absent producer degrades to UNVERIFIED (D-S282.4). ORIGINAL S281 FOCUS: root-fixed why the project board itself was reporting already-shipped work as top priority, and defused a CI failure the hourly cron had silently armed. The stale-open-task gate now verifies ARTIFACT EVIDENCE (does the named deliverable exist now?) instead of guessing from prose similarity — prose scoring was measured on the live corpus and rejected at a 50% false-positive rate; the evidence detector scores 2/2 true positives, 0/49 false positives (D-S281.1). It also now distinguishes a work-done [x] from a record-consolidation [x], after consolidating duplicates instantly produced a 100% false positive against a genuinely-open founder-gated carry (D-S281.2). build-geo-vitals --check was byte-comparing against an Actions-cache-only input, guaranteeing an e2e failure on the next ordinary push (proved on a pristine origin/main worktree); it now enforces structure + the feed's privacy contract always and byte-compares only when the input is reproducible (D-S281.5). check-orphan-scripts now enumerates git-tracked files instead of walking the filesystem, ending local-red/CI-green divergence (D-S281.6). Board rot cleared: a CANON-019 phantom-blocker (supabase.admin re-verified READY 2/2) plus 16 duplicate records consolidated with zero information lost — open tasks 49 to 33, NOW from 4 items (2 phantom) to 1.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm the S282 push went green. gh run list --commit <tip>
Final score: **100**
[S282][VERIFY/P1] Confirm the S282 push went green. gh run list --commit <tip> — 11 workflows triggered on 06a360d34 (verified triggered, not merely landed). The e2e compliance job is the one that matters: it exercises the trend-latest path this session changed.
Why it matters: Confirm the S282 push went green. gh run list --commit <tip> shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] A [skip ci] cron can arm an invisible CI failure. c7db58811 committed…
Final score: **95**
[S281][CI/P3] A [skip ci] cron can arm an invisible CI failure. c7db58811 committed rows no CI run ever validated, loading a guaranteed e2e failure onto the next innocent push. The S219 6-hourly pages-deploy cron solves the *deploy* strand, not the *validation* strand. Candidate: run the affected --check gates inside the uptime cron before it commits.
Why it matters: A [skip ci] cron can arm an invisible CI failure. c7db58811 committed  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] Date-embedding generators drift across UTC midnight. build-agents-jso…
Final score: **80**
[S281][DX/P4] Date-embedding generators drift across UTC midnight. build-agents-json --check went red purely because this session crossed 00:00Z (built 07-14, checked 07-15). Harmless now; a long CI job spanning midnight would flake. Candidate: date-normalise in --check the way generatedAt already is.
Why it matters: Date-embedding generators drift across UTC midnight. build-agents-json shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`



### DEFERRED / GATED

#### 1. [PRODUCT] The local events ledger has diverged from the sibling it mirrors
Final score: **96**
[S282][DATA/P3] The local events ledger has diverged from the sibling it mirrors — 893 vs 1278 records. closeout-autopilot Step 3c-events mirrors studio-ops portfolio/events.ndjson → local via copyFileSync on every closeout, so the two should be byte-identical; they are not. Either the mirror is not running on the runs that matter (STUDIO_ROOT unset / sibling absent) or something writes local out-of-band — the S216-era hand-append (TASK_BOARD_ARCHIVE:674) is a known instance and is what left the un-terminated line that later glued (D-S282.2). The sibling is currently clean (1278 records, 0 corrupt), so no data is at risk; the question is which file is authoritative and why the mirror isn't converging them. Not chased to the bottom in S282 — recorded with evidence rather than guessed at.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE
Final score: **84**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 4. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **81**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [PRODUCT] Wishlist "N waiting" momentum
Final score: **78**
[S280→][PRODUCT/P2·FOUNDER] Wishlist "N waiting" momentum — CANON-019 phantom cleared (D-S280.3). supabase.admin is READY (2/2) — NOT credential-blocked. Real gate: founder public-optics call (low counts backfire on unreleased-game surfaces). De-gating design: floor-thresholded display (only surface counts ≥ a momentum-positive minimum). Next session can ship the pipeline once the founder sets the optics policy.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [VERIFY] scripts/fetch-studio-feed.mjs zombie
Final score: **75**
[S281→S282][FOUNDER] scripts/fetch-studio-feed.mjs zombie — still a founder call; S282 inherited the judgement rather than re-litigating it. S281's addendum already identified the producer (studio-ops verify-consumer-adoption --apply-snippets, whose missing-target branch unconditionally rewrites it, so a deliberate un-adoption is indistinguishable from never-adopted) and shipped the opt-out proposal as Ark cargo 01JTI98UHNA4C3E97AD02DB94B per CANON-018. Nothing to do here until that cargo is answered; deleting it a third time would again destroy unrecoverable work. Left untracked on disk, deliberately excluded from every S282 commit. — *original entry:* Untracked; deleted from git in S275 as dead (zero consumers, output removed, header claims a nonexistent issue #109), re-killed as an untracked copy in S279 (no git trace — git log --diff-filter=D shows only one deletion), and back again. It differs from every committed version by one line (AbortSignal.timeout(10_000)), so deleting an untracked file would destroy unrecoverable work. It no longer blocks build:check (D-S281.6). Question worth answering: what keeps recreating it?
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [VERIFY] Homepage LCP measured pass
Final score: **72**
[S279][PERF/P2] Homepage LCP measured pass — sharpened honest-deferral. The throttled harness proved the homepage's APPLIED LCP is fine (~1.7s); the CI 5.8s is Lantern's *simulated* render-blocking penalty. The 47KB inline-CSS split is the confirmed lever but stays FOUC-risky on the brand anchor — needs real headless Lighthouse before/after + multi-viewport FOUC on a preview deploy. Floor NOT lowered (CANON-031). Founder-device gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [COHESION] Social Dashboard bidirectional mirror
Final score: **62**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

## Recommended Build Order

1. Confirm the S282 push went green. gh run list --commit <tip>
2. Post-push CI confirmation
3. A [skip ci] cron can arm an invisible CI failure. c7db58811 committed…
4. Date-embedding generators drift across UTC midnight. build-agents-jso…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
