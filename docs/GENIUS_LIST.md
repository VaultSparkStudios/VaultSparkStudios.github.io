# Genius Hit List — Session 283

Generated: 2026-07-16
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **all-green ✓**
- Current focus: S283 was a codex arc that ran /start → /audit → /implement in full — six verified root fixes shipped to the working tree plus a second-order innovation pack started — then died during /closeout before a single commit (0 ahead of origin, .session-lock still held). Recovery did NOT trust the audit's shipped-log: integrity sweep (all changed JSON/ndjson/jsonl parse, 0 bad; ~/.claude.json valid), then verification caught a real regression S283's own gate would have blocked — tests/oracle-extra.spec.js used waitUntil:'networkidle' on the beacon-heavy /oracle/ (the S223 30s-timeout trap that check-e2e-networkidle exists to catch), fixed to waitUntil:'load' + explicit waitForResponse on the two asserted feeds. After a full npm run build to regenerate stale artifacts: build:check 213/213 EXIT 0, unit 31/31, doctor blockingFailing 0 — the six fixes are verified REAL, not phantom. The six (D-S283.1–.6): (1) public AI-discovery manifests now derive from committed api/ecosystem-state.json and fail closed, so gitignored IGNIS state can no longer make local disagree with the committed site while CI skips generation; (2) a precise metadata-only carry classifier so the Genius List stops deleting its highest-value task because a sentence contains the word 'carry'; (3) Oracle reads /api/* public feeds once behind a shared promise cache with production /ignis/output/* probes structurally forbidden, ending the ~57-request 404 stampede WITHOUT expanding public exposure; (4) the half-hour skip-CI uptime publisher now validates its staged artifacts before committing; (5) both Lighthouse gates share ONE fail-closed volatility policy (floor 0.76 + ≥2-of-5 tripwire preserved, nothing lowered), resolving the standing S282 #1 carry with the re-run proof S282 already gathered; (6) closeout no longer claims a sibling mirror it never performs — the false self-copy that manufactured a bogus 893-vs-1278 blocker (and invited a CANON-018-violating cross-repo write) is gone, and the 893-record local ledger is the project's own CI-readable truth. Landed all recovered work + the one fix as a single commit labelled 'recover S283 closeout'; no reset-hard, no force-push. PREVIOUS (S282): recovered S281's cut-off closeout (write-back was complete but never pushed; claims verified REAL — build:check 207/207, doctor blockingFailing 0 — not phantom-green), then root-fixed four gates that lied, all one defect class: a check whose verdict depends on an input that is not reproducible where the check runs. (1) The lab-volatile tolerance gap on the trend-latest path — S281's deferred fix, shipped: corroborate the latest entry against the PRECEDING runs, with callers required to PROVE the corroborator excludes the run under test or the gate fails closed; floor NOT lowered; self-test 9 to 16; proved against the pre-fix script as control on a CI-faithful harness 4/4, and shipped while e2e was GREEN so it is provably not a gate hacked green (D-S282.1). (2) The events ledger had been silently reading ZERO for 13 days: one glued line made a whole-file try/catch reader return [] for all 892 records, hidden because the heartbeat generator prefers the sibling ledger and quietly fell back — the public homepage was under-reporting our own shipping activity (pulses30d 5 to 6). Root-fixed at four layers plus a new check-ndjson-integrity gate (15/15) (D-S282.2). (3) check-startup-meter-freshness: the inherited carry's premise was BACKWARDS — it is a local-red, not a CI trap, because CI has no session lock and so reports the default limit that matches the brief; fixed to compare like-for-like only, 7 to 13 (D-S282.3). (4) The tests signal had no producer and said passing anyway: 186/186 was hand-typed and frozen since 2026-07-08 while build:check grew to 209, with the staleness guard sitting inside the dead branch that could never run; now derived from api/build-check-diagnostics.json, absent producer degrades to UNVERIFIED (D-S282.4). ORIGINAL S281 FOCUS: root-fixed why the project board itself was reporting already-shipped work as top priority, and defused a CI failure the hourly cron had silently armed. The stale-open-task gate now verifies ARTIFACT EVIDENCE (does the named deliverable exist now?) instead of guessing from prose similarity — prose scoring was measured on the live corpus and rejected at a 50% false-positive rate; the evidence detector scores 2/2 true positives, 0/49 false positives (D-S281.1). It also now distinguishes a work-done [x] from a record-consolidation [x], after consolidating duplicates instantly produced a 100% false positive against a genuinely-open founder-gated carry (D-S281.2). build-geo-vitals --check was byte-comparing against an Actions-cache-only input, guaranteeing an e2e failure on the next ordinary push (proved on a pristine origin/main worktree); it now enforces structure + the feed's privacy contract always and byte-compares only when the input is reproducible (D-S281.5). check-orphan-scripts now enumerates git-tracked files instead of walking the filesystem, ending local-red/CI-green divergence (D-S281.6). Board rot cleared: a CANON-019 phantom-blocker (supabase.admin re-verified READY 2/2) plus 16 duplicate records consolidated with zero information lost — open tasks 49 to 33, NOW from 4 items (2 phantom) to 1.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Date-embedding generators drift across UTC midnight. build-agents-jso…
Final score: **81**
[S281][DX/P4] Date-embedding generators drift across UTC midnight. build-agents-json --check went red purely because this session crossed 00:00Z (built 07-14, checked 07-15). Harmless now; a long CI job spanning midnight would flake. Candidate: date-normalise in --check the way generatedAt already is.
Why it matters: Date-embedding generators drift across UTC midnight. build-agents-json was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`



### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **93**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [SECURITY] TT-ENFORCE-REPROBE
Final score: **93**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **90**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [VERIFY] scripts/fetch-studio-feed.mjs zombie
Final score: **78**
[S281→S282][FOUNDER] scripts/fetch-studio-feed.mjs zombie — still a founder call; S282 inherited the judgement rather than re-litigating it. S281's addendum already identified the producer (studio-ops verify-consumer-adoption --apply-snippets, whose missing-target branch unconditionally rewrites it, so a deliberate un-adoption is indistinguishable from never-adopted) and shipped the opt-out proposal as Ark cargo 01JTI98UHNA4C3E97AD02DB94B per CANON-018. Nothing to do here until that cargo is answered; deleting it a third time would again destroy unrecoverable work. Left untracked on disk, deliberately excluded from every S282 commit. — *original entry:* Untracked; deleted from git in S275 as dead (zero consumers, output removed, header claims a nonexistent issue #109), re-killed as an untracked copy in S279 (no git trace — git log --diff-filter=D shows only one deletion), and back again. It differs from every committed version by one line (AbortSignal.timeout(10_000)), so deleting an untracked file would destroy unrecoverable work. It no longer blocks build:check (D-S281.6). Question worth answering: what keeps recreating it?
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [COHESION] Social Dashboard bidirectional mirror
Final score: **71**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **69**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [VERIFY] nav-sheet device verify (mobile bottom-sheet default-swap
Final score: **66**
[S180][FOUNDER] nav-sheet device verify (mobile bottom-sheet default-swap — real-device confirmation).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [VERIFY] Verify membership-live-tier.js in browser
Final score: **62**
[S94][FOLLOWUP] Verify membership-live-tier.js in browser — sign in as a member and confirm rank strip highlights active tier (gold glow + scroll-into-view), world vault shows "✓ You have access" badges for tier unlocks. Check mobile layout.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

## Recommended Build Order

1. Date-embedding generators drift across UTC midnight. build-agents-jso…

## Best Immediate Move

Release browser gates are green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
