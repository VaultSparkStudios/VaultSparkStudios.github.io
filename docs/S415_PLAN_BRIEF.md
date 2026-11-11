╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · IMPLEMENT PLAN BRIEF                                                            ║
║  Session 415 · 2026-11-11 · agent: codex · repo: vaultsparkstudios-website                    ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Bind visual proof to the candidate before release                                          ║
║                                                                                               ║
║  EFFORT SHIPPABILITY █████████░   93/100                                                      ║
║  EXECUTION CONFIDENCE ███░░░░░░░   30/100                                                     ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [1]  candidate-baseline-provenance                              EFFO 9  ·  EXEC 5
         ── ui-ux-feedback ──────────────────────────────────────────────────────────────────
         Visitors see intentional, reviewed Games layout and CI tests the version actually
         being released.
         → .github/workflows/visual-regression.yml

  [3]  affected-authenticated-promotion                           EFFO 10  ·  EXEC 2
         ── security ────────────────────────────────────────────────────────────────────────
         Vault Members and approved investors retain their intended destination and protected
         access through the identity flow.
         → cloudflare/obelisk-auth.js

  [2]  candidate-required-acceptance                              EFFO 9  ·  EXEC 2
         ── speed-organization-efficiency ───────────────────────────────────────────────────
         Visitors receive a candidate whose public journeys and rendering have passed current
         checks.
         → .github/RELEASE_CHECKS.json

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    (none)

  BLOCKERS
    • Current source and hosted E2E are nonpassing; affected deployed account acceptance remains unverified.

