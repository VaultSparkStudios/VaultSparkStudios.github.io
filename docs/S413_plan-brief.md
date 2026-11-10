╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · IMPLEMENT PLAN BRIEF                                                            ║
║  Session 413 · 2026-11-09 · agent: codex · repo: vaultsparkstudios-website                    ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Repair response truth and finish the pending website release                               ║
║                                                                                               ║
║  EFFORT SHIPPABILITY ████████░░   83/100                                                      ║
║  EXECUTION CONFIDENCE ██▌░░░░░░░   25/100                                                     ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [1]  oracle-stream-completion                                   EFFO 8  ·  EXEC 4
         ── ai-intelligence ─────────────────────────────────────────────────────────────────
         Parse cached JSON replies directly and require nonempty SSE text with the service
         completion tail. Keep the existing fallback and request policy while verifying
         success and failure without provider calls. Do not count empty output as a
         successful answer.
         → docs/S413_audit-findings.json; fresh source review.

  [2]  startup-session-identity                                   EFFO 7  ·  EXEC 3
         ── observability-honesty ───────────────────────────────────────────────────────────
         Show the active arc separately from the last completed session using the existing
         identity helper. Preserve ahead-of-SIL state and verify active, absent and stale
         locks. Regenerate and validate the actual startup brief.
         → docs/S413_audit-findings.json; fresh source review.

  [3]  review-three-linux-references                              EFFO 8  ·  EXEC 2
         ── ui-ux-feedback ──────────────────────────────────────────────────────────────────
         Inspect only the three selected original Linux reference cells after the exact
         artifact trust decision. Preserve old images and failures, and require unchanged
         native comparison to pass. Generation or transport alone is not acceptance.
         → docs/S413_audit-findings.json; fresh source review.

  [4]  isolated-release-acceptance                                EFFO 10  ·  EXEC 1
         ── features-depth ──────────────────────────────────────────────────────────────────
         Finish actual isolated staging and affected account journeys before production
         promotion. Verify exact candidate checks, current staging, rollback and served
         readback under existing deployment authorization. Unresolved trust and registration
         prerequisites remain pending.
         → docs/S413_audit-findings.json; fresh source review.

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    (none)

  BLOCKERS
    (none)
