# ORACLE_SPEC — Studio-wide Ecosystem Data Aggregator

**Owner repo:** `vaultspark-studio-ops`
**Consumer repo:** `vaultsparkstudios.github.io` (already shipped — `/oracle/` page renders this feed)
**Drafted in:** vaultsparkstudios.github.io · S134
**Reason drafted here:** vaultspark-studio-ops was session-locked by Codex during S134. Drop-in spec.

---

## Purpose

The website's `/oracle/` page currently reads `ignis/output/portfolio-pulse.json` directly from the website repo. That file is generated locally by IGNIS but it only refreshes when a session in this repo runs IGNIS — meaning the public Oracle is only as fresh as the *website's* last closeout, not the *ecosystem's*.

We need a **single, authoritative ecosystem feed**, published by studio-ops on a cron schedule, that the website pulls.

---

## Deliverable

A studio-ops command that produces `portfolio/ECOSYSTEM_STATE.json` covering **every project in `PROJECT_REGISTRY.json`**, aggregated from each project's `context/PROJECT_STATUS.json` + each project's local `ignis/output/portfolio-pulse.json` if present.

### Output schema

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "ISO-8601",
  "generatedBy": "studio-ops · scripts/build-ecosystem-state.mjs",
  "studioTotals": {
    "projects": 29,
    "sparked": 5,
    "forge": 18,
    "vaulted": 6,
    "blockedTotal": 47,
    "freshLast7d": 12,
    "staleOver30d": 3
  },
  "ignisAggregate": {
    "lastIgnisRunAt": "ISO-8601",
    "currentStudioScore": 970,
    "trend": "↑",
    "studioCognitionTier": "ignited"
  },
  "projects": [
    {
      "slug": "vaultsparkstudios-website",
      "name": "VaultSparkStudios.github.io",
      "vaultStatus": "sparked",
      "health": "green",
      "liveUrl": "https://vaultsparkstudios.com/",
      "stagingUrl": "https://website.staging.vaultsparkstudios.com",
      "currentFocus": "...",
      "nextMilestone": "...",
      "blockers": [],
      "blockerCount": 5,
      "lastUpdated": "2026-05-17",
      "staleDays": 0,
      "ignisScore": 970,
      "ignisTier": "ignited",
      "voice": {
        "quote": "...",
        "tone": "...",
        "scoredAt": "..."
      },
      "links": {
        "repo": "https://github.com/...",
        "live": "https://...",
        "docs": "https://...",
        "support": "https://..."
      }
    }
  ]
}
```

### Implementation outline

```js
// vaultspark-studio-ops/scripts/build-ecosystem-state.mjs
import fs from 'node:fs';
import path from 'node:path';

const REGISTRY = JSON.parse(fs.readFileSync('portfolio/PROJECT_REGISTRY.json', 'utf8'));
const DEV_ROOT = process.env.STUDIO_DEV_ROOT || path.resolve('..');

const projects = REGISTRY.projects.map(p => {
  const base = p.localPath || path.join(DEV_ROOT, p.slug);
  const status = readJSON(path.join(base, 'context', 'PROJECT_STATUS.json'));
  const voice  = readJSON(path.join(base, 'ignis', 'output', 'project-voices.json'))?.voices?.[p.slug];
  return {
    slug: p.slug,
    name: p.name,
    vaultStatus: p.vaultStatus || status?.vaultStatus || 'forge',
    health: status?.health || p.health || 'unknown',
    liveUrl: status?.liveUrl || p.runtimeUrl || null,
    stagingUrl: p.stagingUrl || null,
    currentFocus: status?.currentFocus || p.currentFocus,
    nextMilestone: status?.nextMilestone || p.nextMilestone,
    blockers: status?.blockers || [],
    blockerCount: (status?.blockers || []).length,
    lastUpdated: status?.lastUpdated || null,
    staleDays: status?.lastUpdated ? Math.floor((Date.now() - Date.parse(status.lastUpdated)) / 86_400_000) : null,
    ignisScore: status?.ignisScore || null,
    ignisTier: status?.ignisTier || null,
    voice: voice || null,
    links: {
      repo: p.repo ? `https://github.com/${p.repo}` : null,
      live: status?.liveUrl || p.runtimeUrl || null,
    },
  };
});

const studioTotals = aggregate(projects);
const out = { schemaVersion: '1.0', generatedAt: new Date().toISOString(), generatedBy: 'studio-ops · scripts/build-ecosystem-state.mjs', studioTotals, projects };
fs.writeFileSync('portfolio/ECOSYSTEM_STATE.json', JSON.stringify(out, null, 2));
```

### Publishing

Two delivery paths — pick one:

**Option A — Studio-ops publishes to GitHub Pages (recommended).** Studio-ops gets a public site at `studio-ops.vaultsparkstudios.com` that exposes only `/ecosystem-state.json`. Website fetches it directly.

**Option B — Studio-ops commits `ECOSYSTEM_STATE.json` to the website repo via PR.** Closeout autopilot writes the file, opens a PR titled `chore(oracle): refresh ecosystem feed` for review. Simpler infra, but couples release cadences.

### Cron

```yaml
# .github/workflows/ecosystem-state-cron.yml
name: Ecosystem State Refresh
on:
  schedule:
    - cron: '0 */6 * * *'  # every 6 hours
  workflow_dispatch:
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/build-ecosystem-state.mjs
      - run: |
          # Option A: deploy to studio-ops pages
          # Option B: open PR to vaultsparkstudios.github.io
```

### Website-side switchover (minimal change)

When `ECOSYSTEM_STATE.json` is live, the Oracle page's data source flips from local `portfolio-pulse.json` to the new feed. Single-line change in `/oracle/index.html`:

```diff
- fetch('/ignis/output/portfolio-pulse.json', { cache: 'no-cache' })
+ fetch('https://studio-ops.vaultsparkstudios.com/ecosystem-state.json', { cache: 'no-cache' })
```

The IGNIS project block stays as-is — it can read either source since the schema is compatible.

---

## Status

- [ ] studio-ops: implement `build-ecosystem-state.mjs`
- [ ] studio-ops: cron workflow
- [ ] studio-ops: publish strategy (A or B) chosen
- [ ] website: switch fetch URL once feed is live
- [ ] website: add ETag/304 caching once feed is hosted

**Picked up by:** next studio-ops session (after S112 sprint closes).
