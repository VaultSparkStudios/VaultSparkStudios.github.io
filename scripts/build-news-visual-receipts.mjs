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
      dimensions: ['sceneFingerprint', 'palette', 'focalSubject', 'satireTarget'],
      exactSceneWarnings: diversity(recent)
    }
  };
}

if (SELF_TEST) {
  const warnings = diversity([{ id: 'a', sceneFingerprint: 'x' }, { id: 'b', sceneFingerprint: 'x' }]);
  if (warnings.length !== 1) process.exit(1);
  console.log('build-news-visual-receipts --self-test: all passed');
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
  if (PROMOTE && (latest.some((x) => !x.promotionEligible) || next.diversityMemory.exactSceneWarnings.length)) {
    console.error('build-news-visual-receipts --promote: latest stories lack semantic pixel review or repeat a recent scene');
    process.exit(1);
  }
  console.log('build-news-visual-receipts: ok (' + next.receipts.length + ' stories, ' + next.diversityMemory.exactSceneWarnings.length + ' recent exact-scene warnings)');
}
