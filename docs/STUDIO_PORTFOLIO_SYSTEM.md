# Studio Portfolio System

VaultSpark should track projects with one shared portfolio language across every medium.

## Three-layer model

1. Project repos own detailed truth.
2. The private studio ops repo owns the aggregated portfolio registry.
3. The internal dashboard should visualize that registry, not replace project memory.

## Required project-level files

Every active studio project should maintain:

- `context/PORTFOLIO_CARD.md`
- `context/PROJECT_STATUS.json`

Use the card for fast human orientation and the JSON file for machine-readable aggregation.

## Aggregation model

The private studio ops repo should maintain:

- `portfolio/PROJECT_REGISTRY.md`
- `portfolio/PROJECT_REGISTRY.json`

These aggregate the project-owned summaries without replacing the project repos as the source of detailed truth.

## Update rule

When project status truth changes, update:

1. `context/PORTFOLIO_CARD.md`
2. `context/PROJECT_STATUS.json`
3. any active handoff or current-state files that changed materially
4. the studio registry in the private ops repo

## Dashboard rule

The internal Studio Dashboard should become the command-center visualization layer for portfolio health, blockers, readiness, and stale-project detection.

It should not become the only source of project truth.
