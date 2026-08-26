#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { affectedEvidenceNodes, globMatches, loadEvidenceGraph, validateEvidenceGraph } from './lib/evidence-graph.mjs';
import { execFileSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function selfTest() {
  const graph = {
    schemaVersion: '1.0',
    nodes: [
      { id: 'base', output: 'api/base.json', sources: ['context/*.md'], check: ['node', 'base'] },
      { id: 'derived', output: 'api/derived.json', sources: ['api/base.json'], check: ['node', 'derived'] },
      { id: 'final', output: 'api/final.json', sources: ['api/derived.json'], check: ['node', 'final'] },
    ],
  };
  const affected = affectedEvidenceNodes(graph, ['context/STATE.md']).map((node) => node.id);
  const cycle = { ...graph, nodes: graph.nodes.map((node, index) => index === 0 ? { ...node, sources: ['api/final.json'] } : node) };
  const cases = [
    ['single-star glob is segment-bounded', globMatches('api/*.json', 'api/x.json') && !globMatches('api/*.json', 'api/sub/x.json')],
    ['source change closes transitively', affected.join(',') === 'base,derived,final'],
    ['unrelated code selects no evidence', affectedEvidenceNodes(graph, ['scripts/helper.mjs']).length === 0],
    ['cycle is rejected', validateEvidenceGraph(cycle).some((error) => error.includes('cycle'))],
    ['valid graph passes', validateEvidenceGraph(graph).length === 0],
    // S324 · shared surfaces (index.html has two SSR writers). Undeclared
    // duplicates must still be rejected, declared ones accepted, and — the case
    // the old single-entry byOutput map got wrong — an edge out of the SECOND
    // writer must be visible to cycle detection.
    ['undeclared duplicate output is still rejected', validateEvidenceGraph({
      schemaVersion: '1.0',
      nodes: [
        { id: 'a', output: 'page.html', sources: ['api/base.json'], check: ['node', 'a'] },
        { id: 'b', output: 'page.html', sources: ['api/base.json'], check: ['node', 'b'] },
      ],
    }).some((e) => e.includes('duplicate/missing output'))],
    ['a duplicate declared by only ONE writer is rejected', validateEvidenceGraph({
      schemaVersion: '1.0',
      nodes: [
        { id: 'a', output: 'page.html', sources: ['api/base.json'], check: ['node', 'a'] },
        { id: 'b', output: 'page.html', sources: ['api/base.json'], check: ['node', 'b'], sharedOutput: true },
      ],
    }).some((e) => e.includes('sharedOutput'))],
    ['a fully declared shared output is accepted', validateEvidenceGraph({
      schemaVersion: '1.0',
      nodes: [
        { id: 'a', output: 'page.html', sources: ['api/base.json'], check: ['node', 'a'], sharedOutput: true },
        { id: 'b', output: 'page.html', sources: ['api/base.json'], check: ['node', 'b'], sharedOutput: true },
      ],
    }).length === 0],
    ['a cycle through the SECOND writer of a shared output is detected', validateEvidenceGraph({
      schemaVersion: '1.0',
      nodes: [
        { id: 'a', output: 'page.html', sources: ['api/base.json'], check: ['node', 'a'], sharedOutput: true },
        { id: 'b', output: 'page.html', sources: ['api/x.json'], check: ['node', 'b'], sharedOutput: true },
        { id: 'x', output: 'api/x.json', sources: ['page.html'], check: ['node', 'x'] },
      ],
    }).some((e) => e.includes('cycle'))],
  ];
  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`evidence-graph self-test: ${cases.length}/${cases.length}`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  execFileSync(process.execPath, ['scripts/check-cache-evidence-classification.mjs'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/build-news-visual-receipts.mjs', '--check'], { cwd: ROOT, stdio: 'inherit' });
  const graph = loadEvidenceGraph(ROOT);
  const errors = validateEvidenceGraph(graph);
  for (const node of graph.nodes) {
    if (!fs.existsSync(path.join(ROOT, node.builder))) errors.push(`${node.id}: builder missing (${node.builder})`);
    if (!fs.existsSync(path.join(ROOT, node.check[1]))) errors.push(`${node.id}: check executable missing (${node.check[1]})`);
  }
  const build = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.build;
  for (const node of graph.nodes.filter((item) => item.publishCascade && build.includes(path.basename(item.builder)))) {
    for (const source of node.sources) {
      const upstream = graph.nodes.find((candidate) => candidate.output === source);
      if (!upstream || !build.includes(path.basename(upstream.builder))) continue;
      if (build.indexOf(path.basename(upstream.builder)) > build.indexOf(path.basename(node.builder))) {
        errors.push(`${node.id}: build order precedes upstream ${upstream.id}`);
      }
    }
  }
  if (errors.length) {
    for (const error of errors) console.error(`evidence-graph: ${error}`);
    process.exit(1);
  }
  console.log(`evidence-graph: ${graph.nodes.length} nodes · acyclic · builders/checks present · build order valid`);
}

main();
