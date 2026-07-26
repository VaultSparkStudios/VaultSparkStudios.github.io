import fs from 'node:fs';
import path from 'node:path';

const normalize = (value) => String(value).replaceAll('\\', '/').replace(/^\.\/+/, '');

export function globMatches(pattern, candidate) {
  const source = normalize(pattern);
  const target = normalize(candidate);
  const escaped = source.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**', '\u0000')
    .replaceAll('*', '[^/]*')
    .replaceAll('\u0000', '.*');
  return new RegExp(`^${escaped}$`).test(target);
}

export function validateEvidenceGraph(graph) {
  const errors = [];
  if (graph?.schemaVersion !== '1.0' || !Array.isArray(graph?.nodes)) return ['invalid graph envelope'];
  const ids = new Set();
  const outputs = new Set();
  for (const node of graph.nodes) {
    if (!node.id || ids.has(node.id)) errors.push(`duplicate/missing node id: ${node.id || '<missing>'}`);
    if (!node.output || outputs.has(node.output)) errors.push(`duplicate/missing output: ${node.output || '<missing>'}`);
    if (!Array.isArray(node.sources) || !node.sources.length) errors.push(`${node.id}: sources missing`);
    if (!Array.isArray(node.check) || node.check.length < 2) errors.push(`${node.id}: check command missing`);
    // alsoStage: sibling paths the builder writes alongside its output (e.g. the
    // append-only ledger a derived feed is computed from). Optional, but when
    // present every entry must be a real path string — a publisher that commits
    // the feed without its ledger republishes a feed its own inputs can't rebuild.
    if (node.alsoStage !== undefined) {
      if (!Array.isArray(node.alsoStage) || !node.alsoStage.length) errors.push(`${node.id}: alsoStage must be a non-empty array when present`);
      else if (node.alsoStage.some((entry) => typeof entry !== 'string' || !entry.trim())) errors.push(`${node.id}: alsoStage entries must be non-empty paths`);
      else if (node.alsoStage.includes(node.output)) errors.push(`${node.id}: alsoStage must not repeat the node output`);
    }
    ids.add(node.id);
    outputs.add(node.output);
  }
  const edges = new Map(graph.nodes.map((node) => [node.id, []]));
  const byOutput = new Map(graph.nodes.map((node) => [node.output, node]));
  for (const node of graph.nodes) {
    for (const source of node.sources) {
      const upstream = byOutput.get(source);
      if (upstream) edges.get(upstream.id).push(node.id);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) { errors.push(`cycle detected at ${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of edges.get(id) || []) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of edges.keys()) visit(id);
  return [...new Set(errors)];
}

export function affectedEvidenceNodes(graph, changedFiles) {
  const changed = [...new Set(changedFiles.map(normalize))];
  const affected = new Set();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const node of graph.nodes) {
      if (affected.has(node.id)) continue;
      const direct = changed.includes(normalize(node.output))
        || node.sources.some((source) => changed.some((file) => globMatches(source, file)))
        || node.sources.some((source) => graph.nodes.some((upstream) => affected.has(upstream.id) && upstream.output === source));
      if (direct) { affected.add(node.id); progressed = true; }
    }
  }
  return graph.nodes.filter((node) => affected.has(node.id));
}

export function loadEvidenceGraph(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'config', 'evidence-graph.json'), 'utf8'));
}
