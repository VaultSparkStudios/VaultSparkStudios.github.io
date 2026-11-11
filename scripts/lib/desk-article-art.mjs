/** Actual scoped article image encoder shared by the publisher and pre-email preparation. */
import fs from 'node:fs';
import path from 'node:path';
import { PERSONAS, formatFor } from './news-desk.mjs';
import { renderEditorialOverlaySvg, storyMemeOverlayOptions } from './news-memes.mjs';
import { renderSatireDerivatives } from './news-satire-raster.mjs';
import { artDigest, beginArticleArtRender, assertArticleArtRenderCurrent, sealArticleArtRender, writeArticleArtBytes } from './desk-art-provenance.mjs';

export async function renderArticleArt(root, day, story, kind) {
  const context = beginArticleArtRender(root, day, story, kind);
  const source = fs.readFileSync(path.join(root, context.source));
  if (artDigest(source) !== context.sourceSha256) throw new Error('Reviewed source changed before encoding');
  const base = `assets/og/news/${context.id}`, outputs = {};
  if (kind === 'satire') {
    const derivatives = await renderSatireDerivatives(source);
    for (const [suffix, buffer] of Object.entries(derivatives)) outputs[base + '--satire' + suffix] = buffer;
  } else {
    const { default: sharp } = await import('sharp');
    const { renderPanelDerivatives } = await import('../generate-news-art.mjs');
    const persona = PERSONAS.find(p => p.id === story.memeLine?.personaId);
    const cardOverlay = renderEditorialOverlaySvg({ text: story.headline, eyebrow: `${formatFor(story).name} · THE DESK`,
      footer: `${persona?.name || 'THE DESK'} · AI PERSONA · SOURCE-BOUND EDITORIAL ART`, accent: persona?.accent || '#ffc400', date: day.date, fontSize: 52 });
    outputs[base + '.png'] = await sharp(source).resize(1200, 630, { fit: 'cover', position: 'attention' })
      .composite([{ input: Buffer.from(cardOverlay) }]).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
    const panel = await renderPanelDerivatives(source, renderEditorialOverlaySvg(storyMemeOverlayOptions({ date: day.date, text: story.memeLine.text, persona: persona || PERSONAS[0] })));
    for (const [suffix, buffer] of Object.entries(panel)) outputs[base + '--meme' + suffix] = buffer;
    // Same responsive encoding as generate-news-pages, but produced from this
    // fresh panel rather than retaining a mobile sibling from a previous raster.
    outputs[base + '--meme--640.webp'] = await sharp(panel['.webp']).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 80, smartSubsample: true }).toBuffer();
    for (const width of [640, 128]) outputs[base + `--meme--${width}.avif`] = await sharp(panel['.avif']).resize({ width, withoutEnlargement: true }).avif({ quality: 58, effort: 6 }).toBuffer();
  }
  assertArticleArtRenderCurrent(root, context, day, story);
  for (const [file, buffer] of Object.entries(outputs)) {
    writeArticleArtBytes(root, file, buffer);
  }
  return sealArticleArtRender(root, context, day, story, outputs);
}
