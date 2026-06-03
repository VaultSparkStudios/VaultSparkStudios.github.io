# Studio Theme Evolution System

VaultSparkStudios.com should read like a professional creative studio with a living portfolio, not a single-page personal bet. New public pages should use immersive studio primitives, sharper portfolio copy, and public operating proof.

## Required posture

- Lead with VaultSpark Studios as a professional creative studio.
- Tie games, tools, worlds, membership, and intelligence back to one portfolio.
- Prefer release discipline, public proof, and Studio OS language over vague ambition.
- Preserve each project theme, but make the parent studio feel coherent.

## Reusable primitives

- `.vs-immersive-band` — full-width atmospheric section band for studio-level moments.
- `.vs-section-kicker` — compact uppercase section signal for scan-friendly context.
- `.vs-signal-grid` — responsive proof/stat/action grid.
- `.vs-proof-note` — constrained explanatory copy with mature line length.

## Inline-style maintenance

Use `node scripts/extract-inline-styles.mjs --check` before broad visual cleanup. It confirms the supported intelligence targets are already class-based. Use `--list-targets` to inspect the maintained page set, and `--targets=<comma-list>` when a narrow extraction pass is intentional.

The extractor is a maintenance utility, not a blanket formatter. Expand its target list only when the page has an explicit style-contract gate or a reviewed migration plan.

## Copy floor

Every major wayfinding page should answer three questions quickly:

1. What part of the studio portfolio am I looking at?
2. What has actually shipped or become visible?
3. Where should I go next if I care about this surface?
