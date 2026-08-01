```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S302 · 2026-08-01 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The missing Sign in with Obelisk was never a code bug, and completing the relying party    ║
║    surfaced a provider defect that blocks the promotion it was meant to unlock.               ║
║                                                                                               ║
║  PROJECT IMPACT     ████████▌░   85/100                                                       ║
║  ECOSYSTEM IMPACT   ███████▌░░   77/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#3]  discovery-advertises-unbuilt-routes                       PROJ 9  ·  ECOS 10
         ── observability ───────────────────────────────────────────────────────────────────
         revocation_endpoint and end_session_endpoint are in the discovery document and
         absent as routes. The discriminator is clean: implemented endpoints answer with
         protocol errors while these answer with the router fallback 404 unknown-auth-route.
         A form-encoded POST returns 400 bad-json while valid JSON returns the 404, so the
         body is parsed before routing and that 400 is not evidence the route exists. A
         discovery document is a producer manifest, and this one advertises producers that
         were never built.
         → Live probe of all six advertised endpoints; Ark pattern-share 01JUU2VCO891896C74686E0E76 with the full evidence table

  [#4]  mock-passed-provider-did-not                              PROJ 8  ·  ECOS 9
         ── process ─────────────────────────────────────────────────────────────────────────
         The tests passed against an RFC 7009-compliant mock while the live route did not
         exist, so the implementation would have shipped unable to revoke anything. A
         self-test proves the code matches the spec its author believed; only the provider
         proves the spec. Probing before shipping is now the rule for any new provider
         integration rather than an optional extra.
         → node --test tests/obelisk-auth.unit.spec.js 21/21 green vs live 404 unknown-auth-route

  [#2]  provider-side-logout                                      PROJ 9  ·  ECOS 7
         ── security ────────────────────────────────────────────────────────────────────────
         Logout deleted our KV record and cleared the cookie, leaving the Obelisk grant and
         its refresh token alive — it signed the user out of nothing durable. Revocation runs
         before the delete, because that record is the only place the tokens exist and
         deleting first would strand a grant we could no longer revoke. Non-fatal by
         construction, so a provider that is down can never trap a user in a signed-in state.
         → cloudflare/obelisk-auth.js revokeObeliskTokens + endSessionUrl; tests 13 to 21; build:check 267/267 EXIT 0

  [#1]  obelisk-button-undelivered                                PROJ 10  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         Measured rather than assumed: live vault-member carries 0 links to /login and 4
         password fields against the repo's 2 and 0, loads legacy supabase-client.js and no
         identity.js at all, while /login itself returns 302 with valid PKCE. The homepage,
         membership, join and vault-wall have zero /login links between them. The lane built
         to ship safely while identity work was held is structurally incapable of shipping
         the identity work, because vault-member is SENSITIVE-classified and withheld from
         it.
         → curl of live vault-member vs repo; api/build-sha.json deployedBy pages-deploy-content-lane; SENSITIVE list at scripts/check-content-hotfix-gate.mjs:45

  [#5]  absent-is-not-failed                                      PROJ 7  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         A 404 is recorded as not_implemented rather than added to failed, and cached per
         issuer. The distinction is operational: failed invites a retry and would make every
         sign-out pay two doomed round trips forever, while not_implemented is a cross-repo
         finding that belongs in cargo. The implementation ships regardless and starts
         working unchanged the moment the route exists.
         → revokeObeliskTokens unsupportedRevocation cache; test asserts the doomed call is not repeated

  [#6]  stale-blocker-corrected                                   PROJ 8  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         real-provider-e2e requires five journey legs including revocation, which cannot
         honestly pass while the provider has no revocation path. One turn earlier I had told
         the founder a single sign-in would close the last blocker. PROJECT_STATUS.blockers,
         the task board and the handoff are corrected, because the Studio Hub reads that file
         and a stale blocker on a public-adjacent surface is the same class of lie this
         session exists to remove.
         → context/PROJECT_STATUS.json blockers rewritten; D-S302.5

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • The token 400 silent sign-out is the one user-visible bug and is still unfixed: a member with a valid edge session is shown a signed-out portal with no retry and no message.
    • Console hygiene: View Transitions unhandled rejection, and the Sentry sourcemap comment with its hash cascade.
    • Trim the three stale production-hold reasons that api/release-proof.json still publishes.
    • The genius-list rationale generator false-positives on the word navigation, classifying a JS error-handling fix as a public copy change needing founder sign-off.
    • context-meter.mjs reported 1.5% used all session while the conversation was near exhaustion — it measures a heuristic bootstrap cost, not the session it claims to gauge.

  BLOCKERS
    • real-provider-e2e-pending is blocked on Obelisk implementing /auth/revoke, not on a founder sign-in. Our half is shipped and works unchanged once the route exists.
    • Production remains behind main; every live sign-in surface still serves the pre-migration password form.
    • A sign-in at /login is still worth doing early — it is the only thing that proves our client registration against a real credential, which remains unproven.

  ACTION GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
