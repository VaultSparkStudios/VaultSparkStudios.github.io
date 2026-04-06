# Soul — VaultSparkStudios.github.io

## Creative identity

The VaultSpark Studios site is the studio's face to the world. It should feel:
- **Intentional and atmospheric** — dark theme, cyberpunk-adjacent, premium
- **Earned, not generic** — membership feels like entry into something real, not a SaaS signup
- **Studio-owned** — every corner of the site reflects VaultSpark identity, not templates

## Non-negotiables

1. **Vault identity is consistent** — brand vocabulary (FORGE/SPARKED/VAULTED), rank system language, Vault Member framing must stay coherent sitewide. No generic "user" or "subscriber" language leaking in.
2. **Membership must feel real** — the 9-tier rank system, achievements, and challenges are load-bearing for community buy-in. Never ship half-baked portal features.
3. **Security is not negotiable** — auth flows, CSP headers, Cloudflare Worker, and crawler blocking must stay intact. Never disable or weaken without explicit Studio Owner approval.

## Quality bar

- Mobile-first, responsive on all screen sizes
- Dark mode is default; light mode must be a first-class experience
- No console errors, no broken links, no layout shifts on load
- Accessibility: touch targets, semantic HTML, axe-core CI enforced

## Anti-goals

- No generic SaaS aesthetics — this is a game studio with personality
- No shipping features that break the rank/achievement economy without a migration plan
- No committing secrets, internal docs, or private financial data to this public repo
