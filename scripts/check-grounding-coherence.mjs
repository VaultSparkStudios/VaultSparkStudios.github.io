#!/usr/bin/env node
/**
 * check-grounding-coherence.mjs — agent-geo-layer-v2 (audit 2026-10-02, L1).
 *
 * THE GAP IT CLOSES: the studio's facts reached answer engines through several
 * corpora — /.well-known/llms-full.txt, /.well-known/entity-graph.json and the
 * prebaked Oracle answers — each generated from its own input. They drifted:
 * the entity graph and llms-full called the flagship "Franchise Architect:
 * Football" while the public catalog said "Franchise Architect", and nothing
 * noticed. An answer engine that reads two of them sees two studios.
 *
 * api/public-intelligence.json is the ONE canonical facts source (named as such
 * in llms.txt and agents.json). This gate parses each derived corpus back into
 * { id → name, status } for the projects it shares with the catalog, hashes both
 * sides, and fails on any mismatch with a per-project diff:
 *   - .well-known/llms-full.txt  index lines + per-shard "Slug / Vault status"
 *   - .well-known/entity-graph.json  #project-<slug> nodes (name + Vault Status)
 *   - oracle/answers/index.json  the live status claims the Oracle makes
 *     ("N game(s) live and M more in the Forge", "Playable now:", "Also live:",
 *     "Start with X", "Most active right now: X")
 * A corpus that parses to zero shared projects FAILS — an empty parse proves
 * nothing ([[feedback_whole_file_parse_silent_zero]]).
 *
 * Usage:
 *   node scripts/check-grounding-coherence.mjs
 *   node scripts/check-grounding-coherence.mjs --self-test   # incl. negative controls
 *   node scripts/check-grounding-coherence.mjs --json
 *
 * Import-safe: side effects only when invoked directly.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://vaultsparkstudios.com';

// Registry slug / page directory → public-intelligence catalog id, where they differ.
export const ID_ALIAS = Object.freeze({
  'franchise-architect-football': 'football-gm',
  'franchise-architect': 'football-gm',
});
const MIN_SHARED = { llmsFull: 5, entityGraph: 5 };

const norm = (s) => String(s ?? '').trim();
const status = (s) => norm(s).toUpperCase();
const toId = (slug) => ID_ALIAS[slug] || slug;

/** Canonical facts: catalog id → { name, status }. */
export function canonicalFacts(pi) {
  const out = new Map();
  for (const c of (pi && pi.catalog) || []) {
    if (c && c.id) out.set(c.id, { name: norm(c.name), status: status(c.status) });
  }
  return out;
}

/** Stable digest of { id: {name,status} } over the given ids. */
export function factsDigest(facts, ids) {
  const rows = [...ids].sort().map((id) => {
    const f = facts.get(id) || {};
    return `${id}\t${f.name ?? ''}\t${f.status ?? ''}`;
  });
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

/** llms-full.txt → id → { name, status } (index lines and per-shard identity blocks). */
export function parseLlmsFull(text) {
  const facts = new Map();
  const conflicts = [];
  const put = (id, fact, where) => {
    const prev = facts.get(id);
    if (prev && (prev.name !== fact.name || prev.status !== fact.status)) {
      conflicts.push(`${id}: llms-full disagrees with itself (${where}: "${fact.name}" ${fact.status} vs "${prev.name}" ${prev.status})`);
    }
    if (!prev) facts.set(id, fact);
  };
  const indexRe = /^- \[([^\]]+)\]\(https:\/\/vaultsparkstudios\.com\/(?:(?:games|projects|universe)\/([^/]+)\/)?llms-full\.txt\) — [^·\n]*· ([a-z]+)\s*$/gm;
  let m;
  while ((m = indexRe.exec(text)) !== null) {
    if (!m[2]) continue; // the studio's own root shard is not a catalog project
    put(toId(m[2]), { name: norm(m[1]), status: status(m[3]) }, 'index');
  }
  for (const section of text.split(/\n(?=# )/)) {
    const name = section.match(/^# (.+)$/m);
    const slug = section.match(/^- Slug: (\S+)$/m);
    const vs = section.match(/^- Vault status: (\S+)$/m);
    if (name && slug && vs) put(toId(slug[1]), { name: norm(name[1]), status: status(vs[1]) }, 'shard');
  }
  return { facts, conflicts };
}

/** entity-graph.json → id → { name, status } from #project-<slug> nodes. */
export function parseEntityGraph(graph) {
  const facts = new Map();
  for (const node of (graph && graph['@graph']) || []) {
    const m = String(node['@id'] || '').match(/#project-(.+)$/);
    if (!m) continue;
    const prop = (node.additionalProperty || []).find((p) => p && p.name === 'Vault Status');
    facts.set(toId(m[1]), { name: norm(node.name), status: prop ? status(prop.value) : '' });
  }
  return { facts, conflicts: [] };
}

/** Oracle answers → findings for every status claim that contradicts the catalog. */
export function oracleFindings(answersDoc, canon, pi) {
  const findings = [];
  const byName = new Map([...canon.entries()].map(([id, f]) => [f.name, { id, ...f }]));
  const games = ((pi && pi.catalog) || []).filter((c) => c.type === 'game');
  const liveGames = games.filter((c) => status(c.status) === 'SPARKED').length;
  const forgeGames = games.filter((c) => status(c.status) === 'FORGE').length;
  let claims = 0;
  for (const a of (answersDoc && answersDoc.answers) || []) {
    const text = String(a.answer || '');
    const where = a.id || a.query || '?';
    const counts = text.match(/(\d+) game\(s\) live and (\d+) more in the Forge/);
    if (counts) {
      claims++;
      if (Number(counts[1]) !== liveGames || Number(counts[2]) !== forgeGames) {
        findings.push(`oracle ${where}: says ${counts[1]} live / ${counts[2]} in the Forge; catalog has ${liveGames} / ${forgeGames}`);
      }
    }
    for (const list of text.matchAll(/(?:Playable now|Also live): ([^.]+)\./g)) {
      for (const name of list[1].split(',').map(norm).filter(Boolean)) {
        claims++;
        const f = byName.get(name);
        if (!f) findings.push(`oracle ${where}: "${name}" is called live but is not a catalog name`);
        else if (f.status !== 'SPARKED') findings.push(`oracle ${where}: "${name}" is called live but the catalog says ${f.status}`);
      }
    }
    for (const named of text.matchAll(/(?:Start with|Most active right now:) ([^—.]+?)(?: —|\.|$)/g)) {
      claims++;
      const name = norm(named[1]);
      if (!byName.has(name)) findings.push(`oracle ${where}: names "${name}", which is not a catalog name`);
    }
  }
  return { findings, claims };
}

/** Compare one parsed corpus against the canonical facts. */
export function compareCorpus(label, parsed, canon, minShared = 1) {
  const shared = [...parsed.facts.keys()].filter((id) => canon.has(id));
  const findings = [...parsed.conflicts];
  if (shared.length < minShared) {
    findings.push(`${label}: parsed only ${shared.length} catalog project(s) (need ≥ ${minShared}) — the parser or the corpus is broken`);
  }
  const canonDigest = factsDigest(canon, shared);
  const corpusDigest = factsDigest(parsed.facts, shared);
  if (canonDigest !== corpusDigest) {
    for (const id of shared.sort()) {
      const want = canon.get(id);
      const got = parsed.facts.get(id);
      if (want.name !== got.name) findings.push(`${label}: ${id} name "${got.name}" ≠ catalog "${want.name}"`);
      if (want.status !== got.status) findings.push(`${label}: ${id} status ${got.status || '(none)'} ≠ catalog ${want.status}`);
    }
  }
  return { label, shared: shared.length, canonDigest, corpusDigest, findings };
}

export function runCheck({ pi, llmsFull, entityGraph, oracle }) {
  const canon = canonicalFacts(pi);
  const results = [
    compareCorpus('.well-known/llms-full.txt', parseLlmsFull(llmsFull), canon, MIN_SHARED.llmsFull),
    compareCorpus('.well-known/entity-graph.json', parseEntityGraph(entityGraph), canon, MIN_SHARED.entityGraph),
  ];
  const o = oracleFindings(oracle, canon, pi);
  const oracleFind = [...o.findings];
  if (o.claims === 0) oracleFind.push('oracle/answers/index.json: no status claims parsed — the parser or the answers are broken');
  results.push({ label: 'oracle/answers/index.json', shared: o.claims, canonDigest: null, corpusDigest: null, findings: oracleFind });
  return { canonCount: canon.size, results, ok: canon.size > 0 && results.every((r) => r.findings.length === 0) };
}

function loadLive() {
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  return {
    pi: JSON.parse(read('api/public-intelligence.json')),
    llmsFull: read('.well-known/llms-full.txt'),
    entityGraph: JSON.parse(read('.well-known/entity-graph.json')),
    oracle: JSON.parse(read('oracle/answers/index.json')),
  };
}

function selfTest() {
  let pass = 0, fail = 0;
  const t = (name, cond) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.error('  ✗ ' + name); } };
  const pi = { catalog: [
    { id: 'vorn', name: 'Vorn', type: 'platform', status: 'SPARKED' },
    { id: 'football-gm', name: 'Franchise Architect', type: 'game', status: 'SPARKED' },
    { id: 'solara', name: 'Solara', type: 'game', status: 'FORGE' },
    { id: 'hashmark', name: 'Hashmark', type: 'tool', status: 'FORGE' },
    { id: 'shadow', name: 'SHADOW', type: 'tool', status: 'FORGE' },
  ] };
  const shard = (name, slug, st) => `# ${name}\n\n> x\n\n## Identity\n- Slug: ${slug}\n- Medium: app\n- Vault status: ${st}\n`;
  const idx = (name, path, st) => `- [${name}](${SITE}/${path}llms-full.txt) — app · ${st}`;
  const llmsFull = [
    '# VaultSpark Studios', '', '## Projects (LLM-readable shards)', '',
    idx('VaultSparkStudios.github.io', '', 'sparked'),
    idx('Vorn', 'projects/vorn/', 'sparked'),
    idx('Franchise Architect', 'games/franchise-architect/', 'sparked'),
    idx('Solara', 'games/solara/', 'forge'),
    idx('Hashmark', 'projects/hashmark/', 'forge'),
    idx('SHADOW', 'projects/shadow/', 'forge'),
    idx('StatVault', 'projects/statvault/', 'forge'),
    '', '---', '',
    shard('Vorn', 'vorn', 'SPARKED'), shard('Franchise Architect', 'franchise-architect-football', 'SPARKED'),
    shard('Solara', 'solara', 'FORGE'), shard('Hashmark', 'hashmark', 'FORGE'), shard('SHADOW', 'shadow', 'FORGE'),
  ].join('\n');
  const node = (slug, name, st) => ({ '@type': 'CreativeWork', '@id': `${SITE}/#project-${slug}`, name, additionalProperty: [{ '@type': 'PropertyValue', name: 'Vault Status', value: st }] });
  const entityGraph = { '@graph': [
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'VaultSpark Studios' },
    node('vorn', 'Vorn', 'SPARKED'), node('franchise-architect-football', 'Franchise Architect', 'SPARKED'),
    node('solara', 'Solara', 'FORGE'), node('hashmark', 'Hashmark', 'FORGE'), node('shadow', 'SHADOW', 'FORGE'),
    node('statvault', 'StatVault', 'FORGE'),
  ] };
  const oracle = { answers: [
    { id: 'games', answer: '1 game(s) live and 1 more in the Forge. Playable now: Franchise Architect.' },
    { id: 'play', answer: 'Start with Franchise Architect — Live beta. Also live: Vorn.' },
    { id: 'active', answer: 'Most active right now: Franchise Architect — Live beta.' },
  ] };
  const base = { pi, llmsFull, entityGraph, oracle };

  const clean = runCheck(base);
  t('coherent fixture passes (aliased slug, off-catalog project ignored)', clean.ok);
  t('digests agree on the shared set', clean.results.slice(0, 2).every((r) => r.canonDigest === r.corpusDigest && r.shared === 5));

  // NEGATIVE CONTROLS — each mutation must flip the gate red.
  const r1 = runCheck({ ...base, llmsFull: llmsFull.replace('- Vault status: FORGE\n', '- Vault status: SPARKED\n') });
  t('NEGATIVE: llms-full shard status flip fails', !r1.ok && r1.results[0].findings.some((f) => /status|disagrees/.test(f)));
  const r2 = runCheck({ ...base, llmsFull: llmsFull.replaceAll('Franchise Architect', 'Franchise Architect: Football') });
  t('NEGATIVE: llms-full name drift fails', !r2.ok && r2.results[0].findings.some((f) => /name "Franchise Architect: Football"/.test(f)));
  const eg = JSON.parse(JSON.stringify(entityGraph));
  eg['@graph'][3].additionalProperty[0].value = 'SPARKED';
  const r3 = runCheck({ ...base, entityGraph: eg });
  t('NEGATIVE: entity-graph status flip fails', !r3.ok && r3.results[1].findings.some((f) => /solara status SPARKED/.test(f)));
  const r4 = runCheck({ ...base, oracle: { answers: [{ id: 'g', answer: '2 game(s) live and 1 more in the Forge. Playable now: Solara.' }] } });
  t('NEGATIVE: oracle live count + a FORGE title called live both fail', !r4.ok && r4.results[2].findings.length === 2);
  const r5 = runCheck({ ...base, oracle: { answers: [{ id: 'g', answer: 'Start with Franchise Architect: Football — Live beta.' }] } });
  t('NEGATIVE: oracle naming a non-catalog name fails', !r5.ok && r5.results[2].findings.some((f) => /not a catalog name/.test(f)));
  const r6 = runCheck({ ...base, llmsFull: '# empty corpus\n' });
  t('NEGATIVE: an empty parse fails instead of passing silently', !r6.ok && r6.results[0].findings.some((f) => /parsed only 0/.test(f)));
  const r7 = runCheck({ ...base, oracle: { answers: [{ id: 'x', answer: 'No status claim here.' }] } });
  t('NEGATIVE: oracle with zero parsed claims fails', !r7.ok);

  console.log(`check-grounding-coherence --self-test: ${pass}/${pass + fail} passed`);
  return fail;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 1 : 0);
  const report = runCheck(loadLive());
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const r of report.results) {
      const digest = r.canonDigest ? ` · sha256 ${r.corpusDigest.slice(0, 12)} vs canon ${r.canonDigest.slice(0, 12)}` : '';
      console.log(`${r.findings.length ? '✗' : '✓'} ${r.label}: ${r.shared} shared fact(s)${digest}`);
      for (const f of r.findings) console.error('    ' + f);
    }
  }
  if (!report.ok) {
    console.error('check-grounding-coherence: a derived corpus disagrees with api/public-intelligence.json — regenerate it from the catalog (build-public-ecosystem → build-llms-full-shards, build-entity-graph, build-oracle-answers).');
    process.exit(1);
  }
  console.log(`check-grounding-coherence: ✓ ${report.results.length} corpora agree with the canonical facts source (${report.canonCount} catalog projects)`);
}
