/** Capture source/render inputs at the actual encoder; never certify legacy output hashes afterward. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SATIRE_CARTOON_BUDGETS } from './news-memes.mjs';

export const DESK_ART_PRODUCERS = [
  'package-lock.json',
  'scripts/build-news-desk.mjs', 'scripts/lib/desk-article-art.mjs', 'scripts/lib/desk-art-provenance.mjs',
  'scripts/generate-news-art.mjs', 'scripts/lib/news-desk.mjs', 'scripts/lib/news-memes.mjs',
  'scripts/lib/news-satire-raster.mjs', 'scripts/lib/og-template.mjs',
];
export const artDigest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function idFor(date, slug) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^[a-z0-9][a-z0-9-]*$/.test(String(slug))) throw new Error('Invalid art render identity');
  return date + '--' + slug;
}
export function articleArtOutputs(date, slug, kind) {
  const id = idFor(date, slug), base = 'assets/og/news/' + id;
  if (kind === 'banner') return [base + '.png', ...['.png', '.webp', '.avif', '--640.webp', '--640.avif', '--128.avif'].map(suffix => base + '--meme' + suffix)];
  if (kind === 'satire') return Object.keys(SATIRE_CARTOON_BUDGETS).map(suffix => base + '--satire' + suffix);
  throw new Error('Unknown article art render kind');
}
export function articleArtProofPath(date, slug, kind) {
  articleArtOutputs(date, slug, kind);
  return `data/news-desk/art-provenance/${idFor(date, slug)}--${kind}.json`;
}
function ownedBytes(root, relative) {
  const base = fs.realpathSync(root), absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep) || !fs.realpathSync(absolute).startsWith(base + path.sep) || !fs.lstatSync(absolute).isFile()) throw new Error('Art proof input is not an owned regular file');
  return fs.readFileSync(absolute);
}
function assertRegularOrMissing(file) {
  try { if (!fs.lstatSync(file).isFile()) throw new Error('Art output must be a regular file'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
export function writeArticleArtBytes(root, relative, bytes) {
  const base = fs.realpathSync(root), absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep)) throw new Error('Art output escapes project');
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  if (!fs.realpathSync(path.dirname(absolute)).startsWith(base + path.sep)) throw new Error('Art output must be an owned regular file');
  assertRegularOrMissing(absolute);
  fs.writeFileSync(absolute, bytes);
}
export function beginArticleArtRender(root, day, story, kind) {
  const id = idFor(day.date, story.slug);
  const source = `data/news-desk/art/${id}${kind === 'satire' ? '--satire' : ''}.png`;
  articleArtOutputs(day.date, story.slug, kind);
  return { id, date: day.date, slug: story.slug, kind, source, sourceSha256: artDigest(ownedBytes(root, source)),
    inputsSha256: artDigest(JSON.stringify({ date: day.date, story })),
    // Git's text checkout can differ between the Windows worker and Linux CI.
    // Bind identical producer text, while raster/output hashes remain raw bytes.
    producers: DESK_ART_PRODUCERS.map(file => ({ file, encoding: 'utf8-lf',
      sha256: artDigest(ownedBytes(root, file).toString('utf8').replace(/\r\n/g, '\n')) })) };
}
export function assertArticleArtRenderCurrent(root, context, day, story) {
  if (JSON.stringify(beginArticleArtRender(root, day, story, context.kind)) !== JSON.stringify(context)) throw new Error('Article source/render inputs changed while encoding');
}
/** Only called by the actual encoder with its freshly produced output buffers. */
export function sealArticleArtRender(root, context, day, story, buffers) {
  assertArticleArtRenderCurrent(root, context, day, story);
  const expected = articleArtOutputs(day.date, story.slug, context.kind);
  if (Object.keys(buffers).sort().join('|') !== [...expected].sort().join('|')) throw new Error('Incomplete encoded article art family');
  const outputs = expected.map(file => {
    if (!Buffer.isBuffer(buffers[file]) || !buffers[file].length || !ownedBytes(root, file).equals(buffers[file])) throw new Error('Encoded output does not match written article art');
    return { file, sha256: artDigest(buffers[file]), bytes: buffers[file].length };
  });
  const proof = { schemaVersion: 1, producer: 'scripts/lib/desk-article-art.mjs', context, outputs };
  const target = path.join(root, articleArtProofPath(day.date, story.slug, context.kind));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.realpathSync(path.dirname(target)).startsWith(fs.realpathSync(root) + path.sep)) throw new Error('Art proof must be an owned regular file');
  assertRegularOrMissing(target);
  const temporary = target + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });fs.renameSync(temporary, target);
  return proof;
}
export function validateArticleArtProof(root, day, story, kind) {
  try {
    const proof = JSON.parse(ownedBytes(root, articleArtProofPath(day.date, story.slug, kind)).toString('utf8'));
    if (proof.schemaVersion !== 1 || proof.producer !== 'scripts/lib/desk-article-art.mjs') return ['derivative-provenance-invalid'];
    const current = beginArticleArtRender(root, day, story, kind);
    if (JSON.stringify(proof.context) !== JSON.stringify(current)) return ['derivative-provenance-stale-inputs'];
    const expected = articleArtOutputs(day.date, story.slug, kind);
    if (!Array.isArray(proof.outputs) || proof.outputs.length !== expected.length || new Set(proof.outputs.map(row => row.file)).size !== expected.length) return ['derivative-provenance-incomplete'];
    for (const file of expected) {
      const row = proof.outputs.find(entry => entry.file === file), bytes = ownedBytes(root, file);
      if (!row || artDigest(bytes) !== row.sha256 || bytes.length !== row.bytes) return ['derivative-provenance-output-drift'];
    }
    return [];
  } catch { return ['derivative-provenance-missing-or-unreadable']; }
}
