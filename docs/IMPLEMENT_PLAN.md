<!-- source: docs/AUDIT_2026-11-22.json · Session 418 · public technical projection -->
# S418 technical implementation and acceptance plan

The twelve outcomes retain their original IDs and selected L2 depth. Source/local verification and hosted release acceptance are separate; every item remains pending until its complete acceptance exists. Detailed operator coordination is retained privately.

1. **content-baseline-preservation (L2)** — Preserve the served executable baseline when publishing content-only changes, including repeated releases and supported content lanes. Deployment-source attestations must remain distinct from the artifact actually served; stale or conflicting baseline inputs must fail.

   Acceptance: Focused regressions cover independent serving and source-attestation evidence, conflicting overlays, stale overrides, hotfixes and successive content releases that retain withheld executable bytes. Existing release holds remain enforced.

2. **signup-and-account-acceptance (L2)** — Preserve shared Obelisk identity ownership and website profile-completion safeguards. Verify the existing member and approved-investor journeys without broadening signup, account or access authority.

   Acceptance: Missing and underage paths cannot create website profiles. Candidate-based tests must establish permitted profile completion, sign-in, own-member data, existing approved-investor access, refusal boundaries, recovery and logout/revocation. Source tests alone do not establish hosted account acceptance.

3. **account-export-deletion (L2)** — Export all website-owned personal data and support confirmed, idempotent deletion across owned database, subscription and email records. Preserve shared identity ownership and unrelated users/content.

   Acceptance: A permitted disposable account can export its complete owned data and request deletion. Retries and partial database, subscription or email failures remain visible and cannot be reported as completed deletion. Shared data and other users remain preserved.

4. **checkout-and-content-reporting (L2)** — Show existing renewal terms clearly before checkout without changing prices or membership promises. Provide validated content reporting through existing contact infrastructure with honest delivery/error states.

   Acceptance: Checkout displays current renewal disclosure. Reports validate input and provide useful acknowledgement or failure feedback; actual delivery and required external legal/registration acceptance remain separately evidenced.

5. **agent-input-and-publish-boundaries (L2)** — Treat external feed facts as bounded untrusted data and separate read/author authority from publishing. Publish only the exact validated artifact through the existing constrained transfer boundary.

   Acceptance: Hostile feed instructions cannot become publishing instructions; authoring authority cannot publish. Exact artifact path, base, hash and regular-file restrictions are enforced, and bounded stale-source retries rerun validation.

6. **edge-rate-and-import-integrity (L2)** — Apply shared concurrency-safe request limits to the relevant public AI endpoints while preserving verified-principal classification, privacy, cache behavior and existing cost caps. Pin actual remote imports to reviewed versions.

   Acceptance: Concurrent requests and anonymous bypass attempts respect shared limits. Request admission fails closed when required state is unavailable, genuine cache hits preserve independent admission, and reviewed imports pass focused dependency/function checks.

7. **availability-and-project-waitlists (L2)** — Use the existing public availability authority consistently across current pages and generators. Persist project-specific waitlists with explicit confirmation, bounded abuse controls and truthful receipt states.

   Acceptance: Public counts, lifecycle labels, enrollment posture and access descriptions agree with current authorities. Waitlists retain the selected project and confirmation semantics; duplicate, expired, provider-failed and removal cases remain honest.

8. **canonical-site-information-architecture (L2)** — Consolidate overlapping identity, evidence, newsletter and account entry surfaces through existing content, canonical routes, generators and redirects while preserving meaningful anchors and protected deep links.

   Acceptance: Navigation, incoming links, query/fragment behavior, discovery, sitemap and crawl agree with the canonical route map. Published article/feed/Brand JSON resources remain available and retired index files do not return as redirect stubs.

9. **shared-visual-system (L2)** — Use the existing theme and shared shell system to provide clear hero, card and action hierarchy on affected pages, with readable desktop and mobile presentation in every supported theme.

   Acceptance: Affected routes and states require actual before/after rendered inspection across the supported themes and widths, with source-matching evidence. Accessibility, mobile parity and geometry checks cannot be replaced by source-only assertions.

10. **trust-beta-devlog-agent-surfaces (L2)** — Provide Trust, Beta, Devlog and Agents surfaces from current security, evidence, release, journal and discovery sources. Expose only declared public read operations through MCP and preserve factual beta/undated-roadmap posture.

   Acceptance: Human and agent routes link and render correctly. MCP rejects mutations and undeclared operations; the public surfaces do not invent deployment, access, launch or readiness claims.

11. **ai-currency-cache-and-scoped-verification (L2)** — Review actual provider defaults against current official evidence while preserving intentional pins and provider constraints. Verify existing cache isolation, corpus invalidation and scoped checks, correcting demonstrated gaps without replacing full release verification.

   Acceptance: Model choices and price estimates have applicable official evidence; cache hits/isolation and complete corpus invalidation pass focused checks. Scoped verification measurements are explicitly partial and cannot satisfy required full release acceptance.

12. **recent-goals-full-release-closeout (L2)** — Complete the inherited technical outcomes and the current source/release acceptance process without borrowing historical completion claims. Preserve required CI, staging/account journeys, production verification and rollback requirements.

   Acceptance: Each inherited outcome retains inspected acceptance evidence. Required current CI, isolated staging/account checks, authorized delivery, served production readback, rollback readiness and final closeout remain pending until their actual evidence exists.

Current scope preserves existing public prices, membership/rank authority, shared identity ownership, release holds and undated roadmap. No implementation-only result declares a lifecycle launch or completed release.
