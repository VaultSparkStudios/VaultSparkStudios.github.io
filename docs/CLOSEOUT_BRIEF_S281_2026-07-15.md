```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S281 · 2026-07-15 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The board itself was the bug — it ranked already-shipped work as top priority.             ║
║    Root-fixed done-detection to verify ARTIFACT EVIDENCE, not prose similarity; and           ║
║    defused an e2e failure a [skip ci] cron had already armed, invisibly.                      ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   82/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   72/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  stale-open-artifact-evidence                              PROJ 9  ·  ECOS 8
        axis: observability
        S281's own genius list ranked two S280-shipped items as top priorities. Two blind
        spots: a ticked [x] only counted as done if the PROSE also said "DONE S{N}" (S280's
        never did → never even a candidate), and title-jaccard@0.8 scored "Commit a snapshot"
        vs "Committed snapshot + wiring" at only ~0.38 because jaccard punishes the size
        asymmetry when a small open item is absorbed into a bigger done entry.
        Fix: the checkbox IS the done state (pool 8→24, ZERO new false positives) + an
        orthogonal artifact-evidence detector — does the named deliverable exist NOW
        (git-tracked file / npm script / live build:check step), governed by a creation verb
        BEFORE it? Prose-similarity was measured on the live corpus and REJECTED at a 50%
        false-positive rate. Evidence detector: 2/2 true positives, 0/49 false positives.
        evidence: check-stale-open-tasks --self-test 10/10 · --check exit 0 · D-S281.1

  [#2]  record-consolidation-not-done-evidence                    PROJ 8  ·  ECOS 8
        axis: observability
        Consolidating 3 duplicate "Homepage LCP" records INSTANTLY produced a 100%-overlap
        false positive: the gate began reporting the surviving, genuinely-open, founder-gated
        carry as done — the exact lie being fixed, self-inflicted in one edit, caught only by
        re-running the gate instead of trusting the change.
        Insight: not every [x] is evidence the work happened. Two kinds exist — a work-done
        closure (valid evidence) and a record-consolidation closure (closes a duplicate
        RECORD; the work lives on, still open). Self-test pins that the exclusion is
        marker-driven, never title-driven.
        evidence: RECORD_CONSOLIDATION marker + self-test · D-S281.2

  [#3]  geo-vitals-armed-ci-failure                               PROJ 9  ·  ECOS 7
        axis: ci
        build-geo-vitals --check byte-compared api/geo-vitals.json against
        .cache/probe-colo-supplement.ndjson — an Actions-cache-only input uptime-probe.yml
        DELIBERATELY never commits. Cron commit c7db58811 landed supplement-derived rows under
        [skip ci], so CI never ran on it: a guaranteed e2e.yml build:check failure was waiting
        for the next ordinary push. Proved on a pristine origin/main worktree (exit 1) — after
        catching that I had contaminated my own control by regenerating the file.
        Now: structural + PRIVACY invariants always (no country below minSamples=3 may ever be
        named — the promise the public feed actually makes), byte-compare only when the input
        is reproducible. Flips all three ways, incl. STILL catching injected drift.
        Second-order sweep: 1/62 byte-comparing gates affected. Class contained.
        evidence: build-geo-vitals --self-test 9/9 · pristine-worktree repro · D-S281.5

  [#4]  orphan-gate-git-tracked-enumeration                       PROJ 7  ·  ECOS 7
        axis: ci
        check-orphan-scripts walked the filesystem, judging files CI can never check out —
        hard-failing build:check LOCALLY on every run while every CI run stayed green.
        Now enumerates git ls-files, filtered to genuine top-level: an unfiltered git pathspec
        crosses directory boundaries and silently annexed scripts/lib (352→395), which
        check-orphan-libs owns. Correct subject set 351 = 352 − 1.
        Verified it STILL catches a tracked orphan (probe: exit 1).
        evidence: check-orphan-scripts --self-test 5/5 · tracked-orphan probe · D-S281.6

  [#5]  canon019-phantom-and-record-rot                           PROJ 8  ·  ECOS 6
        axis: process
        The [S187] wishlist item still claimed "Supabase admin MISSING" after S280 corrected
        the NEWER duplicate — re-verified READY 2/2 while the founder queue still rendered
        "Requires missing credential" (a CANON-019 ABSOLUTE violation, and an observability lie
        about our own capability). Generalization: correcting a premise is not done until every
        duplicate carrying it is swept.
        Hand-consolidated one-job-many-records rot (TT-ENFORCE ×5, RICHER-IGNIS ×3, Homepage
        LCP ×3, Social Dashboard ×3, 2 founder-action pairs): 49→33 open tasks, 16 records
        closed, ZERO information lost. NOW: 4 items (2 phantom) → 1.
        evidence: check-secrets --for supabase.admin READY 2/2 · D-S281.3, D-S281.4

  ───────────────────────────────────────────────────────────────────────────────────────────
  HONEST DEFERRALS (WINS — recorded, not skipped)

  · Automated duplicate-open clustering gate — NOT shipped (D-S281.4). Probed at thresholds
    0.6/0.7/0.8/0.9: it MISSED the real duplicates (Homepage LCP titles diverge on their
    parentheticals; TT's bare titles carry too few tokens) AND invented false clusters
    (union-find transitivity chained "Add Workers KV scopes" to "Revoke compromised PAT" via a
    near-empty [FOUNDER ACTION — SECURITY] title). Its one surviving post-cleanup finding is
    itself that false positive. A gate that noisy is worse than none.

  · Speculative meta-gate for the geo-vitals class — NOT shipped (D-S281.5). The sweep found
    1/62 (now fixed); its other 5 candidates were false positives of its own heuristic (a
    self-test FIXTURE string; gates that already degrade gracefully — each verified exit 0 with
    its input absent). A gate reporting zero forever is cost without signal.

  ───────────────────────────────────────────────────────────────────────────────────────────
  SURFACED · NOT ACTIONED (founder call)

  · scripts/fetch-studio-feed.mjs zombie — deleted from git in S275 as dead (zero consumers,
    output removed, header claims a nonexistent issue #109), re-killed as an untracked copy in
    S279 (no git trace — git log --diff-filter=D shows only one deletion), and BACK AGAIN.
    NOT deleted: it differs from every committed version by one line (AbortSignal.timeout),
    so deleting an untracked file would destroy unrecoverable work. It no longer blocks
    build:check (D-S281.6). The question worth answering is what keeps recreating it.

  ───────────────────────────────────────────────────────────────────────────────────────────
  VERIFICATION

  · npm run build            EXIT 0
  · npm run build:check      207/207 EXIT 0   (direct capture — no pipe masking)
  · node --test worker unit  31/31
  · ops doctor               blockingFailing 0  (14/15; 1 warn = sibling session locks, sibling-owned)
  · S280 post-push CI        12/12 workflows green on 62245573 (incl. Lighthouse + Accessibility)

  SIL: 999/1000 (v3.0) · Velocity 9 · Debt ↓
  ───────────────────────────────────────────────────────────────────────────────────────────
```
