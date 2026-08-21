#!/usr/bin/env node
/**
 * Deterministic, article-bound Desk illustration and pixel-integrity review.
 * The authored brief supplies article anchors and a subject/action/object
 * relationship; the renderer makes those exact elements visible. The review
 * verifies decoded dimensions and non-blank entropy, then hashes the bytes.
 * It makes no semantic pixel claim (semanticVerified remains false).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { escapeXml, wrapTitle } from './lib/og-template.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_DIR = path.join(ROOT, '.cache', 'news-drafts');
const ART_DIR = path.join(ROOT, 'data', 'news-desk', 'art');
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const tspans = (lines, x, firstY, step) => lines
  .map((line, index) => `<text x="${x}" y="${firstY + index * step}">${escapeXml(line)}</text>`)
  .join('');

export function renderArticleArtSvg(story, date) {
  const visual = story.visual || {};
  const rel = visual.relationships?.[0] || {};
  const subject = rel.subject?.[0] || 'THE SYSTEM';
  const action = rel.action?.[0] || 'routes';
  const object = rel.object?.[0] || 'THE SIGNAL';
  const anchors = (visual.anchors || []).slice(0, 3);
  while (anchors.length < 3) anchors.push('SOURCE-BOUND DETAIL');
  const title = wrapTitle(String(story.headline || ''), 31).slice(0, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#101521"/>
    <g opacity=".12" stroke="#ffc400">${Array.from({ length: 24 }, (_, i) => `<path d="M${i * 54 - 80} 0l310 630"/>`).join('')}</g>
    <rect x="34" y="34" width="1132" height="562" rx="22" fill="none" stroke="#ffc400" stroke-width="3"/>
    <text x="70" y="78" font-family="Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="5" fill="#ffc400">THE DESK · ARTICLE-BOUND EDITORIAL ART</text>
    <text x="1130" y="78" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="#d7deef">${escapeXml(date)}</text>
    <g font-family="Georgia,serif" font-size="48" font-weight="700" fill="#f7f1e2">${tspans(title, 70, 145, 54)}</g>
    <g transform="translate(70 325)">
      <rect width="280" height="108" rx="18" fill="#171d2c" stroke="#72d6ff" stroke-width="3"/>
      <rect x="390" width="280" height="108" rx="18" fill="#171d2c" stroke="#ffc400" stroke-width="3"/>
      <rect x="780" width="280" height="108" rx="18" fill="#171d2c" stroke="#72d6ff" stroke-width="3"/>
      <path d="M290 54h86m-18-16 18 16-18 16M680 54h86m-18-16 18 16-18 16" stroke="#ffc400" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <g font-family="Arial,sans-serif" text-anchor="middle">
        <text x="140" y="35" font-size="15" letter-spacing="3" fill="#8792a8">SUBJECT</text>
        <text x="530" y="35" font-size="15" letter-spacing="3" fill="#8792a8">ACTION</text>
        <text x="920" y="35" font-size="15" letter-spacing="3" fill="#8792a8">OBJECT</text>
        <text x="140" y="75" font-size="24" font-weight="800" fill="#f7f1e2">${escapeXml(subject).slice(0, 24)}</text>
        <text x="530" y="75" font-size="24" font-weight="800" fill="#f7f1e2">${escapeXml(action).slice(0, 24)}</text>
        <text x="920" y="75" font-size="24" font-weight="800" fill="#f7f1e2">${escapeXml(object).slice(0, 24)}</text>
      </g>
    </g>
    <g transform="translate(70 480)" font-family="Arial,sans-serif">
      ${anchors.map((anchor, index) => `<g transform="translate(${index * 370} 0)"><rect width="344" height="72" rx="14" fill="#0b0e16" stroke="#30384b"/><text x="18" y="28" font-size="13" font-weight="800" letter-spacing="2" fill="#ffc400">SOURCE ANCHOR 0${index + 1}</text><text x="18" y="53" font-size="17" fill="#f7f1e2">${escapeXml(anchor).slice(0, 36)}</text></g>`).join('')}
    </g>
    <text x="70" y="582" font-family="Arial,sans-serif" font-size="16" font-weight="800" letter-spacing="2" fill="#8792a8">PROCEDURAL EDITORIAL ILLUSTRATION · SEMANTIC PIXEL CLAIMS WITHHELD</text>
  </svg>`;
}

async function inspect(file) {
  const image = sharp(file);
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
  if (metadata.width !== 1200 || metadata.height !== 630) throw new Error(`expected 1200x630, got ${metadata.width}x${metadata.height}`);
  if (!Number.isFinite(stats.entropy) || stats.entropy < 1) throw new Error(`raster entropy too low (${stats.entropy})`);
  return {
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    reviewed: true,
    reviewer: 'scripts/generate-news-art.mjs direct pixel-integrity review',
    semanticVerified: false,
  };
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const svg = renderArticleArtSvg({
      headline: 'Memory Is a Routing Problem',
      visual: { anchors: ['agent memory', 'self-mined guidelines', 'task completion'], relationships: [{ subject: ['curator'], action: ['feeds'], object: ['guidelines'] }] },
    }, '2026-08-21');
    const checks = [/curator/.test(svg), /feeds/.test(svg), /guidelines/.test(svg), /agent memory/.test(svg), /width="1200"/.test(svg)];
    console.log(`generate-news-art --self-test: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((ok) => !ok)) process.exit(1);
    return;
  }
  const date = arg('--date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('--date YYYY-MM-DD is required');
  const files = fs.readdirSync(DRAFT_DIR).filter((name) => name.startsWith(`${date}--`) && name.endsWith('.json'));
  if (!files.length) throw new Error(`no drafts for ${date}`);
  fs.mkdirSync(ART_DIR, { recursive: true });
  for (const name of files) {
    const draftPath = path.join(DRAFT_DIR, name);
    const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
    const artPath = path.join(ROOT, draft.story.visual.artSource);
    if (!fs.existsSync(artPath)) {
      await sharp(Buffer.from(renderArticleArtSvg(draft.story, date))).png({ compressionLevel: 9 }).toFile(artPath);
    }
    draft.story.visual.pixelInspection = await inspect(artPath);
    draft.story.visual.generatedArt = true;
    fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
    console.log(`✓ ${name} — art bound + pixel-inspected (${path.relative(ROOT, artPath)})`);
  }
}

await main();
