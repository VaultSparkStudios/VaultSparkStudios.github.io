<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: def721450818 -->
<!-- generated-at: 2026-08-02T23:01:18.632Z -->

# LATEST_HANDOFF (compact)

SESSION 302 HANDOFF SUMMARY

Session
- S302 (continuation past S301 closeout), 2026-08-01

Intent
- Diagnose missing "Sign in with Obelisk" on /vault-member/#login + console errors; complete relying party; promote.
- Outcome: root cause found; one phase shipped; promotion blocked by provider defect.

Shipped
- Provider-side logout: RFC 7009 revocation + RP-initiated logout URL, runs before KV delete, non-fatal. Tests 13 to 21. build:check 267/267 EXIT 0. Pushed 6f3dea2c2.

Root Cause (reported bug)
- Delivery problem: vault-member/ is SENSITIVE and withheld from the only lane that deploys. Live serves legacy supabase-client.js, no identity.js. Obelisk button never delivered. /login returns 302 with valid PKCE but zero /login links on any live page. Button itself works.

Now Bucket (top 3, all founder-approved)
1. Phase 2 - token 400 silent sign-out. Member with valid edge session sees signed-out portal, no retry/message. Fix cloudflare/obelisk-auth.js:539 + stop silent fail at assets/supabase-client.js:122-126.
2. Phase 3 - console hygiene (View Transitions rejection; Sentry sourcemap + hash cascade).
3. Phase 4 - trim three stale hold reasons from PRODUCTION_PROMOTION.json / release-proof.json.
- Full plan: ~/.claude/plans/deep-petting-puppy.md

Blockers (top 3)
1. Promotion blocked on provider: Obelisk advertises revocation_endpoint + end_session_endpoint but implements neither (404 unknown-auth-route). real-provider-e2e revocation leg cannot honestly pass. Waits on Obelisk shipping /auth/revoke.
2. Client registration unproven: only a real /login token exchange proves client registration against real credential.
3. Prior-turn guidance corrected: sign-in alone will not close real-provider-e2e.

Human-Blocked
- Real Obelisk sign-in at /login (works by direct URL today): proves client registration; genuinely unproven. Carried from S300/S301 (age ~2 sessions). Founder-only under CANON-019.
- confirm_content dispatch decision: still built, not dispatched (age from S300, ~2 sessions).
- Optional: add SUPABASE_ACCESS_TOKEN as repo Actions secret to schedule link-readiness gauge.
- Note: only sign-in is human-blocked for promotion; Phases 2-4 are approved agent work.

Next session: start Phase 2 (token 400 silent sign-out) per deep-petting-puppy.md.
