# Deploy Pages

## Full production release ceremony

Before a full production promotion, run `npm run release:ceremony`. The command
is fail-closed and writes `api/release-ceremony.json`; green requires the exact
canonical staging origin, accepted Obelisk redirect registration, verified
staging deployment lineage, six cross-browser staging tests with zero skips, a
ready promotion interlock, and Studio Doctor `blockingFailing: 0`. The manual
production workflows repeat this gate before any production mutation. Content-
only repair lanes retain their narrower independent gates.

Detailed deployment procedure is maintained in private studio operations documentation.

Public-safe note:
- this repo keeps deployable code, not the full internal deployment playbook
