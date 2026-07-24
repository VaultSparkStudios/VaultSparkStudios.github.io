```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S289 · 2026-07-23 · agent: codex · repo: VaultSparkStudios.github.io                 ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Obelisk now owns identity on a rollback-capable canonical staging Worker, while            ║
║    production stays honestly unchanged until runtime proofs reconcile.                        ║
║                                                                                               ║
║  PROJECT IMPACT     █████████▌   96/100                                                       ║
║  ECOSYSTEM IMPACT   ████████░░   84/100                                                       ║
║  SIL DELTA          998 → 994  (-4)                                                           ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#8]  physical-promotion-interlock                              PROJ 10  ·  ECOS 10
         ── security ────────────────────────────────────────────────────────────────────────
         A main push can now land recovered source without changing routed production. Pages,
         Worker, cache purge, and Sentry production receipts consume one fail-closed hold;
         release proof reports the same blockers, and only a ready manually confirmed
         dispatch can promote.
         → promotion gate 7/7 · four workflows covered · independent push GO / production NO-GO

  [#1]  edge-oidc-authority                                       PROJ 10  ·  ECOS 9
         ── security ────────────────────────────────────────────────────────────────────────
         The edge now completes authorization-code plus PKCE, verifies every identity claim
         against JWKS, and issues a signed revocable session. Cookie presence alone and
         legacy browser sessions can no longer establish identity.
         → cloudflare/obelisk-auth.js · Worker/Obelisk unit suite 47/47

  [#7]  honest-runtime-hold                                       PROJ 10  ·  ECOS 9
         ── truth ───────────────────────────────────────────────────────────────────────────
         Source-ready SQL and Function changes did not become a production claim.
         Service-role REST cannot deploy either surface, the live archive error remains
         observable, and real-provider signed-in E2E is still required after runtime
         reconciliation.
         → Supabase CLI missing management token · RPC 42702 · production unchanged

  [#3]  authoritative-bootstrap                                   PROJ 9  ·  ECOS 9
         ── organization ────────────────────────────────────────────────────────────────────
         Browser identity now comes from /api/auth/me; Supabase credentials are short-lived
         memory-only transport issued after a valid edge session. Legacy persisted sessions
         are cleared, removing the dual-authority bypass.
         → assets/identity.js · assets/supabase-client.js · tests/helpers/vaultAuth.js

  [#2]  identity-continuity                                       PROJ 10  ·  ECOS 8
         ── depth ───────────────────────────────────────────────────────────────────────────
         Existing members keep the UUID that owns their ranks, plans, investor records, and
         RLS data. The bridge uses privileged subject metadata and verified email, preserves
         plan metadata, and refuses ambiguous mappings.
         → cloudflare/obelisk-auth.js · assets/supabase-client.js · conflict/idempotency unit fixtures

  [#5]  canonical-worker-staging                                  PROJ 10  ·  ECOS 8
         ── resilience ──────────────────────────────────────────────────────────────────────
         Canonical staging now traverses the named Worker and a private origin chain, keeps
         redirects on the public hostname, deploys static assets atomically, and records
         rollback snapshots. Its parity gate proves nonce-capable Worker CSP without
         weakening the static-origin safety bar.
         → Worker 773ec75d-4de8-4246-8f59-582fb061298f · /_health 200/no-store · rollback 20260724023625 · candidate-green

  [#4]  portal-ceremonies                                         PROJ 9  ·  ECOS 7
         ── ui_ux ───────────────────────────────────────────────────────────────────────────
         Password and social entry gave way to Obelisk without flattening Vault-specific
         onboarding, rank, plan, application, approval, consent, or role behavior. Account
         settings now distinguish credential security from membership control.
         → vault-member/portal-auth.js · investor-portal/login/index.html · vault-member/portal-settings.js

  [#6]  exact-candidate-proof                                     PROJ 9  ·  ECOS 7
         ── quality ─────────────────────────────────────────────────────────────────────────
         The post-build tree passed 218 checks, the production interlock passed 7/7, 47
         Worker/Obelisk units passed, 78 final data files parsed, and the
         seven-theme/auth/accessibility/Lighthouse evidence names what was and was not signed
         in.
         → build:check 218/218 · interlock 7/7 · auth 47/47 · Lighthouse 99/100/96/100

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Provide a Supabase management deployment capability through the Studio secrets gateway, then apply the archive migration and deploy Eternal Intelligence.
    • Run real-provider member and investor callback/session/role/revocation E2E, emit the identity migration receipt, and repeat the independent release gate.

  BLOCKERS
    • Service-role REST is available, but no Supabase management access token or approved database/function deployment credential is available.
    • Archive SQL and Eternal function runtime state are behind source; real-provider signed-in E2E is therefore incomplete and production remains held.

  ACTION GATE
    8 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
