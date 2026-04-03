# Decisions

Public-safe decisions retained in this repo:

### 2026-03-31 — Public website repo keeps only public-safe operational material

- Status: active
- Decision: detailed handoffs, work logs, audits, local settings, and operator-only notes should not live in the public website repository in full detail

### 2026-04-03 — Public repo sanitization expanded to Studio OS tracked files

- Status: active
- Decision: tracked Studio OS context, log, audit, handoff, and local-tooling files in this repo were reduced to public-safe summaries or pointers
- Why: the website can stay deployable without exposing internal execution history, operator workflows, or sensitive planning detail
- Preservation: a local private backup of the pre-sanitization material was created outside the repo before the tracked copies were sanitized
