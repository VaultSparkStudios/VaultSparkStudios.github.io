# VaultSpark public analytics measurement system

Status: implemented in S315 · public-safe architecture and operator handoff

## What changed

VaultSpark no longer treats every number as a “page view.” The public product now
keeps four distinct measurement classes:

| Class | Answers | Does not mean |
|---|---|---|
| Cloudflare Web Analytics | Human browser page loads and visits | Requests, assets, or unique people |
| Cloudflare Traffic Analytics | Edge requests, HTML responses, cache activity, threats, and bytes | Human visits |
| VaultSpark Real User Monitoring | Accepted performance and engagement observations | Traffic or unique readers |
| Derived Studio receipts | Portfolio, editorial, proof, and release facts | Audience |

These classes are never added together. Every public metric carries its source,
environment, bot policy, window, observed-through date, sampling method, freshness,
and interpretation. Missing is rendered as unavailable rather than zero.

## Cloudflare collection plane

config/cloudflare-analytics-surfaces.json is the complete zone/host registry.
scripts/pull-cloudflare-analytics.mjs reads Cloudflare through the Studio secrets
gateway and produces:

- data/cloudflare-analytics.json — public-safe source snapshot;
- api/ecosystem-analytics.json — validated Cloudflare receipt;
- data/cloudflare-analytics-history.ndjson — append-only daily history.

Audience totals use production hosts only, exclude Cloudflare-classified bots, and
use complete UTC days. Edge totals remain a separate infrastructure layer. Adaptive
datasets publish their sample interval and confidence metadata.

The daily workflow refreshes the receipts and both public surfaces. It cannot publish
a credential: the token exists only as an encrypted repository secret, and the
generated artifacts contain aggregates and provenance only.

## Public surfaces

/stats/ is the VaultSpark Studios website report. It deliberately leaves its
30-day human page-load metric unavailable because Cloudflare Web Analytics has not
observed vaultsparkstudios.com in the current dataset. The 97 seven-day and 189
thirty-day legacy values are labeled performance samples, which is what they were.

/stats/ecosystem/ is the divided Studio ecosystem report. It includes all 19 public
projects alphabetically, even when a project is unmeasured. Audience coverage and
edge coverage have independent denominators; staging is excluded from audience; no
traffic leaderboard is shown while instrumentation coverage is uneven.

The API equivalents are stats.json, api/ecosystem-stats.json, and
api/ecosystem-analytics.json. They are advertised to agents through agents.json
and the large-language-model discovery files.

## The Desk: live readers and engaged time

Every published article has a reader-activity panel:

- “Reading now” is a rolling 90-second presence window in Cloudflare Key-Value
  storage. A random tab identifier is hashed with request context and expires.
  Exact counts below three are suppressed.
- “Engaged time” counts seconds only while the article is visible and its tab is
  focused. One bounded summary is written per completed observation. No cookie,
  account ID, raw Internet Protocol address, query string, or durable session ID is
  stored.
- Public averages remain unavailable until a story has five observations. The
  feed explicitly says these are completed observations—not unique people and not
  Cloudflare visits.

The public aggregate is api/news-desk-engagement.json; sufficient snapshots enter
an append-only history. With no qualifying observations yet, every story honestly
renders “Building a sample.”

Every generated editorial illustration also has an independent compact emoji panel:
👍 Like, 🔥 Fire, 😂 Laugh, and 🤯 Wow. A selection is highlighted and remembered
only after the Worker confirms delivery. Panel keys include the story and panel ID,
so their counts cannot contaminate story-level or writer-level reactions.

## Remaining provider activation

The analytics-read credential can query all Studio zone/account analytics, but it
cannot change Cloudflare Web Analytics site settings. To unlock main-site audience
data, enable Web Analytics for vaultsparkstudios.com in Cloudflare or provide a
narrow token with Account Settings Read/Edit. After Cloudflare begins emitting the
host, the next daily pull will replace “Unavailable” automatically—no code or manual
number entry is required.

The new Desk presence route is implemented and hermetically tested. It must be staged
with a non-production R2 binding and pass the Worker release gate before production
promotion; until then, the article UI reports the endpoint as unavailable and never
simulates a live reader.

## Verification

- Cloudflare derivation self-test: 7/7.
- Ecosystem derivation self-test: 4/4.
- Desk engagement derivation self-test: 5/5.
- Worker unit tests: 42/42.
- Focused browser tests: 25 analytics/theme tests and 3 Desk interaction tests.
- Rendered visual review: 56/56 hash-bound captures manually reviewed.
- Mobile trace after geometry reservation: /stats/ LCP 252ms, CLS 0;
  /stats/ecosystem/ LCP 228ms, CLS 0.0091; touched Desk article LCP 412ms, CLS 0.
- Lighthouse CI now audits the three touched routes locally and on staging with a
  route-specific mobile performance floor of 0.90.
