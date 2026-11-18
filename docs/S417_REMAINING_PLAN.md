# Public-beta plan — remaining work after S417

S417 shipped the first tranche: point-award integrity (live), script-injection hardening for model-written pages, supply-chain baseline, served-surface boundary, opt-in analytics with Global Privacy Control, and stale-claim fixes. Threat model: `docs/THREAT_MODEL.md`. Decisions: D-S417.1–6.

Remaining, in order. Each item names its acceptance check.

1. **Signup safeguards** — bot check and neutral age screen on the site's own signup path; anonymous sign-ins off after sibling owners confirm; then flip public copy to "open". Check: signup without a token is refused; under-13 stores nothing.
2. **Deletion and export** — a processor for portal delete requests across database, payments and email, with confirmation. Check: staging account fully removed.
3. **Subscription and takedown** — `/subscription-terms/` and `/dmca/` are drafted (D-S417.7). Still open: auto-renewal wording inside checkout, a report-content form. Founder: designated-agent registration, lawyer review.
4. **Agent guardrails** — fence feed text as data in Desk prompts; split feed-reading from publishing credentials; shared rate limiter for AI endpoints; pin edge-function remote imports.
5. **One truth source** — `api/public-intelligence.json` owns counts, signup posture and plan availability; coherence gate fails on hardcoded copies; real per-game waitlists.
6. **Information architecture** — proof pages 6→3, studio identity 5→2, one newsletter centre, one sign-in door, one account area; delete retired page folders.
7. **Visual system** — one hero and card component, theme depth, single primary call to action, rendered-pixel receipts.
8. **New pages** — Trust Center, Beta hub, Devlog, Agents guide with a read-only MCP endpoint, undated roadmap.
9. **AI cost and quality** — model-ID currency, cached answers before model calls, static search index, tiered `build:check`.
10. **Beta gate** — release gate, human sign-up-to-delete walk on staging, founder account-security checklist, announcement.
