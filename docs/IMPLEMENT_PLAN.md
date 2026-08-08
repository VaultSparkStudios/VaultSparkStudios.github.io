<!-- generated-by: /implement (session 307) -->
<!-- generated-at: 2026-08-07 -->

# Implementation Plan — S307

**Source:** `docs/AUDIT_2026-08-07.json` (6 items)
**Order:** public truth → deterministic boundary → discovery → machine subscription → rendered proof → release authority.

**Success bar:** every page change passes mobile Lighthouse Performance ≥90 or records a concrete exception; UI changes require CANON-053 desktop/mobile, every-theme rendered-pixel proof.

| Order | Audit # | Slug | Rung | Outcome |
|---|---:|---|---|---|
| 1 | 1 | source-bound-news-graduation | L2 | Replace public fiction with a primary-source edition. |
| 2 | 2 | deterministic-news-publish-boundary | L2 | Make preview data incapable of publishing. |
| 3 | 3 | news-navigation-and-discovery | L2 | Make The Desk findable from header, footer, and sitemap. |
| 4 | 4 | news-json-feed | L2 | Give people and agents a canonical subscription surface. |
| 5 | 5 | news-rendered-pixel-and-accessibility-proof | L2 | Prove the real interface across supported states. |
| 6 | 6 | differential-obelisk-registration-proof | L2 | Name the exact provider registration still holding staging. |

## Execution state

- Items 1–5: shipped and verified.
- Item 6: local differential proof complete; provider-side stable-staging registration remains honestly blocked.
- Production News promotion: held by CANON-007 until `https://website.staging.vaultsparkstudios.com/auth/callback` is accepted. The production callback already passes.
