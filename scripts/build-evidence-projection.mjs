#!/usr/bin/env node
/**
 * Human + agent projections of the evidence graph.
 *
 * `config/evidence-graph.json` is the single declarative source that drives
 * build order, pre-push closure, and every publisher cascade in this repo — and
 * until now nothing could read it without parsing JSON. CANON-048 says every
 * surface is built for humans AND agents; the most load-bearing structural
 * artifact here was legible to neither.
 *
 * Two projections, one validated source:
 *   docs/EVIDENCE_GRAPH.md   — mermaid dependency diagram + node table (humans)
 *   api/evidence-graph.json  — resolved relation view, dependsOn/feeds (agents)
 *
 * Both are derived ONLY after `validateEvidenceGraph()` passes. Projecting an
 * invalid graph would publish a confident picture of a broken contract, which is
 * worse than publishing nothing.
 *
 * Lives under /api/ rather than /.well-known/ deliberately: robots.txt disallows
 * /.well-known/ except four explicitly allow-listed files, so a relation view
 * placed there would be invisible to the very agents it exists for.
 *
 * Usage:
 *   node scripts/build-evidence-projection.mjs
 *   node scripts/build-evidence-projection.mjs --check
 *   node scripts/build-evidence-projection.mjs --self-test
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidenceGraph, validateEvidenceGraph } from './lib/evidence-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_OUT = path.join(ROOT, 'docs', 'EVIDENCE_GRAPH.md');
const AGENT_OUT = path.join(ROOT, 'api', 'evidence-graph.json');

/** Collapse an external input path to its directory family so the diagram stays readable. */
export function sourceFamily(source) {
  const clean = String(source).replaceAll('\\', '/');
  const slash = clean.indexOf('/');
  return slash === -1 ? clean : `${clean.slice(0, slash)}/`;
}

const mermaidId = (value) => `n_${String(value).replace(/[^a-zA-Z0-9]/g, '_')}`;

/** Resolve raw source strings into node-to-node edges plus external inputs. */
export function resolveRelations(graph) {
  const byOutput = new Map(graph.nodes.map((node) => [node.output, node]));
  const feeds = new Map(graph.nodes.map((node) => [node.output, new Set()]));
  const resolved = graph.nodes.map((node) => {
    const dependsOn = [];
    const externalSources = [];
    for (const source of node.sources) {
      if (byOutput.has(source)) dependsOn.push(source);
      else externalSources.push(source);
    }
    for (const upstream of dependsOn) feeds.get(upstream).add(node.output);
    return {
      id: node.id,
      output: node.output,
      builder: node.builder,
      verify: node.check.join(' '),
      publishCascade: node.publishCascade === true,
      alsoStage: [...(node.alsoStage || [])].sort(),
      dependsOn: [...dependsOn].sort(),
      externalSources: [...externalSources].sort(),
    };
  });
  for (const node of resolved) node.feeds = [...feeds.get(node.output)].sort();
  return resolved.sort((a, b) => a.id.localeCompare(b.id));
}

/** Deterministic topological build order; ties broken by id so output is stable. */
// S324: keyed by node id, not by output. Keying by output silently collapsed a
// surface with two writers (index.html carries SSR from build-home-desk-module
// AND build-launch-age) into a single map entry, so the order came back one
// short of the node count and the whole projection refused to build. An output
// now counts as satisfied only when EVERY node that writes it has been ordered
// — a consumer of index.html must come after both writers, not after whichever
// one happened to run first.
export function topologicalOrder(resolved) {
  const remaining = new Map(resolved.map((node) => [node.id, node]));
  const order = [];
  while (remaining.size) {
    const stillProduced = new Set([...remaining.values()].map((node) => node.output));
    const ready = [...remaining.values()]
      .filter((node) => node.dependsOn.every((dep) => !stillProduced.has(dep)))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!ready.length) break;
    for (const node of ready) {
      order.push(node.id);
      remaining.delete(node.id);
    }
  }
  return order;
}

export function renderMermaid(resolved) {
  const lines = ['flowchart LR'];
  const families = [...new Set(resolved.flatMap((node) => node.externalSources.map(sourceFamily)))].sort();
  if (families.length) {
    lines.push('  subgraph inputs["source inputs"]');
    for (const family of families) lines.push(`    ${mermaidId(family)}["${family}"]`);
    lines.push('  end');
  }
  for (const node of resolved) {
    const shape = node.publishCascade ? ['[[', ']]'] : ['[', ']'];
    lines.push(`  ${mermaidId(node.output)}${shape[0]}"${node.output}"${shape[1]}`);
  }
  const edges = new Set();
  for (const node of resolved) {
    for (const family of new Set(node.externalSources.map(sourceFamily))) {
      edges.add(`  ${mermaidId(family)} --> ${mermaidId(node.output)}`);
    }
    for (const dep of node.dependsOn) edges.add(`  ${mermaidId(dep)} --> ${mermaidId(node.output)}`);
  }
  lines.push(...[...edges].sort());
  return lines.join('\n');
}

export function renderMarkdown(graph, resolved, order) {
  const cascade = resolved.filter((node) => node.publishCascade);
  const families = [...new Set(resolved.flatMap((node) => node.externalSources.map(sourceFamily)))].sort();
  return [
    '<!-- generated-by: scripts/build-evidence-projection.mjs -->',
    '<!-- source: config/evidence-graph.json — edit the graph, never this file -->',
    '',
    '# Evidence Graph',
    '',
    `${graph.description}`,
    '',
    `**${resolved.length} nodes** · **${cascade.length}** participate in the publish cascade ·`,
    'derived only from a graph that passes `validateEvidenceGraph()`.',
    '',
    'This file is a projection. To change it, change `config/evidence-graph.json` and run',
    '`node scripts/build-evidence-projection.mjs`. `--check` fails the build if the two drift.',
    '',
    '## Why this graph exists',
    '',
    'Every node is a derived public artifact whose bytes must stay reproducible from its',
    'sources. A workflow that commits a source without regenerating its dependants leaves the',
    'tree self-inconsistent — the artifact serves a stale value on a public trust surface until',
    'a human notices. `check-publish-cascade-coverage.mjs` reads this graph to make that',
    'structurally impossible; `check-evidence-graph.mjs` keeps the graph itself acyclic and',
    'complete; and the pre-push coherence scan reads it to decide what a given diff must',
    're-verify. (That scan is named by role, not filename: `check-orphan-scripts.mjs` treats a',
    'basename in prose as a consumer reference, and a doc mention is documentation, not wiring.)',
    '',
    '## Dependency diagram',
    '',
    'Double-bordered nodes participate in the publish cascade. External inputs are grouped by',
    'directory family to keep the shape readable.',
    '',
    '```mermaid',
    renderMermaid(resolved),
    '```',
    '',
    '## Nodes',
    '',
    '| Node | Output | Cascade | Depends on | Feeds |',
    '|---|---|:--:|---|---|',
    ...resolved.map((node) => [
      '',
      `\`${node.id}\``,
      `\`${node.output}\``,
      node.publishCascade ? 'yes' : '—',
      node.dependsOn.length ? node.dependsOn.map((dep) => `\`${dep}\``).join('<br>') : '—',
      node.feeds.length ? node.feeds.map((feed) => `\`${feed}\``).join('<br>') : '—',
      '',
    ].join(' | ').trim()),
    '',
    '## Builders and verification',
    '',
    '| Node | Builder | Verify |',
    '|---|---|---|',
    ...resolved.map((node) => `| \`${node.id}\` | \`${node.builder}\` | \`${node.verify}\` |`),
    '',
    '## External inputs',
    '',
    ...families.map((family) => {
      const consumers = resolved.filter((node) => node.externalSources.some((source) => sourceFamily(source) === family));
      return `- \`${family}\` → ${consumers.map((node) => `\`${node.id}\``).join(', ')}`;
    }),
    '',
    '## Build order',
    '',
    ...order.map((id, index) => `${index + 1}. \`${id}\``),
    '',
  ].join('\n');
}

/**
 * Identity of the contract itself. Any change to a node — id, output, sources,
 * builder, check, cascade flag — flips this hash, so `--check` cannot pass on a
 * projection that describes a different graph than the committed one.
 */
export function contractSha256(graph) {
  return crypto.createHash('sha256').update(JSON.stringify(graph.nodes)).digest('hex');
}

export function buildAgentView(graph, resolved, order) {
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-evidence-projection.mjs',
    // Deterministic by construction: this artifact is a pure function of a
    // committed config file, so its timestamp is the config's declared revision
    // date — never wall-clock, which would make the byte-check drift every run.
    generatedAt: graph.revisedAt,
    contractSha256: contractSha256(graph),
    source: 'config/evidence-graph.json',
    publicSafe: true,
    description: graph.description,
    purpose: 'Resolved relation view of this site\'s derived public evidence artifacts. Each node names the artifact, the builder that produces it, the command that verifies its bytes, and its edges to other artifacts.',
    humanProjection: 'docs/EVIDENCE_GRAPH.md',
    nodeCount: resolved.length,
    cascadeNodeCount: resolved.filter((node) => node.publishCascade).length,
    buildOrder: order,
    nodes: resolved.map((node) => ({
      id: node.id,
      output: node.output,
      builder: node.builder,
      verify: node.verify,
      publishCascade: node.publishCascade,
      ...(node.alsoStage.length ? { alsoStage: node.alsoStage } : {}),
      dependsOn: node.dependsOn,
      feeds: node.feeds,
      externalSources: node.externalSources,
    })),
  };
}

function project(graph) {
  const errors = validateEvidenceGraph(graph);
  if (!graph.revisedAt || Number.isNaN(Date.parse(graph.revisedAt))) {
    errors.push('config/evidence-graph.json must declare a valid revisedAt date (it is the deterministic generatedAt for both projections)');
  }
  if (errors.length) return { errors };
  const resolved = resolveRelations(graph);
  const order = topologicalOrder(resolved);
  if (order.length !== resolved.length) return { errors: ['build order is incomplete — graph is not fully orderable'] };
  return {
    errors: [],
    doc: renderMarkdown(graph, resolved, order),
    agent: JSON.stringify(buildAgentView(graph, resolved, order), null, 2) + '\n',
    resolved,
    order,
  };
}

function selfTest() {
  const graph = {
    schemaVersion: '1.0',
    description: 'test graph',
    revisedAt: '2026-01-02',
    nodes: [
      { id: 'base', output: 'api/base.json', sources: ['context/A.md', 'context/B.md'], builder: 'scripts/build-base.mjs', check: ['node', 'scripts/build-base.mjs', '--check'], publishCascade: true },
      { id: 'derived', output: 'api/derived.json', sources: ['api/base.json', 'data/x.ndjson'], builder: 'scripts/build-derived.mjs', check: ['node', 'scripts/build-derived.mjs', '--check'], alsoStage: ['data/x.ndjson'] },
    ],
  };
  const out = project(graph);
  const resolved = out.resolved;
  const base = resolved.find((node) => node.id === 'base');
  const derived = resolved.find((node) => node.id === 'derived');

  const invalid = project({ schemaVersion: '1.0', description: 'x', revisedAt: '2026-01-02', nodes: [{ id: 'a', output: 'api/a.json', sources: ['api/b.json'], builder: 'scripts/a.mjs', check: ['node', 'scripts/a.mjs'] }, { id: 'b', output: 'api/b.json', sources: ['api/a.json'], builder: 'scripts/b.mjs', check: ['node', 'scripts/b.mjs'] }] });

  const live = loadEvidenceGraph(ROOT);
  const liveOut = project(live);

  const added = { ...graph, nodes: [...graph.nodes, { id: 'extra', output: 'api/extra.json', sources: ['api/derived.json'], builder: 'scripts/build-extra.mjs', check: ['node', 'scripts/build-extra.mjs', '--check'] }] };
  const addedOut = project(added);

  const cases = [
    ['node-to-node edges resolve', derived.dependsOn.length === 1 && derived.dependsOn[0] === 'api/base.json'],
    ['non-node sources stay external', derived.externalSources.length === 1 && derived.externalSources[0] === 'data/x.ndjson'],
    ['reverse edges are populated', base.feeds.length === 1 && base.feeds[0] === 'api/derived.json'],
    ['a leaf feeds nothing', derived.feeds.length === 0],
    ['build order is topological', out.order.indexOf('base') < out.order.indexOf('derived')],
    ['every node is ordered', out.order.length === resolved.length],
    // S324 · a surface with two writers. Ordering keyed by output dropped one of
    // them, and a consumer must wait for BOTH writers — not just the first.
    ['both writers of a shared output are ordered', (() => {
      const shared = topologicalOrder(resolveRelations({
        schemaVersion: '1.0',
        nodes: [
          { id: 'w1', output: 'page.html', sources: ['api/base.json'], check: ['node', 'w1'], sharedOutput: true },
          { id: 'w2', output: 'page.html', sources: ['api/base.json'], check: ['node', 'w2'], sharedOutput: true },
          { id: 'base', output: 'api/base.json', sources: ['context/*.md'], check: ['node', 'base'] },
        ],
      }));
      return shared.length === 3 && shared.includes('w1') && shared.includes('w2');
    })()],
    ['a consumer waits for the LAST writer of a shared output', (() => {
      const ord = topologicalOrder(resolveRelations({
        schemaVersion: '1.0',
        nodes: [
          { id: 'w1', output: 'page.html', sources: ['data/a.json'], check: ['node', 'w1'], sharedOutput: true },
          { id: 'w2', output: 'page.html', sources: ['data/b.json'], check: ['node', 'w2'], sharedOutput: true },
          { id: 'reader', output: 'api/reader.json', sources: ['page.html'], check: ['node', 'reader'] },
        ],
      }));
      return ord.indexOf('reader') > ord.indexOf('w1') && ord.indexOf('reader') > ord.indexOf('w2');
    })()],
    ['source families collapse to directories', sourceFamily('context/PROJECT_STATUS.json') === 'context/' && sourceFamily('index.html') === 'index.html'],
    ['diagram declares every node', resolved.every((node) => out.doc.includes(`"${node.output}"`))],
    ['cascade nodes are visually distinct', out.doc.includes(`${mermaidId('api/base.json')}[["api/base.json"]]`)],
    ['diagram carries the dependency edge', renderMermaid(resolved).includes(`${mermaidId('api/base.json')} --> ${mermaidId('api/derived.json')}`)],
    ['mermaid fence is present for humans', out.doc.includes('```mermaid')],
    ['alsoStage surfaces to agents', JSON.parse(out.agent).nodes.find((node) => node.id === 'derived').alsoStage[0] === 'data/x.ndjson'],
    ['agent view names its human twin', JSON.parse(out.agent).humanProjection === 'docs/EVIDENCE_GRAPH.md'],
    ['an invalid graph is never projected', invalid.errors.length > 0 && invalid.doc === undefined],
    ['projection is deterministic', JSON.stringify(project(graph).agent) === JSON.stringify(out.agent)],
    ['a new node changes BOTH projections', addedOut.doc !== out.doc && addedOut.agent !== out.agent],
    ['the live graph projects cleanly', liveOut.errors.length === 0 && liveOut.order.length === live.nodes.length],
    ['live projection covers every live node', live.nodes.every((node) => liveOut.agent.includes(`"${node.output}"`))],
    ['generatedAt is the declared revision, not wall clock', JSON.parse(out.agent).generatedAt === '2026-01-02'],
    ['a graph without revisedAt is rejected', project({ ...graph, revisedAt: undefined }).errors.some((error) => error.includes('revisedAt'))],
    ['a non-date revisedAt is rejected', project({ ...graph, revisedAt: 'soon' }).errors.some((error) => error.includes('revisedAt'))],
    ['the contract hash binds the node set', contractSha256(added) !== contractSha256(graph)],
    ['the contract hash is stable for an unchanged graph', contractSha256(graph) === contractSha256({ ...graph })],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`build-evidence-projection --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`build-evidence-projection --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const graph = loadEvidenceGraph(ROOT);
  const out = project(graph);
  if (out.errors.length) {
    for (const error of out.errors) console.error(`build-evidence-projection: ${error}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    const targets = [[DOC_OUT, out.doc, 'docs/EVIDENCE_GRAPH.md'], [AGENT_OUT, out.agent, 'api/evidence-graph.json']];
    for (const [file, expected, label] of targets) {
      const actual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (actual !== expected) {
        console.error(`build-evidence-projection: ${label} drifted from config/evidence-graph.json; run without --check to rebuild`);
        process.exit(1);
      }
    }
  } else {
    fs.writeFileSync(DOC_OUT, out.doc);
    fs.writeFileSync(AGENT_OUT, out.agent);
  }
  console.log(`build-evidence-projection: ${out.resolved.length} node(s) projected to docs/EVIDENCE_GRAPH.md + api/evidence-graph.json`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
