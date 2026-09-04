```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S343 · 2026-09-04 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The site had no users because it could not accept one: an undefined VS.kitSubscribe        ║
║    failed every registration while creating the account.                                      ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   84/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   70/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#5]  credential-scope-mismatch                                 PROJ 8  ·  ECOS 9
         ── security ────────────────────────────────────────────────────────────────────────
         check-secrets --audit reports supabase.admin READY 2/2 for a key that 401s here:
         valid, unexpired, and scoped to ref ckwtolofoqzrqouqkmvs while the site ships
         fjnpzjjyhnpmunfoycrp. Presence is being reported as validity on the surface an agent
         consults before declaring itself blocked - and it is a second, independent reason
         the Obelisk ceremony would fail AFTER a human completes the passkey flow.
         → D-S343.4; Ark pattern-share 01K1MKFQ4O40B21B35A3AFE86A

  [#1]  registration-blocker                                      PROJ 10  ·  ECOS 7
         ── correctness ─────────────────────────────────────────────────────────────────────
         vault-member/portal-auth.js called VS.kitSubscribe(...), defined nowhere in the
         codebase, inside the registration try-block ahead of showDashboard(), with the
         subscribe checkbox shipping checked. Every stranger threw a TypeError, was told
         registration failed, and left - while their account had in fact been created, so the
         retry collided with register_open's uniqueness guard. The ordering was the bug, not
         the missing function: an optional side effect must never sit upstream of the outcome
         it decorates.
         → vault-member/portal-auth.js; verified in the SERVED bundle at 57e69bfcd - the only surviving kitSubscribe is the comment explaining its removal

  [#4]  funnel-bot-separation                                     PROJ 7  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         /stats/ecosystem/ has advertised 'bots separated from people' for months while the
         funnel beacon applied no filter, leaving all 371 hero impressions of unknown
         provenance and every derived conversion number undecidable. looksLikeBot() returns a
         BOOLEAN - the UA is read and discarded, because a stored UA is a fingerprint.
         → cloudflare/worker-lib.mjs; cloudflare/security-headers-worker.js; worker tests 57/57

  [#3]  cancel-path-sold-never-wired                              PROJ 9  ·  ECOS 6
         ── legal ───────────────────────────────────────────────────────────────────────────
         supabase/functions/customer-portal-session had ZERO callers and the Settings button
         was typeof-guarded, so it failed silently while the copy promises 'Cancel anytime'.
         A consumer-law exposure rather than a bug, and one that would surface only when
         someone tried to leave.
         → vault-member/portal-core.js openCustomerPortal(); portal-settings.js ?checkout=success

  [#2]  silent-success-taken-handle                               PROJ 8  ·  ECOS 5
         ── correctness ─────────────────────────────────────────────────────────────────────
         register_open reports rejection as DATA, not as rpcErr. The client checked only the
         error channel, so a taken handle dropped the member into a dashboard their handle
         was never bound to.
         → vault-member/portal-auth.js rpcData check, both array and object shapes

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [QA/P0] Run the human signup walkthrough in a clean browser profile with the subscribe box checked - the plan's actual Phase 0 gate, and the only evidence that closes it.
    • [BUILD/P1] Gate the class, not the instance: nothing in 388 steps catches a call to an undefined global, which is exactly how this session's headline bug survived every gate and a live deploy.
    • [SEC/P0] Per-project Supabase key names in the studio-ops gateway; one shared slot cannot serve two projects.
    • [VOICE/P1] Give the homepage IGNIS chip the publicNote treatment the sibling surfaces already have.
    • Phases 3-7 of the approved plan remain untouched: adaptive front door, the three competing intent taxonomies, activation instrumentation, the welcome email, the three divergent rank ladders, and surfacing /how-we-build/ and /evidence/.

  BLOCKERS
    • The Phase 0 gate is a HUMAN walkthrough and has not been run - registration is verified by build:check 388/388, mobile 215/215, worker 57/57 and by reading the served bundle, but not by a person creating an account.
    • The gateway's Supabase service-role key 401s against this project while the audit reports READY 2/2.
    • The Obelisk provider journey remains unobserved; use --watch, not --live, and fix the Supabase key first or the truth reads fail at the end.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
