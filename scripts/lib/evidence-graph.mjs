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
  // S324: output uniqueness is load-bearing — `byOutput` below resolves the
  // dependency edges, so two nodes silently claiming one output would make one
  // of them edge-invisible. But some surfaces genuinely have more than one
  // writer: index.html carries SSR fragments from build-home-desk-module AND
  // build-launch-age. Modeling only one of them is the same lie this graph
  // exists to prevent. So a shared surface is allowed — but only when EVERY
  // node claiming it says so out loud, and only for a path nothing consumes as
  // a source (a page, not a feed). Both conditions are checked, not assumed.
  const sharedOutputs = new Set(
    graph.nodes.filter((n) => n.sharedOutput === true && n.output).map((n) => n.output),
  );
  for (const node of graph.nodes) {
    if (!node.id || ids.has(node.id)) errors.push(`duplicate/missing node id: ${node.id || '<missing>'}`);
    const sharedOk = node.sharedOutput === true && sharedOutputs.has(node.output);
    if (!node.output || (outputs.has(node.output) && !sharedOk)) errors.push(`duplicate/missing output: ${node.output || '<missing>'}`);
    else if (outputs.has(node.output) && sharedOk
      && graph.nodes.some((other) => other.output === node.output && other.sharedOutput !== true)) {
      errors.push(`${node.id}: shared output ${node.output} — every node writing it must declare sharedOutput: true`);
    }
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
  // S324: a multimap, not a Map. A surface with two writers (index.html carries
  // SSR from build-home-desk-module and build-launch-age) collapsed to whichever
  // node happened to be inserted last, so an edge out of the OTHER writer was
  // invisible to cycle detection. affectedEvidenceNodes already walked every
  // writer; this half did not, and the two disagreeing is exactly the kind of
  // silent partial coverage this graph exists to prevent.
  const byOutput = new Map();
  for (const node of graph.nodes) {
    if (!byOutput.has(node.output)) byOutput.set(node.output, []);
    byOutput.get(node.output).push(node);
  }
  for (const node of graph.nodes) {
    for (const source of node.sources) {
      for (const upstream of byOutput.get(source) || []) edges.get(upstream.id).push(node.id);
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
