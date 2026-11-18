# Threat model — vaultsparkstudios.com

Public-safe summary. It names classes of attack and the control that answers each one. It contains no credentials, no internal hostnames and no exploit detail. Operational runbooks live in the private studio operations repository.

Last reviewed: 2026-11-17. Studio baseline: CANON-057 (AI-era security baseline).

## What we protect

| Asset | Why it matters |
|---|---|
| Member accounts and sessions | Identity, paid membership, profile data |
| Points, ranks and entitlements | Fairness of leaderboards and rewards; paid-tier access |
| Investor portal documents | Confidential business material |
| Published pages | Visitors trust what the site says and runs in their browser |
| Deploy and automation credentials | Anything that can publish to the site or change the database |
| The repository and its agent instructions | Agents write and ship most changes |

## Trust boundaries

1. **Browser ↔ edge.** Everything from a browser is untrusted. The Cloudflare Worker sets the security headers and the content security policy, gates private routes, and rate-limits public forms.
2. **Browser ↔ database.** The browser holds only a publishable key. Row-level security is on for every table. Functions that run with elevated rights must check the caller themselves.
3. **Third-party text ↔ model ↔ page.** News feeds are third-party input. A model turns them into articles that are published on a schedule. Feed text and model output are both treated as data.
4. **Automation ↔ repository.** Scheduled workflows commit and deploy. Coding agents read files, web pages and tool output while holding credentials.
5. **Dependencies ↔ build.** Packages and third-party workflow actions run with the build's privileges.

## Attack classes and controls

| # | Attack class (2025–26 examples) | Control here | Verified by |
|---|---|---|---|
| 1 | Elevated database function trusts the caller, or is callable without signing in (exposed row-level-security gaps in AI-built apps) | Point awards use server-side rules; service-only functions have no public grant; the internal overload is not client-callable | `scripts/apply-supabase-migration.mjs --probe point-award-integrity` |
| 2 | Script injection through model-written or member-written text | HTML escaping at render; JSON placed in inline scripts is escaped; containers of untrusted text are marked and the edge removes any script, frame or plugin element inside them | `scripts/test/safe-inline-json.mjs` |
| 3 | Hidden instructions in text (zero-width, direction-override and TAG characters in feeds, rules files) | Removed where feed text enters, and again at render; repository text is scanned by the studio agent-surface check | `scripts/lib/invisible-text.mjs`, studio `check-agent-surface-integrity` |
| 4 | Prompt injection through feed content | Invisible characters are removed before a model reads feed text; model output must pass claim-parity and disclosure checks before publishing; article text is escaped at render, so injected markup cannot run | `scripts/check-news-claim-parity.mjs`, `scripts/check-news-ai-disclosure.mjs` |
| 5 | Package worm or hijacked release (self-propagating npm worms, maintainer phishing) | Committed lockfile; `npm ci`; install scripts disabled in every npm root; three-day release-age floor; zero runtime dependencies | studio `check-supply-chain-baseline`, `scripts/verify-supply-chain.mjs` |
| 6 | Retargeted action tag (third-party action tags rewritten to malicious commits) | Every action pinned to a full commit SHA; Dependabot proposes new SHAs after a cooldown | studio `check-supply-chain-baseline` |
| 7 | Workflow script injection and over-privileged tokens | Inputs reach the shell only through environment variables; the token defaults to read-only; write scope is granted per workflow | workflow review, `scripts/check-workflow-step-guards.mjs` |
| 8 | Look-alike package run by an agent tool launcher | The MCP launcher never downloads from the registry (`--no-install`); agent-suggested installs go through package trust | `.mcp.json`, studio `package-trust` |
| 9 | Internal records published by accident | The deploy uses a positive allowlist; operator folders may not appear in it | `scripts/test/served-surface-boundary.mjs` |
| 10 | Payment-page skimming | Card entry happens only on Stripe-hosted pages; the content security policy restricts script sources | `scripts/verify-live-headers.mjs`, `scripts/check-sri.mjs` |
| 11 | Account takeover by social engineering (voice cloning, help-desk resets, token theft from integrations) | Owner-only: hardware keys or passkeys on every provider account; no money, credential, access or deploy request is acted on from voice, video, chat or email alone; quarterly review of connected apps | Owner checklist |
| 12 | Domain or subdomain takeover | Custom domain verified with the host; DNS records removed with the resource they point to; registrar lock | Owner checklist |
| 13 | Automated abuse of sign-up, forms and AI endpoints | Turnstile, signed request tokens and rate limits on public forms; per-request budgets and quotas on AI endpoints | `tests/` unit specs for Turnstile, CSRF and rate limits |

## Known gaps (tracked, not yet closed)

- Sign-up through the member portal is not yet behind a bot check or an age screen. The identity provider move to Obelisk is the intended place for both.
- Several elevated database functions owned by sibling products share this database and can be called without signing in. Their owners have been notified through the studio transport; this repository does not edit them.
- Prompts do not yet fence feed text as data with an explicit instruction, and the publishing workflow's credentials are not yet split from the step that reads feeds.
- Trusted Types is in report-only mode.
- Remote imports in edge functions are version-ranged, not pinned to an exact version with a hash.
- The per-address limit on one AI endpoint is held in instance memory, so it is per-instance.

## Reporting

See `SECURITY.md` and `/.well-known/security.txt`.
