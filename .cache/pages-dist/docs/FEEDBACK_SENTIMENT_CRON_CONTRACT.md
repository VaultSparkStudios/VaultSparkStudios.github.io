# Feedback Sentiment Cron — Contract (S163 · audit #9)

Completes the feedback digest. S162 shipped the **client-side theme bucketing**
slice on `/feedback/insights/`. This is the other half: a server-side
categorization cron that writes a sentiment-trend + the top-3 *un-addressed* asks
into a public-safe aggregate the site reads.

Pairs with audit #3 (feedback-ship-provenance): provenance shows **what's been
addressed**; this shows **what hasn't yet**.

## Ownership (CANON-018 / CANON-029)

The cron is **studio-ops-owned** — it touches raw `vault_feedback` rows, so it
must run where service-role credentials live, never in this public repo. Ship it
via Ark cargo to the studio-ops slug; this repo only consumes the public-safe
aggregate. Free-tier safe (CANON-029): scheduled batch categorization, no
per-user studio cost.

## Website side (shipped here)

- `api/feedback-summary.json` — public-safe aggregate the site reads. Seeded
  empty; the reader stays silent until it has data.
- `assets/feedback-summary.js` — renders sentiment trend + top-3 un-addressed
  asks on `/feedback/insights/` when present.

## Aggregate shape (public-safe — no raw feedback text ever)

```json
{
  "generatedAt": "YYYY-MM-DD",
  "windowDays": 30,
  "sentimentTrend": [
    { "week": "2026-W21", "positive": 12, "neutral": 7, "negative": 3 }
  ],
  "topUnaddressed": [
    { "theme": "Conversion", "count": 5, "hint": "pricing clarity" }
  ]
}
```

Counts and short theme/hint labels only — never a member's words. The hint is a
curator-written summary phrase, not a quoted excerpt (voice-leak patrol applies).

## Suggested SQL view (studio-ops side)

```sql
-- public-safe rollup: counts per sentiment per ISO week, last 30d
create or replace view feedback_sentiment_weekly as
select to_char(created_at, 'IYYY-"W"IW') as week,
       count(*) filter (where sentiment = 'positive') as positive,
       count(*) filter (where sentiment = 'neutral')  as neutral,
       count(*) filter (where sentiment = 'negative') as negative
from vault_feedback
where created_at > now() - interval '30 days'
group by 1 order by 1;
```

The cron classifies sentiment (BYOK/local model per CANON-029), writes
`feedback_summaries`, and exports the public-safe slice to
`api/feedback-summary.json` on deploy.
