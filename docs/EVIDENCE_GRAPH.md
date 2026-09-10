<!-- generated-by: scripts/build-evidence-projection.mjs -->
<!-- source: config/evidence-graph.json — edit the graph, never this file -->

# Evidence Graph

Machine-readable dependency graph for public evidence artifacts. Sources may be exact paths or single/double-star globs.

**80 nodes** · **38** participate in the publish cascade ·
derived only from a graph that passes `validateEvidenceGraph()`.

This file is a projection. To change it, change `config/evidence-graph.json` and run
`node scripts/build-evidence-projection.mjs`. `--check` fails the build if the two drift.

## Why this graph exists

Every node is a derived public artifact whose bytes must stay reproducible from its
sources. A workflow that commits a source without regenerating its dependants leaves the
tree self-inconsistent — the artifact serves a stale value on a public trust surface until
a human notices. `check-publish-cascade-coverage.mjs` reads this graph to make that
structurally impossible; `check-evidence-graph.mjs` keeps the graph itself acyclic and
complete; and the pre-push coherence scan reads it to decide what a given diff must
re-verify. (That scan is named by role, not filename: `check-orphan-scripts.mjs` treats a
basename in prose as a consumer reference, and a doc mention is documentation, not wiring.)

## Dependency diagram

Double-bordered nodes participate in the publish cascade. External inputs are grouped by
directory family to keep the shape readable.

```mermaid
flowchart LR
  subgraph inputs["source inputs"]
    n____["**/"]
    n____["../"]
    n__cache_[".cache/"]
    n__git_[".git/"]
    n__github_[".github/"]
    n__well_known_[".well-known/"]
    n_api_["api/"]
    n_assets_["assets/"]
    n_cloudflare_["cloudflare/"]
    n_config_["config/"]
    n_context_["context/"]
    n_data_["data/"]
    n_docs_["docs/"]
    n_external_build_vantage_worker_routes["external:build-vantage-worker-routes"]
    n_external_founder_brand_masters["external:founder-brand-masters"]
    n_external_production_apex["external:production-apex"]
    n_external_production_pages["external:production-pages"]
    n_external_production_worker_routes["external:production-worker-routes"]
    n_games_["games/"]
    n_ignis_["ignis/"]
    n_journal_["journal/"]
    n_llms_full_txt["llms-full.txt"]
    n_news_["news/"]
    n_oracle_["oracle/"]
    n_package_json["package.json"]
    n_privacy_["privacy/"]
    n_projects_["projects/"]
    n_repo_structure_public_project_routes["repo-structure:public-project-routes"]
    n_rights_["rights/"]
    n_scripts_["scripts/"]
    n_status_["status/"]
    n_studio_pulse_["studio-pulse/"]
    n_supabase_["supabase/"]
    n_terms_["terms/"]
    n_universe_["universe/"]
  end
  n_agents_json[["agents.json"]]
  n_projects_vorn__ai_index_html["projects/vorn/.ai/index.html"]
  n_api_ai_discovery_health_json["api/ai-discovery-health.json"]
  n_assets_ambient_core_bundle_js["assets/ambient-core.bundle.js"]
  n_context_ambient_ledger_json["context/ambient-ledger.json"]
  n_api_analytics_summary_json["api/analytics-summary.json"]
  n_docs_ARK_SIGNATURE_FAILURE_DOSSIER_2026_06_04_md["docs/ARK_SIGNATURE_FAILURE_DOSSIER_2026-06-04.md"]
  n_api_attention_pressure_json[["api/attention-pressure.json"]]
  n_brand_assets_json["brand/assets.json"]
  n_config_cache_evidence_classification_json["config/cache-evidence-classification.json"]
  n_api_candidate_artifact_manifest_json[["api/candidate-artifact-manifest.json"]]
  n_api_canonical_destination_reachability_json[["api/canonical-destination-reachability.json"]]
  n_changelog_index_html[["changelog/index.html"]]
  n_api_changelog_narrative_json["api/changelog-narrative.json"]
  n_api_citation_json[["api/citation.json"]]
  n_api_commit_map_json[["api/commit-map.json"]]
  n__cache_cta_readiness_json[[".cache/cta-readiness.json"]]
  n_api_deploy_currency_json[["api/deploy-currency.json"]]
  n__headers["_headers"]
  n__well_known_entity_graph_json[".well-known/entity-graph.json"]
  n_api_evidence_graph_json[["api/evidence-graph.json"]]
  n_docs_EVIDENCE_GRAPH_md[["docs/EVIDENCE_GRAPH.md"]]
  n_evidence_index_html["evidence/index.html"]
  n_favicon_ico["favicon.ico"]
  n_api_feedback_provenance_json[["api/feedback-provenance.json"]]
  n_api_field_win_json["api/field-win.json"]
  n_membership_index_html[["membership/index.html"]]
  n_feed_forge_ledger_json[["feed/forge-ledger.json"]]
  n_api_founder_presence_json["api/founder-presence.json"]
  n_api_geo_vitals_json["api/geo-vitals.json"]
  n_api_heartbeat_json["api/heartbeat.json"]
  n_index_html[["index.html"]]
  n_api_identity_migration_receipt_json[["api/identity-migration-receipt.json"]]
  n_api_ignis_conduit_json["api/ignis-conduit.json"]
  n_api_ignis_platform_status_json["api/ignis-platform-status.json"]
  n_api_ignis_roi_json["api/ignis-roi.json"]
  n_data_ignis_search_index_json["data/ignis-search-index.json"]
  n_data_inp_soak_verdicts_json["data/inp-soak-verdicts.json"]
  n_api_intelligence_budget_json["api/intelligence-budget.json"]
  n_api_intent_map_json[["api/intent-map.json"]]
  n_index_html["index.html"]
  n__well_known_llms_txt[[".well-known/llms.txt"]]
  n_data_lqip_map_json[["data/lqip-map.json"]]
  n_api_nav_sheet_stats_json["api/nav-sheet-stats.json"]
  n_api_nervous_system_json["api/nervous-system.json"]
  n_api_news_critique_packets_json[["api/news-critique-packets.json"]]
  n_api_news_desk_json[["api/news-desk.json"]]
  n_api_news_desk_engagement_json[["api/news-desk-engagement.json"]]
  n_api_news_desk_freshness_json[["api/news-desk-freshness.json"]]
  n_api_news_desk_reactions_json[["api/news-desk-reactions.json"]]
  n_api_news_desk_stats_json[["api/news-desk-stats.json"]]
  n_news_index_html[["news/index.html"]]
  n_api_news_visual_receipts_json[["api/news-visual-receipts.json"]]
  n_api_newsroom_run_json[["api/newsroom-run.json"]]
  n_api_oracle_insights_json["api/oracle-insights.json"]
  n_api_ecosystem_velocity_json["api/ecosystem-velocity.json"]
  n_pathways_builders_index_html["pathways/builders/index.html"]
  n_api_promotion_receipt_json["api/promotion-receipt.json"]
  n_api_proof_aware_projects_json["api/proof-aware-projects.json"]
  n_api_ecosystem_state_json[["api/ecosystem-state.json"]]
  n_api_public_intelligence_json[["api/public-intelligence.json"]]
  n_api_public_status_json[["api/public-status.json"]]
  n_api_rank_climbers_json["api/rank-climbers.json"]
  n_api_release_proof_json[["api/release-proof.json"]]
  n_api_security_posture_json[["api/security-posture.json"]]
  n_assets_shell_manifest_json["assets/shell-manifest.json"]
  n_api_ship_receipts_json["api/ship-receipts.json"]
  n_api_site_health_json["api/site-health.json"]
  n_api_staging_deploy_continuity_json["api/staging-deploy-continuity.json"]
  n_api_staging_deploy_receipt_json["api/staging-deploy-receipt.json"]
  n_docs_STARTUP_BRIEF_md["docs/STARTUP_BRIEF.md"]
  n_data_stats_surface_json[["data/stats-surface.json"]]
  n_api_status_proof_json[["api/status-proof.json"]]
  n_membership_index_html["membership/index.html"]
  n_api_tt_readiness_json["api/tt-readiness.json"]
  n_api_tt_summary_json["api/tt-summary.json"]
  n_api_ux_decision_ledger_json["api/ux-decision-ledger.json"]
  n_api_worker_route_history_json[["api/worker-route-history.json"]]
  n_api_worker_route_provenance_json[["api/worker-route-provenance.json"]]
  n_changelog_index_html[["changelog/index.html"]]
  n____ --> n__well_known_entity_graph_json
  n____ --> n_api_ignis_platform_status_json
  n____ --> n_assets_shell_manifest_json
  n____ --> n_projects_vorn__ai_index_html
  n__cache_ --> n_api_geo_vitals_json
  n__cache_ --> n_api_nav_sheet_stats_json
  n__cache_ --> n_api_tt_readiness_json
  n__cache_ --> n_context_ambient_ledger_json
  n__cache_ --> n_docs_ARK_SIGNATURE_FAILURE_DOSSIER_2026_06_04_md
  n__git_ --> n_api_commit_map_json
  n__git_ --> n_api_ecosystem_velocity_json
  n__github_ --> n_api_newsroom_run_json
  n__github_ --> n_api_release_proof_json
  n__headers --> n_api_ai_discovery_health_json
  n__well_known_ --> n_api_security_posture_json
  n__well_known_llms_txt --> n_agents_json
  n__well_known_llms_txt --> n_api_ai_discovery_health_json
  n__well_known_llms_txt --> n_api_candidate_artifact_manifest_json
  n_agents_json --> n_api_ai_discovery_health_json
  n_agents_json --> n_api_candidate_artifact_manifest_json
  n_api_ --> n__cache_cta_readiness_json
  n_api_ --> n_api_attention_pressure_json
  n_api_ --> n_api_candidate_artifact_manifest_json
  n_api_ --> n_api_deploy_currency_json
  n_api_ --> n_api_identity_migration_receipt_json
  n_api_ --> n_api_intent_map_json
  n_api_ --> n_api_nervous_system_json
  n_api_ --> n_api_news_critique_packets_json
  n_api_ --> n_api_newsroom_run_json
  n_api_ --> n_api_oracle_insights_json
  n_api_ --> n_api_promotion_receipt_json
  n_api_ --> n_api_release_proof_json
  n_api_ --> n_api_site_health_json
  n_api_ --> n_api_staging_deploy_receipt_json
  n_api_ --> n_api_status_proof_json
  n_api_ --> n_api_ux_decision_ledger_json
  n_api_ --> n_data_stats_surface_json
  n_api_ai_discovery_health_json --> n_api_status_proof_json
  n_api_analytics_summary_json --> n_data_stats_surface_json
  n_api_attention_pressure_json --> n_api_status_proof_json
  n_api_candidate_artifact_manifest_json --> n_api_release_proof_json
  n_api_candidate_artifact_manifest_json --> n_api_staging_deploy_receipt_json
  n_api_canonical_destination_reachability_json --> n_api_status_proof_json
  n_api_commit_map_json --> n_api_changelog_narrative_json
  n_api_commit_map_json --> n_api_feedback_provenance_json
  n_api_commit_map_json --> n_api_ignis_conduit_json
  n_api_commit_map_json --> n_api_proof_aware_projects_json
  n_api_commit_map_json --> n_api_public_status_json
  n_api_commit_map_json --> n_api_ship_receipts_json
  n_api_commit_map_json --> n_feed_forge_ledger_json
  n_api_deploy_currency_json --> n_api_intent_map_json
  n_api_deploy_currency_json --> n_api_release_proof_json
  n_api_deploy_currency_json --> n_api_status_proof_json
  n_api_deploy_currency_json --> n_docs_STARTUP_BRIEF_md
  n_api_ecosystem_state_json --> n__well_known_llms_txt
  n_api_ecosystem_state_json --> n_agents_json
  n_api_ecosystem_state_json --> n_api_canonical_destination_reachability_json
  n_api_ecosystem_state_json --> n_data_stats_surface_json
  n_api_feedback_provenance_json --> n_api_intelligence_budget_json
  n_api_feedback_provenance_json --> n_api_nervous_system_json
  n_api_feedback_provenance_json --> n_api_ship_receipts_json
  n_api_feedback_provenance_json --> n_api_ux_decision_ledger_json
  n_api_feedback_provenance_json --> n_data_ignis_search_index_json
  n_api_field_win_json --> n_api_proof_aware_projects_json
  n_api_field_win_json --> n_api_status_proof_json
  n_api_geo_vitals_json --> n_api_status_proof_json
  n_api_heartbeat_json --> n_api_public_status_json
  n_api_identity_migration_receipt_json --> n_api_intent_map_json
  n_api_identity_migration_receipt_json --> n_api_release_proof_json
  n_api_identity_migration_receipt_json --> n_api_status_proof_json
  n_api_ignis_roi_json --> n_api_nervous_system_json
  n_api_nav_sheet_stats_json --> n_api_nervous_system_json
  n_api_nav_sheet_stats_json --> n_api_ux_decision_ledger_json
  n_api_nervous_system_json --> n_api_intelligence_budget_json
  n_api_news_desk_engagement_json --> n_news_index_html
  n_api_news_desk_freshness_json --> n_index_html
  n_api_news_desk_freshness_json --> n_news_index_html
  n_api_news_desk_json --> n_api_intent_map_json
  n_api_news_desk_json --> n_index_html
  n_api_news_desk_reactions_json --> n_news_index_html
  n_api_news_desk_stats_json --> n_data_stats_surface_json
  n_api_news_desk_stats_json --> n_news_index_html
  n_api_news_visual_receipts_json --> n_api_news_critique_packets_json
  n_api_newsroom_run_json --> n_api_status_proof_json
  n_api_promotion_receipt_json --> n_api_release_proof_json
  n_api_promotion_receipt_json --> n_api_status_proof_json
  n_api_public_intelligence_json --> n_api_candidate_artifact_manifest_json
  n_api_public_intelligence_json --> n_api_citation_json
  n_api_public_intelligence_json --> n_api_ecosystem_state_json
  n_api_public_intelligence_json --> n_api_intelligence_budget_json
  n_api_public_intelligence_json --> n_api_intent_map_json
  n_api_public_intelligence_json --> n_api_nervous_system_json
  n_api_public_intelligence_json --> n_api_oracle_insights_json
  n_api_public_intelligence_json --> n_api_public_status_json
  n_api_public_intelligence_json --> n_changelog_index_html
  n_api_public_intelligence_json --> n_data_ignis_search_index_json
  n_api_public_status_json --> n_api_intent_map_json
  n_api_public_status_json --> n_api_status_proof_json
  n_api_public_status_json --> n_data_stats_surface_json
  n_api_public_status_json --> n_index_html
  n_api_security_posture_json --> n_api_status_proof_json
  n_api_security_posture_json --> n_data_ignis_search_index_json
  n_api_ship_receipts_json --> n_api_intelligence_budget_json
  n_api_ship_receipts_json --> n_changelog_index_html
  n_api_site_health_json --> n_api_intelligence_budget_json
  n_api_site_health_json --> n_api_status_proof_json
  n_api_staging_deploy_receipt_json --> n_api_release_proof_json
  n_api_staging_deploy_receipt_json --> n_api_staging_deploy_continuity_json
  n_api_status_proof_json --> n_api_citation_json
  n_api_status_proof_json --> n_data_stats_surface_json
  n_api_ux_decision_ledger_json --> n_api_intelligence_budget_json
  n_api_ux_decision_ledger_json --> n_api_nervous_system_json
  n_api_worker_route_history_json --> n_api_public_status_json
  n_api_worker_route_provenance_json --> n_api_candidate_artifact_manifest_json
  n_api_worker_route_provenance_json --> n_api_intent_map_json
  n_api_worker_route_provenance_json --> n_api_release_proof_json
  n_api_worker_route_provenance_json --> n_api_security_posture_json
  n_api_worker_route_provenance_json --> n_api_status_proof_json
  n_api_worker_route_provenance_json --> n_api_worker_route_history_json
  n_assets_ --> n_api_candidate_artifact_manifest_json
  n_assets_ --> n_api_security_posture_json
  n_assets_ --> n_assets_ambient_core_bundle_js
  n_assets_ --> n_assets_shell_manifest_json
  n_assets_ --> n_data_lqip_map_json
  n_assets_ --> n_favicon_ico
  n_assets_ambient_core_bundle_js --> n_assets_shell_manifest_json
  n_assets_shell_manifest_json --> n__headers
  n_assets_shell_manifest_json --> n_api_candidate_artifact_manifest_json
  n_assets_shell_manifest_json --> n_pathways_builders_index_html
  n_cloudflare_ --> n_api_identity_migration_receipt_json
  n_cloudflare_ --> n_api_security_posture_json
  n_cloudflare_ --> n_api_worker_route_provenance_json
  n_config_ --> n_api_evidence_graph_json
  n_config_ --> n_api_security_posture_json
  n_config_ --> n_assets_shell_manifest_json
  n_config_ --> n_docs_EVIDENCE_GRAPH_md
  n_context_ --> n_api_founder_presence_json
  n_context_ --> n_api_heartbeat_json
  n_context_ --> n_api_identity_migration_receipt_json
  n_context_ --> n_api_ignis_conduit_json
  n_context_ --> n_api_intelligence_budget_json
  n_context_ --> n_api_nervous_system_json
  n_context_ --> n_api_public_intelligence_json
  n_context_ --> n_api_release_proof_json
  n_context_ --> n_api_security_posture_json
  n_context_ --> n_docs_STARTUP_BRIEF_md
  n_data_ --> n_api_analytics_summary_json
  n_data_ --> n_api_feedback_provenance_json
  n_data_ --> n_api_field_win_json
  n_data_ --> n_api_news_desk_engagement_json
  n_data_ --> n_api_news_desk_freshness_json
  n_data_ --> n_api_news_desk_json
  n_data_ --> n_api_news_desk_reactions_json
  n_data_ --> n_api_news_desk_stats_json
  n_data_ --> n_api_news_visual_receipts_json
  n_data_ --> n_api_oracle_insights_json
  n_data_ --> n_api_promotion_receipt_json
  n_data_ --> n_api_proof_aware_projects_json
  n_data_ --> n_api_release_proof_json
  n_data_ --> n_api_ship_receipts_json
  n_data_ --> n_api_site_health_json
  n_data_ --> n_api_staging_deploy_continuity_json
  n_data_ --> n_api_staging_deploy_receipt_json
  n_data_ --> n_api_tt_summary_json
  n_data_ --> n_api_ux_decision_ledger_json
  n_data_ --> n_api_worker_route_history_json
  n_data_ --> n_data_ignis_search_index_json
  n_data_ --> n_data_inp_soak_verdicts_json
  n_data_ --> n_data_lqip_map_json
  n_data_ --> n_data_stats_surface_json
  n_data_ --> n_evidence_index_html
  n_data_ --> n_membership_index_html
  n_data_ --> n_news_index_html
  n_data_ --> n_pathways_builders_index_html
  n_data_ignis_search_index_json --> n_api_intelligence_budget_json
  n_data_ignis_search_index_json --> n_api_oracle_insights_json
  n_docs_ --> n_api_ignis_roi_json
  n_docs_ --> n_api_ship_receipts_json
  n_external_build_vantage_worker_routes --> n_api_worker_route_provenance_json
  n_external_founder_brand_masters --> n_brand_assets_json
  n_external_production_apex --> n_api_promotion_receipt_json
  n_external_production_pages --> n_api_promotion_receipt_json
  n_external_production_worker_routes --> n_api_worker_route_provenance_json
  n_games_ --> n_api_ai_discovery_health_json
  n_games_ --> n_data_ignis_search_index_json
  n_games_ --> n_projects_vorn__ai_index_html
  n_ignis_ --> n_api_ecosystem_state_json
  n_index_html --> n_api_candidate_artifact_manifest_json
  n_index_html --> n_api_deploy_currency_json
  n_journal_ --> n_evidence_index_html
  n_journal_ --> n_pathways_builders_index_html
  n_llms_full_txt --> n_data_ignis_search_index_json
  n_membership_index_html --> n_api_candidate_artifact_manifest_json
  n_membership_index_html --> n_data_ignis_search_index_json
  n_news_ --> n_api_news_visual_receipts_json
  n_oracle_ --> n_data_ignis_search_index_json
  n_package_json --> n_api_security_posture_json
  n_privacy_ --> n_data_ignis_search_index_json
  n_projects_ --> n_api_ai_discovery_health_json
  n_projects_ --> n_projects_vorn__ai_index_html
  n_repo_structure_public_project_routes --> n__well_known_llms_txt
  n_repo_structure_public_project_routes --> n_agents_json
  n_rights_ --> n_data_ignis_search_index_json
  n_scripts_ --> n_api_rank_climbers_json
  n_scripts_ --> n_api_staging_deploy_receipt_json
  n_scripts_ --> n_config_cache_evidence_classification_json
  n_scripts_ --> n_context_ambient_ledger_json
  n_status_ --> n_api_candidate_artifact_manifest_json
  n_studio_pulse_ --> n_api_candidate_artifact_manifest_json
  n_supabase_ --> n_api_identity_migration_receipt_json
  n_terms_ --> n_data_ignis_search_index_json
  n_universe_ --> n_api_ai_discovery_health_json
  n_universe_ --> n_data_ignis_search_index_json
  n_universe_ --> n_projects_vorn__ai_index_html
```

## Nodes

| Node | Output | Cascade | Depends on | Feeds |
|---|---|:--:|---|---|
| `agents-json` | `agents.json` | yes | `.well-known/llms.txt`<br>`api/ecosystem-state.json` | `api/ai-discovery-health.json`<br>`api/candidate-artifact-manifest.json` |
| `ai-canonical-pages` | `projects/vorn/.ai/index.html` | — | — | — |
| `ai-discovery-health` | `api/ai-discovery-health.json` | — | `.well-known/llms.txt`<br>`_headers`<br>`agents.json` | `api/status-proof.json` |
| `ambient-bundles` | `assets/ambient-core.bundle.js` | — | — | `assets/shell-manifest.json` |
| `ambient-ledger` | `context/ambient-ledger.json` | — | — | — |
| `analytics-summary` | `api/analytics-summary.json` | — | — | `data/stats-surface.json` |
| `ark-signature-dossier` | `docs/ARK_SIGNATURE_FAILURE_DOSSIER_2026-06-04.md` | — | — | — |
| `attention-pressure` | `api/attention-pressure.json` | yes | — | `api/status-proof.json` |
| `brand-assets` | `brand/assets.json` | — | — | — |
| `cache-evidence-classification` | `config/cache-evidence-classification.json` | — | — | — |
| `candidate-artifact-manifest` | `api/candidate-artifact-manifest.json` | yes | `.well-known/llms.txt`<br>`agents.json`<br>`api/public-intelligence.json`<br>`api/worker-route-provenance.json`<br>`assets/shell-manifest.json`<br>`index.html`<br>`membership/index.html` | `api/release-proof.json`<br>`api/staging-deploy-receipt.json` |
| `canonical-destination-reachability` | `api/canonical-destination-reachability.json` | yes | `api/ecosystem-state.json` | `api/status-proof.json` |
| `changelog-live` | `changelog/index.html` | yes | `api/public-intelligence.json` | — |
| `changelog-narrative` | `api/changelog-narrative.json` | — | `api/commit-map.json` | — |
| `citation` | `api/citation.json` | yes | `api/public-intelligence.json`<br>`api/status-proof.json` | — |
| `commit-map` | `api/commit-map.json` | yes | — | `api/changelog-narrative.json`<br>`api/feedback-provenance.json`<br>`api/ignis-conduit.json`<br>`api/proof-aware-projects.json`<br>`api/public-status.json`<br>`api/ship-receipts.json`<br>`feed/forge-ledger.json` |
| `cta-readiness` | `.cache/cta-readiness.json` | yes | — | — |
| `deploy-currency` | `api/deploy-currency.json` | yes | `index.html` | `api/intent-map.json`<br>`api/release-proof.json`<br>`api/status-proof.json`<br>`docs/STARTUP_BRIEF.md` |
| `early-hints-headers` | `_headers` | — | `assets/shell-manifest.json` | `api/ai-discovery-health.json` |
| `entity-graph` | `.well-known/entity-graph.json` | — | — | — |
| `evidence-graph-agent` | `api/evidence-graph.json` | yes | — | — |
| `evidence-graph-doc` | `docs/EVIDENCE_GRAPH.md` | yes | — | — |
| `evidence-hub` | `evidence/index.html` | — | — | — |
| `favicon` | `favicon.ico` | — | — | — |
| `feedback-provenance` | `api/feedback-provenance.json` | yes | `api/commit-map.json` | `api/intelligence-budget.json`<br>`api/nervous-system.json`<br>`api/ship-receipts.json`<br>`api/ux-decision-ledger.json`<br>`data/ignis-search-index.json` |
| `field-win-proof` | `api/field-win.json` | — | — | `api/proof-aware-projects.json`<br>`api/status-proof.json` |
| `flight-director` | `membership/index.html` | yes | — | `api/candidate-artifact-manifest.json`<br>`data/ignis-search-index.json` |
| `forge-feed` | `feed/forge-ledger.json` | yes | `api/commit-map.json` | — |
| `founder-presence` | `api/founder-presence.json` | — | — | — |
| `geo-vitals` | `api/geo-vitals.json` | — | — | `api/status-proof.json` |
| `heartbeat` | `api/heartbeat.json` | — | — | `api/public-status.json` |
| `home-desk-module` | `index.html` | yes | `api/news-desk-freshness.json`<br>`api/news-desk.json` | `api/candidate-artifact-manifest.json`<br>`api/deploy-currency.json` |
| `identity-migration-receipt` | `api/identity-migration-receipt.json` | yes | — | `api/intent-map.json`<br>`api/release-proof.json`<br>`api/status-proof.json` |
| `ignis-conduit` | `api/ignis-conduit.json` | — | `api/commit-map.json` | — |
| `ignis-platform-status` | `api/ignis-platform-status.json` | — | — | — |
| `ignis-roi` | `api/ignis-roi.json` | — | — | `api/nervous-system.json` |
| `ignis-search-index` | `data/ignis-search-index.json` | — | `api/feedback-provenance.json`<br>`api/public-intelligence.json`<br>`api/security-posture.json`<br>`membership/index.html` | `api/intelligence-budget.json`<br>`api/oracle-insights.json` |
| `inp-soak-verdicts` | `data/inp-soak-verdicts.json` | — | — | — |
| `intelligence-budget` | `api/intelligence-budget.json` | — | `api/feedback-provenance.json`<br>`api/nervous-system.json`<br>`api/public-intelligence.json`<br>`api/ship-receipts.json`<br>`api/site-health.json`<br>`api/ux-decision-ledger.json`<br>`data/ignis-search-index.json` | — |
| `intent-map` | `api/intent-map.json` | yes | `api/deploy-currency.json`<br>`api/identity-migration-receipt.json`<br>`api/news-desk.json`<br>`api/public-intelligence.json`<br>`api/public-status.json`<br>`api/worker-route-provenance.json` | — |
| `launch-age` | `index.html` | — | `api/public-status.json` | `api/candidate-artifact-manifest.json`<br>`api/deploy-currency.json` |
| `llms-full-shards` | `.well-known/llms.txt` | yes | `api/ecosystem-state.json` | `agents.json`<br>`api/ai-discovery-health.json`<br>`api/candidate-artifact-manifest.json` |
| `lqip-map` | `data/lqip-map.json` | yes | — | — |
| `nav-sheet-stats` | `api/nav-sheet-stats.json` | — | — | `api/nervous-system.json`<br>`api/ux-decision-ledger.json` |
| `nervous-system` | `api/nervous-system.json` | — | `api/feedback-provenance.json`<br>`api/ignis-roi.json`<br>`api/nav-sheet-stats.json`<br>`api/public-intelligence.json`<br>`api/ux-decision-ledger.json` | `api/intelligence-budget.json` |
| `news-critique-packets` | `api/news-critique-packets.json` | yes | `api/news-visual-receipts.json` | — |
| `news-desk` | `api/news-desk.json` | yes | — | `api/intent-map.json`<br>`index.html` |
| `news-desk-engagement` | `api/news-desk-engagement.json` | yes | — | `news/index.html` |
| `news-desk-freshness` | `api/news-desk-freshness.json` | yes | — | `index.html`<br>`news/index.html` |
| `news-desk-reactions` | `api/news-desk-reactions.json` | yes | — | `news/index.html` |
| `news-desk-stats` | `api/news-desk-stats.json` | yes | — | `data/stats-surface.json`<br>`news/index.html` |
| `news-pages` | `news/index.html` | yes | `api/news-desk-engagement.json`<br>`api/news-desk-freshness.json`<br>`api/news-desk-reactions.json`<br>`api/news-desk-stats.json` | — |
| `news-visual-receipts` | `api/news-visual-receipts.json` | yes | — | `api/news-critique-packets.json` |
| `newsroom-run` | `api/newsroom-run.json` | yes | — | `api/status-proof.json` |
| `oracle-query-clusters` | `api/oracle-insights.json` | — | `api/public-intelligence.json`<br>`data/ignis-search-index.json` | — |
| `oracle-velocity-public` | `api/ecosystem-velocity.json` | — | — | — |
| `pathways-pages` | `pathways/builders/index.html` | — | `assets/shell-manifest.json` | — |
| `promotion-receipt` | `api/promotion-receipt.json` | — | — | `api/release-proof.json`<br>`api/status-proof.json` |
| `proof-aware-projects` | `api/proof-aware-projects.json` | — | `api/commit-map.json`<br>`api/field-win.json` | — |
| `public-ecosystem` | `api/ecosystem-state.json` | yes | `api/public-intelligence.json` | `.well-known/llms.txt`<br>`agents.json`<br>`api/canonical-destination-reachability.json`<br>`data/stats-surface.json` |
| `public-intelligence` | `api/public-intelligence.json` | yes | — | `api/candidate-artifact-manifest.json`<br>`api/citation.json`<br>`api/ecosystem-state.json`<br>`api/intelligence-budget.json`<br>`api/intent-map.json`<br>`api/nervous-system.json`<br>`api/oracle-insights.json`<br>`api/public-status.json`<br>`changelog/index.html`<br>`data/ignis-search-index.json` |
| `public-status` | `api/public-status.json` | yes | `api/commit-map.json`<br>`api/heartbeat.json`<br>`api/public-intelligence.json`<br>`api/worker-route-history.json` | `api/intent-map.json`<br>`api/status-proof.json`<br>`data/stats-surface.json`<br>`index.html` |
| `rank-climbers` | `api/rank-climbers.json` | — | — | — |
| `release-proof` | `api/release-proof.json` | yes | `api/candidate-artifact-manifest.json`<br>`api/deploy-currency.json`<br>`api/identity-migration-receipt.json`<br>`api/promotion-receipt.json`<br>`api/staging-deploy-receipt.json`<br>`api/worker-route-provenance.json` | — |
| `security-posture` | `api/security-posture.json` | yes | `api/worker-route-provenance.json` | `api/status-proof.json`<br>`data/ignis-search-index.json` |
| `shell-assets` | `assets/shell-manifest.json` | — | `assets/ambient-core.bundle.js` | `_headers`<br>`api/candidate-artifact-manifest.json`<br>`pathways/builders/index.html` |
| `ship-receipts` | `api/ship-receipts.json` | — | `api/commit-map.json`<br>`api/feedback-provenance.json` | `api/intelligence-budget.json`<br>`changelog/index.html` |
| `site-health` | `api/site-health.json` | — | — | `api/intelligence-budget.json`<br>`api/status-proof.json` |
| `staging-deploy-continuity` | `api/staging-deploy-continuity.json` | — | `api/staging-deploy-receipt.json` | — |
| `staging-deploy-receipt` | `api/staging-deploy-receipt.json` | — | `api/candidate-artifact-manifest.json` | `api/release-proof.json`<br>`api/staging-deploy-continuity.json` |
| `startup-brief` | `docs/STARTUP_BRIEF.md` | — | `api/deploy-currency.json` | — |
| `stats-surface` | `data/stats-surface.json` | yes | `api/analytics-summary.json`<br>`api/ecosystem-state.json`<br>`api/news-desk-stats.json`<br>`api/public-status.json`<br>`api/status-proof.json` | — |
| `status-proof` | `api/status-proof.json` | yes | `api/ai-discovery-health.json`<br>`api/attention-pressure.json`<br>`api/canonical-destination-reachability.json`<br>`api/deploy-currency.json`<br>`api/field-win.json`<br>`api/geo-vitals.json`<br>`api/identity-migration-receipt.json`<br>`api/newsroom-run.json`<br>`api/promotion-receipt.json`<br>`api/public-status.json`<br>`api/security-posture.json`<br>`api/site-health.json`<br>`api/worker-route-provenance.json` | `api/citation.json`<br>`data/stats-surface.json` |
| `surface-spine` | `membership/index.html` | — | — | `api/candidate-artifact-manifest.json`<br>`data/ignis-search-index.json` |
| `tt-readiness` | `api/tt-readiness.json` | — | — | — |
| `tt-summary` | `api/tt-summary.json` | — | — | — |
| `ux-decision-ledger` | `api/ux-decision-ledger.json` | — | `api/feedback-provenance.json`<br>`api/nav-sheet-stats.json` | `api/intelligence-budget.json`<br>`api/nervous-system.json` |
| `worker-route-history` | `api/worker-route-history.json` | yes | `api/worker-route-provenance.json` | `api/public-status.json` |
| `worker-route-provenance` | `api/worker-route-provenance.json` | yes | — | `api/candidate-artifact-manifest.json`<br>`api/intent-map.json`<br>`api/release-proof.json`<br>`api/security-posture.json`<br>`api/status-proof.json`<br>`api/worker-route-history.json` |
| `you-asked-shipped` | `changelog/index.html` | yes | `api/ship-receipts.json` | — |

## Builders and verification

| Node | Builder | Verify |
|---|---|---|
| `agents-json` | `scripts/build-agents-json.mjs` | `node scripts/build-agents-json.mjs --check` |
| `ai-canonical-pages` | `scripts/build-ai-canonical-pages.mjs` | `node scripts/build-ai-canonical-pages.mjs --check` |
| `ai-discovery-health` | `scripts/build-ai-discovery-health.mjs` | `node scripts/build-ai-discovery-health.mjs --check` |
| `ambient-bundles` | `scripts/build-ambient-bundle.mjs` | `node scripts/build-ambient-bundle.mjs --check` |
| `ambient-ledger` | `scripts/build-ambient-ledger.mjs` | `node scripts/build-ambient-ledger.mjs --check` |
| `analytics-summary` | `scripts/build-analytics-summary.mjs` | `node scripts/build-analytics-summary.mjs --check` |
| `ark-signature-dossier` | `scripts/build-ark-signature-dossier.mjs` | `node scripts/build-ark-signature-dossier.mjs --check` |
| `attention-pressure` | `scripts/build-attention-pressure.mjs` | `node scripts/build-attention-pressure.mjs --check` |
| `brand-assets` | `scripts/build-brand-assets.mjs` | `node scripts/build-brand-assets.mjs --check` |
| `cache-evidence-classification` | `scripts/check-cache-evidence-classification.mjs` | `node scripts/check-cache-evidence-classification.mjs` |
| `candidate-artifact-manifest` | `scripts/build-candidate-artifact-manifest.mjs` | `node scripts/build-candidate-artifact-manifest.mjs --check` |
| `canonical-destination-reachability` | `scripts/probe-canonical-destinations.mjs` | `node scripts/probe-canonical-destinations.mjs --check` |
| `changelog-live` | `scripts/build-changelog-live.mjs` | `node scripts/build-changelog-live.mjs --check` |
| `changelog-narrative` | `scripts/build-changelog-narrative.mjs` | `node scripts/build-changelog-narrative.mjs --check` |
| `citation` | `scripts/build-citation.mjs` | `node scripts/build-citation.mjs --check` |
| `commit-map` | `scripts/build-commit-map.mjs` | `node scripts/build-commit-map.mjs --check` |
| `cta-readiness` | `scripts/check-cta-readiness.mjs` | `node scripts/check-cta-readiness.mjs --check` |
| `deploy-currency` | `scripts/build-deploy-currency.mjs` | `node scripts/build-deploy-currency.mjs --check` |
| `early-hints-headers` | `scripts/build-early-hints-headers.mjs` | `node scripts/build-early-hints-headers.mjs --check` |
| `entity-graph` | `scripts/build-entity-graph.mjs` | `node scripts/build-entity-graph.mjs --check` |
| `evidence-graph-agent` | `scripts/build-evidence-projection.mjs` | `node scripts/build-evidence-projection.mjs --check` |
| `evidence-graph-doc` | `scripts/build-evidence-projection.mjs` | `node scripts/build-evidence-projection.mjs --check` |
| `evidence-hub` | `scripts/generate-evidence-hub.mjs` | `node scripts/generate-evidence-hub.mjs --check` |
| `favicon` | `scripts/build-favicon.mjs` | `node scripts/build-favicon.mjs --check` |
| `feedback-provenance` | `scripts/build-feedback-provenance.mjs` | `node scripts/build-feedback-provenance.mjs --check` |
| `field-win-proof` | `scripts/build-field-win-proof.mjs` | `node scripts/build-field-win-proof.mjs --check` |
| `flight-director` | `scripts/build-flight-director.mjs` | `node scripts/build-flight-director.mjs --check` |
| `forge-feed` | `scripts/build-forge-feed.mjs` | `node scripts/build-forge-feed.mjs --check` |
| `founder-presence` | `scripts/generate-founder-presence.mjs` | `node scripts/generate-founder-presence.mjs --check` |
| `geo-vitals` | `scripts/build-geo-vitals.mjs` | `node scripts/build-geo-vitals.mjs --check` |
| `heartbeat` | `scripts/generate-heartbeat.mjs` | `node scripts/generate-heartbeat.mjs --check` |
| `home-desk-module` | `scripts/build-home-desk-module.mjs` | `node scripts/build-home-desk-module.mjs --check` |
| `identity-migration-receipt` | `scripts/build-identity-migration-receipt.mjs` | `node scripts/build-identity-migration-receipt.mjs --check` |
| `ignis-conduit` | `scripts/build-ignis-conduit.mjs` | `node scripts/build-ignis-conduit.mjs --check` |
| `ignis-platform-status` | `scripts/build-ignis-platform-status.mjs` | `node scripts/build-ignis-platform-status.mjs --check` |
| `ignis-roi` | `scripts/build-ignis-roi.mjs` | `node scripts/build-ignis-roi.mjs --check` |
| `ignis-search-index` | `scripts/build-ignis-search-index.mjs` | `node scripts/build-ignis-search-index.mjs --check` |
| `inp-soak-verdicts` | `scripts/build-inp-soak-verdicts.mjs` | `node scripts/build-inp-soak-verdicts.mjs --check` |
| `intelligence-budget` | `scripts/build-intelligence-budget.mjs` | `node scripts/build-intelligence-budget.mjs --check` |
| `intent-map` | `scripts/build-intent-map.mjs` | `node scripts/build-intent-map.mjs --check` |
| `launch-age` | `scripts/build-launch-age.mjs` | `node scripts/build-launch-age.mjs --check` |
| `llms-full-shards` | `scripts/build-llms-full-shards.mjs` | `node scripts/build-llms-full-shards.mjs --check` |
| `lqip-map` | `scripts/build-lqip-map.mjs` | `node scripts/build-lqip-map.mjs --check` |
| `nav-sheet-stats` | `scripts/build-nav-sheet-stats.mjs` | `node scripts/build-nav-sheet-stats.mjs --check` |
| `nervous-system` | `scripts/build-nervous-system.mjs` | `node scripts/build-nervous-system.mjs --check` |
| `news-critique-packets` | `scripts/build-news-critique-packets.mjs` | `node scripts/build-news-critique-packets.mjs --check` |
| `news-desk` | `scripts/build-news-desk.mjs` | `node scripts/build-news-desk.mjs --check` |
| `news-desk-engagement` | `scripts/build-news-desk-engagement.mjs` | `node scripts/build-news-desk-engagement.mjs --check` |
| `news-desk-freshness` | `scripts/build-news-freshness.mjs` | `node scripts/build-news-freshness.mjs --check` |
| `news-desk-reactions` | `scripts/build-news-desk-reactions.mjs` | `node scripts/build-news-desk-reactions.mjs --check` |
| `news-desk-stats` | `scripts/build-news-desk-stats.mjs` | `node scripts/build-news-desk-stats.mjs --check` |
| `news-pages` | `scripts/generate-news-pages.mjs` | `node scripts/generate-news-pages.mjs --check` |
| `news-visual-receipts` | `scripts/build-news-visual-receipts.mjs` | `node scripts/build-news-visual-receipts.mjs --check` |
| `newsroom-run` | `scripts/build-newsroom-run.mjs` | `node scripts/build-newsroom-run.mjs --check` |
| `oracle-query-clusters` | `scripts/build-oracle-query-clusters.mjs` | `node scripts/build-oracle-query-clusters.mjs --check` |
| `oracle-velocity-public` | `scripts/build-oracle-velocity-public.mjs` | `node scripts/build-oracle-velocity-public.mjs --check` |
| `pathways-pages` | `scripts/generate-pathways.mjs` | `node scripts/generate-pathways.mjs --check` |
| `promotion-receipt` | `scripts/build-promotion-receipt.mjs` | `node scripts/build-promotion-receipt.mjs --check` |
| `proof-aware-projects` | `scripts/build-proof-aware-projects.mjs` | `node scripts/build-proof-aware-projects.mjs --check` |
| `public-ecosystem` | `scripts/build-public-ecosystem.mjs` | `node scripts/build-public-ecosystem.mjs --check` |
| `public-intelligence` | `scripts/generate-public-intelligence.mjs` | `node scripts/generate-public-intelligence.mjs --check` |
| `public-status` | `scripts/build-public-status.mjs` | `node scripts/build-public-status.mjs --check` |
| `rank-climbers` | `scripts/build-rank-climbers.mjs` | `node scripts/build-rank-climbers.mjs --check` |
| `release-proof` | `scripts/build-release-proof.mjs` | `node scripts/build-release-proof.mjs --check` |
| `security-posture` | `scripts/build-security-posture.mjs` | `node scripts/build-security-posture.mjs --check` |
| `shell-assets` | `scripts/build-shell-assets.mjs` | `node scripts/build-shell-assets.mjs --check` |
| `ship-receipts` | `scripts/build-ship-receipts.mjs` | `node scripts/build-ship-receipts.mjs --check` |
| `site-health` | `scripts/build-site-health.mjs` | `node scripts/build-site-health.mjs --check` |
| `staging-deploy-continuity` | `scripts/build-staging-deploy-continuity.mjs` | `node scripts/build-staging-deploy-continuity.mjs --check` |
| `staging-deploy-receipt` | `scripts/deploy-staging.mjs` | `node scripts/check-staging-deploy-receipt.mjs` |
| `startup-brief` | `scripts/render-startup-brief.mjs` | `node scripts/check-startup-session-coherence.mjs` |
| `stats-surface` | `scripts/build-stats-surface.mjs` | `node scripts/build-stats-surface.mjs --check` |
| `status-proof` | `scripts/build-status-proof.mjs` | `node scripts/build-status-proof.mjs --check --check-content` |
| `surface-spine` | `scripts/apply-surface-spine.mjs` | `node scripts/apply-surface-spine.mjs --check` |
| `tt-readiness` | `scripts/build-tt-readiness.mjs` | `node scripts/build-tt-readiness.mjs --check` |
| `tt-summary` | `scripts/build-tt-summary.mjs` | `node scripts/build-tt-summary.mjs --check` |
| `ux-decision-ledger` | `scripts/build-ux-decision-ledger.mjs` | `node scripts/build-ux-decision-ledger.mjs --check` |
| `worker-route-history` | `scripts/build-worker-route-history.mjs` | `node scripts/build-worker-route-history.mjs --check` |
| `worker-route-provenance` | `scripts/build-worker-route-provenance.mjs` | `node scripts/build-worker-route-provenance.mjs --check` |
| `you-asked-shipped` | `scripts/build-you-asked-shipped.mjs` | `node scripts/build-you-asked-shipped.mjs --check` |

## External inputs

- `**/` → `shell-assets`
- `../` → `ai-canonical-pages`, `entity-graph`, `ignis-platform-status`
- `.cache/` → `ambient-ledger`, `ark-signature-dossier`, `geo-vitals`, `nav-sheet-stats`, `tt-readiness`
- `.git/` → `commit-map`, `oracle-velocity-public`
- `.github/` → `newsroom-run`, `release-proof`
- `.well-known/` → `security-posture`
- `api/` → `attention-pressure`, `candidate-artifact-manifest`, `cta-readiness`, `deploy-currency`, `identity-migration-receipt`, `intent-map`, `nervous-system`, `news-critique-packets`, `newsroom-run`, `oracle-query-clusters`, `promotion-receipt`, `release-proof`, `site-health`, `staging-deploy-receipt`, `stats-surface`, `status-proof`, `ux-decision-ledger`
- `assets/` → `ambient-bundles`, `candidate-artifact-manifest`, `favicon`, `lqip-map`, `security-posture`, `shell-assets`
- `cloudflare/` → `identity-migration-receipt`, `security-posture`, `worker-route-provenance`
- `config/` → `evidence-graph-agent`, `evidence-graph-doc`, `security-posture`, `shell-assets`
- `context/` → `founder-presence`, `heartbeat`, `identity-migration-receipt`, `ignis-conduit`, `intelligence-budget`, `nervous-system`, `public-intelligence`, `release-proof`, `security-posture`, `startup-brief`
- `data/` → `analytics-summary`, `evidence-hub`, `feedback-provenance`, `field-win-proof`, `flight-director`, `ignis-search-index`, `inp-soak-verdicts`, `lqip-map`, `news-desk`, `news-desk-engagement`, `news-desk-freshness`, `news-desk-reactions`, `news-desk-stats`, `news-pages`, `news-visual-receipts`, `oracle-query-clusters`, `pathways-pages`, `promotion-receipt`, `proof-aware-projects`, `release-proof`, `ship-receipts`, `site-health`, `staging-deploy-continuity`, `staging-deploy-receipt`, `stats-surface`, `surface-spine`, `tt-summary`, `ux-decision-ledger`, `worker-route-history`
- `docs/` → `ignis-roi`, `ship-receipts`
- `external:build-vantage-worker-routes` → `worker-route-provenance`
- `external:founder-brand-masters` → `brand-assets`
- `external:production-apex` → `promotion-receipt`
- `external:production-pages` → `promotion-receipt`
- `external:production-worker-routes` → `worker-route-provenance`
- `games/` → `ai-canonical-pages`, `ai-discovery-health`, `ignis-search-index`
- `ignis/` → `public-ecosystem`
- `journal/` → `evidence-hub`, `pathways-pages`
- `llms-full.txt` → `ignis-search-index`
- `news/` → `news-visual-receipts`
- `oracle/` → `ignis-search-index`
- `package.json` → `security-posture`
- `privacy/` → `ignis-search-index`
- `projects/` → `ai-canonical-pages`, `ai-discovery-health`
- `repo-structure:public-project-routes` → `agents-json`, `llms-full-shards`
- `rights/` → `ignis-search-index`
- `scripts/` → `ambient-ledger`, `cache-evidence-classification`, `rank-climbers`, `staging-deploy-receipt`
- `status/` → `candidate-artifact-manifest`
- `studio-pulse/` → `candidate-artifact-manifest`
- `supabase/` → `identity-migration-receipt`
- `terms/` → `ignis-search-index`
- `universe/` → `ai-canonical-pages`, `ai-discovery-health`, `ignis-search-index`

## Build order

1. `ai-canonical-pages`
2. `ambient-bundles`
3. `ambient-ledger`
4. `analytics-summary`
5. `ark-signature-dossier`
6. `attention-pressure`
7. `brand-assets`
8. `cache-evidence-classification`
9. `commit-map`
10. `cta-readiness`
11. `entity-graph`
12. `evidence-graph-agent`
13. `evidence-graph-doc`
14. `evidence-hub`
15. `favicon`
16. `field-win-proof`
17. `flight-director`
18. `founder-presence`
19. `geo-vitals`
20. `heartbeat`
21. `identity-migration-receipt`
22. `ignis-platform-status`
23. `ignis-roi`
24. `inp-soak-verdicts`
25. `lqip-map`
26. `nav-sheet-stats`
27. `news-desk`
28. `news-desk-engagement`
29. `news-desk-freshness`
30. `news-desk-reactions`
31. `news-desk-stats`
32. `news-visual-receipts`
33. `newsroom-run`
34. `oracle-velocity-public`
35. `promotion-receipt`
36. `public-intelligence`
37. `rank-climbers`
38. `site-health`
39. `surface-spine`
40. `tt-readiness`
41. `tt-summary`
42. `worker-route-provenance`
43. `changelog-live`
44. `changelog-narrative`
45. `feedback-provenance`
46. `forge-feed`
47. `home-desk-module`
48. `ignis-conduit`
49. `news-critique-packets`
50. `news-pages`
51. `proof-aware-projects`
52. `public-ecosystem`
53. `security-posture`
54. `shell-assets`
55. `worker-route-history`
56. `canonical-destination-reachability`
57. `early-hints-headers`
58. `ignis-search-index`
59. `llms-full-shards`
60. `pathways-pages`
61. `public-status`
62. `ship-receipts`
63. `ux-decision-ledger`
64. `agents-json`
65. `launch-age`
66. `nervous-system`
67. `oracle-query-clusters`
68. `you-asked-shipped`
69. `ai-discovery-health`
70. `candidate-artifact-manifest`
71. `deploy-currency`
72. `intelligence-budget`
73. `intent-map`
74. `staging-deploy-receipt`
75. `startup-brief`
76. `status-proof`
77. `citation`
78. `release-proof`
79. `staging-deploy-continuity`
80. `stats-surface`
