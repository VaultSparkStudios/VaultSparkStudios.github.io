# IGNIS_PROJECT_VOICES_SPEC — Per-project Voice Generation

**Owner repo:** `vaultspark-ignis`
**Consumer:** `vaultsparkstudios.github.io` (already shipped — `assets/ignis-project-block.js` reads `ignis/output/project-voices.json`)
**Drafted in:** vaultsparkstudios.github.io · S134
**Reason drafted here:** vaultspark-ignis was session-locked by another Claude Code session during S134.

---

## Purpose

The website's IGNIS project block on every project page renders an IGNIS voice quotation. Today, `ignis/output/project-voices.json` is hand-seeded in the website repo. The right home for voice generation is IGNIS itself, since IGNIS already has the narrator (`expression/narrator.ts`), voice renderer (`expression/voice-renderer.ts`), and per-project context.

The founder explicitly asked: *"give IGNIS freedom to say whatever it would like tied to that project/game"* — so the voices should be IGNIS's actual synthesis, not hand-prompted.

The founder also constrained: *"rely on current Max plan instead of doing unnecessary API calls"* — so generation runs through IGNIS's existing model routing, not direct Claude API calls.

---

## Deliverable

A new IGNIS CLI command:

```bash
npx tsx cli.ts voices [--project <slug>] [--all] [--out <path>]
```

That reads each project's IGNIS context + portfolio-pulse data and synthesizes a short voice quotation in IGNIS's own narrator style, writing the result to:

```
ignis/output/project-voices.json
```

This file is the same schema the website already consumes — no website-side changes needed.

---

## Schema (matches current website consumer)

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "ISO-8601",
  "generator": "vaultspark-ignis · cli voices",
  "narratorPersona": "IGNIS — Living Flame Intelligence v4.1 ...",
  "voices": {
    "<project-slug>": {
      "quote": "1–3 sentence IGNIS observation about the project",
      "tone": "wry|analytical|observational|cryptic|...",
      "scoredAt": "YYYY-MM-DD",
      "evidence": {
        "currentFocus": "...",
        "healthSnapshot": "green|yellow|red",
        "ignisScore": 12345,
        "lastSignal": "ISO-8601"
      }
    }
  }
}
```

The `evidence` block is new — it pins each quote to the IGNIS signal that drove it, so we can detect when a quote is stale relative to current truth.

---

## Voice characteristics

Per the IGNIS narrator persona in `expression/narrator.ts`:

- Sharp, sometimes contrarian, always evidence-grounded
- Speaks in the studio's own voice — IGNIS is not the studio's *advisor*, it's the studio's *instrument*
- Short — 1 to 3 sentences, never more
- Mentions specific evidence when possible (sprint number, score, blocker)
- Avoids marketing language; says what IGNIS actually observes
- May admit conflict-of-interest when commenting on itself or its consumers

### Bad voice example (rejected)

> "IdeaForge is an exciting AI evaluation platform that revolutionizes how ideas are scored!"

### Good voice example (accepted)

> "Generic scorecards are a category error. Every idea has its own dimensions of risk, and most evaluation tools force-fit ideas into a fixed rubric. IdeaForge generates the rubric from the idea. That's the architectural choice that matters. Everything else is implementation."

---

## Model routing

Per the IGNIS `intelligence/ai-budget-router.ts` policy and the founder's "Max plan" constraint:

1. Default to **local synthesis** using IGNIS's narrator + portfolio-pulse data (no external model call).
2. Only escalate to **Claude API** when:
   - `--force-fresh` flag is set, AND
   - daily IGNIS spend is below the $7/day cap (CANON-012), AND
   - the project's evidence has changed materially since last `scoredAt`.

This keeps the default path zero-cost and respects the cap.

---

## Cadence

- Run on every IGNIS `full` invocation (i.e., already happens once per closeout).
- Voices auto-refresh when project pulse changes — no separate cron needed.
- A `--force-all` flag regenerates everything regardless of staleness, for major template overhauls.

---

## Website-side compatibility

Zero changes required on the website side. The existing widget already:
- Reads `ignis/output/project-voices.json`
- Falls back gracefully when a voice is missing
- Includes `data-quote` attribute fallback for offline rendering

When IGNIS owns voice generation, the website's hand-seeded version becomes the bootstrap and gets overwritten by IGNIS's output on the next session that re-runs IGNIS.

---

## Status

- [ ] vaultspark-ignis: add `voices` CLI command
- [ ] vaultspark-ignis: implement local-synthesis path (no external call)
- [ ] vaultspark-ignis: optional Claude-routed `--force-fresh` path
- [ ] vaultspark-ignis: wire into IGNIS `full` command so closeout regenerates
- [ ] website: nothing needed (already consuming this schema)

**Picked up by:** next vaultspark-ignis session.
