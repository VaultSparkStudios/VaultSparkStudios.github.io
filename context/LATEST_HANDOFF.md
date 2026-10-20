## Where We Left Off (Session 390) — public data contracts

S390 repairs ten public queries production rejected and adds a live-verified REST contract gate (125 queries; 7 deferred with notes), removes the /changelog/#stories layout shift (0.1154 → <0.01), makes four send commands admit argv strictly, and keeps the handoff extract cap on measured evidence. Deploy: fully deployed and verified — production serves ceeeb2de9f (Pages run 39359262188, tag s390-production-20261020), byte parity tree-current 1105/1115 identical, 0 Supabase 4xx (was 11); Worker unchanged since S389. Evidence: docs/RELEASE_S390.json. Founder review: vault-sdk member fetch (changes consumer gating) and event_rsvps exposing user_id to anon. Goal association: Claude Code /goal in session 02f984f7-d3e8-4932-b23b-e88b50a20643 (no native Codex binding); this release belongs to that invocation.

## Where We Left Off (Session 389) — release verified

S389 verifies five repairs: deployment argument admission, deterministic handoff extraction, archive sitemap discovery, Oracle answer ordering, and field-proof publication ordering. Complete local validation passed542/542 twice; post-event closure109/109; mobile215/215 with zero P0/P1;28 sitemap captures inspected. Exact-candidate staging, hosted checks, full Pages and Worker deployment and strict production readback verified for c86109ee05dff52ad0fe134ed34a060b97bcbe4f. No measured performance improvement or authenticated identity acceptance is claimed. Release evidence: docs/RELEASE_S389.json.

Continue with the two queued S389 SIL observations. Native goal01a1557e-9d32-7d13-b5cf-3e802fd6616d createdAt1792435752 is bound to S389; this release belongs to that invocation. Final publication, restoration and cleanup evidence is recorded in docs/RELEASE_S389.json.

