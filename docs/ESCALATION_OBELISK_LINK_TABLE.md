# Founder escalation — `public.obelisk_identity_link` (kills the login scan cliff)

S303 · Status: **awaiting founder sign-off** (auth-flow change per AGENTS.md) · Design already recorded in D-S301.10.

## The problem (live-measured)

Every Obelisk callback walks `/auth/v1/admin/users?per_page=100` up to 20 pages. At the
current 252 accounts that is 3 admin round-trips per sign-in; at 2,000 accounts the scan
throws `supabase_user_scan_limit` and **every login fails closed**. Headroom today: 1,748
accounts (`check-obelisk-link-readiness.mjs`).

## The approved-direction design (D-S301.10)

- New table in **our** schema: `public.obelisk_identity_link (obelisk_sub text primary key, user_id uuid unique not null, linked_at timestamptz)`.
- Inserted **before** the `app_metadata` write, so an interruption leaves a self-healing
  orphan link row rather than an orphan metadata write.
- Supplies the uniqueness guarantee `auth.users` denies us (42501: must be owner) AND an
  indexed subject lookup — kills both full table walks.
- Worker rewiring is **additive with fallback** to the existing scan; no behavior change
  for unlinked users.

## Why it is founder-gated

It touches the authentication flow (AGENTS.md escalation list). Nothing else blocks it:
`sqlMigration` plane probes ready, migration is idempotent, pre-image capture is standard.

## Execution plan on approval (agent work, ~1 session)

1. Migration via Supabase management API with pre-image to `.cache/`.
2. Worker: indexed lookup first, scan fallback, orphan-row self-heal test.
3. Live verification through `verify-supabase-runtime.mjs --verify --write-evidence`
   (machine-produced evidence only).
4. Rollback: drop table + revert worker commit; fallback path means no user impact.

## Related but separate founder items

- Add `SUPABASE_ACCESS_TOKEN` as a GitHub Actions secret → enables the daily
  `check-obelisk-link-readiness.mjs` cron (precondition-first, per the board).
- Next production Worker deploy also ships the S303 link-failure receipt
  (committed, tested 30/30, deploy blocked by permission classifier this session).
