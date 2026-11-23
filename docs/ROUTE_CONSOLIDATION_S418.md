# S418 canonical route map

Status: implemented in the current source; final rendered, staging and production acceptance remains pending. The route court passes 28 retired routes with no index stubs or meta-refresh pages. Source transfer retained 63 Studio/Pulse/How We Build anchors, nine Brand anchors and the existing live modules.

The existing redirect court in `scripts/build-route-consolidation.mjs`, `config/route-consolidation.json` and `_redirects` remains authoritative. Consolidation must update actual content, links, generators, discovery, sitemap and rendered acceptance together. Retired directories must not contain redirect stub pages.

| Existing surface | Canonical destination | Preserved purpose |
|---|---|---|
| `/evidence/`, existing `/proof/` and `/stats/` aliases | `/evidence/` and its existing anchors | Measured claims, numbers and verifiable receipts |
| `/security/` | `/trust/` | Security policy and responsible disclosure, with old section anchors retained and fragment-free legacy redirects |
| `/ignis-health/` | `/status/` | Retire the internal canary page; use public health feeds for the Status section, without importing authenticated auto-probes |
| `/status/` | `/status/` | Availability, incidents and service-specific health |
| `/studio/` | `/studio/` | Studio identity, manifesto and operating approach |
| `/studio-pulse/` | `/studio/` | Actual portfolio/activity signals; preserve all existing named sub-section anchors and live modules |
| `/how-we-build/` | `/studio/` | Public explanation of the process and evidence, preserving old section IDs; no operator runbook content |
| `/brand/` index | `/press/` | Downloadable original brand assets, typography and approved usage; preserve `/brand/assets.json` and `/brand/tokens.json` |
| `/press/` | `/press/` | Press facts, media assets and brand usage |
| `/journal/` index | `/devlog/` | The existing dated studio writing and archive; published article URLs remain valid |
| `/dispatch/` | `/dispatch/` | One newsletter centre, with clear choices for studio release notes and The Desk |
| `/news/` | `/news/` | The Desk remains an editorial destination; subscription links lead to the newsletter centre |
| `/sign-in/` | `/sign-in/` | Existing human sign-in audience chooser; machine auth routes retain their contract |
| `/vault-member/` and existing `/vault-portal/` alias | `/vault-member/` | The single member account area, with login/register/recovery/deep-link intents preserved |
| `/member/?…` | unchanged | Public member lookup is a distinct public profile journey, not a duplicate account area |
| `/membership/` | unchanged | Public tier explanation and pricing, not another account area |
| `/roadmap/` | unchanged | Existing undated roadmap; no date promises added |

New canonical `/trust/`, `/beta/`, `/devlog/` and `/agents/` surfaces must reuse current security/evidence, actual release posture, existing journal content and AI discovery contracts. A Beta hub is documentation of actual access and readiness, not a declaration that a lifecycle transition or public launch occurred. The Agents guide's MCP endpoint must support only its declared read operations.

The five identity destinations become Studio and Press; the proof destinations remain Evidence, Trust and Status. Redirects into these routes must preserve meaningful old anchors and query/deep-link behavior. Existing content must be moved or deliberately reconciled before a source folder is retired.

Legacy redirects are fragment-free because fragments never reach the server and a fixed replacement fragment discards the caller's old section target. New canonical links can point directly to `#pulse`, `#how-we-build`, `#brand` or `#security`. Published Journal articles, dispatch feeds and Brand JSON contracts remain real resources; retiring an index does not authorize a wildcard directory redirect.

Migration dependencies include Journal date/feed builders and news/pathway chrome harvesting, How We Build's evidence-page chrome source, Pulse's flight-director and candidate/release contracts, evidence-graph inputs, and pathname-based waveform/live-module loading. These must move with their actual content and anchors. Protected investor entry and `/login`, `/auth/*` and member deep links retain their existing contracts.

Acceptance: inspect before/after desktop/mobile captures in all seven themes, verify mobile navigation and changed panels, run the route court, sitemap/navigation/discovery coherence and a complete crawl, and exercise protected entry/deep links against the candidate. No count or source-only assertion replaces those checks.
