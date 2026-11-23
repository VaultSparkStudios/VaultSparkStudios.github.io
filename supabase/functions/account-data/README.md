# Website membership data processor

This endpoint exports and erases the explicit website-membership manifest in
`20261123042000_website_account_data.sql`. It never deletes shared Studio Auth,
Obelisk links, PromoGrind, investment relationships, shared gameplay ledgers or
Stripe customers/invoices. JSON export includes owned media metadata and download
references; original image bytes are not embedded. An oversized export fails
visibly rather than returning a truncated successful file. Media URLs are built from the configured public data authority, never
from a production constant in SQL. An internal-only staging service must declare
its matching `PUBLIC_SUPABASE_URL` before exporting nonempty media references.

Environment admission happens before any Auth, database or provider request.
`APP_URL` is required and must exactly equal `https://vaultsparkstudios.com` or
`https://website.staging.vaultsparkstudios.com`. Production `SUPABASE_URL` must be
`https://fjnpzjjyhnpmunfoycrp.supabase.co`; staging must use
`https://website-data.staging.vaultsparkstudios.com` or `http://gateway:8000`.
If `PUBLIC_SUPABASE_URL` is set, it must exactly equal that environment's public
data authority. Internal staging without it can serve status and empty-media
exports; nonempty-media exports fail until the public staging authority is set.
Unknown origins, mixed environments, credentials, paths, query strings, fragments,
trailing slashes/dots and explicit alternate ports are rejected. There is no
`www` alias or test-only bypass. The exact strings are deployment contracts,
not arbitrary configurable export destinations.

Authenticated POST bodies:

- `{"action":"export"}`: all rows in the scoped database manifest, counts,
  media references, scope and timestamp. Supabase error objects never become
  empty successful exports.
- `{"action":"delete","confirmation":"DELETE WEBSITE MEMBERSHIP"}`: durable
  request, immediate website newsletter/profile suppression, and one processing
  attempt. HTTP 202 is accepted/pending, not completion.
- `{"action":"status"}`: minimal own request status.

POST `{"action":"process"}` with the separate processor bearer secret, without
an Origin header, retries at most five jobs. It cannot choose arbitrary user IDs.
The processor never sends data exports to email.

Runtime settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`,
`STRIPE_SECRET_KEY`, `BREVO_API_KEY`, owned `DISPATCH_LIST_ID`, verified
`ACCOUNT_DATA_FROM_EMAIL`, `KIT_API_KEY` (private V4 key), verified `KIT_ACCOUNT_ID`,
and a >=32-character `ACCOUNT_DATA_PROCESSOR_SECRET`.
Provision these through the secrets gateway. Missing applicable provider settings
leave jobs incomplete. No provider key is returned or logged.

Deployment integration requires the migration first, then deploying this directory
with `verify_jwt=false` (the handler verifies confirmed human tokens itself and
authenticates the processor separately). A scheduler must POST process with its
private secret. The frontend must expose the exact scope and pending/failure
states. These integrations and positive staging-account verification are separate
from unit tests; source existence does not prove deployment.

Leased checkpoints make cancellation, list unlinking, media removal, SQL erasure
and confirmation independently retryable. Only exact website Stripe subscriptions
with matching live metadata/customer/user/plan provenance are scheduled to stop
renewing; unrelated subscriptions are preserved. Brevo removes only the configured
Desk list, not the shared contact. Member newsletter exclusion uses the dedicated
opt-out and membership records; parent integration must preserve this behavior.

Erasure is a transaction. Comment redaction preserves peers' replies; nullable
creator/recipient attribution preserves teams/gift history. Every scoped writer
uses the same advisory identity lock as request intake, then checks a durable
tombstone, including callback profile writes, Stripe membership upserts and
fan-art uploads. Shared product and investor writes are not intercepted.
Identity locks are nonblocking try-locks: contention aborts with retryable SQLSTATE
40001 rather than waiting while a BEFORE ROW trigger holds a target-row lock.
Strict nulling of existing reference columns is permitted without a role bypass,
even when another unchanged participant also has a deletion tombstone. Inserts,
new references and simultaneous content/entitlement changes remain blocked.

Service-only jobs hold confirmation email and media paths until successful
confirmation; completion clears both. The minimal ID/state timestamps, opaque
user tombstone and scoped billing references remain to prevent recreation and
support cancellation receipts. No legal retention duration is invented here.
Provider-accepted confirmation is recorded; it does not assert mailbox delivery.
Brevo idempotency minimizes duplicate confirmations across transient retries.
The durable UUID request id is used as its idempotency key; provider TTL still
applies, so this is not a promise of exactly-once mailbox delivery.
Shared beta-key consumption records are preserved: clearing their claimant would
reissue already-consumed game keys. Team creator attribution is removed without
transferring ownership or expanding another member's privileges.

Legacy Kit associations are part of marketing acceptance: remove/read back only
the three website tags declared in `assets/kit.js`, preserving unrelated tags and
the global contact. The existing welcome sequence is also checked. The current
official REST contract has no per-subscriber sequence-removal operation, so a
remaining sequence association stays `kit_sequence_removal_unverified` until the
owned Kit automation/dashboard removes it and the API readback verifies absence.
No guessed endpoint or global unsubscribe is used. Missing Kit authority fails
closed; Brevo-only suppression is not complete legacy-marketing erasure.

Project-specific waitlist rows are exported/removed through service-only RPCs using
the confirmed provider email, never a browser-supplied address. Their export
section is mandatory in the client completeness contract. Apply the project
waitlist migration before deploying this integrated account-data function.
