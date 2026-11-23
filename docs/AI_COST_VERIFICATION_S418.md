# AI model and scoped verification evidence

Reviewed 2026-11-23. This is source and offline functional evidence. It does not establish provider entitlement, live inference quality, deployment, or full release acceptance.

## Provider choices

| Surface | Actual source choice | Review result |
| --- | --- | --- |
| Ask IGNIS and semantic search | Claude Sonnet 5.5 by default; the dated Haiku 4.5 snapshot serves inexpensive routes and declared fallback paths | Sonnet remains in the current official lineup. Haiku 4.5 remains an active legacy model. Preserve the explicit snapshot and tested request behavior. Haiku 5.5 is a documented successor requiring a separate behavior and quality comparison before adoption. |
| Shared script router | Sonnet 5.5, Opus 5.5; explicit Haiku 4.5 and Fable 5.1 pins | Preserve selection and existing model-specific thinking controls. A new model announcement does not authorize a routing change. |
| Desk authoring | Self-hosted Qwen/Qwen3.6-35B-A3B-FP8, then the declared Qwen3.8-27B standby | Preserve the provider-specific advisory contract, constrained failover and actual-author provenance. No paid provider substitution or availability claim was made. |
| Eternal intelligence | Configured self-hosted model, default openai/gpt-oss-120b | Preserve the configured provider, cached response and grounded template fallback. A provider prefix is not evidence that the OpenAI API serves this route. |
| Local OpenAI API catalog | Explicit historical versions, catalog verified October 1 | It is not a current model recommendation. The official API catalog now presents GPT-6.2. No website inference route reviewed here uses this catalog as its active provider default; no new API model or Codex selector was adopted. |

The control-plane radar completed its current seven-day scan on November 22. Its Anthropic model-source fingerprint is `a2ae3d768de04690802a9f0712990c85846d84afe9601f937ae167db096de458`. Successful source retrieval does not renew the older shared router and OpenAI catalog review markers: their freshness checks remain truthful. This project review verifies the choices above; it does not claim to refresh the complete Studio model catalog or account-specific model list.

Sources inspected directly: [Claude model catalog](https://platform.claude.com/docs/en/models/overview), [Haiku 4.5 status and pinned identifier](https://platform.claude.com/docs/en/models/haiku-4-5/overview), and [OpenAI API models](https://developers.openai.com/api/docs/models).

## Price correction

The [first-party Claude API pricing reference](https://platform.claude.com/docs/en/about-claude/pricing) gives Sonnet 5.5 cache reads as $0.10 per million tokens. The edge estimate and shared script router previously used $0.20. Those current estimates now agree with the documented rate. The older Sonnet 5 generation retains $0.20; other prices and model IDs remain unchanged.

The forward migration `20261123044000_ignis_sonnet_cache_price.sql` updates the authoritative meter function without rewriting historical migration files. It preserves caps, accounting behavior and service-only execution grants. Database application and native SQL acceptance belong to the release owner; source tests do not prove this migration has reached a provider database.

## Cache and corpus verification

Existing response-cache tests exercise separation by mode, tier and page context, no sharing of member-personalized responses, single-turn eligibility, source/intelligence-version keys, grounded retrieval and citation handling. Existing endpoint tests also establish that a cache hit bypasses inference and spend work while preserving the independent request rate limit. No new cache service was needed.

The corpus builder had a demonstrated invalidation gap: a warm source hash skipped `--check`, omitted registry-driven fact sheets and some static pages, and could conceal a missing or modified generated artifact. It now hashes its builder, hashing helper, complete static page set, registry and referenced fact sheets. Checks always rebuild and compare; normal warm builds also require an unchanged output hash. Isolated functional regressions exercise tampered and deleted output, changed facts, changed registry, added static content, builder changes and forced rebuilds.

At the item-11 checkpoint, the corpus built 64 documents with zero public-summary voice leaks. Canonical route integration subsequently added Trust, Beta, Agents, Devlog, Studio, Press and Dispatch, producing 71 documents. Script, style and hidden template content is excluded from searchable prose. An additional isolated regression verifies all seven new destinations and their visible text; the three corpus regressions and independent `--check` pass.

## Scoped verification measurements

Single local observations, not performance guarantees:

| Command | Elapsed |
| --- | ---: |
| Corpus build | 674 ms |
| Unchanged corpus build | 458 ms |
| Independent corpus check | 733 ms |
| Classify the full build-check command map | 2,593 ms |

The map classified 562/562 commands. Representative plans selected 53 commands for contact HTML, 10 for the corpus builder, and 9 for edge model pricing, with no unclaimed paths in those three plans. These counts describe selection, not successful execution of all selected commands. The nine explicitly executed offline commands passed; cache, pricing and grounding tests passed 39/39. The Desk inference self-test passed 27/27 using injected responses, including provider failure and quota boundaries.

Scoped receipts retain `authority: partial` and `canSatisfyCloseout: false`. Selection and cache savings cannot replace the full current release run, staging checks, deployment or served readback. Raw timings, command exit codes and coverage samples are retained in the session's ignored diagnostic evidence.
