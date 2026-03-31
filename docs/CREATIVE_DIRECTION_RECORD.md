# Creative Direction Record — Studio Website

**ADDITIVE ONLY. Never delete or edit prior entries. Append only.**

This is the authoritative ledger of all human creative direction for this project.
It exists for IP protection, creative continuity, and agent alignment.

## Enforcement rule

An agent MUST append an entry to this file whenever the human gives:
- Creative direction of any kind
- Feature assignments or goals
- Brand, tone, or visual guidance
- Canon-affecting decisions
- Naming decisions
- Any explicit "do this / don't do this" creative instruction

Agents MUST NOT add entries autonomously without human input.
Agents MUST NOT modify or remove existing entries.

---

### 2026-03-31 — Join-page member-count wording

- Category: Assignment + Direction
- Human input: "Join … vault members" → "on website with a green dot"
- Area affected: `/join/` hero social-proof pill
- Previous state: The pill showed `{count} members already in the Vault` with a green-dot live indicator
- New required direction: Keep the green-dot treatment, but reword the line so the website presents it as a `Join … vault members` prompt
- Why it matters: Makes the social-proof surface read more like an active invitation than a passive status line
- Supersedes prior entry: —

---

### 2026-03-31 — Invite-only status clarification

- Category: Direction + Correction
- Human input: "Whats confusing is the ... - it should read as Vault Status or something - and the vault membership is not yet live so a greent dot maybe should be yellow and should reflect current status (which only allows invite codes)" → "Also it shouldn't be on the home page"
- Area affected: `/join/` hero status pill, homepage hero social-proof bar
- Previous state: Public pages implied a live/open member count with green-dot activity styling
- New required direction: Treat the surface as Vault status instead of member-count social proof, use a yellow indicator for invite-code-only access, and remove the homepage version entirely
- Why it matters: Public messaging should match the actual access model and avoid implying open/live membership before launch
- Supersedes prior entry: 2026-03-31 — Join-page member-count wording

---

### 2026-03-31 — Launch-age stat + sign-in flow + default-theme direction

- Category: Direction + Assignment
- Human input: "Days Since Launch could be a good stat" → "When you click Sign In - it should direct to the actual Sign-In tab on that page I woul think" → "Make High Contrast the new Default theme/mode for everyone and rename it to Dark - High Contrast"
- Area affected: homepage hero stats, public sign-in flow, theme system defaults/labels
- Previous state: homepage lacked a launch-age stat, `Sign In` links often landed on the register-first auth view, and the default site theme remained the softer dark palette
- New required direction: add a `Days Since Launch` signal, route sign-in actions to the real login tab, and make the former high-contrast palette the new default under the label `Dark - High Contrast`
- Why it matters: Improves first-click UX, strengthens the studio’s public signal, and makes the default visual identity more intentional
- Supersedes prior entry: —

## Entry categories

| Category | Use when |
|---|---|
| **Direction** | Human specifies what the project should do or become |
| **Assignment** | Human assigns a specific feature, task, or goal |
| **Guidance** | Human gives style, tone, brand, or quality guidance |
| **Canon** | Human makes a lore, world, or story decision |
| **Rejection** | Human rejects a direction, idea, or approach |
| **Approval** | Human approves a proposed direction |

---

## Entries

### 2026-03-26 — Studio OS onboarding

- Category: Direction
- Human input: All VaultSpark projects must adopt Studio OS, including self-improvement loop and Creative Direction Record
- Area affected: Process / Studio OS compliance
- Previous state: No structured creative direction tracking
- New required direction: All human creative direction must be recorded in this file, additive only
- Why it matters: IP protection, agent continuity, creative alignment across sessions
- Supersedes prior entry: —

---

### 2026-03-26 — Full audit + innovation direction

- Category: Assignment + Direction
- Human input: "Audit project in its entirety and provide score/rating, areas of improvement, category scores, analysis/recommendations and another innovative solutions brainstorm list with every single item having a short synopsis and score/rating attached to it. Out of this list, recommend items by 'Highest leverage right now (low effort, real impact)' and 'Highest ceiling (high effort, transformative)'. Ensure Studio Hub and Studio Ops integration is perfect."
- Area affected: Process quality, feature backlog prioritization, Studio Ops compliance
- Previous state: No formal audit score. Studio Ops context files stale (CURRENT_STATE at Phase 11, PROJECT_STATUS with wrong stage/blockers)
- New required direction: Audit-driven backlog. Top [SIL] picks: VaultScore.submit() in game pages + "Complete Your Vault" onboarding CTA. Innovation backlog of 25 items now scored and on record.
- Why it matters: Establishes baseline SIL score (32/50), corrects all staleness, gives prioritized innovation roadmap

---

### 2026-03-27 — Re-audit + implement leverage items + simplify pass

- Category: Assignment + Direction
- Human input: "Audit project in its entirety and provide score/rating, areas of improvement, category scores, analysis/recommendations (short) and another innovative solutions brainstorm list with every single items have a short synopsis and score/rating attached to it for every item and how it would improve/impact the project's overall score, potential, momentum (etc.). Out of this list, recommend the items to implement by 'Highest leverage right now (low effort, real impact)' and 'Highest ceiling (high effort, transformative)' (project is website in this context)" → then "Continue 1-6" → then "CLOSEOUT"
- Area affected: Game integration (VaultScore hookup × 3 pages), site quality (prefers-reduced-motion, SRI hashes, changelog), code quality (5 simplify fixes)
- Previous state: VaultScore SDK existed but was not wired to any game page. CDN scripts had no integrity enforcement. Changelog stopped at Phase 21. prefers-reduced-motion not respected.
- New required direction: Full re-audit at 82/100 (10 categories, 38-item brainstorm). Implement leverage items 1–6: game score submission panels, Discord CTAs, prefers-reduced-motion, SRI hashes, changelog update, canonical tag verification. Simplify pass on all new code.
- Why it matters: Closes the biggest product gap since Phase 36 (games had no vault integration). SIL raised to 36/50. 38-item brainstorm establishes next two sessions' backlog.
- Supersedes prior entry: —

---

### 2026-03-30 — Audit follow-through: implement highest-impact items

- Category: Assignment + Approval
- Human input: "Audit project in its entirety and provide score/rating... Recommend the top items to implement by highest impact/potential." → then "Yes let us complete these steps. But first, explain what is the portfolio card" → then "yes do that"
- Area affected: Studio OS compliance, public data integrity, authenticated QA coverage, activation readiness
- Previous state: Portfolio Card missing, leaderboard/newsletter code assumed non-authoritative schema fields, authenticated portal testing existed only as backlog, activation blockers were scattered across multiple docs
- New required direction: Add the Portfolio Card, fix the rank/data contract drift, add authenticated portal test coverage, and consolidate activation blockers into a concrete runbook
- Why it matters: Raises process reliability, removes silent contract bugs, and converts the highest-impact audit recommendations into shippable repo work
- Supersedes prior entry: —

---

### 2026-03-30 — Theme expansion direction

- Category: Guidance + Approval
- Human input: "I wouldnt mind adding an ambient and warm color options too. I like dark mode easily the best though" → "Cool, lava and high contrst should be added too"
- Area affected: Shared site shell, theme system, visual customization
- Previous state: Broken light mode and a binary dark/light toggle only
- New required direction: Keep dark as the preferred default theme, fix light mode, and expand the picker to include ambient, warm, cool, lava, and high-contrast options
- Why it matters: Preserves the project’s darker core identity while adding curated alternates that feel intentional rather than generic
- Supersedes prior entry: —

---

### 2026-03-31 — Public repo boundary cleanup

- Category: Assignment + Approval
- Human input: "do what is best"
- Area affected: Public repository safety, operational documentation exposure
- Previous state: Public repo still contained a legacy root handoff file with internal setup/process detail and a privileged shortcut workflow document; generated `supabase/.temp/` metadata was tracked
- New required direction: Sanitize public-facing internal docs into safe stubs/pointers and remove generated local metadata from version control
- Why it matters: Keeps the website repo publicly shareable without carrying unnecessary operator-facing detail
- Supersedes prior entry: —

---

### 2026-03-31 — Fix remaining dark card surfaces

- Category: Assignment
- Human input: "yes do fix the darker card issue you mentioned unless you already did that"
- Area affected: Homepage theme parity, light-mode presentation
- Previous state: Shared shell was theme-aware, but several homepage cards still used fixed dark panel backgrounds
- New required direction: Move the prominent homepage cards onto theme-aware shared surfaces so they no longer stay dark in light mode
- Why it matters: Removes the most visible remaining mismatch in the multi-theme system
- Supersedes prior entry: —

---

### 2026-03-31 — Theme sync + Signal Log + legal notice direction

- Category: Assignment + Direction
- Human input: "Make sure the chosen theme is saved on that device for that individual and saved on their vault account too across devices if they have one (not yet launched to public). Fix the signal log page as the entries are on the far right side (vaultsparkstudios.com/journal) - make other UI/UX improvements" → "are there any copyright protection/trademark protection notes we can put anywhere on the website? Further build out the privacy policy too"
- Area affected: Theme persistence model, Vault Member account prefs, Signal Log UX/layout, legal/privacy/IP messaging
- Previous state: Theme choice was local-only, the journal filter row/layout pushed entries into the wrong grid column, and the legal pages underspecified account storage while IP notice was mostly limited to the footer
- New required direction: Keep per-device theme persistence, add account-backed restore for signed-in members, repair the Signal Log layout and shared-surface styling, and expand privacy/rights language without cluttering core product pages
- Why it matters: Improves cross-device polish, fixes a visible public-page regression, and makes ownership/data-handling boundaries clearer before broader public rollout
- Supersedes prior entry: —

---

### 2026-03-31 — Security/UX implementation push + VaultSparked price clarification

- Category: Assignment + Canon Clarification
- Human input: "Analyze website for improvements and refinements and security updates needed - propose any additional features or additionals to Vault Membership or anything on site" → "Complete all fixes and implement all ideas for this project in one pass" → "FYI the price is 24.99"
- Area affected: Security hardening, pricing truth surfaces, Vault Membership UX, activation readiness
- Previous state: The site had several identified security/truth gaps, no dedicated Claim Center or Vault Status surfaces in the member portal, and the public VaultSparked metadata still reflected outdated pricing copy
- New required direction: Ship the highest-value security fixes immediately, add the proposed membership-ready UX additions inside the existing portal, and treat `$24.99/month` as the canonical public VaultSparked price
- Why it matters: Tightens pre-activation trust surfaces, improves membership clarity without waiting for new backend systems, and removes avoidable pricing drift before launch-sensitive billing work
- Supersedes prior entry: —

---

### 2026-03-31 — Next-session flagging for authenticated test accounts

- Category: Assignment
- Human input: "add all of this to context/tasks for next session and flag it - push commit any updates"
- Area affected: Next-session testing workflow, project continuity, authenticated browser QA
- Previous state: Local Playwright auth setup existed in code, but the required dedicated Vault test-account work was not explicitly flagged in project context for follow-up
- New required direction: Record the dedicated Vault test-account setup as a flagged next-session prerequisite in context and push the supporting local Playwright env-loader updates
- Why it matters: Prevents the new authenticated browser coverage from stalling next session due to missing credentials/setup context
- Supersedes prior entry: —
