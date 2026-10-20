# Operational CLI argument admission

This inventory records the argument boundary of outward-facing operational commands. Admission validates the complete argument list before credentials, operational reads, network requests, child processes or writes. Invalid, duplicate or malformed arguments exit with status 2. Help exits without operational activity.

| Command | Operational behavior | Admission |
| --- | --- | --- |
| `purge-promoted-urls.mjs` | Purges promoted URLs and verifies cache responses | Strict shared guard; help and every dry alias are inert |
| `sync-staging-headers.mjs` | Transfers staging header policies and reloads the server | Strict shared guard before configuration imports; help and every dry alias are inert |
| `provision-vault-test-accounts.mjs` | Provisions configured test accounts and writes the local test configuration | Strict shared guard before configuration reads; help and every dry alias are inert |
| `provision-tt-storage.mjs` | Checks or applies diagnostic storage retention | Strict shared guard; `--check` retains its operational read-only audit |
| `provision-worker-staging-origin.mjs` | Checks or applies staging DNS and server configuration | Strict shared guard; `--check` retains its operational read-only audit |
| `apply-supabase-migration.mjs` | Captures database pre-images, optionally applies a migration, and runs named probes | Strict shared guard; `--dry-run` retains its operational pre-image mode |

The shared implementation is `scripts/lib/deploy-argv.mjs`, backed by `scripts/lib/argv-guard.mjs`. Deployment and notification commands already use this admission family; their subprocess regression coverage lives in `tests/deployment-admission.unit.spec.mjs`.

The operational read-only modes above are deliberate exceptions to an entirely inert preview. Provisioner `--check` can read credentials and remote state. Migration `--dry-run` can read database state and write local pre-image evidence. For migration, `--dry`, `-n` and `--check` are inert previews; combining `--apply` with a dry alias is also inert. For the provisioners, `--dry-run`, `--dry` and `-n` are inert, including when combined with an operational mode. Conflicting operational modes are rejected.

`provision-desk-turnstile.mjs` already has strict parsing, explicit environment requirements for apply, and validation before provider operations. It does not universally accept the shared help and preview aliases; unsupported arguments are rejected before operations.

`moderate-desk-comments.mjs` routes unknown flags to usage and validates mutation commands and identifiers before requests. A remaining lower-priority consistency improvement is to reject recognized list-only options on mutation commands instead of accepting and ignoring them. Its argument grammar should be validated per subcommand before credentials are read.

`tests/operational-admission.unit.spec.mjs` runs the six guarded entrypoints in subprocesses with tripwires for credential/configuration imports, filesystem reads and writes, network requests, and child processes. It exercises help, inert previews, mixed apply/preview modes, unknown arguments, duplicate flags, malformed booleans, missing values and mode conflicts. It does not invoke real operational checks, provisioning, purges or migrations.

The inventory covers these reviewed entrypoints; it is not a claim that every script in the repository has been reviewed.
