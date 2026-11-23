# Native account-data regression fixtures

These are executable PostgreSQL tests, not evidence that PostgreSQL ran. Use only
an isolated test/staging database after installing the exact candidate migration.
Do not run setup/cleanup on production. Connection credentials must come through
the Studio secrets gateway; never print them or embed them into command text.

1. Execute `monotonic-redaction.sql` with native `psql -X` and
   `ON_ERROR_STOP=1`. It rolls back all temporary rows and invokes the actual
   installed guard for two tombstoned identities, self-gifts, referral/reviewer
   attribution, preserved peer data, rejected inserts and rejected resurrection.
2. Execute `concurrency-setup.sql` once. Start session A through a native
   PostgreSQL connection. Upon receiving `identity-lock-held`, start session B on
   a distinct connection during A's five-second lock window. Both scripts must
   exit zero. B must emit `nonblocking-40001-verified`; a statement timeout,
   deadlock, missing contention or generic successful UPDATE fails the test.
3. After both sessions terminate, execute `concurrency-cleanup.sql`.

Bind test results to the installed migration/guard hash and record actual source,
connection separation, notices and exit codes. This fixture proves guard
concurrency/redaction behavior. Complete staging-account erasure, external
provider/media/confirmation acceptance and post-erasure row readback remain
additional requirements.
