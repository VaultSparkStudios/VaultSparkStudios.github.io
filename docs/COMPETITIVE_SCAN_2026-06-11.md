<!-- generated-by: S187 /goal competitive analysis -->
<!-- generated-at: 2026-06-11 · session 187 -->

# Competitive Scan — VaultSpark Studios vs. Top Independent Studios

> Benchmarked against the leaders in three categories, then corrected against repo truth.
> **Headline:** VaultSpark has **over-built the infrastructure** of a serious studio and **under-built the conversion surface** of one. The highest-ROI moves are small-to-medium presentation/funnel work layered on machinery that already exists.

## Benchmarked against
- **Indie game studios:** Supergiant, Klei, Landfall, Daniel Mullins
- **Indie-hacker multi-product brands:** levels.io, Marc Lou, Tony Dinh, 37signals
- **Design-led product studios:** Panic, Iconfactory, Active Theory

## Confirmed AHEAD of the field — do NOT rebuild
| Surface | Why it leads |
|---|---|
| Machine-SEO | `llms.txt` + `llms-full.txt` (sharded), `agents.json`, `entity-graph.json`, per-product `.ai/` fact-sheets, JSON-LD — exceeds Supergiant/Panic/Klei and every indie hacker reviewed |
| Performance | 172ms LCP, CF Pages edge, speculation-rules — on par with/ahead of far heavier studio sites |
| Build-in-public *transport* | forge-ledger feeds, `/studio-pulse/`, auto dispatches — more than most leaders HAVE |
| Press kit · membership/identity spine | dedicated press kit; one Vault account across products (rare for an indie studio) |

## The real gaps — and what S187 did about them
| # | Gap (competitive) | Repo-truth correction | S187 action |
|---|---|---|---|
| 1 | **No studio-wide email capture** (Supergiant Blast; every indie hacker) | PARTLY WRONG — a live **ConvertKit ESP** (`kit.js`) already powers the journal form; the `footer-email-form` was wired by JS but existed on **no page** (dead) | ✅ **Activated** the dead footer wiring through the existing ESP — homepage footer column + `footer-dispatch.js` (no new vendor, honest-fail) |
| 2 | **Build-in-public has no human VOICE** (process/failures/numbers — Mullins/Lou) | TRUE — journal essays 81d stale, changelog 59d, while machine feeds stayed fresh | ✅ **`draft-weekly-forge.mjs`** drafts a SOUL-voiced "This week in the Forge" from the ledger + **`check-content-freshness.mjs`** warn-gate |
| 3 | **Proof is self-asserted, not honest** (levels.io shows failures) | TRUE — homepage shows community stats but never portfolio truth | ✅ **honest-traction-scoreboard** on `/studio/`: `3 live · 8 forge · 16 sealed · 186 sessions` — the SEALED count shown deliberately as a trust signal |
| 4 | **Portfolio is a grid, no cross-product routing** (Lou's compounding thesis) | TRUE | ✅ **cross-game-play-next** routes live↔live + forge→playable; never dead-ends |
| 5 | Studio manifesto / soul page | ALREADY DONE — `/studio/` has a manifesto + "We Stand For" | ⏭ skipped (freshness-check caught) |
| 6 | Compounding-promise on membership | ALREADY DONE — `/membership/` states "1 Account, every world" + "Early Access" | ⏭ skipped |
| 7 | Interactive AI vs score dashboard | ALREADY DONE — `/oracle/` is the interactive ask; `/ignis/` already links to it ×2 | ⏭ skipped |
| 8 | Discord/community front-and-center | Discord + Community in footer only | ⏸ deferred — nav promotion needs sitewide propagate-nav |
| 9 | Steam / wishlist launch funnel | Browser-only by design | ⏸ founder-gated (per-title commercial decision); browser variant = wishlist-momentum (deferred, needs Supabase) |
| 10 | Per-product key/capsule art | Shell craft strong, hero art thin | ⏸ founder/design-gated |

## Methodology note
The competitive research agent fetched the live site, which **403s datacenter fetches** (Cloudflare bot-challenge — expected, not an outage), so it reconstructed inventory from deployed source. That's why it missed the live ConvertKit integration (couldn't execute the wired JS) — corrected here against the repo. **Lesson reinforced:** distrust external research against repo truth exactly as we distrust the audit.

## Process improvement shipped
`scripts/check-audit-staleness.mjs` (built S187) greps the corpus + TASK_BOARD DONE history for distinctive phrases before any audit candidate is scored — it immediately caught gaps 5/6/7 as already-done, preventing three wasted implement passes.

*Full source citations in the S187 research transcript. Recommend re-running this scan quarterly and diffing.*
