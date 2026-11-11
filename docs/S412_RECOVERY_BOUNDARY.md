# S412 partial recovery boundary

S412 code and source verification are recorded in `S412_implementation-verification.json` and `S412_current-source-verified.json`. Source publication `360a4a56ed0872484378b6504e707357736ba34b` is on the QA branch; it is not production promotion or full closeout.

The next native invocation is `01a1c30a-d8b0-75c3-80a7-d1edf0a5bf16`, created at epoch `1794273636`. Its binding returned `start-new-arc`. This boundary preserves the unfinished prior release before that invocation's full startup and fresh audit. It awards no SIL score or completion credit.

Recovery observations: writeback-currency reports current at `360a4a56`; the tree contains generated startup/report churn rather than uncommitted application edits. Remote main has diverged from the QA branch (103 main-only, 33 QA-only commits at observation). Preserve both histories; no reset or force-push. Earlier visual comparison run 42494681623 failed, and generation run 42494683475 succeeded provisionally. No newer release-check result is inferred.

Remaining acceptance: three original Linux reference reviews and unchanged comparisons; isolated account target and artifact admission; affected member and approved-investor journeys; exact candidate checks; staging configuration/artifact parity; authorized main/production promotion and readback; full closeout. These remain required in the new arc rather than being treated as recovered successes.

Canonical gateway discovery finds `website.supabase-admin` missing. The repository's older capability map instead reports that name unknown; use the current control-plane discovery for this capability. A fresh read-only provider probe proves management API, SQL and Edge Function authority, but reports the existing data credential project mismatch. This does not prove staging isolation or usable website data administration. Ark drain returned no new cargo. Exact artifact exception decisions are pending; no blocked artifact was downloaded or executed.
