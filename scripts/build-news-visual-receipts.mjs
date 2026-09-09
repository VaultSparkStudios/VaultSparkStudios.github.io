#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');
const OUT = path.join(ROOT, 'api', 'news-visual-receipts.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');
const PROMOTE = process.argv.includes('--promote');
const shaFile = (p) => fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;

export function diversity(rows) {
  const seen = new Map();
  const warnings = [];
  for (const row of rows) {
    if (!row.sceneFingerprint) continue;
    if (seen.has(row.sceneFingerprint)) warnings.push({ current: row.id, prior: seen.get(row.sceneFingerprint), reason: 'exact-scene-repeat' });
    seen.set(row.sceneFingerprint, row.id);
  }
  return warnings;
}

const DECLARED_DIMENSIONS = ['sceneArchetype', 'palette', 'focalArrangement', 'focalSubject', 'satireTarget'];
const declared = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return !normalized || ['undeclared', 'unknown', 'none', 'n/a'].includes(normalized) ? null : normalized;
};

/** Similarity is only a comparison of editorial declarations, never a claim
 * about the pixels. Require composition evidence and three matching dimensions;
 * incomplete pairs abstain rather than treating missing values as agreement. */
export function declaredDiversity(rows) {
  const warnings = []; let comparedPairs = 0; let abstainedPairs = 0;
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      const dimensions = DECLARED_DIMENSIONS.filter((key) => declared(rows[i][key]) && declared(rows[j][key]));
      if (dimensions.length < 3 || !dimensions.some((key) => key === 'sceneArchetype' || key === 'focalArrangement')) { abstainedPairs += 1; continue; }
      comparedPairs += 1;
      if (dimensions.every((key) => declared(rows[i][key]) === declared(rows[j][key]))) {
        warnings.push({ current: rows[i].id, prior: rows[j].id, reason: 'declared-visual-shorthand-repeat', dimensions,
          evidence: Object.fromEntries(dimensions.map((key) => [key, declared(rows[i][key])])) });
      }
    }
  }
  return { basis: 'declared editorial dimensions only; not pixel similarity', comparedPairs, abstainedPairs, warnings };
}

function build() {
  const receipts = [];
  for (const file of fs.readdirSync(DAYS).filter((x) => x.endsWith('.json')).sort()) {
    const day = JSON.parse(fs.readFileSync(path.join(DAYS, file), 'utf8'));
    for (const story of day.stories || []) {
      const id = day.date + '/' + story.slug;
      const artRel = story.visual?.artSource || null;
      const pageRel = 'news/' + id + '/index.html';
      const scene = String(story.visual?.scene || '').trim().replace(/\s+/g, ' ').toLowerCase();
      receipts.push({
        id,
        sourceDay: 'data/news-desk/days/' + file,
        sourceSha256: shaFile(path.join(DAYS, file)),
        page: pageRel,
        pageSha256: shaFile(path.join(ROOT, pageRel)),
        art: artRel,
        artSha256: artRel ? shaFile(path.join(ROOT, artRel)) : null,
        safeZone: { xPct: 5, yPct: 8, widthPct: 90, heightPct: 84, contract: 'editorial focal content and legible text stay inside this inset' },
        review: {
          pixelsReviewed: story.visual?.pixelInspection?.reviewed === true,
          semanticVerified: story.visual?.pixelInspection?.semanticVerified === true,
          reviewer: story.visual?.pixelInspection?.reviewer || null
        },
        sceneFingerprint: scene ? crypto.createHash('sha256').update(scene).digest('hex') : null,
        sceneArchetype: story.visual?.sceneArchetype || null,
        focalArrangement: story.visual?.focalArrangement || null,
        palette: story.visual?.palette || 'undeclared',
        focalSubject: story.visual?.relationships?.[0]?.subject?.join(' ') || 'undeclared',
        satireTarget: story.visual?.satire?.target || 'none',
        promotionEligible: Boolean(artRel && shaFile(path.join(ROOT, artRel)) && shaFile(path.join(ROOT, pageRel)) && story.visual?.pixelInspection?.reviewed && story.visual?.pixelInspection?.semanticVerified)
      });
    }
  }
  const recent = receipts.slice(-12);
  return {
    schemaVersion: 1,
    generatedAt: receipts.length ? receipts[receipts.length - 1].id.slice(0, 10) + 'T00:00:00.000Z' : null,
    generatedBy: 'scripts/build-news-visual-receipts.mjs',
    generatedFrom: 'committed story, page, and art bytes; generatedAt derives from the latest source edition date',
    receipts,
    diversityMemory: {
      window: recent.length,
      dimensions: ['sceneFingerprint', ...DECLARED_DIMENSIONS],
      declaredSimilarity: declaredDiversity(recent),
      exactSceneWarnings: diversity(recent)
    }
  };
}

if (SELF_TEST) {
  const base = { id: 'a', sceneFingerprint: 'different-a', sceneArchetype: 'control room', palette: 'red and black', focalArrangement: 'central console', focalSubject: 'operator', satireTarget: 'false certainty' };
  const similar = { ...base, id: 'b', sceneFingerprint: 'different-b', palette: ' RED   AND BLACK ' };
  const report = declaredDiversity([base, similar]);
  const tests = [
    ['exact scene remains separately detected', diversity([{ id:'a', sceneFingerprint:'x' }, { id:'b', sceneFingerprint:'x' }]).length === 1],
    ['different scene hashes do not hide repeated declarations', report.warnings.length === 1 && diversity([base, similar]).length === 0],
    ['warning names supporting dimensions and declarations', report.warnings[0]?.dimensions.includes('focalArrangement') && report.warnings[0]?.evidence.palette === 'red and black'],
    ['different declared composition does not warn', declaredDiversity([base, {...similar, focalArrangement:'distant horizon'}]).warnings.length === 0],
    ['missing declarations abstain, never imply diversity', declaredDiversity([{id:'a'},{id:'b'}]).abstainedPairs === 1 && declaredDiversity([{id:'a'},{id:'b'}]).comparedPairs === 0],
    ['placeholder values cannot manufacture agreement', declaredDiversity([{id:'a',sceneArchetype:'unknown',palette:'none',focalArrangement:'undeclared'},{id:'b',sceneArchetype:'unknown',palette:'none',focalArrangement:'undeclared'}]).warnings.length === 0],
    ['subject and palette without composition are insufficient', declaredDiversity([{id:'a',palette:'red',focalSubject:'robot',satireTarget:'hype'},{id:'b',palette:'red',focalSubject:'robot',satireTarget:'hype'}]).abstainedPairs === 1],
    ['three declared dimensions including composition are sufficient', declaredDiversity([{id:'a',sceneArchetype:'room',palette:'red',satireTarget:'hype'},{id:'b',sceneArchetype:'room',palette:'red',satireTarget:'hype'}]).warnings.length === 1],
    ['single and empty windows have no fabricated comparisons', declaredDiversity([]).comparedPairs === 0 && declaredDiversity([base]).abstainedPairs === 0],
    ['comparison is deterministic without input mutation', JSON.stringify(declaredDiversity([base,similar])) === JSON.stringify(report) && similar.palette === ' RED   AND BLACK '],
  ];
  for (const [name, ok] of tests) console.log((ok ? '  ok ' : '  FAIL ') + name);
  if (tests.some(([,ok]) => !ok)) process.exit(1);
  console.log('build-news-visual-receipts --self-test: ' + tests.length + '/' + tests.length + ' passed');
} else {
  const next = build();
  if (CHECK) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== JSON.stringify(next, null, 2) + '\n') {
      console.error('build-news-visual-receipts --check: stale; rebuild after news pages');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
  }
  const latest = next.receipts.slice(-3);
  if (PROMOTE && (latest.some((x) => !x.promotionEligible) || next.diversityMemory.exactSceneWarnings.length || next.diversityMemory.declaredSimilarity.warnings.length)) {
    console.error('build-news-visual-receipts --promote: latest stories lack semantic pixel review or repeat recent exact/declared visual shorthand');
    process.exit(1);
  }
  console.log('build-news-visual-receipts: ok (' + next.receipts.length + ' stories, ' + next.diversityMemory.exactSceneWarnings.length + ' recent exact-scene warnings)');
}
