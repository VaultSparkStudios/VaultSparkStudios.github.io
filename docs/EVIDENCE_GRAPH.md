<!-- generated-by: scripts/build-evidence-projection.mjs -->
<!-- source: config/evidence-graph.json — edit the graph, never this file -->

# Evidence Graph

Machine-readable dependency graph for public evidence artifacts. Sources may be exact paths or single/double-star globs.

**14 nodes** · **11** participate in the publish cascade ·
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
    n__github_[".github/"]
    n__well_known_[".well-known/"]
    n_agents_json["agents.json"]
    n_api_["api/"]
    n_assets_["assets/"]
    n_cloudflare_["cloudflare/"]
    n_config_["config/"]
    n_context_["context/"]
    n_data_["data/"]
    n_index_html["index.html"]
    n_membership_["membership/"]
    n_package_json["package.json"]
    n_status_["status/"]
    n_studio_pulse_["studio-pulse/"]
  end
  n_api_candidate_artifact_manifest_json[["api/candidate-artifact-manifest.json"]]
  n_api_citation_json[["api/citation.json"]]
  n_api_evidence_graph_json[["api/evidence-graph.json"]]
  n_docs_EVIDENCE_GRAPH_md[["docs/EVIDENCE_GRAPH.md"]]
  n_api_founder_presence_json["api/founder-presence.json"]
  n_api_heartbeat_json["api/heartbeat.json"]
  n_api_public_intelligence_json[["api/public-intelligence.json"]]
  n_api_public_status_json[["api/public-status.json"]]
  n_api_release_proof_json[["api/release-proof.json"]]
  n_api_security_posture_json[["api/security-posture.json"]]
  n_docs_STARTUP_BRIEF_md["docs/STARTUP_BRIEF.md"]
  n_api_status_proof_json[["api/status-proof.json"]]
  n_api_worker_route_history_json[["api/worker-route-history.json"]]
  n_changelog_index_html[["changelog/index.html"]]
  n__github_ --> n_api_release_proof_json
  n__well_known_ --> n_api_candidate_artifact_manifest_json
  n__well_known_ --> n_api_security_posture_json
  n_agents_json --> n_api_candidate_artifact_manifest_json
  n_api_ --> n_api_candidate_artifact_manifest_json
  n_api_ --> n_api_public_status_json
  n_api_ --> n_api_release_proof_json
  n_api_ --> n_api_security_posture_json
  n_api_ --> n_api_status_proof_json
  n_api_ --> n_api_worker_route_history_json
  n_api_ --> n_changelog_index_html
  n_api_ --> n_docs_STARTUP_BRIEF_md
  n_api_candidate_artifact_manifest_json --> n_api_release_proof_json
  n_api_heartbeat_json --> n_api_public_status_json
  n_api_public_intelligence_json --> n_api_candidate_artifact_manifest_json
  n_api_public_intelligence_json --> n_api_citation_json
  n_api_public_intelligence_json --> n_api_public_status_json
  n_api_public_status_json --> n_api_status_proof_json
  n_api_security_posture_json --> n_api_status_proof_json
  n_api_status_proof_json --> n_api_citation_json
  n_api_worker_route_history_json --> n_api_public_status_json
  n_assets_ --> n_api_candidate_artifact_manifest_json
  n_assets_ --> n_api_security_posture_json
  n_cloudflare_ --> n_api_security_posture_json
  n_config_ --> n_api_evidence_graph_json
  n_config_ --> n_api_security_posture_json
  n_config_ --> n_docs_EVIDENCE_GRAPH_md
  n_context_ --> n_api_founder_presence_json
  n_context_ --> n_api_heartbeat_json
  n_context_ --> n_api_public_intelligence_json
  n_context_ --> n_api_release_proof_json
  n_context_ --> n_api_security_posture_json
  n_context_ --> n_docs_STARTUP_BRIEF_md
  n_data_ --> n_api_worker_route_history_json
  n_index_html --> n_api_candidate_artifact_manifest_json
  n_membership_ --> n_api_candidate_artifact_manifest_json
  n_package_json --> n_api_security_posture_json
  n_status_ --> n_api_candidate_artifact_manifest_json
  n_studio_pulse_ --> n_api_candidate_artifact_manifest_json
```

## Nodes

| Node | Output | Cascade | Depends on | Feeds |
|---|---|:--:|---|---|
| `candidate-artifact-manifest` | `api/candidate-artifact-manifest.json` | yes | `api/public-intelligence.json` | `api/release-proof.json` |
| `citation` | `api/citation.json` | yes | `api/public-intelligence.json`<br>`api/status-proof.json` | — |
| `evidence-graph-agent` | `api/evidence-graph.json` | yes | — | — |
| `evidence-graph-doc` | `docs/EVIDENCE_GRAPH.md` | yes | — | — |
| `founder-presence` | `api/founder-presence.json` | — | — | — |
| `heartbeat` | `api/heartbeat.json` | — | — | `api/public-status.json` |
| `public-intelligence` | `api/public-intelligence.json` | yes | — | `api/candidate-artifact-manifest.json`<br>`api/citation.json`<br>`api/public-status.json` |
| `public-status` | `api/public-status.json` | yes | `api/heartbeat.json`<br>`api/public-intelligence.json`<br>`api/worker-route-history.json` | `api/status-proof.json` |
| `release-proof` | `api/release-proof.json` | yes | `api/candidate-artifact-manifest.json` | — |
| `security-posture` | `api/security-posture.json` | yes | — | `api/status-proof.json` |
| `startup-brief` | `docs/STARTUP_BRIEF.md` | — | — | — |
| `status-proof` | `api/status-proof.json` | yes | `api/public-status.json`<br>`api/security-posture.json` | `api/citation.json` |
| `worker-route-history` | `api/worker-route-history.json` | yes | — | `api/public-status.json` |
| `you-asked-shipped` | `changelog/index.html` | yes | — | — |

## Builders and verification

| Node | Builder | Verify |
|---|---|---|
| `candidate-artifact-manifest` | `scripts/build-candidate-artifact-manifest.mjs` | `node scripts/build-candidate-artifact-manifest.mjs --check` |
| `citation` | `scripts/build-citation.mjs` | `node scripts/build-citation.mjs --check` |
| `evidence-graph-agent` | `scripts/build-evidence-projection.mjs` | `node scripts/build-evidence-projection.mjs --check` |
| `evidence-graph-doc` | `scripts/build-evidence-projection.mjs` | `node scripts/build-evidence-projection.mjs --check` |
| `founder-presence` | `scripts/generate-founder-presence.mjs` | `node scripts/generate-founder-presence.mjs --check` |
| `heartbeat` | `scripts/generate-heartbeat.mjs` | `node scripts/generate-heartbeat.mjs --check` |
| `public-intelligence` | `scripts/generate-public-intelligence.mjs` | `node scripts/generate-public-intelligence.mjs --check` |
| `public-status` | `scripts/build-public-status.mjs` | `node scripts/build-public-status.mjs --check` |
| `release-proof` | `scripts/build-release-proof.mjs` | `node scripts/build-release-proof.mjs --check` |
| `security-posture` | `scripts/build-security-posture.mjs` | `node scripts/build-security-posture.mjs --check` |
| `startup-brief` | `scripts/render-startup-brief.mjs` | `node scripts/check-startup-session-coherence.mjs` |
| `status-proof` | `scripts/build-status-proof.mjs` | `node scripts/build-status-proof.mjs --check --check-content` |
| `worker-route-history` | `scripts/build-worker-route-history.mjs` | `node scripts/build-worker-route-history.mjs --check` |
| `you-asked-shipped` | `scripts/build-you-asked-shipped.mjs` | `node scripts/build-you-asked-shipped.mjs --check` |

## External inputs

- `.github/` → `release-proof`
- `.well-known/` → `candidate-artifact-manifest`, `security-posture`
- `agents.json` → `candidate-artifact-manifest`
- `api/` → `candidate-artifact-manifest`, `public-status`, `release-proof`, `security-posture`, `startup-brief`, `status-proof`, `worker-route-history`, `you-asked-shipped`
- `assets/` → `candidate-artifact-manifest`, `security-posture`
- `cloudflare/` → `security-posture`
- `config/` → `evidence-graph-agent`, `evidence-graph-doc`, `security-posture`
- `context/` → `founder-presence`, `heartbeat`, `public-intelligence`, `release-proof`, `security-posture`, `startup-brief`
- `data/` → `worker-route-history`
- `index.html` → `candidate-artifact-manifest`
- `membership/` → `candidate-artifact-manifest`
- `package.json` → `security-posture`
- `status/` → `candidate-artifact-manifest`
- `studio-pulse/` → `candidate-artifact-manifest`

## Build order

1. `evidence-graph-agent`
2. `evidence-graph-doc`
3. `founder-presence`
4. `heartbeat`
5. `public-intelligence`
6. `security-posture`
7. `startup-brief`
8. `worker-route-history`
9. `you-asked-shipped`
10. `candidate-artifact-manifest`
11. `public-status`
12. `release-proof`
13. `status-proof`
14. `citation`
