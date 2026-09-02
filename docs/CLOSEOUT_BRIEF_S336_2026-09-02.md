```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S336 · 2026-09-02 · agent: claude-code · repo: vaultsparkstudios-website             ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The deploy had been impossible since S334 and an entire session's release was serving      ║
║    to nobody — a page that exists returned 404; the path is repaired, the release is live,    ║
║    and the gate that stayed green through it now has a clock automation cannot rewind         ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   82/100                                                       ║
║  ECOSYSTEM IMPACT   ██████▌░░░   68/100                                                       ║
║  SIL DELTA          989 → 987  (-2)                                                           ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#3]  deploy-currency-second-clock                              PROJ 9  ·  ECOS 9
         ── observability ───────────────────────────────────────────────────────────────────
         build-deploy-currency escalated only on deployedCommit to repo tip against a 48h
         ceiling, but hourly publishers commit constantly and a promotion lands on whatever
         HEAD is at dispatch time — so the deploy itself resets the alarm's only clock. Live
         during the incident: 34 commits behind, ageHours 10.1, state behind, PASS, with a
         whole release stranded. A second clock now ages from the OLDEST undeployed
         hand-authored commit against a 12h ceiling, classified structurally against the
         served-surface manifest and evidence graph rather than by commit subject. It
         measures against the promoted contentLaneHead, so pages a reader can already load
         are never counted as undeployed.
         → build-deploy-currency 85/85, check-deploy-currency-gate 30/30. The self-test locks the exact S336 shape: 34 behind, 10h span, a day of undeployed content -> stale. Matched shell parity still returns content-current first, so the deliberately-held identity backlog cannot trip it.

  [#1]  restore-the-deploy-path                                   PROJ 10  ·  ECOS 8
         ── release ─────────────────────────────────────────────────────────────────────────
         prune-served-surface deletes anything not positively classified by
         config/served-surface.json, then refuses if that broke a route the site advertises —
         and /evidence/ (S334) and /how-we-build/ (S335) were never added to that
         hand-maintained allowlist, so no deploy of any kind could succeed. The trap is
         self-planting: the content lane promotes sitemap.xml, so a new route becomes
         advertised in production on one deploy and only breaks the NEXT one, which is why
         S334 armed it for S335 and S335 armed it for S336. build:check only ever ran the
         script's --self-test over synthetic fixtures, so the one invocation touching the
         real manifest lived inside the deploy workflow.
         → prune --check now runs the real manifest against the real git-tracked tree in build:check; restoring the S335-era manifest exits 1 naming exactly /evidence/ and /how-we-build/, and exits 0 once fixed (both exit codes read directly).

  [#4]  tt-readiness-evidence-age                                 PROJ 8  ·  ECOS 8
         ── security ────────────────────────────────────────────────────────────────────────
         api/tt-readiness.json is publicSafe and gates the Trusted Types enforce flip, and it
         computed no age at all — amber-soak held whenever a warm row existed, at any age,
         forever, while nextAction told the reader to wait for rows to age out that nothing
         ever aged. It also re-stamped generatedAt on every build over a manifest generated
         2026-07-07 against its own declared 30-day window. D-S335.7 called the ageing logic
         suspect; it did not exist.
         → Now ages rows for real and publishes manifestGeneratedAt / manifestAgeDays / soakWindowDays / evidenceStale. New stale-evidence status keeps enforceEligible FALSE — load-bearing, because all 17 warm rows would age out and would otherwise have produced enforce-candidate from a fossil. Live artifact moved amber-soak -> stale-evidence. build-tt-readiness 14/14.

  [#2]  promote-the-stranded-release                              PROJ 10  ·  ECOS 6
         ── release ─────────────────────────────────────────────────────────────────────────
         Production was serving content-lane head d858e0a4 from 2026-09-01 15:50Z, eight
         hours before the S335 feat commit — so the member-write lockdown, Season 1, the
         community wall, the dashboard meter and /how-we-build/ were all in main and none
         were served. /how-we-build/ returned 404 to the public. S335's handoff recorded that
         the content lane deploys on push, which pages-deploy.yml contradicts outright:
         pushes and schedules evaluate the interlock but cannot deploy, and promotion is
         manual-dispatch only.
         → Content lane run 33585666290, 194 paths. /how-we-build/ 404 -> 200 verified by fetching the URL; served api/build-sha.json reports contentLaneHead 88393a29, which contains aff64499. deploy-currency now reads content-current, shell parity matched. The identity interlock was NOT touched — check-production-promotion-gate still reports hold (real-provider-e2e-pending).

  [#5]  community-postgrest-queries                               PROJ 4  ·  ECOS 3
         ── correctness ─────────────────────────────────────────────────────────────────────
         community/index.html asked for a poll filter with the operator and column swapped,
         and filtered game_sessions on created_at, a column that table does not have. Both
         return HTTP 400. Both failures were swallowed into the same empty-state path as an
         honest zero, so the page looked quiet rather than broken.
         → Probed live against the anon endpoint: the old poll filter returns HTTP 400 PGRST100 'failed to parse filter (true)', the corrected is_active=eq.true returns 200; created_at returns 400 'column game_sessions.created_at does not exist' while played_at returns 200. Recorded as a capability fix, not a lit surface — no poll is active, so today's pixels do not change.

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • FOUNDER DECISION: four public tables (challenge_submissions, game_sessions, point_events, member_achievements) still render a silent zero to every anonymous visitor, so /community/, all seven /leaderboards/* and public member profiles show zeros and empty states. The remedy generalizes S335's public_leaderboard pattern — definer projection views honouring public_profile — but it decides which member activity becomes publicly readable, which is yours to call, not an agent's. Diagnosis and call sites in D-S336.5.
    • The surfaces that only NOW actually serve have no manual CANON-053 rendered-pixel review. S335's captures were taken while production still served the previous build, so they are not evidence about the live pages.
    • Re-run the Trusted Types KV soak (scripts/analyze-tt-violations.mjs) so the enforce decision rests on current evidence. The ageing defect is fixed; the missing piece is input, not code.
    • The theme matrix still captures /proof/, retired in S335, and does not cover /community/, /changelog/, /evidence/ or /how-we-build/ — so the pages this session and the last one changed are outside the visual receipt entirely.
    • Remove vault-wall/ from config/served-surface.json once a full production deploy has actually retired the page (D-S336.2).

  BLOCKERS
    • Full-site production promotion remains held on the founder-reserved passkey ceremony; only the scoped content partition was promoted and the interlock was not touched.
    • Trusted Types enforcement stays held — now honestly, on a 57-day-old soak manifest rather than on a gate that could never go green.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
