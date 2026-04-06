# Creative Direction Record — Studio Website

This public repo now keeps only public-safe creative-direction summaries.

Boundary:
- detailed private creative direction, internal rationale, and session-by-session operating notes live in the private Studio OS / ops repository
- this file keeps only high-level public-safe direction notes

## Entries

### 2026-04-06 — Status badge and mobile menu UX standards (S36)

- Category: UX / Visual Quality
- Human input: "the mobile menu brings up a blurry menu now that I can't see" + "make sure the FORGE/SPARKED/VAULTED tags on each project/game/tool page is not conflicting with the project/game header name"
- Area affected: `assets/style.css`, all `projects/*/index.html`
- Required direction: mobile nav must be fully readable (no blur artifacts); status badges must be visually separated from project/game titles — never overlapping
- Why it matters: two user-visible bugs discovered in same session; both are ongoing quality standards — any future badge or nav change must respect these constraints

### 2026-04-06 — Studio OS protocol utilization directive

- Category: Direction + Assignment
- Human input: "go to documents/development/studio-ops and follow all protocol information and update this file folder to start utilizing it"
- Area affected: CLAUDE.md, AGENTS.md, prompts/, all context/ files
- Required direction: fully adopt studio-ops Studio OS protocols in this repo — session aliases, start/closeout prompts, SIL tracking, context files with real content
- Why it matters: `start` was not triggering the full startup brief because CLAUDE.md had no session alias rule; the entire Studio OS integration was missing after the sanitization pass

### 2026-04-06 — GA4 measurement ID provided

- Category: Feature assignment
- Human input: provided measurement ID `G-RSGLPP4KDZ`
- Area affected: all 97 HTML pages
- Required direction: wire GA4 gtag snippet across all pages
- Why it matters: GA4 was wired in CSP but no script loaded; analytics were completely inactive

### 2026-04-03 — Public repo sanitization directive

- Category: Direction + Assignment
- Human input: "Yes do that and make sure it wont break any connections or ruin anything" and "Also do that for all public repos - sanitization pass"
- Area affected: public repository hygiene, tracked Studio OS files, local-tooling files, public/private documentation boundary
- Required direction: sanitize public repos so deployable code remains intact while proprietary or operator-only material is removed, stubbed, or moved to private storage
- Why it matters: the public website repo should remain safe to expose without leaking internal operating detail
