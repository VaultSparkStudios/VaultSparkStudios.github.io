# Decisions

Public-safe decisions retained in this repo:

### 2026-04-06 — Light mode remains token-driven in the shared design system

- Status: active
- Decision: light-mode fixes should be applied in `assets/style.css` and theme metadata rather than page-by-page HTML patches whenever the issue is shared across public pages
- Why: the unreadable text problem was systemic (`--steel` and translucent dark-mode carryovers), so a token-and-surface pass is lower risk, easier to maintain, and keeps light mode a first-class global experience
- Preservation: page-specific CSS can still layer on top, but shared readability issues should be solved at the design-system level first

### 2026-03-31 — Public website repo keeps only public-safe operational material

- Status: active
- Decision: detailed handoffs, work logs, audits, local settings, and operator-only notes should not live in the public website repository in full detail

### 2026-04-03 — Public repo sanitization expanded to Studio OS tracked files

- Status: active
- Decision: tracked Studio OS context, log, audit, handoff, and local-tooling files in this repo were reduced to public-safe summaries or pointers
- Why: the website can stay deployable without exposing internal execution history, operator workflows, or sensitive planning detail
- Preservation: a local private backup of the pre-sanitization material was created outside the repo before the tracked copies were sanitized

### 2026-04-06 — IGNIS scoring wired to closeout protocol

- Status: active
- Decision: run `npx tsx cli.ts score` from `vaultspark-studio-ops/ignis/src/` at every closeout; update `ignisScore`/`ignisGrade`/`ignisLastComputed` in `context/PROJECT_STATUS.json`
- Why: Meta-Reasoning Self-Score Awareness was 20.7/100 due to only 3 sessions of history; compounding score history each closeout is the primary lever to push COGNITION and FORESIGHT pillars from D → C

### 2026-04-03 — Local Playwright credentials moved behind a private ignored file

- Status: active
- Decision: `.env.playwright.local.private` is now the preferred local credential source for Playwright, while `.env.playwright.local` stays safe as a template-style local file
- Why: local tests still need credentials, but the repo-facing local file should not hold real values
