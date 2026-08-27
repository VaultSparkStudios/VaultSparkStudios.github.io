# Route consolidation analysis — 2026-08-25

This analysis precedes the S330 route changes. It records the live inbound-link
surface, the unique content retained, generator ownership, and the explicit
destination for every retirement.

| Cluster | Live evidence | Unique value retained | Decision |
|---|---|---|---|
| Membership | /membership/ 130 inbound HTML files; /membership-value/ 129; /vaultsparked/ 130; /vault-portal/ 128; /join/ 3. The first four were advertised together in the canonical shell. | /membership/ already contains overview, rank economy, tier choice, benefits, studio discount, games access, community, recent ships, and the final join action. /vault-member/ owns registration, sign-in, account, and member state. | Keep /membership/ for understanding/choice and /vault-member/ for the experience. Redirect the other four to the matching section/action. |
| Leaderboards | /leaderboards/ 130 inbound files; /ranks/ 129; /leaderboards/global/ 1. build-leaderboard-subpages.mjs owns the redundant global child while the main page already has Global, Challenges, Recruiters, Franchise Architect, and Call of Doodie tabs. | Rank meaning and global standings remain addressable as #ranks and #global on the main page. | One canonical /leaderboards/ home; redirect /ranks/ and /leaderboards/global/. |
| Orphan batch | /notebook/, /ip/, /brand/system/, /ignis/roi/, /nervous-system/, and /security/trusted-types/ each had one inbound HTML file. Legacy /franchise-architect/ and /solara/ roots each appeared across 132 files because shell propagation carried old runtime links. /share/ is intentionally excluded because it is the manifest-declared Progressive Web App share target. | Notebook is now linked from Studio. Community and Vault Wall remain linked member surfaces. Rights, brand, IGNIS, Signal Digest, security, and game marketing content already lives at the canonical destinations. The share receiver remains a distinct installed-app capability. | Link /notebook/, /community/, and /vault-wall/; preserve /share/; retire the remaining aliases with permanent redirects and noindex fallback stubs. |
| Projects catalog | The hand-authored page exposed 11 cards while api/public-intelligence.json, generated from the portfolio registry, exposes 20 current initiatives. | Existing custom project pages remain canonical where present; external live projects retain their deployed URL; otherwise the catalog shows an honest profile-pending state. | Render the catalog from public intelligence on every build and gate drift. |

No pricing, authentication policy, or membership-tier logic changes are made.
This change only removes parallel explanations and stale aliases.
