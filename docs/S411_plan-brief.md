╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · IMPLEMENT PLAN BRIEF                                                            ║
║  Session 411 · 2026-11-04 · agent: codex · repo: vaultsparkstudios-website                    ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Align lock identity with the carryover boundary                                            ║
║                                                                                               ║
║  EFFORT SHIPPABILITY ████████░░   80/100                                                      ║
║  EXECUTION CONFIDENCE ████░░░░░░   40/100                                                     ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [1]  consistent-session-carryover                               EFFO 8  ·  EXEC 4
         ── speed-organization-efficiency ───────────────────────────────────────────────────
         A rotated lock can retain the preceding session number while replacing its start
         time and commit. Keep these fields under one carryover decision so the next operator
         can locate the current release evidence.
         → scripts/write-session-lock.mjs; independent read-only audit; isolated CLI regression required.

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    (none)

  BLOCKERS
    (none)

