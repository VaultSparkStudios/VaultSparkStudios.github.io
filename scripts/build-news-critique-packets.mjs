#!/usr/bin/env node
/** Deterministic public-safe claim/evidence packets. No model call. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAIMS = path.join(ROOT, 'api', 'news-desk-claims.ndjson');
const VISUALS = path.join(ROOT, 'api', 'news-visual-receipts.json');
const MANIFEST = path.join(ROOT, 'api', 'news-critique-packets.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

export const parseNdjson = (text) => text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));

export function buildPackets(rows, visualReceipts = []) {
  const factsById = new Map(rows.filter((row) => row.type === 'fact').map((row) => [row.id, row]));
  const visualsById = new Map(visualReceipts.map((row) => [row.id, row]));
  const groups = new Map();
  for (const row of rows) {
    const id = `${row.date}/${row.story}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, storyRows]) => {
    const [date, story] = id.split('/');
    const facts = storyRows.filter((row) => row.type === 'fact').map((row) => ({
      id: row.id, hash: row.hash, text: row.factText, sourceUrl: row.sourceUrl,
      sourceHost: row.sourceHost, sourceHealth: row.sourceHealth, articleAnchor: row.url,
    }));
    const claims = storyRows.filter((row) => row.type === 'stance' || row.type === 'prediction').map((row) => {
      const factRefs = [...(row.factRefs || [])];
      for (const ref of factRefs) {
        const fact = factsById.get(ref);
        if (!fact || fact.date !== date || fact.story !== story) throw new Error(`${id}: invalid factRef ${ref}`);
      }
      return {
        kind: row.type,
        id: row.type === 'prediction' ? row.id : `${row.persona}:${row.verdict}`,
        persona: row.persona,
        text: row.type === 'prediction' ? row.claim : row.position,
        confidence: row.confidence,
        ...(row.type === 'stance' ? { verdict: row.verdict, direction: row.direction } : { resolveBy: row.resolveBy, status: row.status }),
        factRefs,
        evidenceStatus: factRefs.length ? 'linked' : 'unlinked',
      };
    });
    const visual = visualsById.get(id);
    return { id, path: `news/${id}/critique.json`, body: {
      schemaVersion: 1,
      generatedAt: `${date}T00:00:00.000Z`,
      generatedBy: 'scripts/build-news-critique-packets.mjs',
      generatedFrom: 'published Desk claim receipts and hash-bound visual review evidence; no runtime model call',
      story: { id, url: `https://vaultsparkstudios.com/news/${id}/`, claimsFeed: 'https://vaultsparkstudios.com/api/news-desk-claims.ndjson' },
      facts,
      claims,
      visualEvidence: visual ? {
        art: visual.art, artSha256: visual.artSha256, pageSha256: visual.pageSha256,
        safeZone: visual.safeZone, review: visual.review, sceneFingerprint: visual.sceneFingerprint,
        promotionEligible: visual.promotionEligible,
      } : null,
      critiqueProtocol: {
        posture: 'Treat facts as sourced evidence, stances as arguments, predictions as falsifiable claims, and unlinked claims as unsupported by this packet.',
        questions: [
          'Do the cited facts entail the linked claim, merely support it, or leave a gap?',
          'Which material counterevidence or alternative explanation is absent?',
          'Is the stated confidence calibrated to the evidence and uncertainty?',
          'Does the visual framing clarify the argument or bias interpretation?',
          'What observation would falsify each prediction by its resolve-by date?',
        ],
      },
    } };
  });
}

const expectedText = (packet) => JSON.stringify(packet.body, null, 2) + '\n';
function livePacketPaths() {
  const out = []; const news = path.join(ROOT, 'news');
  for (const date of fs.readdirSync(news, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))) {
    for (const story of fs.readdirSync(path.join(news, date.name), { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const target = path.join(news, date.name, story.name, 'critique.json');
      if (fs.existsSync(target)) out.push(path.relative(ROOT, target).replaceAll('\\', '/'));
    }
  }
  return out.sort();
}

function selfTest() {
  const rows = [
    { type:'fact', id:'fact-a', hash:'a'.repeat(64), date:'2026-01-01', story:'one', factText:'Observed.', sourceUrl:'https://example.com/a', sourceHost:'example.com', sourceHealth:{state:'declared'}, url:'https://example.test/news/2026-01-01/one/#fact-a' },
    { type:'stance', date:'2026-01-01', story:'one', persona:'vera', verdict:'fair', direction:0, confidence:.7, position:'Interpretation.', factRefs:['fact-a'] },
    { type:'prediction', date:'2026-01-01', story:'one', id:'p-1', persona:'rex', claim:'Future.', confidence:.5, resolveBy:'2027-01-01', status:'open', factRefs:[] },
  ];
  const visual = [{ id:'2026-01-01/one', art:'a.png', artSha256:'b'.repeat(64), pageSha256:'c'.repeat(64), safeZone:{}, review:{pixelsReviewed:true}, sceneFingerprint:'d'.repeat(64), promotionEligible:false }];
  const first = buildPackets(rows, visual); let rejectsOrphan = false;
  try { buildPackets([{...rows[1], factRefs:['missing']}], []); } catch { rejectsOrphan = true; }
  const tests = [
    ['one packet per story', first.length === 1 && first[0].id === '2026-01-01/one'],
    ['facts retain stable receipts', first[0].body.facts[0].hash === 'a'.repeat(64)],
    ['linked stance declares evidence', first[0].body.claims[0].evidenceStatus === 'linked'],
    ['unsupported prediction stays explicit', first[0].body.claims[1].evidenceStatus === 'unlinked'],
    ['visual receipt is projected', first[0].body.visualEvidence.pageSha256 === 'c'.repeat(64)],
    ['orphan cross-reference fails closed', rejectsOrphan],
    ['output is deterministic', JSON.stringify(buildPackets(rows, visual)) === JSON.stringify(first)],
  ];
  for (const [name, ok] of tests) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  if (tests.some(([, ok]) => !ok)) process.exit(1);
  console.log(`build-news-critique-packets --self-test: ${tests.length}/${tests.length} passed`);
}

function main() {
  if (SELF_TEST) return selfTest();
  const rows = parseNdjson(fs.readFileSync(CLAIMS, 'utf8'));
  const visuals = JSON.parse(fs.readFileSync(VISUALS, 'utf8')).receipts || [];
  const packets = buildPackets(rows, visuals);
  const expected = new Set(packets.map((packet) => packet.path)); const drift = [];
  for (const packet of packets) {
    const target = path.join(ROOT, packet.path); const next = expectedText(packet);
    if (CHECK) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== next) drift.push(packet.path);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, next);
    }
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: packets.length ? `${packets.at(-1).id.slice(0, 10)}T00:00:00.000Z` : null,
    generatedBy: 'scripts/build-news-critique-packets.mjs',
    packetCount: packets.length,
    packets: packets.map((packet) => ({
      id: packet.id,
      url: `https://vaultsparkstudios.com/${packet.path}`,
      sha256: crypto.createHash('sha256').update(expectedText(packet)).digest('hex'),
    })),
  };
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (CHECK) {
    if (!fs.existsSync(MANIFEST) || fs.readFileSync(MANIFEST, 'utf8') !== manifestText) drift.push('api/news-critique-packets.json');
  } else {
    fs.writeFileSync(MANIFEST, manifestText);
  }
  for (const orphan of livePacketPaths().filter((file) => !expected.has(file))) drift.push(`orphan:${orphan}`);
  if (drift.length) {
    console.error(`build-news-critique-packets --check: ${drift.length} stale/orphan packet(s)`);
    drift.slice(0, 10).forEach((file) => console.error(`  ${file}`)); process.exit(1);
  }
  console.log(`build-news-critique-packets: ok (${packets.length} deterministic story packets)`);
}

main();
